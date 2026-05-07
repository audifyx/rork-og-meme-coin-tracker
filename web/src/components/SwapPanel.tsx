import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, Loader2, Zap } from "lucide-react";
import { jupQuote, jupGetTokens, SOL_MINT, fmtUsd, fmtPct } from "@/lib/og";

type Props = { ogMint: string };

export const SwapPanel = ({ ogMint }: Props) => {
  const [solAmount, setSolAmount] = useState("1");
  const lamports = useMemo(() => {
    const n = Number(solAmount);
    if (!isFinite(n) || n <= 0) return "0";
    return Math.floor(n * 1e9).toString();
  }, [solAmount]);

  const { data: tokens } = useQuery({
    queryKey: ["swap-meta", ogMint],
    queryFn: () => jupGetTokens([SOL_MINT, ogMint]),
    enabled: !!ogMint,
    staleTime: 30_000,
  });
  const sol = tokens?.find((t) => t.id === SOL_MINT);
  const og = tokens?.find((t) => t.id === ogMint);

  const { data: quote, isFetching, error } = useQuery({
    queryKey: ["quote", ogMint, lamports],
    queryFn: () => jupQuote(SOL_MINT, ogMint, lamports, 100),
    enabled: !!ogMint && lamports !== "0",
    refetchInterval: 12_000,
    retry: 1,
  });

  const outAmount = useMemo(() => {
    if (!quote || !og) return "";
    const out = Number(quote.outAmount) / 10 ** og.decimals;
    return out.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, [quote, og]);

  const impact = quote ? Number(quote.priceImpactPct) * 100 : null;
  const route = quote?.routePlan?.map((r) => r.swapInfo.label).join(" → ") ?? "";

  return (
    <section id="swap" className="relative">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-og-lime">
            <span className="h-px w-10 bg-og-lime" /> JUPITER ROUTER
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
            <span className="text-foreground">COP THE</span>{" "}
            <span className="text-og-lime text-glow">${og?.symbol ?? "OG"}</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Live quote routed through Jupiter's aggregator — the same engine that powers jup.ag.
            Connect a wallet on Jupiter to execute.
          </p>
          <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><span className="h-1 w-4 bg-og-lime" /> Best execution across Solana DEXs</li>
            <li className="flex items-center gap-2"><span className="h-1 w-4 bg-og-gold" /> 1% slippage default</li>
            <li className="flex items-center gap-2"><span className="h-1 w-4 bg-og-cyan" /> Refreshes every 12s</li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <div className="relative border border-og-lime/40 bg-og-ink shadow-og">
            <div className="flex items-center justify-between border-b border-og-grid px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-og-lime">
              <span>QUOTE.SH</span>
              <span className="flex items-center gap-2">
                {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
                {isFetching ? "ROUTING" : "READY"}
              </span>
            </div>

            <div className="space-y-3 p-4">
              {/* Pay */}
              <div className="border border-og-grid bg-og-ink/70 p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">YOU PAY</div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    value={solAmount}
                    onChange={(e) => setSolAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    className="w-full bg-transparent font-display text-3xl font-bold outline-none"
                    placeholder="0.0"
                    inputMode="decimal"
                  />
                  <TokenChip icon={sol?.icon} symbol="SOL" />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  ≈ {fmtUsd(Number(solAmount) * (sol?.usdPrice ?? 0))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="grid h-8 w-8 place-items-center border border-og-grid bg-og-ink text-og-lime">
                  <ArrowDown className="h-4 w-4" />
                </div>
              </div>

              {/* Receive */}
              <div className="border border-og-gold/40 bg-og-ink/70 p-4">
                <div className="text-[10px] uppercase tracking-widest text-og-gold">YOU RECEIVE</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="w-full font-display text-3xl font-bold text-og-gold text-glow-gold">
                    {error ? "—" : outAmount || "0.0"}
                  </div>
                  <TokenChip icon={og?.icon} symbol={og?.symbol ?? "OG"} />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  ≈ {fmtUsd(Number(outAmount.replace(/,/g, "")) * (og?.usdPrice ?? 0))}
                </div>
              </div>

              {/* Quote details */}
              <div className="grid grid-cols-3 gap-3 border border-og-grid bg-og-ink/50 p-3 text-[10px] uppercase tracking-widest">
                <div>
                  <div className="text-muted-foreground">PRICE IMPACT</div>
                  <div className={`mt-1 ${impact != null && impact > 1 ? "text-og-blood" : "text-og-lime"}`}>
                    {impact != null ? fmtPct(impact) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">SLIPPAGE</div>
                  <div className="mt-1 text-foreground">1.00%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">ROUTE</div>
                  <div className="mt-1 truncate text-og-cyan" title={route}>{route || "—"}</div>
                </div>
              </div>

              <a
                href={`https://jup.ag/swap/SOL-${ogMint}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-center gap-2 border border-og-lime bg-og-lime py-4 text-sm font-bold uppercase tracking-[0.3em] text-og-ink transition hover:bg-og-lime/90 pulse-glow"
              >
                <Zap className="h-4 w-4" />
                EXECUTE ON JUPITER
              </a>
              {error && <div className="text-center text-[10px] uppercase tracking-widest text-og-blood">{(error as Error).message}</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TokenChip = ({ icon, symbol }: { icon?: string; symbol: string }) => (
  <div className="flex shrink-0 items-center gap-2 border border-og-grid bg-og-ink px-2 py-1.5">
    <div className="h-6 w-6 overflow-hidden border border-og-grid bg-og-ink">
      {icon ? <img src={icon} alt={symbol} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[10px] text-og-lime">{symbol[0]}</div>}
    </div>
    <span className="font-display text-sm font-bold">{symbol}</span>
  </div>
);
