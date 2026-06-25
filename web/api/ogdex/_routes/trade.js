/**
 * OG DEX — non-custodial trade transaction builder.
 * Builds a buy/sell transaction via PumpPortal (NOT Jupiter) and returns it
 * serialized. The user's Phantom wallet signs AND sends it client-side, so
 * OGDEX never holds keys or funds. pool:"auto" routes pump.fun / PumpSwap /
 * Raydium automatically.
 *
 * POST body: { publicKey, action:"buy"|"sell", mint, amount, denominatedInSol,
 *              slippage, priorityFee, pool }
 * Response: { ok:true, tx:<base64 serialized VersionedTransaction> }
 */
import { send, readBody } from "../_lib.js";

const isPubkey = (v) => typeof v === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  let body = {};
  try { body = await readBody(req); } catch { body = {}; }

  const publicKey = body.publicKey;
  const action = body.action === "sell" ? "sell" : "buy";
  const mint = body.mint;
  const amount = body.amount;
  const denominatedInSol = action === "buy" ? "true" : (body.denominatedInSol === true || body.denominatedInSol === "true" ? "true" : "false");
  const slippage = Math.min(Math.max(Number(body.slippage) || 10, 1), 50);
  const priorityFee = Math.min(Math.max(Number(body.priorityFee) || 0.00005, 0), 0.01);
  const pool = ["auto", "pump", "raydium", "pump-amm", "launchlab", "raydium-cpmm", "bonk"].includes(body.pool) ? body.pool : "auto";

  if (!isPubkey(publicKey)) return send(res, 400, { ok: false, error: "invalid publicKey" });
  if (!isPubkey(mint)) return send(res, 400, { ok: false, error: "invalid mint" });
  // Amount can be a number (SOL for buy / tokens for sell) or a "N%" string
  // (sell a percentage of the holding). PumpPortal accepts both.
  let amt;
  const rawAmt = typeof amount === "string" ? amount.trim() : amount;
  if (action === "sell" && typeof rawAmt === "string" && rawAmt.endsWith("%")) {
    const pct = Number(rawAmt.slice(0, -1));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return send(res, 400, { ok: false, error: "invalid sell percentage" });
    amt = `${pct}%`;
  } else {
    const n = Number(rawAmt);
    if (!Number.isFinite(n) || n <= 0) return send(res, 400, { ok: false, error: "invalid amount" });
    amt = n;
  }

  // PumpPortal "auto" routing can 400 for tokens on a specific venue. Try the
  // requested pool first, then fall back across every venue until one builds.
  const pools = [...new Set([pool, "auto", "pump", "pump-amm", "raydium", "bonk", "raydium-cpmm", "launchlab"])];
  let lastErr = "trade build failed";
  for (const pl of pools) {
    try {
      const r = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, action, mint, amount: amt, denominatedInSol, slippage, priorityFee, pool: pl }),
      });
      const ct = r.headers.get("content-type") || "";
      if (r.ok && !ct.includes("application/json")) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length) return send(res, 200, { ok: true, tx: buf.toString("base64"), pool: pl });
        lastErr = "empty transaction"; continue;
      }
      // error: capture detail (json or text) and try the next pool
      const txt = await r.text().catch(() => "");
      let msg = txt.slice(0, 200);
      try { const j = JSON.parse(txt); msg = j.errors ? (Array.isArray(j.errors) ? j.errors.join("; ") : JSON.stringify(j.errors)) : (j.error || msg); } catch { /* keep text */ }
      lastErr = msg || `trade build failed (${r.status})`;
      // a wallet/balance/amount problem won't be fixed by another pool — stop early
      if (/insufficient|not enough|balance|too small|too large|invalid amount/i.test(lastErr)) break;
    } catch (e) {
      lastErr = String(e?.message || e);
    }
  }
  return send(res, 200, { ok: false, error: lastErr });
}
