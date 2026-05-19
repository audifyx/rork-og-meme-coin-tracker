import sys

with open('web/src/components/Scanner.tsx', 'r') as f:
    content = f.read()

start_marker = 'const ResultRow = ({ t, score, onSelect }: { t: JupTokenInfo; score?: TokenForensicScores; onSelect: () => void }) => {'
end_marker = 'const FilterNum = ({'

start_idx = content.index(start_marker)
end_idx = content.index(end_marker)

new_result_row = '''const ResultRow = ({ t, score, onSelect }: { t: JupTokenInfo; score?: TokenForensicScores; onSelect: () => void }) => {
  const ch: number = t.stats24h?.priceChange ?? 0;
  const up: boolean = ch >= 0;
  const migrationDate: string = shortDate(tokenMigrationDateIso(t));
  const firstMintDate: string = shortDate(tokenOgCreatedAtIso(t));
  const dexPaid: string = tokenDexPaidLabel(t);
  const dexDisplay: string = dexPaid === "—" ? "No paid boost" : dexPaid;
  const originScore: number = score?.originScore ?? 0;
  const cloneScore: number = score?.cloneScore ?? 0;
  const riskScore: number = score?.riskScore ?? (hasPulledOrDeadLiquidity(t) ? 92 : 0);
  const dominanceScore: number = score?.dominanceScore ?? 0;
  const label: string = score?.classification.primary_label ?? "SCANNED";
  const secondaryLabels: string[] = score?.classification.secondary_labels.slice(0, 5) ?? [];
  const holderConcentration: number | undefined = tokenHolderConcentration(t);
  const holderConcentrationLabel: string = holderConcentration != null ? `${Math.round(holderConcentration)}% top` : "—";
  const chartUrl: string = dexScreenerChartUrl(t);
  const lpPulled: boolean = hasPulledOrDeadLiquidity(t);
  const rarityLabel: string = lpPulled || riskScore >= 70
    ? "Danger Foil"
    : score?.isPrimaryToken
      ? "Primary Holo"
      : score?.isFirstMintToken
        ? "Legacy OG"
        : cloneScore >= 50
          ? "Clone Card"
          : dominanceScore >= 70
            ? "Rare Runner"
            : "Scan Card";
  const cardTone: string = lpPulled || riskScore >= 70
    ? "collector-token-card--danger"
    : score?.isPrimaryToken
      ? "collector-token-card--primary"
      : "collector-token-card--copy";

  return (
    <article className={`collector-token-card ${cardTone} group relative flex flex-col overflow-hidden text-left transition duration-200`}>
      <div className="flex items-center justify-between gap-2 p-3 pb-0 font-mono text-[9px] uppercase tracking-widest">
        <span className={`collector-rarity-chip ${lpPulled || riskScore >= 70 ? "text-og-blood" : score?.isPrimaryToken ? "text-og-lime" : "text-og-cyan"}`}>
          {score?.isPrimaryToken ? <Crown className="h-3 w-3" /> : lpPulled || riskScore >= 70 ? <ShieldAlert className="h-3 w-3" /> : <BadgeDollarSign className="h-3 w-3" />}
          {rarityLabel}
        </span>
        <span className="collector-rarity-chip text-muted-foreground">#{score?.dominanceRank ?? "--"} / {fmtNum(t.poolCount ?? t.allPools?.length)} pools</span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelect();
        }}
        className="relative mt-2 cursor-pointer px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-og-cyan/50"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
          {t.icon ? (
            <img src={t.icon} alt={t.symbol} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-og-cyan/10 font-display text-5xl font-black text-og-lime">
              {t.symbol?.slice(0, 1) ?? "?"}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-full bg-black/60 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-og-cyan backdrop-blur">
            LP {fmtUsd(tokenEffectiveLiquidityUsd(t))}
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-display text-3xl font-black tracking-tight text-white drop-shadow-md">${t.symbol}</div>
                <div className="truncate text-[10px] uppercase tracking-[0.24em] text-white/80">{t.name}</div>
              </div>
              <div className="text-right font-mono">
                <div className="text-sm font-bold text-white drop-shadow-md">{fmtUsd(t.usdPrice)}</div>
                <div className={`text-[10px] ${up ? "text-og-lime" : "text-og-blood"} drop-shadow-md`}>{fmtPct(ch)} 24H</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest">
              {t.isVerified ? <span className="rounded-full bg-og-lime px-1.5 py-0.5 text-[8px] text-og-ink">verified</span> : null}
              <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-white/90 backdrop-blur">H {fmtHolderCount(t.holderCount)}</span>
              <span className="truncate rounded-full bg-black/60 px-1.5 py-0.5 text-og-cyan backdrop-blur">DEX {dexDisplay}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className={`inline-flex max-w-full border px-2.5 py-1 font-display text-sm font-black uppercase tracking-tight ${labelToneClass(label)}`}>
            <span className="truncate">{label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          <MiniIntel icon={Gauge} label="Dominance" value={score ? `#${score.dominanceRank} · ${dominanceScore}%` : "—"} accent={dominanceScore >= 70 ? "text-og-lime" : dominanceScore >= 45 ? "text-og-cyan" : "text-muted-foreground"} meter={score ? <ScoreMeter score={dominanceScore} kind="cto" className="mt-1" /> : undefined} />
          <MiniIntel icon={Fingerprint} label="Origin" value={score ? `${originScore}%` : "—"} accent={scoreTextClass("origin", originScore)} meter={score ? <ScoreMeter score={originScore} kind="origin" className="mt-1" /> : undefined} />
          <MiniIntel icon={ShieldAlert} label="Risk" value={score || lpPulled ? `${riskScore}%` : "—"} accent={scoreTextClass("risk", riskScore)} meter={score || lpPulled ? <ScoreMeter score={riskScore} kind="risk" className="mt-1" /> : undefined} />
        </div>

        <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground xl:grid-cols-3">
          <MiniIntel icon={Target} label="Clone" value={score ? `${cloneScore}%` : "—"} accent={scoreTextClass("clone", cloneScore)} />
          <MiniIntel icon={ShieldCheck} label="Authority" value={tokenAuthorityLabel(t)} accent={tokenAuthoritySafe(t) ? "text-og-lime" : "text-og-gold"} />
          <MiniIntel icon={Users} label="Holders" value={fmtHolderCount(t.holderCount)} accent={(t.holderCount ?? 0) >= 1000 ? "text-og-lime" : "text-muted-foreground"} />
          <MiniIntel icon={Wallet} label="Top 10" value={holderConcentrationLabel} accent={(holderConcentration ?? 0) > 45 ? "text-og-blood" : holderConcentration != null ? "text-og-lime" : undefined} />
          <MiniIntel icon={Coins} label="Liquidity" value={fmtUsd(tokenEffectiveLiquidityUsd(t))} accent="text-og-cyan" />
          <MiniIntel icon={RadioTower} label="First Mint" value={firstMintDate} accent={score?.isFirstMintToken ? "text-og-lime" : "text-og-gold"} />
          <MiniIntel icon={Calendar} label="Migrated" value={migrationDate} accent="text-og-cyan" />
          <MiniIntel icon={BadgeDollarSign} label="DEX" value={dexDisplay} accent={dexPaid === "—" ? "text-muted-foreground" : "text-og-lime"} />
        </div>
      </div>

      {secondaryLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-1 font-mono text-[8px] uppercase tracking-widest">
          {secondaryLabels.map((secondary) => (
            <span key={secondary} className="collector-rarity-chip min-h-0 border-og-cyan/30 bg-og-cyan/10 px-1.5 py-0.5 text-og-cyan">
              {secondary}
            </span>
          ))}
        </div>
      )}

      <div className="border-t border-white/10 p-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        <div className="mb-2 truncate">CA {shortAddr(t.id, 5)} · {score?.primaryStatusNote ?? "Open detail panel for full token truth."}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <QuickTool href={chartUrl} icon={<BarChart3 className="h-3 w-3" />} label="Chart" />
          <QuickTool href={`${SOLSCAN_BASE_URL}/${t.id}`} icon={<ExternalLink className="h-3 w-3" />} label="Solscan" />
          <QuickTool href={`${PUMPFUN_BASE_URL}/${t.id}`} icon={<Flame className="h-3 w-3" />} label="Pump" />
          <CoinDetailDialog token={t} onOpenScanner={() => onSelect()} actionLabel="Intel" className="collector-action px-2 py-1" />
          <CopyMintButton mint={t.id} label="Copy" copiedLabel="Copied" className="collector-action border-og-cyan/45 px-2 py-1 text-og-cyan" />
        </div>
      </div>
    </article>
  );
};
'''

new_content = content[:start_idx] + new_result_row + '\n\n' + content[end_idx:]

with open('web/src/components/Scanner.tsx', 'w') as f:
    f.write(new_content)

print('Scanner.tsx updated')
