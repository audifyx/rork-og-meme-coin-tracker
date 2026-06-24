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
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return send(res, 400, { ok: false, error: "invalid amount" });

  try {
    const r = await fetch("https://pumpportal.fun/api/trade-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey, action, mint, amount: amt, denominatedInSol, slippage, priorityFee, pool }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return send(res, 200, { ok: false, error: `trade build failed (${r.status})`, detail: txt.slice(0, 200) });
    }
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      // PumpPortal returned an error object instead of a tx
      const j = await r.json().catch(() => ({}));
      return send(res, 200, { ok: false, error: j.errors ? JSON.stringify(j.errors) : "trade build error" });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) return send(res, 200, { ok: false, error: "empty transaction" });
    return send(res, 200, { ok: true, tx: buf.toString("base64") });
  } catch (e) {
    return send(res, 200, { ok: false, error: String(e?.message || e) });
  }
}
