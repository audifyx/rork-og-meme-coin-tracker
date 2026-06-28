// OG Scan tools — self-contained data layer for the OG Dex Tools page.
// Uses Jupiter (no key), Helius RPC (VITE_HELIUS_API_KEY), and DexScreener.
const HELIUS = (import.meta as any).env?.VITE_HELIUS_API_KEY || "";
const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS}`;
const HELIUS_BASE = "https://api.helius.xyz/v0";
const JUP = "https://lite-api.jup.ag";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const isMint = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test((v || "").trim());

async function rpc(method: string, params: any[]): Promise<any> {
  const r = await fetch(RPC, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "rpc error");
  return j.result;
}
async function jget(path: string): Promise<any> {
  const r = await fetch(`${JUP}${path}`, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`jup ${r.status}`);
  return r.json();
}
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

// ── OG Scanner / Rug Checker ──────────────────────────────────────────────
export interface ScanResult {
  mint: string; symbol: string; name: string; icon?: string | null;
  price: number | null; mcap: number | null; fdv: number | null; liquidity: number | null;
  holderCount: number | null; topHoldersPct: number | null; organicScore: number | null;
  launchpad: string | null; isVerified: boolean;
  mintDisabled: boolean | null; freezeDisabled: boolean | null; devMints: number | null;
  riskScore: number; riskLabel: string; flags: { tone: "good" | "warn" | "bad"; text: string }[];
}
export async function scanToken(mint: string): Promise<ScanResult> {
  const d = await jget(`/tokens/v2/search?query=${mint}`);
  const arr = Array.isArray(d) ? d : (d?.tokens || d?.data || []);
  const t = (arr || []).find((x: any) => x.id === mint) || (arr || [])[0];
  if (!t) throw new Error("Token not found");
  const a = t.audit || {};
  const liquidity = num(t.liquidity), mcap = num(t.mcap), holderCount = num(t.holderCount);
  const topHoldersPct = num(a.topHoldersPercentage);
  const mintDisabled = a.mintAuthorityDisabled ?? null;
  const freezeDisabled = a.freezeAuthorityDisabled ?? null;
  const organicScore = num(t.organicScore);

  const flags: ScanResult["flags"] = [];
  flags.push(mintDisabled ? { tone: "good", text: "Mint authority renounced" } : { tone: "bad", text: "Mint authority ACTIVE — supply can be inflated" });
  flags.push(freezeDisabled ? { tone: "good", text: "Freeze authority renounced" } : { tone: "bad", text: "Freeze authority ACTIVE — wallets can be frozen" });
  if (topHoldersPct != null) flags.push(topHoldersPct > 30 ? { tone: "bad", text: `Top holders own ${topHoldersPct.toFixed(1)}% — high concentration` } : topHoldersPct > 15 ? { tone: "warn", text: `Top holders own ${topHoldersPct.toFixed(1)}%` } : { tone: "good", text: `Top holders own ${topHoldersPct.toFixed(1)}% — well distributed` });
  if (liquidity != null) flags.push(liquidity < 5000 ? { tone: "warn", text: `Thin liquidity ($${Math.round(liquidity).toLocaleString()})` } : { tone: "good", text: `Liquidity $${Math.round(liquidity).toLocaleString()}` });
  if (a.devMints != null && a.devMints > 1) flags.push({ tone: "warn", text: `Dev has minted ${a.devMints} tokens` });

  // 0-100 risk score (higher = safer)
  let score = 50;
  if (mintDisabled) score += 15; else score -= 25;
  if (freezeDisabled) score += 15; else score -= 20;
  if (topHoldersPct != null) score += topHoldersPct > 30 ? -20 : topHoldersPct > 15 ? -5 : 10;
  if (liquidity != null) score += liquidity > 25000 ? 15 : liquidity > 5000 ? 5 : -5;
  if (organicScore != null) score += Math.min(15, organicScore / 7);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const riskLabel = score >= 70 ? "Low risk" : score >= 45 ? "Caution" : "High risk";

  return {
    mint, symbol: t.symbol || "?", name: t.name || t.symbol || "Unknown", icon: t.icon || null,
    price: num(t.usdPrice ?? t.price), mcap, fdv: num(t.fdv), liquidity, holderCount, topHoldersPct,
    organicScore, launchpad: t.launchpad || null, isVerified: !!t.isVerified,
    mintDisabled, freezeDisabled, devMints: num(a.devMints),
    riskScore: score, riskLabel, flags,
  };
}

// ── Holder Scanner ────────────────────────────────────────────────────────
export interface Holder { rank: number; address: string; amount: number; pct: number | null }
export async function tokenHolders(mint: string, limit = 20): Promise<{ holders: Holder[]; supply: number | null }> {
  const [largest, supply] = await Promise.all([
    rpc("getTokenLargestAccounts", [mint]).catch(() => null),
    rpc("getTokenSupply", [mint]).catch(() => null),
  ]);
  const total = num(supply?.value?.uiAmount);
  const rows = (largest?.value || []).slice(0, limit).map((x: any, i: number) => {
    const amt = num(x.uiAmount) ?? 0;
    return { rank: i + 1, address: x.address, amount: amt, pct: total ? (amt / total) * 100 : null };
  });
  return { holders: rows, supply: total };
}

// ── Liquidity Scanner ─────────────────────────────────────────────────────
export interface Pool { dex: string; pair: string; liquidity: number | null; volume24h: number | null; priceUsd: number | null; url?: string }
export async function liquidityScan(mint: string): Promise<{ totalLiquidity: number | null; pools: Pool[]; launchpad: string | null }> {
  let launchpad: string | null = null, jupLiq: number | null = null;
  try {
    const d = await jget(`/tokens/v2/search?query=${mint}`);
    const arr = Array.isArray(d) ? d : (d?.tokens || d?.data || []);
    const t = (arr || []).find((x: any) => x.id === mint) || (arr || [])[0];
    if (t) { launchpad = t.launchpad || null; jupLiq = num(t.liquidity); }
  } catch { /* ignore */ }
  let pools: Pool[] = [];
  try {
    const ds = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`).then((r) => r.ok ? r.json() : null);
    const pairs = Array.isArray(ds) ? ds : (ds?.pairs || []);
    pools = pairs.map((p: any) => ({
      dex: p.dexId || "?", pair: `${p.baseToken?.symbol || "?"}/${p.quoteToken?.symbol || "?"}`,
      liquidity: num(p.liquidity?.usd), volume24h: num(p.volume?.h24), priceUsd: num(p.priceUsd), url: p.url,
    })).sort((a: Pool, b: Pool) => (b.liquidity || 0) - (a.liquidity || 0));
  } catch { /* ignore */ }
  const total = pools.length ? pools.reduce((s, p) => s + (p.liquidity || 0), 0) : jupLiq;
  if (!pools.length && jupLiq != null) pools = [{ dex: launchpad || "bonding curve", pair: "—", liquidity: jupLiq, volume24h: null, priceUsd: null }];
  return { totalLiquidity: total, pools, launchpad };
}

// ── Wallet Profiler ───────────────────────────────────────────────────────
export interface WalletProfile { sol: number | null; tokenCount: number; recentTx: number; topTokens: { mint: string; amount: number }[] }
export async function walletProfile(addr: string): Promise<WalletProfile> {
  const [bal, assets, txs] = await Promise.all([
    rpc("getBalance", [addr]).catch(() => null),
    rpc("getTokenAccountsByOwner", [addr, { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, { encoding: "jsonParsed" }]).catch(() => null),
    fetch(`${HELIUS_BASE}/addresses/${addr}/transactions?api-key=${HELIUS}&limit=50`).then((r) => r.ok ? r.json() : []).catch(() => []),
  ]);
  const sol = bal?.value != null ? bal.value / 1e9 : null;
  const accts = (assets?.value || []).map((x: any) => {
    const info = x.account?.data?.parsed?.info;
    return { mint: info?.mint, amount: num(info?.tokenAmount?.uiAmount) ?? 0 };
  }).filter((t: any) => t.amount > 0);
  return {
    sol, tokenCount: accts.length, recentTx: Array.isArray(txs) ? txs.length : 0,
    topTokens: accts.sort((a: any, b: any) => b.amount - a.amount).slice(0, 8),
  };
}
