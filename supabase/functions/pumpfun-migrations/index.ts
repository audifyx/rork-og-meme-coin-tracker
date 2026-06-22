// pumpfun-migrations — recently graduated/migrated pump.fun tokens.
// FREE multi-source, no API keys (replaces Bitquery EAP). Tries each source
// until one succeeds: pump.fun frontend API -> GeckoTerminal new pools.
// Returns { migrations: [...], count, source }.
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Source 1: pump.fun bonded/migrated coins (complete=true => graduated to Raydium).
async function fromPumpfun(limit: number) {
  const url = `https://frontend-api-v3.pump.fun/coins?offset=0&limit=${limit}&sort=last_trade_timestamp&order=DESC&includeNsfw=false&complete=true`;
  const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(`pumpfun ${r.status}`);
  const arr = await r.json();
  const rows = Array.isArray(arr) ? arr : (arr.coins || []);
  if (!rows.length) throw new Error("pumpfun: empty");
  return { source: "pumpfun", migrations: rows.map((c: any) => ({
    mint: c.mint,
    symbol: c.symbol ?? null,
    name: c.name ?? null,
    marketCap: c.usd_market_cap ?? null,
    image: c.image_uri ?? null,
    migratedAt: c.king_of_the_hill_timestamp || c.created_timestamp || null,
    raydiumPool: c.raydium_pool ?? null,
    dexUrl: c.raydium_pool ? `https://dexscreener.com/solana/${c.raydium_pool}` : `https://pump.fun/${c.mint}`,
  })) };
}
// Source 2: GeckoTerminal newest Solana pools (fresh listings, migration proxy).
async function fromGeckoTerminal(limit: number) {
  const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(`geckoterminal ${r.status}`);
  const data = (await r.json())?.data || [];
  if (!data.length) throw new Error("geckoterminal: empty");
  return { source: "geckoterminal", migrations: data.slice(0, limit).map((p: any) => {
    const a = p.attributes || {};
    const mint = (a.address || "").split("_").pop();
    return { mint, symbol: null, name: a.name ?? null, marketCap: a.fdv_usd ? Number(a.fdv_usd) : null,
      image: null, migratedAt: a.pool_created_at ? Date.parse(a.pool_created_at) : null,
      raydiumPool: a.address ?? null, dexUrl: a.address ? `https://dexscreener.com/solana/${a.address}` : null };
  }) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let limit = 50;
  try {
    if (req.method === "POST") { const b = await req.json().catch(() => ({})); limit = Math.min(Number(b.limit) || 50, 100); }
    else { const u = new URL(req.url); limit = Math.min(Number(u.searchParams.get("limit")) || 50, 100); }
  } catch { /* defaults */ }
  const errors: string[] = [];
  for (const fn of [fromPumpfun, fromGeckoTerminal]) {
    try { const out = await fn(limit); return json({ ...out, count: out.migrations.length, generatedAt: new Date().toISOString() }); }
    catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
  }
  // graceful: never hard-error the feed
  return json({ migrations: [], count: 0, source: "unavailable", tried: errors, generatedAt: new Date().toISOString() }, 200);
});
