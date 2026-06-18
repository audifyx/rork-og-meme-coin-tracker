/**
 * OgVerdict — the OG Scan tool's headline result: explainable 4-tier classification
 * (OG / SAFE CLONE / RISKY / DANGEROUS) + lifecycle, velocity, hype-decay and a
 * share card. Records each verdict to the append-only intelligence log.
 */
import { useEffect, useMemo, useRef } from "react";
import { Sparkles, TrendingUp, GitBranch } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ClassificationCard } from "@/components/scanner-20x/ClassificationCard";
import { ShareScanCard } from "@/components/intel/ShareScanCard";
import { classifyToken } from "@/lib/classification";
import { forensicToInput, jupSeries } from "@/lib/classificationAdapter";
import { trendVelocityScore, reconstructLifecycle, hypeDecayScore, whyExists, type LifecycleStage } from "@/lib/intelligence";
import { logScan, captureTrendSnapshot } from "@/lib/scanLog";
import type { JupTokenInfo, TokenForensicScores } from "@/lib/og";

const STAGES: LifecycleStage[] = ["launch", "expansion", "peak", "decline"];

export function OgVerdict({ token, score }: { token: JupTokenInfo; score?: TokenForensicScores }) {
  const result = useMemo(() => classifyToken(forensicToInput(token, score)), [token, score]);
  const series = useMemo(() => jupSeries(token), [token]);
  const velocity = useMemo(() => trendVelocityScore(series), [series]);
  const lifecycle = useMemo(() => reconstructLifecycle(series), [series]);
  const decay = useMemo(() => hypeDecayScore(series), [series]);

  const loggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (loggedRef.current === token.id) return;
    loggedRef.current = token.id;
    void logScan({ mint: token.id, chain: token.chainId ?? "solana", symbol: token.symbol, name: token.name }, result);
    void captureTrendSnapshot(token.id, {
      priceUsd: token.usdPrice,
      volume24h: token.stats24h ? (token.stats24h.buyVolume ?? 0) + (token.stats24h.sellVolume ?? 0) : undefined,
      liquidityUsd: token.liquidity,
      velocity,
    });
  }, [token, result, velocity]);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-og-cyan">
        <Sparkles className="h-3 w-3" /> OG Verdict
      </div>

      <ClassificationCard result={result} symbol={token.symbol} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-og-grid bg-og-ink/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4" /> Trend & lifecycle</div>
          <Meter label="Trend velocity" value={velocity} />
          <Meter label="Hype decay risk" value={decay} />
          <div className="mt-3 flex flex-wrap gap-1">
            {STAGES.map((st) => (
              <Badge key={st} variant={lifecycle.stage === st ? "default" : "outline"} className="capitalize">{st}</Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{lifecycle.summary}</p>
        </div>
        <div className="rounded-xl border border-og-grid bg-og-ink/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><GitBranch className="h-4 w-4" /> Why this exists</div>
          <p className="text-sm text-muted-foreground">
            {whyExists({ name: token.name, symbol: token.symbol, isOg: result.tier === "OG_TOKEN" })}
          </p>
        </div>
      </div>

      <ShareScanCard mint={token.id} symbol={token.symbol} name={token.name} result={result} />
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{Math.round(value)}/100</span></div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export default OgVerdict;
