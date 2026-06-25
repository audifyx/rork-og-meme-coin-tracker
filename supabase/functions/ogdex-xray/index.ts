// ogdex-xray — early-buyer forensics for any Solana token.
// Walks the mint's signature history to genesis (Helius), parses the EARLIEST
// buy transactions, and classifies:
//   - early buyers (the first N wallets to acquire the token while spending SOL)
//   - snipers     (bought in the launch slot, within 30s, or among the first 15 buys)
//   - bundles     (same-slot clusters where >=3 distinct wallets bought together —
//                  a strong same-block bundler signal)
// No Birdeye / paid indexer. KV-cached at xray/{mint}.json (results are immutable).
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const HELIUS_API_KEY = Deno.env.get("HELIUS_API_KEY") || "";
const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const KV_BUCKET = "ogdex-kv";

async function kvGet(path: string) {
  try { const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${KV_BUCKET}/${path}`, { headers: { apikey: SRK, Authorization: `Bearer ${SRK}` } }); return r.ok ? await r.json() : null; } catch { return null; }
}
async function kvPut(path: string, obj: unknown) {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { method: "POST", headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: KV_BUCKET, name: KV_BUCKET, public: false }) }).catch(() => {});
    await fetch(`${SUPABASE_URL}/storage/v1/object/${KV_BUCKET}/${path}`, { method: "POST", headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json", "x-upsert": "true" }, body: JSON.stringify(obj) });
  } catch { /* best effort */ }
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, s-maxage=86400" } });

let _dbg: any = {};

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  return j?.result ?? null;
}

// Parse a single tx for net token acquisition (a "buy") of `mint` plus SOL spent.
function buyFromTx(tx: any, mint: string) {
  try {
    if (!tx || tx.meta?.err) return null;
    const pre = tx.meta?.preTokenBalances || [], post = tx.meta?.postTokenBalances || [];
    const byOwner: Record<string, number> = {};
    for (const b of post) if (b.mint === mint && b.owner) byOwner[b.owner] = (byOwner[b.owner] || 0) + Number(b.uiTokenAmount?.uiAmount || 0);
    for (const b of pre) if (b.mint === mint && b.owner) byOwner[b.owner] = (byOwner[b.owner] || 0) - Number(b.uiTokenAmount?.uiAmount || 0);
    let wallet: string | null = null, best = 0;
    for (const [o, d] of Object.entries(byOwner)) if (d > best) { best = d; wallet = o; }
    if (!wallet || best <= 0) return null;
    const keys = (tx.transaction?.message?.accountKeys || []).map((k: any) => (typeof k === "string" ? k : k.pubkey));
    const idx = keys.indexOf(wallet);
    let solDelta = 0;
    if (idx >= 0 && tx.meta?.preBalances && tx.meta?.postBalances) solDelta = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / 1e9;
    return {
      wallet, tokenAmount: best,
      solSpent: Math.abs(Math.min(solDelta, 0)) || 0,
      txHash: tx.transaction?.signatures?.[0] || null,
      slot: tx.slot || 0,
      time: (tx.blockTime || 0) * 1000,
    };
  } catch { return null; }
}

async function walkGenesis(mint: string) {
  const MAX_PAGES = 18, PAGE = 1000;
  let before: string | null = null, all: any[] = [], genesis = false;
  for (let i = 0; i < MAX_PAGES; i++) {
    const opts: any = { limit: PAGE }; if (before) opts.before = before;
    const sigs = (await rpc("getSignaturesForAddress", [mint, opts])) || [];
    if (!sigs.length) { genesis = true; break; }
    all = all.concat(sigs);
    before = sigs[sigs.length - 1].signature;
    if (sigs.length < PAGE) { genesis = true; break; }
  }
  _dbg.helius = { sigs: all.length, genesis, pages: Math.ceil(all.length / PAGE) };
  return { all: all.reverse(), genesis };
}

async function analyze(mint: string, limit = 50) {
  const { all, genesis } = await walkGenesis(mint);
  if (!all.length) return { traced: false, genesis, note: "No signatures found." };
  // Take the oldest signatures and resolve their full txs.
  const oldest = all.slice(0, Math.min(80, all.length));
  const txs: any[] = [];
  // Resolve in small batches to be gentle on the RPC.
  for (let i = 0; i < oldest.length; i += 10) {
    const batch = oldest.slice(i, i + 10);
    const resolved = await Promise.all(batch.map((s: any) => rpc("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]).catch(() => null)));
    txs.push(...resolved);
  }
  // Extract buys in chronological order, de-duped by first acquisition per wallet.
  const buysAll: any[] = [];
  for (const tx of txs) { const b = buyFromTx(tx, mint); if (b) buysAll.push(b); }
  buysAll.sort((a, b) => (a.slot - b.slot) || (a.time - b.time));
  if (!buysAll.length) return { traced: false, genesis, note: "No buy transactions parsed near genesis." };

  // The pool/bonding-curve receives the full tradeable supply at genesis with no SOL
  // spent — it is NOT a buyer. Detect and exclude it.
  const launchSlot0 = buysAll[0].slot;
  let poolWallet: string | null = null, poolMax = 0;
  for (const b of buysAll) {
    if (b.slot === launchSlot0 && b.solSpent === 0 && b.tokenAmount > poolMax) { poolMax = b.tokenAmount; poolWallet = b.wallet; }
  }
  const realBuys = buysAll.filter((b) => b.wallet !== poolWallet);
  if (!realBuys.length) return { traced: false, genesis, note: "Only pool genesis tx found." };

  const launchSlot = realBuys[0].slot;
  const launchTime = realBuys[0].time;

  // First acquisition per wallet (chronological).
  const seen = new Set<string>();
  const firstBuys: any[] = [];
  for (const b of realBuys) { if (!seen.has(b.wallet)) { seen.add(b.wallet); firstBuys.push(b); } }

  // Same-slot bundle clusters: slots with >=3 distinct wallets buying together.
  const bySlot: Record<string, Set<string>> = {};
  for (const b of firstBuys) { (bySlot[b.slot] ||= new Set()).add(b.wallet); }
  const bundles = Object.entries(bySlot)
    .filter(([, wallets]) => wallets.size >= 3)
    .map(([slot, wallets]) => ({ slot: Number(slot), wallets: [...wallets], size: wallets.size }))
    .sort((a, b) => b.size - a.size);
  const bundledWallets = new Set<string>();
  for (const b of bundles) for (const w of b.wallets) bundledWallets.add(w);

  // Sniper = bought in the launch slot OR within 20s of the first real buy.
  const isSniper = (b: any) => b.slot === launchSlot || (!!launchTime && !!b.time && (b.time - launchTime) <= 20_000);
  const snipers = firstBuys.filter(isSniper).map((b) => ({ ...b, bundled: bundledWallets.has(b.wallet) }));

  const earlyBuyers = firstBuys.slice(0, limit).map((b, i) => ({
    rank: i + 1, wallet: b.wallet, tokenAmount: b.tokenAmount, solSpent: b.solSpent,
    txHash: b.txHash, slot: b.slot, time: b.time,
    secondsAfterLaunch: launchTime && b.time ? Math.round((b.time - launchTime) / 1000) : null,
    sniper: isSniper(b),
    bundled: bundledWallets.has(b.wallet),
  }));

  const sniperPct = firstBuys.length ? Math.round((snipers.length / firstBuys.length) * 100) : 0;
  const bundlePct = firstBuys.length ? Math.round((bundledWallets.size / firstBuys.length) * 100) : 0;

  return {
    traced: true, genesis, source: "helius",
    launchSlot, launchTime, pool: poolWallet,
    counts: {
      earlyBuyers: firstBuys.length,
      snipers: snipers.length,
      bundledWallets: bundledWallets.size,
      bundles: bundles.length,
      sniperPct, bundlePct,
    },
    earlyBuyers,
    snipers: snipers.slice(0, 30),
    bundles: bundles.slice(0, 15),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  _dbg = {};
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const mint = String(body.mint || url.searchParams.get("mint") || "");
    if (!mint) return json({ ok: false, error: "mint required" }, 400);

    const cacheKey = `xray/${mint}.json`;
    if (!body.debug && !body.refresh) {
      const cached = await kvGet(cacheKey);
      if (cached && cached.xray?.traced) return json({ ok: true, mint, xray: cached.xray, cached: true });
    }

    const xray = await analyze(mint, Number(body.limit) || 50);
    if (xray.traced) kvPut(cacheKey, { xray, at: Date.now() });

    return json({ ok: true, mint, xray, _debug: body.debug ? _dbg : undefined });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) });
  }
});
