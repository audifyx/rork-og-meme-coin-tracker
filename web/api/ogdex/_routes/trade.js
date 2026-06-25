/**
 * OG DEX — non-custodial trade transaction builder.
 * Builds a buy/sell tx and returns it serialized (base64). The user's Phantom
 * wallet signs AND sends it client-side, so OG DEX never holds keys or funds.
 *
 * Routing: PumpPortal first (handles pump.fun / PumpSwap / Raydium and native
 * "N%" sells), with a Jupiter aggregator fallback so ANY liquid Solana token
 * can be traded even when PumpPortal can't route it.
 *
 * POST body: { publicKey, action:"buy"|"sell", mint, amount, denominatedInSol,
 *              slippage, priorityFee, pool }
 */
import { send, readBody, callFn, jup } from "../_lib.js";

const SOL = "So11111111111111111111111111111111111111112";
const isPubkey = (v) => typeof v === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);

async function rpc(method, params) {
  const r = await callFn("rpc-proxy", { method, params, id: 1, provider: "helius" });
  return r?.data?.result ?? r?.result ?? null;
}

// Raw (base-unit) token balance + decimals for an owner+mint.
async function tokenBalance(owner, mint) {
  try {
    const res = await rpc("getTokenAccountsByOwner", [owner, { mint }, { encoding: "jsonParsed" }]);
    let raw = 0n, decimals = 0;
    for (const a of (res?.value || [])) {
      const ta = a.account?.data?.parsed?.info?.tokenAmount;
      if (ta) { raw += BigInt(ta.amount || "0"); decimals = Number(ta.decimals) || decimals; }
    }
    return { raw, decimals };
  } catch { return { raw: 0n, decimals: 0 }; }
}

async function pumpPortalBuild({ publicKey, action, mint, amt, denominatedInSol, slippage, priorityFee, pool }) {
  const pools = [...new Set([pool, "auto", "pump", "pump-amm", "raydium", "bonk", "raydium-cpmm", "launchlab"])];
  let lastErr = "trade build failed";
  for (const pl of pools) {
    try {
      const r = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, action, mint, amount: amt, denominatedInSol, slippage, priorityFee, pool: pl }),
      });
      const ct = r.headers.get("content-type") || "";
      if (r.ok && !ct.includes("application/json")) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length) return { ok: true, tx: buf.toString("base64"), via: "pumpportal", pool: pl };
        lastErr = "empty transaction"; continue;
      }
      const txt = await r.text().catch(() => "");
      let msg = txt.slice(0, 200);
      try { const j = JSON.parse(txt); msg = j.errors ? (Array.isArray(j.errors) ? j.errors.join("; ") : JSON.stringify(j.errors)) : (j.error || msg); } catch { /* keep text */ }
      lastErr = msg || `trade build failed (${r.status})`;
      if (/insufficient|not enough|balance|too small|invalid amount/i.test(lastErr)) return { ok: false, error: lastErr, fatal: true };
    } catch (e) { lastErr = String(e?.message || e); }
  }
  return { ok: false, error: lastErr };
}

// Jupiter aggregator fallback — works for any liquid Solana token.
async function jupiterBuild({ publicKey, action, mint, amt, slippage }) {
  try {
    const slippageBps = Math.min(Math.max(Math.round((Number(slippage) || 10) * 100), 50), 5000);
    let inputMint, outputMint, amount;
    if (action === "buy") {
      inputMint = SOL; outputMint = mint;
      amount = Math.floor(Number(amt) * 1e9); // SOL -> lamports
    } else {
      inputMint = mint; outputMint = SOL;
      const { raw, decimals } = await tokenBalance(publicKey, mint);
      if (raw <= 0n) return { ok: false, error: "no balance to sell" };
      if (typeof amt === "string" && amt.endsWith("%")) {
        const pct = Number(amt.slice(0, -1));
        amount = Number((raw * BigInt(Math.round(pct)) / 100n).toString());
      } else {
        amount = Math.floor(Number(amt) * 10 ** decimals);
      }
    }
    if (!amount || amount <= 0) return { ok: false, error: "invalid amount" };
    const q = await jup(`/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&restrictIntermediateTokens=true`).catch(() => null);
    if (!q || q.error || !q.outAmount) return { ok: false, error: q?.error || "no route" };
    const r = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteResponse: q, userPublicKey: publicKey, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: "auto" }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.swapTransaction) return { ok: false, error: j.error || "jupiter swap failed" };
    return { ok: true, tx: j.swapTransaction, via: "jupiter" };
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  let body = {};
  try { body = await readBody(req); } catch { body = {}; }

  const publicKey = body.publicKey;
  const action = body.action === "sell" ? "sell" : "buy";
  const mint = body.mint;
  const denominatedInSol = action === "buy" ? "true" : (body.denominatedInSol === true || body.denominatedInSol === "true" ? "true" : "false");
  const slippage = Math.min(Math.max(Number(body.slippage) || 10, 1), 50);
  const priorityFee = Math.min(Math.max(Number(body.priorityFee) || 0.00005, 0), 0.01);
  const pool = ["auto", "pump", "raydium", "pump-amm", "launchlab", "raydium-cpmm", "bonk"].includes(body.pool) ? body.pool : "auto";

  if (!isPubkey(publicKey)) return send(res, 400, { ok: false, error: "invalid publicKey" });
  if (!isPubkey(mint)) return send(res, 400, { ok: false, error: "invalid mint" });

  let amt;
  const rawAmt = typeof body.amount === "string" ? body.amount.trim() : body.amount;
  if (action === "sell" && typeof rawAmt === "string" && rawAmt.endsWith("%")) {
    const pct = Number(rawAmt.slice(0, -1));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return send(res, 400, { ok: false, error: "invalid sell percentage" });
    amt = `${pct}%`;
  } else {
    const n = Number(rawAmt);
    if (!Number.isFinite(n) || n <= 0) return send(res, 400, { ok: false, error: "invalid amount" });
    amt = n;
  }

  // 1) PumpPortal (pump ecosystem + raydium, native % sells)
  const pp = await pumpPortalBuild({ publicKey, action, mint, amt, denominatedInSol, slippage, priorityFee, pool });
  if (pp.ok) return send(res, 200, pp);
  if (pp.fatal) return send(res, 200, { ok: false, error: pp.error });

  // 2) Jupiter aggregator fallback (any liquid token)
  const jp = await jupiterBuild({ publicKey, action, mint, amt, slippage });
  if (jp.ok) return send(res, 200, jp);

  return send(res, 200, { ok: false, error: jp.error || pp.error || "Could not build transaction" });
}
