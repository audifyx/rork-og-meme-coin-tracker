/**
 * TokenGate — Verify wallet holds a specific token via Helius RPC before joining a space.
 * User pastes their Solana wallet address, we check token accounts via Helius getTokenAccountsByOwner.
 */
import React, { useState } from "react";
import { Shield, Loader2, CheckCircle, XCircle, Wallet, Copy, ExternalLink } from "lucide-react";
import { HELIUS_RPC } from "@/lib/og";
import { cn } from "@/lib/utils";

interface TokenGateProps {
  tokenCA: string;
  tokenName?: string | null;
  onVerified: () => void;
  onCancel: () => void;
}

const TokenGate: React.FC<TokenGateProps> = ({ tokenCA, tokenName, onVerified, onCancel }) => {
  const [wallet, setWallet] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<"pass" | "fail" | null>(null);
  const [error, setError] = useState("");

  const verify = async () => {
    const addr = wallet.trim();
    if (!addr || addr.length < 32) { setError("Enter a valid Solana wallet address"); return; }
    setChecking(true); setError(""); setResult(null);

    try {
      // Use Helius RPC getTokenAccountsByOwner to check if wallet holds the token
      const res = await fetch(HELIUS_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            addr,
            { mint: tokenCA },
            { encoding: "jsonParsed" },
          ],
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error.message || "RPC error");
        setChecking(false);
        return;
      }

      const accounts = data.result?.value || [];
      // Check if any account has balance > 0
      const holds = accounts.some((acc: any) => {
        const info = acc.account?.data?.parsed?.info;
        const amount = info?.tokenAmount?.uiAmount ?? 0;
        return amount > 0;
      });

      if (holds) {
        setResult("pass");
        setTimeout(() => onVerified(), 1200);
      } else {
        setResult("fail");
      }
    } catch (e: any) {
      setError(e.message || "Verification failed");
    }
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-[#0c1219] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Token-Gated Space</h3>
              <p className="text-xs text-white/40">You must hold a specific token to join</p>
            </div>
          </div>

          {/* Required token */}
          <div className="mb-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-1.5">Required Token</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-400">{tokenName || "Token"}</span>
              <button onClick={() => navigator.clipboard.writeText(tokenCA)} className="text-white/20 hover:text-white/40 transition-colors" title="Copy CA">
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-1 font-mono break-all">{tokenCA}</p>
          </div>

          {/* Wallet input */}
          <div className="mb-4">
            <label className="text-[11px] text-white/40 font-bold mb-1.5 block">Your Wallet Address</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <input
                type="text"
                value={wallet}
                onChange={(e) => { setWallet(e.target.value); setResult(null); setError(""); }}
                placeholder="Paste your Solana wallet address..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 transition-colors font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          {/* Result messages */}
          {result === "pass" && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-400">Verified! ✅</p>
                <p className="text-[10px] text-emerald-400/60">Token found in wallet. Joining space...</p>
              </div>
            </div>
          )}
          {result === "fail" && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5">
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-400">Token Not Found</p>
                <p className="text-[10px] text-red-400/60">
                  Your wallet doesn't hold ${tokenName || "the required token"}. You need any amount to join this space.
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-bold text-white/40 hover:bg-white/[0.08] transition-all">
              Cancel
            </button>
            <button onClick={verify} disabled={checking || result === "pass"}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2",
                result === "pass"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/10"
              )}>
              {checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
                : result === "pass" ? <><CheckCircle className="h-4 w-4" /> Verified</>
                : "Verify & Join"}
            </button>
          </div>

          {/* Powered by */}
          <p className="text-[9px] text-white/15 text-center mt-4">Verified via Helius RPC on Solana Mainnet</p>
        </div>
      </div>
    </div>
  );
};

export default TokenGate;
