/**
 * PinnedContent — Pin tokens (with live DexScreener data) and X/Twitter posts inside a Space.
 * Host can add/remove pinned items. All participants see them in real-time.
 */
import React, { useState, useEffect } from "react";
import { Pin, X, Plus, Link2, ExternalLink, TrendingUp, TrendingDown, Loader2, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinnedToken {
  ca: string;
  name?: string;
  symbol?: string;
  price?: string;
  change24h?: number;
  imageUrl?: string;
}

interface PinnedTweet {
  url: string;
  tweetId: string;
}

interface PinnedContentProps {
  pinnedTokenCA: string | null;
  pinnedTweetUrl: string | null;
  isHost: boolean;
  onPinToken: (ca: string | null) => void;
  onPinTweet: (url: string | null) => void;
}

const PinnedContent: React.FC<PinnedContentProps> = ({
  pinnedTokenCA, pinnedTweetUrl, isHost, onPinToken, onPinTweet,
}) => {
  const [tokenData, setTokenData] = useState<PinnedToken | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [showAddTweet, setShowAddTweet] = useState(false);
  const [caInput, setCaInput] = useState("");
  const [tweetInput, setTweetInput] = useState("");

  // Fetch token data for pinned CA
  useEffect(() => {
    if (!pinnedTokenCA) { setTokenData(null); return; }
    setLoadingToken(true);
    const fetchData = async () => {
      try {
        const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${pinnedTokenCA}`);
        const pairs = await res.json();
        if (pairs && Array.isArray(pairs) && pairs.length > 0) {
          const pair = pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
          setTokenData({
            ca: pinnedTokenCA,
            name: pair.baseToken?.name,
            symbol: pair.baseToken?.symbol,
            price: pair.priceUsd,
            change24h: pair.priceChange?.h24 || 0,
            imageUrl: pair.info?.imageUrl,
          });
        }
      } catch {}
      setLoadingToken(false);
    };
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [pinnedTokenCA]);

  // Extract tweet ID from URL
  const extractTweetId = (url: string): string | null => {
    const m = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    return m?.[1] || null;
  };

  const handlePinToken = () => {
    const ca = caInput.trim();
    if (ca.length >= 32) { onPinToken(ca); setShowAddToken(false); setCaInput(""); }
  };

  const handlePinTweet = () => {
    const url = tweetInput.trim();
    if (extractTweetId(url)) { onPinTweet(url); setShowAddTweet(false); setTweetInput(""); }
  };

  const hasPinned = pinnedTokenCA || pinnedTweetUrl;

  return (
    <div className="space-y-2">
      {/* Pinned Token */}
      {pinnedTokenCA && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Pin className="h-3 w-3 text-amber-400 rotate-45" />
              <span className="text-[9px] font-bold text-amber-400/60 uppercase tracking-wider">Pinned Token</span>
            </div>
            {isHost && (
              <button onClick={() => onPinToken(null)} className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-red-400 transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {loadingToken ? (
            <div className="flex items-center gap-2 text-white/30 text-[11px]"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</div>
          ) : tokenData ? (
            <a href={`https://dexscreener.com/solana/${pinnedTokenCA}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 group">
              {tokenData.imageUrl && <img src={tokenData.imageUrl} alt="" className="w-8 h-8 rounded-full border border-white/10" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white">${tokenData.symbol}</span>
                  <span className="text-[10px] text-white/25 truncate">{tokenData.name}</span>
                  <ExternalLink className="h-2.5 w-2.5 text-white/15 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[12px] text-white/70">${parseFloat(tokenData.price || "0") < 0.0001 ? parseFloat(tokenData.price || "0").toExponential(2) : parseFloat(tokenData.price || "0").toFixed(6)}</span>
                  {tokenData.change24h !== undefined && (
                    <span className={cn("text-[10px] font-bold flex items-center gap-0.5",
                      tokenData.change24h >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {tokenData.change24h >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {tokenData.change24h >= 0 ? "+" : ""}{tokenData.change24h.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </a>
          ) : (
            <p className="text-[10px] text-white/20 font-mono break-all">{pinnedTokenCA}</p>
          )}
        </div>
      )}

      {/* Pinned Tweet */}
      {pinnedTweetUrl && (
        <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.03] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Twitter className="h-3 w-3 text-sky-400" />
              <span className="text-[9px] font-bold text-sky-400/60 uppercase tracking-wider">Pinned Post</span>
            </div>
            {isHost && (
              <button onClick={() => onPinTweet(null)} className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-red-400 transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <a href={pinnedTweetUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 group text-[11px] text-sky-400/60 hover:text-sky-400 transition-colors">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{pinnedTweetUrl}</span>
            <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          {/* Tweet embed iframe */}
          {extractTweetId(pinnedTweetUrl) && (
            <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.06]">
              <iframe
                src={`https://platform.twitter.com/embed/Tweet.html?id=${extractTweetId(pinnedTweetUrl)}&theme=dark`}
                className="w-full h-[300px] border-0"
                sandbox="allow-scripts allow-same-origin allow-popups"
                loading="lazy"
                title="Pinned tweet"
              />
            </div>
          )}
        </div>
      )}

      {/* Host: Add pinned content */}
      {isHost && (
        <div className="flex gap-2">
          {!pinnedTokenCA && (
            <div className="flex-1">
              {showAddToken ? (
                <div className="flex gap-1.5">
                  <input value={caInput} onChange={e => setCaInput(e.target.value)} placeholder="Paste token CA..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white placeholder:text-white/15 focus:outline-none focus:border-amber-500/20 font-mono" />
                  <button onClick={handlePinToken} className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all">Pin</button>
                  <button onClick={() => setShowAddToken(false)} className="px-1.5 py-1.5 rounded-lg bg-white/[0.04] text-white/20 hover:text-white/40"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setShowAddToken(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/25 hover:text-amber-400 hover:border-amber-500/20 transition-all">
                  <Plus className="h-2.5 w-2.5" /> Pin Token
                </button>
              )}
            </div>
          )}

          {!pinnedTweetUrl && (
            <div className="flex-1">
              {showAddTweet ? (
                <div className="flex gap-1.5">
                  <input value={tweetInput} onChange={e => setTweetInput(e.target.value)} placeholder="Paste X/Twitter URL..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white placeholder:text-white/15 focus:outline-none focus:border-sky-500/20" />
                  <button onClick={handlePinTweet} className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20 hover:bg-sky-500/20 transition-all">Pin</button>
                  <button onClick={() => setShowAddTweet(false)} className="px-1.5 py-1.5 rounded-lg bg-white/[0.04] text-white/20 hover:text-white/40"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setShowAddTweet(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/25 hover:text-sky-400 hover:border-sky-500/20 transition-all">
                  <Plus className="h-2.5 w-2.5" /> Pin Post
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PinnedContent;
