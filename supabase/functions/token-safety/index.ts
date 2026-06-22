// token-safety — rich RugCheck security data for a mint (ported from enhanced-intelligence).
// POST { mint } -> { ok, ...security }. verify_jwt=false (public read).
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
async function fetchJson(url: string, ms = 10000): Promise<any | null> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); clearTimeout(t); return r.ok ? await r.json() : null; }
  catch { clearTimeout(t); return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { mint } = await req.json().catch(() => ({ mint: "" }));
  const m = String(mint || "").trim();
  if (!m) return json({ ok: false, error: "mint required" }, 400);

  const d = await fetchJson(`https://api.rugcheck.xyz/v1/tokens/${m}/report`);
  if (!d) return json({ ok: false, error: "rugcheck unavailable" });

  const known: Record<string, any> = d.knownAccounts || {};
  const markets: any[] = Array.isArray(d.markets) ? d.markets : [];
  const lpAddrs = new Set<string>();
  for (const mk of markets) {
    if (typeof mk?.pubkey === "string") lpAddrs.add(mk.pubkey);
    for (const f of ["liquidityAAccount", "liquidityBAccount", "mintLPAccount"]) {
      const v = mk?.[f];
      if (typeof v === "string") lpAddrs.add(v);
      else if (v && typeof v === "object" && v.owner) lpAddrs.add(v.owner);
    }
  }
  const isPool = (h: any) => {
    const addr = h?.address || ""; const owner = h?.owner || "";
    const ka = known[addr] || known[owner];
    if (ka && /amm|lp|liquidity|pool|market|raydium|meteora|orca|pump/i.test(`${ka.type || ""} ${ka.name || ""}`)) return true;
    return (owner && lpAddrs.has(owner)) || (addr && lpAddrs.has(addr));
  };
  const holders: any[] = Array.isArray(d.topHolders) ? d.topHolders : [];
  const realHolders = holders.filter((h) => !isPool(h));
  const poolHolders = holders.filter((h) => isPool(h));
  const sumPct = (arr: any[], n: number) => arr.length ? Math.round(arr.slice(0, n).reduce((a: number, h: any) => a + (h.pct || 0), 0) * 100) / 100 : null;

  const launchpadName = d.launchpad?.name || null;
  const isPumpFun = (d.launchpad?.platform || "").toLowerCase().includes("pump") || m.toLowerCase().endsWith("pump");
  let lpLockedPct = num(d.markets?.[0]?.lp?.lpLockedPct);
  if (lpLockedPct == null && isPumpFun) lpLockedPct = 100;

  return json({
    ok: true,
    mint: m,
    riskScore: num(d.score_normalised ?? d.score),
    rugged: d.rugged ?? null,
    risks: Array.isArray(d.risks) ? d.risks.slice(0, 10).map((r: any) => ({ name: r.name, level: r.level, desc: r.description, score: r.score })) : [],
    mintAuthorityRenounced: d.mintAuthority == null,
    freezeAuthorityRenounced: d.freezeAuthority == null,
    lpLockedPct,
    isPumpFun,
    launchpad: launchpadName || (isPumpFun ? "Pump.fun" : null),
    top10RealHolderPct: sumPct(realHolders, 10),
    lpHolderPct: sumPct(poolHolders, poolHolders.length),
    totalHolders: num(d.totalHolders),
    topHolders: realHolders.slice(0, 15).map((h: any) => ({ address: h.address || h.owner, pct: num(h.pct), insider: !!h.insider })),
    marketCount: markets.length,
  });
});
