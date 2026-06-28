// Resilient top-holder fetch for OG DEX. Helius getTokenLargestAccounts is the
// only efficient "top N" source but its account-index service intermittently
// returns -32603 "overloaded" (esp. for tokens with millions of accounts) and
// rpc-proxy can cold-start slowly. So we: retry with backoff, resolve owners
// (token account -> wallet), label whales, bound every call with a timeout, and
// keep a last-known-good copy in KV so a transient failure never blanks the UI.
import { SUPA_FN, ANON, kvGet, kvPut } from "./_lib.js";

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Single JSON-RPC call through the Helius-backed rpc-proxy, with a hard timeout.
async function rpc(method, params, timeout = 9000) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(`${SUPA_FN}/rpc-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params, provider: "helius" }),
      signal: ctl.signal,
    });
    const j = await res.json().catch(() => null);
    if (j?.data?.error || j?.error) return { result: null, error: j?.data?.error?.message || j?.error?.message || "rpc error" };
    return { result: j?.data?.result ?? j?.result ?? null, error: null };
  } catch (e) {
    return { result: null, error: String(e?.message || e) };
  } finally { clearTimeout(id); }
}

// getTokenLargestAccounts with retry — the index service often recovers on retry.
async function largestAccounts(mint, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const { result, error } = await rpc("getTokenLargestAccounts", [mint], 8000);
    if (result?.value?.length) return result.value;
    // Mega tokens (millions of accounts) get a persistent "index overloaded" /
    // "too many accounts" error that won't clear within this request — give it
    // one quick retry then bail so we don't burn the whole function timeout.
    const overloaded = error && /overload|too many accounts/i.test(error);
    if (overloaded && i >= 1) return null;
    if (i < attempts - 1) await sleep(400 * (i + 1));
  }
  return null;
}

// Resolve token-account pubkeys -> owner wallets via getMultipleAccounts.
async function resolveOwners(tokenAccounts) {
  const out = {};
  if (!tokenAccounts.length) return out;
  const { result } = await rpc("getMultipleAccounts", [tokenAccounts, { encoding: "jsonParsed" }], 8000);
  (result?.value || []).forEach((acc, i) => {
    const owner = acc?.data?.parsed?.info?.owner;
    if (owner) out[tokenAccounts[i]] = owner;
  });
  return out;
}

function labelFor(pct) {
  if (pct == null) return "holder";
  if (pct >= 1) return "whale";
  if (pct >= 0.5) return "large holder";
  return "holder";
}

// Live fetch: largest accounts -> supply -> owners -> labeled rows. Returns [] on failure.
async function fetchHoldersLive(mint, price, limit = 20) {
  const accts = await largestAccounts(mint);
  if (!accts?.length) return [];
  const top = accts.slice(0, limit);
  const supplyRes = await rpc("getTokenSupply", [mint], 6000);
  const total = num(supplyRes.result?.value?.uiAmount) || top.reduce((s, a) => s + (num(a.uiAmount) || 0), 0) || 0;
  const owners = await resolveOwners(top.map((a) => a.address));
  return top.map((a, i) => {
    const amt = num(a.uiAmount) || 0;
    const pct = total ? (amt / total) * 100 : null;
    const owner = owners[a.address] || a.address;
    return {
      rank: i + 1,
      owner,
      tokenAccount: a.address,
      uiAmount: amt,
      pct,
      usdValue: price != null ? amt * price : null,
      label: labelFor(pct),
    };
  });
}

// Public: resilient labeled holders with last-known-good fallback.
// Returns { holders: [...], source: "live"|"cache"|"none", stale: bool }.
export async function getLabeledHolders(mint, price = null, limit = 20) {
  const live = await fetchHoldersLive(mint, price, limit).catch(() => []);
  if (live.length) {
    kvPut(`holders/${mint}.json`, { ts: Date.now(), holders: live }).catch(() => {});
    return { holders: live, source: "live", stale: false };
  }
  const cached = await kvGet(`holders/${mint}.json`).catch(() => null);
  if (cached?.holders?.length) {
    const holders = cached.holders.map((h) => ({ ...h, usdValue: price != null ? (num(h.uiAmount) || 0) * price : h.usdValue, stale: true }));
    return { holders, source: "cache", stale: true };
  }
  return { holders: [], source: "none", stale: false };
}
