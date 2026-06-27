/**
 * /api/ogdex/traders?mint=<mint>
 *
 * Returns top-50 holders (by balance) + top-50 traders (by PnL, 24h window).
 * Both datasets are sourced from Birdeye and enriched with cross-references
 * so holders also show their trading stats when available.
 *
 * Response shape:
 * {
 *   ok: true,
 *   mint: string,
 *   holders: HolderRow[],      // top 50 by balance
 *   traders: TraderRow[],      // top 50 by PnL (24h)
 * }
 *
 * HolderRow: { rank, owner, uiAmount, pct, usdValue?,
 *              buyVol?, sellVol?, realizedPnl?, unrealizedPnl?, netPnl?,
 *              buys?, sells?, tradeCount? }
 *
 * TraderRow: { rank, owner, buys, sells, tradeCount,
 *              buyVol, sellVol, volume,
 *              realizedPnl, unrealizedPnl, netPnl,
 *              isHolder, holdingPct?, holdingAmount? }
 */
import { send, cache } from "../_lib.js";

const BIRDEYE = "https://public-api.birdeye.so";
const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY || "";
const JUP = "https://lite-api.jup.ag";

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

function beHeaders() {
  return { "X-API-KEY": BIRDEYE_KEY, Accept: "application/json", "x-chain": "solana" };
}

async function beGet(path) {
  if (!BIRDEYE_KEY) return null;
  try {
    const r = await fetch(`${BIRDEYE}${path}`, { headers: beHeaders() });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// Fetch top 50 holders via Birdeye
async function fetchHolders(mint) {
  const d = await beGet(`/defi/token/holder?address=${mint}&offset=0&limit=50&sort_type=desc&sort_by=ui_amount`);
  // Response: { success, data: { items: [...] } }
  const items = d?.data?.items || d?.items || [];
  return items.map((h, i) => ({
    rank: i + 1,
    owner: h.owner || h.address || "",
    uiAmount: num(h.ui_amount ?? h.uiAmount) || 0,
    pct: num(h.percentage) != null ? num(h.percentage) * 100 : null, // Birdeye 0-1 → %
    usdValue: null, // enriched below with live price
  }));
}

// Fetch top 50 traders via Birdeye (sorted by 24h PnL)
async function fetchTraders(mint) {
  const d = await beGet(`/defi/token/top_traders?address=${mint}&time_frame=24h&sort_type=PnL&sort_by=PnL&limit=50&offset=0`);
  const items = d?.data?.items || d?.items || [];
  return items.map((t, i) => ({
    rank: i + 1,
    owner: t.address || t.owner || "",
    buys: num(t.buys) ?? num(t.buy_count) ?? null,
    sells: num(t.sells) ?? num(t.sell_count) ?? null,
    tradeCount: num(t.tradeCount) ?? num(t.trade_count) ?? null,
    buyVol: num(t.buy) ?? num(t.buy_volume) ?? null,
    sellVol: num(t.sell) ?? num(t.sell_volume) ?? null,
    volume: num(t.volume) ?? null,
    realizedPnl: num(t.realizedProfit) ?? num(t.realized_profit) ?? null,
    unrealizedPnl: num(t.unrealizedProfit) ?? num(t.unrealized_profit) ?? null,
    netPnl: num(t.pnl) ?? null,
    isHolder: false, // set below
    holdingPct: null,
    holdingAmount: null,
  }));
}

// Fetch current price from Jupiter
async function fetchPrice(mint) {
  try {
    const r = await fetch(`${JUP}/price/v3?ids=${mint}`);
    if (!r.ok) return null;
    const d = await r.json();
    return num(d[mint]?.usdPrice);
  } catch { return null; }
}

export default async function handler(req, res) {
  const url = new URL(req.url, "http://x");
  const mint = (url.searchParams.get("mint") || "").trim();
  if (!mint) return send(res, 400, { ok: false, error: "mint required" });
  cache(res, 60, 300);

  try {
    const [holders, traders, price] = await Promise.all([
      fetchHolders(mint),
      fetchTraders(mint),
      fetchPrice(mint),
    ]);

    // Enrich holders with USD value
    if (price) {
      for (const h of holders) h.usdValue = h.uiAmount * price;
    }

    // Cross-reference: attach trader stats to holders, mark traders who still hold
    const holderMap = new Map(holders.map((h) => [h.owner, h]));
    const traderMap = new Map(traders.map((t) => [t.owner, t]));

    for (const h of holders) {
      const t = traderMap.get(h.owner);
      if (t) {
        h.buyVol = t.buyVol;
        h.sellVol = t.sellVol;
        h.realizedPnl = t.realizedPnl;
        h.unrealizedPnl = t.unrealizedPnl;
        h.netPnl = t.netPnl;
        h.buys = t.buys;
        h.sells = t.sells;
        h.tradeCount = t.tradeCount;
      }
    }
    for (const t of traders) {
      const h = holderMap.get(t.owner);
      if (h) {
        t.isHolder = true;
        t.holdingPct = h.pct;
        t.holdingAmount = h.uiAmount;
        t.holdingUsd = h.usdValue;
      }
    }

    return send(res, 200, { ok: true, mint, holders, traders });
  } catch (e) {
    return send(res, 200, { ok: false, mint, error: String(e?.message || e) });
  }
}
