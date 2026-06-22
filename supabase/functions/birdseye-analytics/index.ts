import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Free, key-less token analytics with multi-source fallback (replaces Birdeye).
// Sources tried in order until one returns data: DexScreener -> GeckoTerminal -> Jupiter.
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const num = (v: unknown) => (v == null ? null : Number(v));

async function fromDexScreener(address: string) {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`dexscreener ${r.status}`);
  const j = await r.json();
  const pairs = (j.pairs || []).filter((p: any) => p.chainId === "solana");
  if (!pairs.length) throw new Error("dexscreener: no pairs");
  const best = pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  return { source: "dexscreener", data: {
    address, name: best.baseToken?.name ?? null, symbol: best.baseToken?.symbol ?? null,
    price: num(best.priceUsd), liquidityUsd: num(best.liquidity?.usd), marketCap: num(best.marketCap),
    fdv: num(best.fdv), volume24h: num(best.volume?.h24), priceChange24h: num(best.priceChange?.h24),
    image: best.info?.imageUrl ?? null, dexUrl: best.url ?? null,
  } };
}
async function fromGeckoTerminal(address: string) {
  const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${address}`, { signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`geckoterminal ${r.status}`);
  const a = (await r.json())?.data?.attributes;
  if (!a) throw new Error("geckoterminal: no data");
  return { source: "geckoterminal", data: {
    address, name: a.name ?? null, symbol: a.symbol ?? null, price: num(a.price_usd),
    liquidityUsd: num(a.total_reserve_in_usd), marketCap: num(a.market_cap_usd), fdv: num(a.fdv_usd),
    volume24h: num(a.volume_usd?.h24), priceChange24h: null, image: a.image_url ?? null, dexUrl: null,
  } };
}
async function fromJupiter(address: string) {
  const r = await fetch(`https://lite-api.jup.ag/price/v3?ids=${address}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`jupiter ${r.status}`);
  const d = (await r.json())?.[address];
  if (!d) throw new Error("jupiter: no data");
  return { source: "jupiter", data: {
    address, name: null, symbol: null, price: num(d.usdPrice), liquidityUsd: num(d.liquidity),
    marketCap: null, fdv: null, volume24h: null, priceChange24h: null, image: null, dexUrl: null,
  } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { address } = await req.json();
    if (!address) throw new Error("Token address is required");
    const sources = [fromDexScreener, fromGeckoTerminal, fromJupiter];
    const errors: string[] = [];
    for (const fn of sources) {
      try { const out = await fn(address); return json({ success: true, ...out, timestamp: new Date().toISOString() }); }
      catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
    }
    return json({ success: false, error: "all sources failed", tried: errors }, 502);
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
