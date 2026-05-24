/**
 * TokenTicker — Live token chart + price pinned inside a Space room.
 * Paste a CA → fetches DexScreener data → shows price, chart embed, and key stats.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, ExternalLink, X, RefreshCw,
  Copy, BarChart3, DollarSign, Activity, Users, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenData {
  name: string;
  symbol: string;
  priceUsd: string;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  pairAddress: string;
  dexId: string;
  imageUrl?: string;
  fdv: number;
  txns24h: { buys: number; sells: number };
}

interface TokenTickerProps {
  ca: string;
  onClose?: () => void;
  compact?: boolean;
}

const fmt = (n: number): string => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const fmtPrice = (p: string): string => {
  const n = parseFloat(p);
  if (n < 0.0001) return `$${n.toExponential(2)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(2)}`;
};

const PctBadge = ({ val }: { val: number }) => {
  const positive = val >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
      positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
    )}>
      {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {positive ? "+" : ""}{val.toFixed(2)}%
    </span>
  );
};

const TokenTicker: React.FC<TokenTickerProps> = ({ ca, onClose, compact }) => {
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showChart, setShowChart] = useState(!compact);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${ca}`);
      const pairs = await res.json();
      if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
        setError("Token not found on DexScreener");
        setLoading(false);
        return;
      }
      // Pick highest-liquidity pair
      const pair = pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      setToken({
        name: pair.baseToken?.name || "Unknown",
        symbol: pair.baseToken?.symbol || "???",
        priceUsd: pair.priceUsd || "0",
        priceChange5m: pair.priceChange?.m5 || 0,
        priceChange1h: pair.priceChange?.h1 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        volume24h: pair.volume?.h24 || 0,
        liquidity: pair.liquidity?.usd || 0,
        marketCap: pair.marketCap || 0,
        fdv: pair.fdv || 0,
        pairAddress: pair.pairAddress || "",
        dexId: pair.dexId || "",
        imageUrl: pair.info?.imageUrl || undefined,
        txns24h: { buys: pair.txns?.h24?.buys || 0, sells: pair.txns?.h24?.sells || 0 },
      });
      setLastUpdate(Date.now());
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to fetch");
    }
    setLoading(false);
  }, [ca]);

  useEffect(() => { fetchToken(); const iv = setInterval(fetchToken, 15000); return () => clearInterval(iv); }, [fetchToken]);

  if (loading) return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center gap-2 text-white/30 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading token data...
    </div>
  );

  if (error || !token) return (
    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400/60 flex items-center justify-between">
      <span>{error || "Token not found"}</span>
      {onClose && <button onClick={onClose} className="p-1 hover:bg-white/5 rounded"><X className="h-3 w-3" /></button>}
    </div>
  );

  const dexUrl = `https://dexscreener.com/solana/${ca}`;
  const chartUrl = `https://dexscreener.com/solana/${ca}?embed=1&theme=dark&info=0`;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-white/[0.01] overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center gap-2.5 border-b border-white/[0.06]">
        {token.imageUrl && (
          <img src={token.imageUrl} alt="" className="w-7 h-7 rounded-full border border-white/10" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm text-white">${token.symbol}</span>
            <span className="text-[10px] text-white/25 truncate">{token.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono font-bold text-[13px] text-white">{fmtPrice(token.priceUsd)}</span>
            <PctBadge val={token.priceChange5m} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowChart(!showChart)}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors" title="Toggle chart">
            <BarChart3 className="h-3.5 w-3.5 text-white/40" />
          </button>
          <a href={dexUrl} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors" title="Open on DexScreener">
            <ExternalLink className="h-3.5 w-3.5 text-white/40" />
          </a>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
              <X className="h-3.5 w-3.5 text-white/40" />
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-3.5 py-2 flex items-center gap-3 text-[10px] border-b border-white/[0.04] overflow-x-auto">
        <div className="flex items-center gap-1 text-white/30 shrink-0">
          <span className="text-white/15">1h</span> <PctBadge val={token.priceChange1h} />
        </div>
        <div className="flex items-center gap-1 text-white/30 shrink-0">
          <span className="text-white/15">24h</span> <PctBadge val={token.priceChange24h} />
        </div>
        <div className="shrink-0 text-white/20"><DollarSign className="h-2.5 w-2.5 inline" /> Vol: {fmt(token.volume24h)}</div>
        <div className="shrink-0 text-white/20"><Activity className="h-2.5 w-2.5 inline" /> Liq: {fmt(token.liquidity)}</div>
        <div className="shrink-0 text-white/20">MC: {fmt(token.marketCap)}</div>
        <div className="shrink-0 text-white/20">
          <Users className="h-2.5 w-2.5 inline" /> {token.txns24h.buys}B/{token.txns24h.sells}S
        </div>
      </div>

      {/* Chart embed */}
      {showChart && (
        <div className="w-full aspect-[16/9] max-h-[300px]">
          <iframe
            src={chartUrl}
            className="w-full h-full border-0"
            title={`${token.symbol} chart`}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        </div>
      )}

      {/* CA copy bar */}
      <div className="px-3.5 py-2 flex items-center justify-between border-t border-white/[0.04]">
        <span className="text-[9px] text-white/15 font-mono truncate max-w-[200px]">{ca}</span>
        <button onClick={() => navigator.clipboard.writeText(ca)}
          className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors">
          <Copy className="h-2.5 w-2.5" /> Copy CA
        </button>
      </div>
    </div>
  );
};

export default TokenTicker;
