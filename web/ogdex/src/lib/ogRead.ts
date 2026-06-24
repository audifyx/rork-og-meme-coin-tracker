/**
 * OG Read — synthesized, plain-English token analysis from real on-chain data.
 * Deterministic (no LLM call) so it's free, instant, and works with no sign-in.
 * Can be upgraded to a live LLM later.
 */
import { compact } from "./api";

export type Tone = "good" | "warn" | "bad";
export interface OgReadResult { tone: Tone; headline: string; bullets: { tone: Tone; text: string }[]; }

const pct = (v: any) => (v == null ? null : Number(v));

export function buildOgRead(d: any): OgReadResult {
  const score = d?.score?.total ?? d?.meta?.organicScore ?? null;
  const flags = d?.flags || {};
  const safety = d?.safety || {};
  const meta = d?.meta || {};
  const t = d?.token || {};
  const sym = t.symbol || meta.symbol || "This token";

  const top10 = pct(meta.topHoldersPct ?? t.audit?.topHoldersPercentage);
  const lpLocked = pct(safety.lpLockedPct);
  const holders = meta.holderCount ?? t.holderCount ?? safety.totalHolders;
  const hChange = pct(meta.holderChange24h ?? t.holderChange24h);
  const ch24 = pct(t.change24h ?? meta.priceChange24h);
  const organic = meta.organicScoreLabel || t.organicScoreLabel;
  const momentum = (d?.momentumLabel || meta.momentumLabel || "").replace(/[^\w\s]/g, "").trim();
  const rugged = !!safety.rugged || !!flags.lpPulled;
  const clone = !!d?.score?.isPumpFunClone;

  // overall tone
  let tone: Tone = "warn";
  if (rugged) tone = "bad";
  else if (score != null && score >= 75) tone = "good";
  else if (score != null && score < 40) tone = "bad";
  else if (score != null && score >= 55) tone = "good";

  // headline
  const verdict = d?.verdict || (score != null ? (score >= 75 ? "Strong" : score >= 50 ? "Mixed" : "Risky") : "Unrated");
  let headline: string;
  if (rugged) headline = `${sym} shows rug characteristics — liquidity pulled or flagged as rugged. Treat with extreme caution.`;
  else if (tone === "good") headline = `${sym} reads ${verdict.toLowerCase()}: clean authorities${lpLocked != null && lpLocked >= 50 ? ", locked liquidity" : ""}${momentum ? `, and ${momentum.toLowerCase()} momentum` : ""}.`;
  else if (tone === "bad") headline = `${sym} looks risky — weak fundamentals and unresolved red flags. Size carefully.`;
  else headline = `${sym} is mixed — some green flags, some risks worth checking before aping.`;

  const b: { tone: Tone; text: string }[] = [];

  // authorities
  const mint = safety.mintAuthorityRenounced ?? flags.mintAuthorityDisabled;
  const freeze = safety.freezeAuthorityRenounced ?? flags.freezeAuthorityDisabled;
  if (mint && freeze) b.push({ tone: "good", text: "Mint & freeze authority renounced — supply is fixed and the dev can't freeze your tokens." });
  else if (!mint && !freeze) b.push({ tone: "bad", text: "Mint AND freeze authority still active — dev can print supply and freeze wallets. High risk." });
  else b.push({ tone: "warn", text: `${mint ? "Freeze" : "Mint"} authority still active — partial control remains with the deployer.` });

  // liquidity
  if (flags.lpPulled) b.push({ tone: "bad", text: "Liquidity has been pulled — this is a rug. Avoid." });
  else if (lpLocked != null && lpLocked >= 90) b.push({ tone: "good", text: `LP ${lpLocked.toFixed(0)}% locked/burned — rug-pull risk is low.` });
  else if (lpLocked != null && lpLocked >= 30) b.push({ tone: "warn", text: `Only ${lpLocked.toFixed(0)}% of LP is locked — partial rug protection.` });
  else if (lpLocked != null) b.push({ tone: "bad", text: `LP barely locked (${lpLocked.toFixed(0)}%) — elevated rug risk.` });
  else if (flags.minLiquidity) b.push({ tone: "warn", text: "Liquidity depth is sufficient, but lock status is unknown." });

  // concentration
  if (top10 != null) {
    if (top10 < 20) b.push({ tone: "good", text: `Top 10 holders own ${top10.toFixed(1)}% — healthy, distributed supply.` });
    else if (top10 < 40) b.push({ tone: "warn", text: `Top 10 holders own ${top10.toFixed(1)}% — moderate concentration, watch for dumps.` });
    else b.push({ tone: "bad", text: `Top 10 holders own ${top10.toFixed(1)}% — heavy concentration, a few wallets can crash it.` });
  }

  // holders / growth
  if (holders) {
    const hc = hChange != null ? ` (${hChange >= 0 ? "+" : ""}${hChange.toFixed(1)}% 24h)` : "";
    b.push({ tone: hChange != null && hChange > 0 ? "good" : "warn", text: `${compact(Number(holders))} holders${hc} — ${hChange != null && hChange > 0 ? "growing base" : "flat/declining base"}.` });
  }

  // momentum / organic
  if (organic || ch24 != null) {
    const dir = ch24 != null ? `${ch24 >= 0 ? "+" : ""}${ch24.toFixed(1)}% 24h` : "";
    const org = organic ? `${organic} organic activity` : "";
    b.push({ tone: organic === "high" || (ch24 ?? 0) > 0 ? "good" : "warn", text: [org, dir].filter(Boolean).join(" · ") + (organic === "high" ? " — real demand, not just wash volume." : "") });
  }

  // clone
  if (clone) b.push({ tone: "bad", text: "Flagged as a likely clone of another token — verify the original before buying." });

  // explicit risks from safety engine
  for (const r of (safety.risks || []).slice(0, 3)) {
    b.push({ tone: /danger|high|crit/i.test(r.level) ? "bad" : "warn", text: r.desc || r.name });
  }

  return { tone, headline, bullets: b.slice(0, 8) };
}
