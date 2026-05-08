import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  Coins,
  Cpu,
  Crosshair,
  Crown,
  Flame,
  Gauge,
  Map,
  Radar,
  Rocket,
  Search,
  Target,
  Zap,
} from "lucide-react";
import { Scanlines } from "@/components/Scanlines";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusStrip } from "@/components/StatusStrip";
import { Marquee } from "@/components/Marquee";
import { Hero } from "@/components/Hero";
import { OgStats } from "@/components/OgStats";
import { Scanner } from "@/components/Scanner";
import { Trending } from "@/components/Trending";
import { OgFinder } from "@/components/OgFinder";
import { PairTracker } from "@/components/PairTracker";
import { Migrations } from "@/components/Migrations";
import { TxFeed } from "@/components/TxFeed";
import { Whales } from "@/components/Whales";
import { SwapPanel } from "@/components/SwapPanel";
import { TechStack } from "@/components/TechStack";
import { OurCoin } from "@/components/OurCoin";
import { SnipeFeed } from "@/components/SnipeFeed";
import { SolToolsRoadmap } from "@/components/SolToolsRoadmap";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";
import { DEFAULT_OG_MINT, STORAGE_OG_MINT } from "@/lib/og";

const LEGACY_DEFAULT_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

type TabId =
  | "overview"
  | "our-coin"
  | "roadmap"
  | "snipe-feed"
  | "scanner"
  | "og-finder"
  | "pairs"
  | "migrations"
  | "trending"
  | "swap"
  | "tech";

type TabAccent = "blue" | "white" | "cyan";

type TabConfig = {
  id: TabId;
  label: string;
  eyebrow: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: TabAccent;
};

const TABS: TabConfig[] = [
  { id: "overview", label: "Vitals", eyebrow: "MARKET COMMAND", description: "Price, liquidity, whales, and real-time tape in one dedicated page.", Icon: Gauge, accent: "blue" },
  { id: "our-coin", label: "Token Soon", eyebrow: "OFFICIAL NOTICE", description: "No token out yet. A clean coming-soon banner replaces the old CA/chart hub.", Icon: Coins, accent: "white" },
  { id: "roadmap", label: "Roadmap", eyebrow: "SOLTOOLS VISION", description: "The official SolTools path from OGScan tools into a crypto-native social ecosystem.", Icon: Map, accent: "cyan" },
  { id: "snipe-feed", label: "Snipe Feed", eyebrow: "DEV WALLET RADAR", description: "Track brand-new launches, repeat creator wallets, hot scores, and risk warnings.", Icon: Target, accent: "cyan" },
  { id: "scanner", label: "Scanner", eyebrow: "RUN THE CHAIN", description: "Paste a mint and inspect signal, score, holders, and market data.", Icon: Search, accent: "blue" },
  { id: "og-finder", label: "OG Finder", eyebrow: "FIND THE ORIGIN", description: "Search tickers and separate the real OG from dead copycats.", Icon: Crosshair, accent: "cyan" },
  { id: "pairs", label: "New Pairs", eyebrow: "PAIR RADAR", description: "Watch fresh Solana pairs before the timeline catches up.", Icon: Radar, accent: "blue" },
  { id: "migrations", label: "Migrations", eyebrow: "BREAKOUT WATCH", description: "Track tokens moving from launch chaos into real liquidity.", Icon: Rocket, accent: "white" },
  { id: "trending", label: "Trending", eyebrow: "NARRATIVE HEAT", description: "See what is actually moving across the Solana market.", Icon: Flame, accent: "cyan" },
  { id: "swap", label: "Swap", eyebrow: "JUPITER ROUTER", description: "Search coins and route swaps while keeping the scanner context.", Icon: Zap, accent: "blue" },
  { id: "tech", label: "Tech", eyebrow: "HOW IT WORKS", description: "The data pipeline behind OG detection and live Solana signals.", Icon: Cpu, accent: "white" },
];

const STORAGE_TAB = "og_scanner.active_tab";
const WORKSPACE_ID = "workspace";

