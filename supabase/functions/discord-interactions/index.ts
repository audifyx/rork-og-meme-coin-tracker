// discord-interactions — Discord slash commands for Grim.
// Adds true two-way chat to Discord (the discord-connect integration is
// alerts-only). Handles /chat and /migrations. Verifies the Ed25519 request
// signature with DISCORD_PUBLIC_KEY, immediately ACKs with a deferred response
// (Discord requires a reply within 3s, but Grim can take longer), then edits
// the original message with the real answer via the interaction token.
//
// Env: DISCORD_PUBLIC_KEY, DISCORD_APP_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// No JWT (Discord calls it). Deploy with --no-verify-jwt.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY") || "";
const APP_ID = Deno.env.get("DISCORD_APP_ID") || "";
const API = "https://discord.com/api/v10";

// Discord interaction + response type enums we use.
const T = { PING: 1, APPLICATION_COMMAND: 2 };
const R = { PONG: 1, CHANNEL_MESSAGE: 4, DEFERRED_CHANNEL_MESSAGE: 5 };

const hexToBytes = (hex: string) =>
  new Uint8Array((hex.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16)));

let cachedKey: CryptoKey | null = null;
async function getPublicKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = await crypto.subtle.importKey(
      "raw",
      hexToBytes(PUBLIC_KEY),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
  }
  return cachedKey;
}

// Discord signs every request with Ed25519 over (timestamp + raw body).
async function verifySignature(body: string, sig: string, ts: string): Promise<boolean> {
  try {
    const key = await getPublicKey();
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      hexToBytes(sig),
      new TextEncoder().encode(ts + body),
    );
  } catch {
    return false;
  }
}

async function askGrim(text: string): Promise<string> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-intelligence`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
      body: JSON.stringify({ messages: [{ role: "user", content: text }], context: "Source: Discord bot" }),
    });
    const j = await r.json();
    return j.content || j.error || "Couldn't read the chain right now, try again.";
  } catch {
    return "Grim's RPC hiccuped. Try again in a sec.";
  }
}

function fmtUsd(n: unknown): string {
  const v = Number(n);
  if (!isFinite(v) || v === 0) return "?";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + v.toFixed(2);
}

async function migrationsText(): Promise<string> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/pumpfun-migrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
      body: JSON.stringify({ hours: 24, limit: 10 }),
    });
    const j = await r.json();
    const migs = j.migrations || [];
    if (!migs.length) return "No pump.fun migrations in the last 24h.";
    return "🚀 **Pump.fun migrations · last 24h**\n" + migs.map((m: any, i: number) => {
      const sym = m.symbol || m.mint.slice(0, 6);
      return `${i + 1}. **${sym}** · MC ${fmtUsd(m.marketCap)} · Liq ${fmtUsd(m.liquidityUsd)} · <https://dexscreener.com/solana/${m.mint}>`;
    }).join("\n");
  } catch {
    return "Couldn't fetch migrations right now.";
  }
}

function sentimentEmoji(s: string) {
  const t = (s || "").toLowerCase();
  if (t.includes("bull")) return "🟢";
  if (t.includes("bear")) return "🔴";
  return "⚪";
}
function decodeEntities(s: string) {
  return (s || "")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

// Query PostgREST directly (no supabase-js needed) with the service role key.
async function rest(path: string): Promise<any[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    return await r.json();
  } catch {
    return [];
  }
}

async function newsText(): Promise<string> {
  const rows = await rest("crypto_news?select=title,source,sentiment,source_url,published_at&order=published_at.desc.nullslast&limit=6");
  if (!rows.length) return "No news right now.";
  return "📰 **Latest crypto news**\n" + rows.map((n: any, i: number) => {
    const title = decodeEntities(n.title || "");
    return `${i + 1}. ${sentimentEmoji(n.sentiment)} ${n.source_url ? `[${title}](<${n.source_url}>)` : title} — *${n.source || ""}*`;
  }).join("\n");
}

async function alphaText(): Promise<string> {
  const rows = await rest("alpha_callouts?select=username,token_symbol,direction,target_multiplier,upvotes,created_at&order=created_at.desc&limit=6");
  if (!rows.length) return "No alpha callouts yet.";
  return "🧠 **Latest alpha callouts**\n" + rows.map((a: any, i: number) => {
    const dir = (a.direction || "").toLowerCase() === "short" ? "🔻 SHORT" : "🚀 LONG";
    const tgt = a.target_multiplier ? ` · 🎯 ${a.target_multiplier}x` : "";
    return `${i + 1}. **$${a.token_symbol || "?"}** ${dir}${tgt} · 👍 ${a.upvotes || 0} · by @${a.username || "anon"}`;
  }).join("\n");
}

// Edit the original (deferred) interaction message with the final content.
// Discord caps message content at 2000 chars.
async function editOriginal(token: string, content: string) {
  const body = content.length > 1990 ? content.slice(0, 1989) + "…" : content;
  await fetch(`${API}/webhooks/${APP_ID}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: body, allowed_mentions: { parse: [] } }),
  }).catch((e) => console.error("editOriginal err", e));
}

// Run async work after we've already returned the deferred ACK.
function runAfterAck(work: Promise<unknown>) {
  // @ts-ignore EdgeRuntime is provided by the Supabase edge runtime.
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(work);
  else void work;
}

Deno.serve(async (req) => {
  const sig = req.headers.get("X-Signature-Ed25519") || "";
  const ts = req.headers.get("X-Signature-Timestamp") || "";
  const raw = await req.text();

  if (!sig || !ts || !(await verifySignature(raw, sig, ts))) {
    return new Response("invalid request signature", { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  // Discord endpoint health check.
  if (body.type === T.PING) return Response.json({ type: R.PONG });

  if (body.type === T.APPLICATION_COMMAND) {
    const name = body.data?.name;
    const token = body.token;

    if (name === "chat") {
      const prompt = String(body.data?.options?.find((o: any) => o.name === "message")?.value || "").trim();
      if (!prompt) {
        return Response.json({ type: R.CHANNEL_MESSAGE, data: { content: "Ask me something: `/chat message: is SOL gonna pump?`" } });
      }
      runAfterAck(askGrim(prompt).then((a) => editOriginal(token, a)));
      return Response.json({ type: R.DEFERRED_CHANNEL_MESSAGE });
    }

    if (name === "migrations") {
      runAfterAck(migrationsText().then((t) => editOriginal(token, t)));
      return Response.json({ type: R.DEFERRED_CHANNEL_MESSAGE });
    }

    if (name === "news") {
      runAfterAck(newsText().then((t) => editOriginal(token, t)));
      return Response.json({ type: R.DEFERRED_CHANNEL_MESSAGE });
    }

    if (name === "alpha") {
      runAfterAck(alphaText().then((t) => editOriginal(token, t)));
      return Response.json({ type: R.DEFERRED_CHANNEL_MESSAGE });
    }

    return Response.json({ type: R.CHANNEL_MESSAGE, data: { content: "Unknown command." } });
  }

  return new Response("ok");
});
