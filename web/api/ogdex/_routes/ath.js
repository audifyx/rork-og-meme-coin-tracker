import { jup, send, cache } from "../_lib.js";
import { num } from "../_normalize.js";

const GT = "https://api.geckoterminal.com/api/v2";
const GT_HDR = { Accept: "application/json;version=20230302" };

// CoinGecko gives the TRUE historical all-time high for listed tokens (covers
// established coins whose peak predates their current main pool). No API key.
async function coingeckoAth(mint) {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/solana/contract/${mint}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      { headers: { Accept: "application/json" } },
    );
    if (!r.ok) return null;
    const d = await r.json();
    const md = d?.market_data; if (!md) return null;
    const athPrice = num(md.ath?.usd);
    if (!athPrice) return null;
    const circ = num(md.circulating_supply) || num(md.total_supply);
    const cur = num(md.current_price?.usd);
    const mc = num(md.market_cap?.usd);
    let athMcap = circ ? athPrice * circ : null;
    if (!athMcap && athPrice && cur && mc) athMcap = (athPrice / cur) * mc;
    return { athPrice, athMcap, source: "coingecko", athDate: md.ath_date?.usd || null };
  } catch { return null; }
}

async function poolHigh(pool) {
  try {
    const gt = await fetch(`${GT}/networks/solana/pools/${pool}/ohlcv/day?limit=1000&currency=usd&aggregate=1`, { headers: GT_HDR })
      .then((r) => (r.ok ? r.json() : null));
    const candles = gt?.data?.attributes?.ohlcv_list || [];
    const highs = candles.map((c) => num(c[2])).filter((h) => h && h > 0);
    return highs.length ? Math.max(...highs) : null;
  } catch { return null; }
}

// GeckoTerminal fallback: scan the token's pools and take the global daily high.
async function geckoterminalAth(mint, supply, price, mcap) {
  try {
    const pr = await fetch(`${GT}/networks/solana/tokens/${mint}/pools`, { headers: GT_HDR }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const pools = (pr?.data || [])
      .map((p) => ({ addr: p.attributes?.address, liq: Number(p.attributes?.reserve_in_usd) || 0 }))
      .filter((p) => p.addr).sort((a, b) => b.liq - a.liq).slice(0, 6).map((p) => p.addr);
    if (!pools.length) return null;
    const highs = (await Promise.all(pools.map(poolHigh))).filter((h) => h && h > 0);
    if (!highs.length) return null;
    let athPrice = Math.max(...highs);
    if (price && athPrice > price * 5000) athPrice = price; // wick guard
    let athMcap = supply ? athPrice * supply : (price && mcap ? (athPrice / price) * mcap : null);
    return { athPrice, athMcap, source: "geckoterminal", athDate: null };
  } catch { return null; }
}

export default async function handler(req, res) {
  const url = new URL(req.url, "http://x");
  const mint = url.searchParams.get("mint") || "";
  if (!mint) return send(res, 400, { ok: false, error: "mint required" });
  cache(res, 1800, 7200); // ATH barely changes — cache 30m fresh, 2h stale

  try {
    // Current price/supply/mcap from Jupiter (no key, reliable) for the GT path + sanity.
    let price = null, supply = null, mcap = null;
    try {
      const arr = await jup(`/tokens/v2/search?query=${mint}`);
      const jt = Array.isArray(arr) ? (arr.find((t) => (t.id || t.mint) === mint) || null) : null;
      if (jt) { price = num(jt.usdPrice); supply = num(jt.totalSupply) || num(jt.circSupply); mcap = num(jt.mcap); }
    } catch {}

    const [cg, gt] = await Promise.all([coingeckoAth(mint), geckoterminalAth(mint, supply, price, mcap)]);

    // True ATH = the highest peak any source has seen.
    const cands = [cg, gt].filter((x) => x && x.athPrice);
    if (!cands.length) return send(res, 200, { ok: true, mint, athPrice: null, athMcap: null, source: null });
    const best = cands.sort((a, b) => (b.athPrice || 0) - (a.athPrice || 0))[0];
    let athMcap = best.athMcap;
    if (athMcap == null && best.athPrice && price && mcap) athMcap = (best.athPrice / price) * mcap;
    if (athMcap != null && mcap) athMcap = Math.max(athMcap, mcap); // ATH >= now
    const fromAthPct = (athMcap && mcap) ? ((mcap / athMcap) - 1) * 100 : null;

    return send(res, 200, {
      ok: true, mint, athPrice: best.athPrice, athMcap,
      source: best.source, athDate: best.athDate, fromAthPct,
    });
  } catch (e) {
    return send(res, 200, { ok: false, mint, error: String(e?.message || e) });
  }
}