const getFeatureButtonClass = (active: boolean, accent: TabAccent): string => {
  if (active) {
    if (accent === "white") return "border-og-gold bg-og-gold text-og-ink shadow-og-gold";
    if (accent === "cyan") return "border-og-cyan bg-og-cyan text-og-ink shadow-og";
    return "border-og-lime bg-og-lime text-og-ink shadow-og";
  }

  if (accent === "white") return "border-og-grid bg-og-ink/72 text-foreground/75 hover:border-og-gold hover:bg-og-gold/10 hover:text-og-gold";
  if (accent === "cyan") return "border-og-grid bg-og-ink/72 text-foreground/75 hover:border-og-cyan hover:bg-og-cyan/10 hover:text-og-cyan";
  return "border-og-grid bg-og-ink/72 text-foreground/75 hover:border-og-lime hover:bg-og-lime/10 hover:text-og-lime";
};

const getAccentTextClass = (accent: TabAccent): string => {
  if (accent === "white") return "text-og-gold";
  if (accent === "cyan") return "text-og-cyan";
  return "text-og-lime";
};

const getAccentBorderClass = (accent: TabAccent): string => {
  if (accent === "white") return "border-og-gold/55 shadow-og-gold";
  if (accent === "cyan") return "border-og-cyan/55 shadow-[0_0_0_1px_hsl(var(--og-cyan)/0.22),0_36px_120px_-72px_hsl(var(--og-cyan))]";
  return "border-og-lime/55 shadow-[0_0_0_1px_hsl(var(--og-lime)/0.22),0_36px_120px_-72px_hsl(var(--og-lime))]";
};

