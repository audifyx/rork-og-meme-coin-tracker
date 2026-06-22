// og-holders — real top-holder distribution for a token.
// Uses Helius getTokenLargestAccounts + getTokenSupply, then resolves the OWNER
// wallet behind each token account and the PROGRAM that owns that wallet so we can
// exclude AMM liquidity-pool vaults, bonding curves and burn addresses from the
// "holder" set. POST { mint } -> { ok, holders, top10pct, lpHolderPct, ... }
const HELIUS_API_KEY = Deno.env.get("HELIUS_API_KEY") || "";
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const TOKEN_PROGRAMS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",   // SPL Token
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",   // Token-2022
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",  // Associated Token
]);
// Known AMM / launchpad programs whose PDAs hold pool liquidity (NOT real holders).
const AMM_PROGRAMS = new Set([
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",  // Raydium AMM v4
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",  // Raydium CLMM
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",  // Raydium CPMM
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",   // Orca Whirlpool
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWfK",  // Orca v2 / token-swap
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",   // Meteora DLMM
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",  // Meteora dynamic AMM
  "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi",  // Meteora vault
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",   // pump.fun AMM
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",   // pump.fun bonding curve
  "2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c",  // Lifinity v2
  "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",   // Phoenix
  "FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1b",  // FluxBeam
  "swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ",   // Saros
]);
// Burn / dead addresses — tokens here are out of circulation, not held.
const BURN_ADDRESSES = new Set([
  "1nc1nerator11111111111111111111111111111111",
  "11111111111111111111111111111111",
  "deadDeadDeadDeadDeadDeadDeadDeadDeadDeadDead",
]);

async function rpc(method: string, params: any[]): Promise<any> {
  const r = await fetch(HELIUS_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: "og", method, params }), signal: AbortSignal.timeout(12000) });
  const j = await r.json();
  return j.result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { mint } = await req.json().catch(() => ({ mint: "" }));
    const m = String(mint || "").trim();
    if (!MINT_RE.test(m)) return json({ ok: false, error: "Provide a valid token mint." }, 400);

    const [largest, supply] = await Promise.all([
      rpc("getTokenLargestAccounts", [m, { commitment: "confirmed" }]),
      rpc("getTokenSupply", [m]),
    ]);
    const accounts = (largest?.value || []).slice(0, 20);
    const total = supply?.value?.uiAmount || 0;

    // 1) token account -> owner wallet
    let owners: (string | null)[] = [];
    try {
      const mul = await rpc("getMultipleAccounts", [accounts.map((a: any) => a.address), { encoding: "jsonParsed" }]);
      owners = (mul?.value || []).map((v: any) => v?.data?.parsed?.info?.owner || null);
    } catch { owners = accounts.map(() => null); }

    // 2) owner wallet -> the program that owns that wallet (System = normal user, AMM = pool PDA)
    let ownerProgram: (string | null)[] = [];
    try {
      const probe = owners.map((o) => o || SYSTEM_PROGRAM);
      const mul2 = await rpc("getMultipleAccounts", [probe, { encoding: "jsonParsed" }]);
      ownerProgram = (mul2?.value || []).map((v: any) => v?.owner || null);
    } catch { ownerProgram = owners.map(() => null); }

    const classify = (owner: string | null, prog: string | null): "holder" | "pool" | "burn" | "contract" => {
      if (owner && BURN_ADDRESSES.has(owner)) return "burn";
      if (prog && AMM_PROGRAMS.has(prog)) return "pool";
      if (prog && prog !== SYSTEM_PROGRAM && !TOKEN_PROGRAMS.has(prog)) return "contract"; // program-owned (vesting/multisig/other pool)
      return "holder";
    };

    const classified = accounts.map((a: any, i: number) => {
      const owner = owners[i] || null;
      const prog = ownerProgram[i] || null;
      const kind = classify(owner, prog);
      const pct = total > 0 ? (a.uiAmount / total) * 100 : null;
      return { owner, tokenAccount: a.address, uiAmount: a.uiAmount || 0, pct, kind };
    });

    // Real holders only (exclude pools, burns and program-owned accounts).
    const real = classified.filter((c) => c.kind === "holder");
    const holders = real.slice(0, 10).map((c, i) => ({
      rank: i + 1,
      owner: c.owner,
      tokenAccount: c.tokenAccount,
      uiAmount: c.uiAmount,
      pct: c.pct,
      label: c.pct == null ? null : c.pct >= 10 ? "mega-whale" : c.pct >= 5 ? "whale" : c.pct >= 2 ? "large" : "holder",
    }));

    const sumPct = (arr: typeof classified) => total > 0 ? arr.reduce((s, c) => s + (c.uiAmount || 0), 0) / total * 100 : null;
    const top10pct = sumPct(real.slice(0, 10));                              // real-holder concentration
    const lpHolderPct = sumPct(classified.filter((c) => c.kind === "pool")); // liquidity locked in pools
    const burnPct = sumPct(classified.filter((c) => c.kind === "burn"));
    const top10pctRaw = sumPct(classified.slice(0, 10));                     // legacy (LP-inclusive) for reference

    let risk = "unknown";
    if (top10pct != null) risk = top10pct >= 50 ? "very high" : top10pct >= 30 ? "high" : top10pct >= 20 ? "moderate" : top10pct >= 10 ? "low" : "very low";

    return json({
      ok: true,
      mint: m,
      totalSupply: total,
      top10pct,
      top10pctRaw,
      lpHolderPct,
      burnPct,
      concentrationRisk: risk,
      excludedPools: classified.filter((c) => c.kind === "pool").length,
      holders,
      note: "top10pct excludes AMM liquidity pools, bonding curves and burn addresses",
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