const Index = () => {
  const [mint, setMint] = useState<string>(DEFAULT_OG_MINT);
  const [tab, setTab] = useState<TabId>("overview");
  const [pendingScrollTarget, setPendingScrollTarget] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved: string | null = localStorage.getItem(STORAGE_OG_MINT);
      if (saved && saved !== LEGACY_DEFAULT_MINT) {
        setMint(saved);
      } else {
        localStorage.setItem(STORAGE_OG_MINT, DEFAULT_OG_MINT);
      }
      const t: TabId | null = localStorage.getItem(STORAGE_TAB) as TabId | null;
      if (t && TABS.some((x) => x.id === t)) setTab(t);
    } catch {
      /* noop */
    }
  }, []);

  const activeTab: TabConfig = useMemo<TabConfig>(() => TABS.find((x) => x.id === tab) ?? TABS[0], [tab]);
  const activeTabNumber: number = useMemo<number>(() => Math.max(1, TABS.findIndex((x) => x.id === tab) + 1), [tab]);
  const headerNavItems: { id: string; label: string }[] = useMemo(() => TABS.map(({ id, label }) => ({ id, label })), []);

  const updateMint = (next: string, nextTab: TabId = "overview"): void => {
    setMint(next);
    try {
      localStorage.setItem(STORAGE_OG_MINT, next);
    } catch {
      /* noop */
    }
    setTab(nextTab);
    try {
      localStorage.setItem(STORAGE_TAB, nextTab);
    } catch {
      /* noop */
    }
  };

  const promptMint = (): void => {
    const v: string | null = window.prompt("Paste any Solana mint address to inspect:", mint);
    if (v && v.trim().length > 20) updateMint(v.trim());
  };

  const switchTab = (id: TabId, shouldScroll: boolean = false): void => {
    setTab(id);
    setPendingScrollTarget(shouldScroll ? WORKSPACE_ID : null);
    try {
      localStorage.setItem(STORAGE_TAB, id);
    } catch {
      /* noop */
    }
  };

  const handleNavigate = (id: string): void => {
    if (TABS.some((x) => x.id === id)) switchTab(id as TabId, true);
  };

  useEffect(() => {
    if (!pendingScrollTarget) return;

    const scrollTimer: number = window.setTimeout(() => {
      document.getElementById(pendingScrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollTarget(null);
    }, 50);

    return () => window.clearTimeout(scrollTimer);
  }, [pendingScrollTarget, tab]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-og-ink text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,hsl(var(--og-lime)/0.18),transparent_32%),radial-gradient(circle_at_82%_0%,hsl(var(--og-cyan)/0.14),transparent_28%),linear-gradient(180deg,hsl(var(--og-ink)),hsl(var(--background)))]" />
      <Scanlines />

      <SiteHeader navItems={headerNavItems} activeId={tab} onNavigate={handleNavigate} />
      <StatusStrip mint={mint} onChangeMint={promptMint} />
      <Marquee />

      <Hero
        onScanClick={() => switchTab("scanner", true)}
        onSwapClick={() => switchTab("swap", true)}
      />

      <main id={WORKSPACE_ID} className="mx-auto max-w-7xl scroll-mt-32 px-4 py-6 sm:px-6 lg:py-8">
        <section className="mb-5 overflow-hidden border border-og-grid bg-og-ink/82 shadow-og backdrop-blur">
          <div className="relative border-b border-og-grid p-4 sm:p-5">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.38em] text-og-cyan">
                  <span className="h-px w-10 bg-og-cyan" /> choose one tool page
                </div>
                <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground sm:text-5xl">
                  Each tool is now its own tab.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  No more endless mixed dashboard. Pick a tool below and the entire workspace becomes that tool’s page with a clear start, body, and footer.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 border border-og-gold/50 bg-og-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-og-gold">
                <CalendarClock className="h-3.5 w-3.5" /> token coming soon
              </div>
            </div>
          </div>

          <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-5">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => switchTab(tb.id)}
                className={cn(
                  "group flex min-h-[86px] items-start gap-3 border p-3 text-left transition active:scale-[0.99]",
                  getFeatureButtonClass(tab === tb.id, tb.accent),
                )}
              >
                <tb.Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.18em]">{tb.label}</span>
                  <span className="mt-1 block text-[10px] uppercase leading-snug tracking-widest opacity-60">{tb.eyebrow}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className={cn("relative min-h-[calc(100vh-170px)] overflow-hidden border-2 bg-og-ink/92 backdrop-blur", getAccentBorderClass(activeTab.accent))}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--og-lime)/0.07)_0_1px,transparent_1px_calc(100%-1px),hsl(var(--og-cyan)/0.1)_calc(100%-1px)),radial-gradient(circle_at_0%_0%,hsl(var(--og-lime)/0.12),transparent_28%)]" />
          <div className="relative flex flex-col gap-3 border-b border-og-grid bg-og-ink/95 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={cn("grid h-12 w-12 shrink-0 place-items-center border font-mono text-[11px] font-black", getAccentTextClass(activeTab.accent), activeTab.accent === "white" ? "border-og-gold/60 bg-og-gold/10" : activeTab.accent === "cyan" ? "border-og-cyan/60 bg-og-cyan/10" : "border-og-lime/60 bg-og-lime/10")}>
                #{String(activeTabNumber).padStart(2, "0")}
              </span>
              <div>
                <div className={cn("font-mono text-[10px] uppercase tracking-[0.34em]", getAccentTextClass(activeTab.accent))}>page starts here</div>
                <h3 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-foreground sm:text-4xl">{activeTab.label}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{activeTab.description}</p>
              </div>
            </div>
            <button
              onClick={promptMint}
              className="inline-flex items-center justify-center gap-2 border border-og-grid bg-background/35 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/70 transition hover:border-og-lime hover:text-og-lime"
            >
              Change scan target
            </button>
          </div>

          <div className="relative p-4 sm:p-5 lg:p-6">
            {tab === "overview" && (
              <div className="grid gap-4">
                <OgStats mint={mint} onSelect={updateMint} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="border border-og-cyan/45 bg-og-ink/78 p-4 shadow-[inset_4px_0_0_hsl(var(--og-cyan)/0.55)]">
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-og-cyan">
                      <Crown className="h-3 w-3" /> WHALES · LIVE
                    </div>
                    <Whales mint={mint} />
                  </div>
                  <div className="border border-og-gold/45 bg-og-ink/78 p-4 shadow-[inset_4px_0_0_hsl(var(--og-gold)/0.45)]">
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-og-gold">
                      <Activity className="h-3 w-3" /> TAPE · LIVE
                    </div>
                    <TxFeed mint={mint} />
                  </div>
                </div>
              </div>
            )}

            {tab === "our-coin" && <OurCoin />}
            {tab === "roadmap" && <SolToolsRoadmap />}
            {tab === "snipe-feed" && <SnipeFeed onSelect={updateMint} />}
            {tab === "scanner" && <Scanner onSelect={updateMint} />}
            {tab === "og-finder" && <OgFinder onSelect={updateMint} />}
            {tab === "pairs" && <PairTracker onSelect={updateMint} />}
            {tab === "migrations" && <Migrations onSelect={updateMint} />}
            {tab === "trending" && <Trending onSelect={updateMint} />}
            {tab === "swap" && <SwapPanel ogMint={mint} onSelectMint={(next) => updateMint(next, "swap")} />}
            {tab === "tech" && <TechStack />}
          </div>

          <div className="relative flex items-center justify-between border-t border-og-grid bg-og-ink/95 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
            <span>page ends here</span>
            <span className={getAccentTextClass(activeTab.accent)}>{activeTab.label}</span>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
