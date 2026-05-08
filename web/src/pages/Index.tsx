import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Coins,
  Compass,
  Copy,
  Crosshair,
  Eye,
  Filter,
  Flame,
  Gauge,
  Layers3,
  Map,
  Pause,
  Radar,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Migrations } from "@/components/Migrations";
import { OgFinder } from "@/components/OgFinder";
import { OgStats } from "@/components/OgStats";
import { OurCoin } from "@/components/OurCoin";
import { PairTracker } from "@/components/PairTracker";
import { Scanner } from "@/components/Scanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SnipeFeed } from "@/components/SnipeFeed";
import { SolToolsRoadmap } from "@/components/SolToolsRoadmap";
import { SwapPanel } from "@/components/SwapPanel";
import { TechStack } from "@/components/TechStack";
import { Trending } from "@/components/Trending";
import { TxFeed } from "@/components/TxFeed";
import { Whales } from "@/components/Whales";
import { cn } from "@/lib/utils";
import { DEFAULT_OG_MINT, STORAGE_OG_MINT, shortAddr } from "@/lib/og";

const LEGACY_DEFAULT_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

type ToolId =
  | "snipe-feed"
  | "scanner"
  | "pairs"
  | "og-finder"
  | "migrations"
  | "trending"
  | "swap"
  | "token"
  | "roadmap"
  | "tech";

type NavId = "home" | ToolId;
type Tone = "blue" | "cyan" | "white" | "gold";

type ToolConfig = {
  id: ToolId;
  label: string;
  shortLabel: string;
  path: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  Icon: ComponentType<{ className?: string }>;
  tone: Tone;
};

type NavItem = {
  id: NavId;
  label: string;
};

export const TOOL_ROUTES: ToolConfig[] = [
  {
    id: "snipe-feed",
    label: "Snipe Feed",
    shortLabel: "Snipe",
    path: "/snipe-feed",
    title: "Live Snipe Feed",
    eyebrow: "new launches",
    subtitle: "A dedicated launch radar page with creator history, risk labels, and fast chart actions.",
    Icon: Target,
    tone: "cyan",
  },
  {
    id: "scanner",
    label: "Scanner",
    shortLabel: "Scanner",
    path: "/scanner",
    title: "Token Scanner",
    eyebrow: "paste ca or ticker",
    subtitle: "Search any Solana token and inspect price, liquidity, holders, history, and market signal.",
    Icon: Search,
    tone: "blue",
  },
  {
    id: "pairs",
    label: "New Pairs",
    shortLabel: "Pairs",
    path: "/pairs",
    title: "New Pair Radar",
    eyebrow: "dex discovery",
    subtitle: "Track fresh pairs as a full workspace instead of burying them in a scrolling dashboard.",
    Icon: Radar,
    tone: "cyan",
  },
  {
    id: "og-finder",
    label: "OG Finder",
    shortLabel: "Finder",
    path: "/og-finder",
    title: "OG Finder",
    eyebrow: "copycat filter",
    subtitle: "Search tickers and separate the real original from low-liquidity clones and copycats.",
    Icon: Crosshair,
    tone: "gold",
  },
  {
    id: "migrations",
    label: "Migrations",
    shortLabel: "Moves",
    path: "/migrations",
    title: "Migration Watch",
    eyebrow: "breakout monitor",
    subtitle: "Find tokens moving from launch chaos into stronger liquidity and cleaner market structure.",
    Icon: Rocket,
    tone: "gold",
  },
  {
    id: "trending",
    label: "Trending",
    shortLabel: "Trending",
    path: "/trending",
    title: "Trending Market",
    eyebrow: "market heat",
    subtitle: "See what is actually moving across Solana right now with a cleaner full-page view.",
    Icon: Flame,
    tone: "cyan",
  },
  {
    id: "swap",
    label: "Swap",
    shortLabel: "Swap",
    path: "/swap",
    title: "Jupiter Swap",
    eyebrow: "route preview",
    subtitle: "Search coins and preview Jupiter routes without the swap widget blending into other tools.",
    Icon: Zap,
    tone: "blue",
  },
  {
    id: "token",
    label: "Token Soon",
    shortLabel: "Token",
    path: "/token",
    title: "No Token Out Yet",
    eyebrow: "official safety room",
    subtitle: "A clear launch notice page so nobody mistakes fake contracts or fake charts for OGScan.",
    Icon: Coins,
    tone: "gold",
  },
  {
    id: "roadmap",
    label: "Roadmap",
    shortLabel: "Roadmap",
    path: "/roadmap",
    title: "SolTools Roadmap",
    eyebrow: "ecosystem plan",
    subtitle: "The path from OGScan tools into the broader SolTools crypto community platform.",
    Icon: Map,
    tone: "white",
  },
  {
    id: "tech",
    label: "Tech Stack",
    shortLabel: "Tech",
    path: "/tech",
    title: "How It Works",
    eyebrow: "data pipeline",
    subtitle: "A technical page for the infrastructure behind OG detection, routing, and live signals.",
    Icon: Layers3,
    tone: "white",
  },
];

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Tokens" },
  ...TOOL_ROUTES.map((tool) => ({ id: tool.id, label: tool.shortLabel })),
];

const normalizePath = (pathname: string): string => pathname.replace(/\/+$/, "") || "/";

const findToolById = (id: ToolId): ToolConfig => TOOL_ROUTES.find((tool) => tool.id === id) ?? TOOL_ROUTES[0];

const getToneFrameClass = (tone: Tone): string => {
  if (tone === "gold") return "border-og-gold/25 bg-og-gold/10 text-og-gold shadow-[0_0_36px_-22px_hsl(var(--og-gold))]";
  if (tone === "white") return "border-white/12 bg-white/[0.045] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
  return "border-og-lime/25 bg-og-lime/10 text-og-lime shadow-[0_0_36px_-22px_hsl(var(--og-lime))]";
};

const getToneGlowClass = (tone: Tone): string => {
  if (tone === "gold") return "from-og-gold/16 via-og-lime/6 to-transparent";
  if (tone === "white") return "from-white/10 via-og-cyan/5 to-transparent";
  return "from-og-lime/18 via-og-cyan/8 to-transparent";
};

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mint, setMint] = useState<string>(DEFAULT_OG_MINT);
  const [headerQuery, setHeaderQuery] = useState<string>("");
  const [scannerQuery, setScannerQuery] = useState<string>("");

  useEffect(() => {
    try {
      const savedMint: string | null = localStorage.getItem(STORAGE_OG_MINT);
      if (savedMint && savedMint !== LEGACY_DEFAULT_MINT) {
        setMint(savedMint);
      } else {
        localStorage.setItem(STORAGE_OG_MINT, DEFAULT_OG_MINT);
      }
    } catch {
      /* localStorage can be unavailable in restricted browser contexts */
    }
  }, []);

  const currentPath: string = normalizePath(location.pathname);
  const activeTool: ToolConfig | null = useMemo<ToolConfig | null>(
    () => TOOL_ROUTES.find((tool) => tool.path === currentPath) ?? null,
    [currentPath],
  );
  const activeNavId: NavId = activeTool?.id ?? "home";

  const navigateTo = useCallback(
    (nextId: NavId): void => {
      if (nextId === "home") {
        navigate("/");
        return;
      }
      navigate(findToolById(nextId).path);
    },
    [navigate],
  );

  const updateMint = useCallback(
    (nextMint: string, nextTool: ToolId = "scanner"): void => {
      setMint(nextMint);
      setHeaderQuery(nextMint);
      setScannerQuery(nextMint);
      try {
        localStorage.setItem(STORAGE_OG_MINT, nextMint);
      } catch {
        /* noop */
      }
      navigate(findToolById(nextTool).path);
    },
    [navigate],
  );

  const runHeaderSearch = useCallback(
    (query?: string): void => {
      const cleanQuery: string = (query ?? headerQuery).trim();
      if (cleanQuery.length < 2) return;

      setHeaderQuery(cleanQuery);
      setScannerQuery(cleanQuery);

      const looksLikeMint: boolean = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanQuery);
      if (looksLikeMint) {
        setMint(cleanQuery);
        try {
          localStorage.setItem(STORAGE_OG_MINT, cleanQuery);
        } catch {
          /* noop */
        }
      }

      navigate(findToolById("scanner").path);
    },
    [headerQuery, navigate],
  );

  const promptMint = useCallback((): void => {
    const nextMint: string | null = window.prompt("Paste any Solana mint address to inspect:", mint);
    if (nextMint && nextMint.trim().length > 20) updateMint(nextMint.trim(), "scanner");
  }, [mint, updateMint]);

  const copyMint = useCallback((): void => {
    void navigator.clipboard?.writeText(mint);
  }, [mint]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020706] text-foreground">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_76%_0%,rgba(0,224,199,0.12),transparent_31%),radial-gradient(circle_at_18%_18%,rgba(4,144,125,0.16),transparent_34%),linear-gradient(180deg,#020706_0%,#03100e_48%,#010504_100%)]" />
      <div className="fixed inset-0 grid-bg opacity-20" />
      <div className="fixed inset-0 noise opacity-70" />

      <SiteHeader
        navItems={NAV_ITEMS}
        activeId={activeNavId}
        mint={mint}
        query={headerQuery}
        onQueryChange={setHeaderQuery}
        onRunSearch={runHeaderSearch}
        onCopyMint={copyMint}
        onNavigate={(id: string) => navigateTo(id as NavId)}
      />

      <div className="relative lg:pl-[274px]">
        <main>
          {activeTool ? (
            <ToolPage
              activeTool={activeTool}
              mint={mint}
              scannerQuery={scannerQuery}
              onSelectMint={updateMint}
              onPromptMint={promptMint}
              onOpenScanner={() => navigateTo("scanner")}
            />
          ) : (
            <HomePage mint={mint} onSelectMint={updateMint} onNavigate={navigateTo} onOpenScanner={() => navigateTo("scanner")} />
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

const HomePage = ({
  mint,
  onSelectMint,
  onNavigate,
  onOpenScanner,
}: {
  mint: string;
  onSelectMint: (nextMint: string, nextTool?: ToolId) => void;
  onNavigate: (nextId: NavId) => void;
  onOpenScanner: () => void;
}) => {
  const featuredTools: ToolConfig[] = useMemo<ToolConfig[]>(() => TOOL_ROUTES, []);

  return (
    <section className="mx-auto min-h-screen max-w-[1180px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      <WorkspaceHeader title="Token Monitor" subtitle="Real-time Solana token tracking & analysis" mint={mint} onPromptMint={onOpenScanner} />
      <MetricStrip />
      <SearchToolbar onOpenScanner={onOpenScanner} />
      <ModeTabs activeLabel="Trending" />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="monitor-panel">
          <div className="monitor-panel-header">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-[13px] border border-og-lime/20 bg-og-lime/10 text-og-lime">
                <Coins className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-white">Live Tool Feed</h2>
                  <span className="rounded-full border border-og-lime/25 bg-og-lime/10 px-2.5 py-1 font-mono text-[10px] font-bold text-og-lime">{featuredTools.length} tools</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Each row opens one full-page SolTools workspace.</p>
              </div>
            </div>
          </div>
          <ToolDirectoryFeed tools={featuredTools} onNavigate={onNavigate} />
        </div>

        <aside className="space-y-5">
          <OfficialTokenNotice onNavigate={onNavigate} />
          <section className="monitor-panel p-4">
            <MiniHeader icon={Activity} title="Market Pulse" action="Live" />
            <div className="mt-4 overflow-hidden rounded-[16px] border border-og-grid/70 bg-black/20 p-3">
              <OgStats mint={mint} onSelect={(nextMint: string) => onSelectMint(nextMint, "scanner")} />
            </div>
          </section>
          <MiniPanel title="Whales" icon={Wallet} tone="cyan">
            <Whales mint={mint} />
          </MiniPanel>
          <MiniPanel title="Live Tape" icon={BarChart3} tone="gold">
            <TxFeed mint={mint} compact />
          </MiniPanel>
        </aside>
      </div>
    </section>
  );
};

const ToolPage = ({
  activeTool,
  mint,
  scannerQuery,
  onSelectMint,
  onPromptMint,
  onOpenScanner,
}: {
  activeTool: ToolConfig;
  mint: string;
  scannerQuery: string;
  onSelectMint: (nextMint: string, nextTool?: ToolId) => void;
  onPromptMint: () => void;
  onOpenScanner: () => void;
}) => {
  return (
    <section className="mx-auto min-h-screen max-w-[1180px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      <WorkspaceHeader title={activeTool.title} subtitle={activeTool.subtitle} mint={mint} icon={activeTool.Icon} tone={activeTool.tone} onPromptMint={onPromptMint} />
      <MetricStrip />
      <SearchToolbar onOpenScanner={onOpenScanner} />
      <ModeTabs activeLabel={activeTool.shortLabel} />

      <div className="relative mt-5 overflow-hidden rounded-[18px] border border-og-grid/80 bg-[#07110f]/92 shadow-[0_0_0_1px_rgba(0,224,199,0.06),0_34px_120px_-92px_hsl(var(--og-lime))]">
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b opacity-80", getToneGlowClass(activeTool.tone))} />
        <div className="relative min-w-0 p-3 sm:p-5">{renderTool(activeTool.id, mint, scannerQuery, onSelectMint, onPromptMint)}</div>
      </div>
    </section>
  );
};

function renderTool(
  id: ToolId,
  mint: string,
  scannerQuery: string,
  onSelectMint: (nextMint: string, nextTool?: ToolId) => void,
  onPromptMint: () => void,
): ReactNode {
  switch (id) {
    case "snipe-feed":
      return <SnipeFeed onSelect={(nextMint: string) => onSelectMint(nextMint, "scanner")} />;
    case "scanner":
      return <Scanner onSelect={(nextMint: string) => onSelectMint(nextMint, "scanner")} initialQuery={scannerQuery} />;
    case "pairs":
      return <PairTracker onSelect={(nextMint: string) => onSelectMint(nextMint, "scanner")} />;
    case "og-finder":
      return <OgFinder onSelect={(nextMint: string) => onSelectMint(nextMint, "scanner")} />;
    case "migrations":
      return <Migrations onSelect={(nextMint: string) => onSelectMint(nextMint, "scanner")} />;
    case "trending":
      return <Trending onSelect={(nextMint: string) => onSelectMint(nextMint, "scanner")} />;
    case "swap":
      return <SwapPanel ogMint={mint} onSelectMint={(nextMint: string) => onSelectMint(nextMint, "swap")} />;
    case "token":
      return <OurCoin />;
    case "roadmap":
      return <SolToolsRoadmap />;
    case "tech":
      return <TechStack />;
    default:
      return null;
  }
}

const WorkspaceHeader = ({
  title,
  subtitle,
  mint,
  icon: Icon,
  tone = "cyan",
  onPromptMint,
}: {
  title: string;
  subtitle: string;
  mint: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  onPromptMint: () => void;
}) => (
  <header className="flex flex-col gap-4 border-b border-og-grid/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      {Icon ? (
        <span className={cn("mt-0.5 hidden h-12 w-12 shrink-0 place-items-center rounded-[16px] border sm:grid", getToneFrameClass(tone))}>
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <div className="min-w-0">
        <h1 className="text-[32px] font-black leading-none tracking-[-0.055em] text-white sm:text-[36px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
    </div>

    <div className="flex items-center gap-2 sm:justify-end">
      <button
        onClick={onPromptMint}
        className="hidden items-center gap-2 rounded-[12px] border border-og-lime/18 bg-og-lime/9 px-3 py-2 font-mono text-xs font-bold text-og-lime shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-og-lime/50 sm:inline-flex"
      >
        <Sparkles className="h-4 w-4" /> $6.4K
        <span className="h-1.5 w-20 rounded-full bg-og-lime/20">
          <span className="block h-full w-4/5 rounded-full bg-og-lime shadow-[0_0_16px_hsl(var(--og-lime)/0.6)]" />
        </span>
      </button>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-og-lime/20 bg-og-lime/12 px-3 py-2 font-mono text-[11px] font-bold text-og-lime">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-og-lime opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-og-lime" />
        </span>
        Live
      </span>
      <button
        onClick={() => void navigator.clipboard?.writeText(mint)}
        className="inline-flex items-center gap-1.5 rounded-[12px] border border-og-grid bg-white/[0.035] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition hover:border-og-lime/50 hover:text-og-lime"
      >
        <Copy className="h-3.5 w-3.5" /> {shortAddr(mint, 4)}
      </button>
    </div>
  </header>
);

const MetricStrip = () => {
  const metrics: { label: string; value: string; Icon: ComponentType<{ className?: string }>; tone: Tone; muted?: boolean }[] = [
    { label: "Watching", value: "3", Icon: Eye, tone: "cyan" },
    { label: "Favorites", value: "0", Icon: Star, tone: "gold" },
    { label: "Gainers", value: "8", Icon: TrendingUp, tone: "cyan" },
    { label: "Trending", value: "15", Icon: BarChart3, tone: "white", muted: true },
  ];

  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-[15px] border border-og-grid/85 bg-[#07110f]/82 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
          <div className="flex items-center gap-4">
            <span className={cn("grid h-12 w-12 place-items-center rounded-[15px] border", metric.muted ? "border-white/5 bg-white/[0.025] text-white/18" : getToneFrameClass(metric.tone))}>
              <metric.Icon className="h-6 w-6" />
            </span>
            <div>
              <div className="text-[31px] font-black leading-none tracking-[-0.06em] text-white">{metric.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{metric.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SearchToolbar = ({ onOpenScanner }: { onOpenScanner: () => void }) => (
  <div className="mt-5 rounded-[16px] border border-og-grid/80 bg-[#07110f]/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <button
        onClick={onOpenScanner}
        className="flex min-h-12 flex-1 items-center gap-3 rounded-[13px] border border-og-grid bg-black/16 px-4 text-left transition hover:border-og-lime/40"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-og-lime/10 text-og-lime">
          <Search className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">Search or paste token address...</span>
      </button>
      <div className="flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-[12px] border border-og-grid bg-black/18 px-4 py-3 text-sm font-bold text-white/82 transition hover:border-og-lime/35">
          <Filter className="h-4 w-4" /> All Tokens <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground" />
        </button>
        <button className="inline-flex items-center gap-2 rounded-[12px] border border-og-grid bg-black/18 px-4 py-3 text-sm font-bold text-white/82 transition hover:border-og-lime/35">
          Market Cap <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground" />
        </button>
        <button className="inline-flex items-center gap-2 rounded-[12px] bg-og-lime px-4 py-3 text-sm font-black text-[#02100e] shadow-[0_0_26px_-10px_hsl(var(--og-lime))] transition active:scale-95">
          <Pause className="h-4 w-4" /> Pause
        </button>
        <button className="grid h-12 w-12 place-items-center rounded-[12px] border border-og-grid bg-black/28 text-muted-foreground transition hover:border-og-lime/40 hover:text-og-lime">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

const ModeTabs = ({ activeLabel }: { activeLabel: string }) => (
  <div className="mt-5 grid max-w-[450px] grid-cols-2 overflow-hidden rounded-[9px] border border-og-grid/70 bg-black/18 p-1">
    <button className="rounded-[7px] bg-black/55 px-4 py-2.5 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <TrendingUp className="mr-2 inline h-4 w-4 text-white/85" /> {activeLabel}
    </button>
    <button className="rounded-[7px] px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:text-og-lime">
      <Star className="mr-2 inline h-4 w-4" /> Watchlist (3)
    </button>
  </div>
);

const ToolDirectoryFeed = ({ tools, onNavigate }: { tools: ToolConfig[]; onNavigate: (nextId: NavId) => void }) => (
  <div>
    {tools.map((tool, index) => (
      <button key={tool.id} onClick={() => onNavigate(tool.id)} className="token-feed-row group md:grid md:grid-cols-12 md:items-center md:gap-3">
        <div className="flex min-w-0 items-center gap-3 md:col-span-6">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border", getToneFrameClass(tool.tone))}>
            <tool.Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-black tracking-[-0.03em] text-white">{tool.label}</span>
              <span className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-0.5 font-mono text-[10px] font-bold text-white/75">{tool.shortLabel}</span>
            </span>
            <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
              {String(index + 1).padStart(2, "0")} · {tool.eyebrow} · page
            </span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-right md:col-span-6 md:mt-0 md:grid-cols-4 md:items-center">
          <span className="token-stat-pill">
            <span className="block text-sm font-black text-white">{index % 2 === 0 ? "$108.0K" : "$26.3K"}</span>
            <span>MCap</span>
          </span>
          <span className="token-stat-pill">
            <span className="block text-sm font-black text-white">{index % 3 === 0 ? "$25.6K" : "$8.6K"}</span>
            <span>Liq</span>
          </span>
          <span className="token-stat-pill">
            <span className="block text-sm font-black text-og-lime">+{index % 2 === 0 ? "204" : "82"}%</span>
            <span>Signal</span>
          </span>
          <span className="hidden items-center justify-end gap-4 text-white/80 md:flex">
            <span className="text-xl leading-none text-white/70 transition group-hover:text-og-lime">+</span>
            <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1 group-hover:text-og-lime" />
          </span>
        </div>
      </button>
    ))}
  </div>
);

const OfficialTokenNotice = ({ onNavigate }: { onNavigate: (nextId: NavId) => void }) => (
  <button
    onClick={() => onNavigate("token")}
    className="group relative w-full overflow-hidden rounded-[16px] border border-og-gold/25 bg-og-gold/[0.07] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-og-gold/50"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--og-gold)/0.18),transparent_36%)]" />
    <div className="relative flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-og-gold text-[#06100d]">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-black tracking-[-0.04em] text-og-gold">No token out yet</span>
        <span className="mt-1 block text-xs text-muted-foreground">Coming soon · ignore fake contracts</span>
      </span>
      <ChevronRight className="h-5 w-5 text-og-gold/70 transition group-hover:translate-x-1" />
    </div>
  </button>
);

const MiniPanel = ({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  children: ReactNode;
}) => (
  <section className="monitor-panel p-4">
    <MiniHeader icon={Icon} title={title} action={tone === "gold" ? "Tape" : "Watch"} />
    <div className="mt-4 overflow-hidden rounded-[16px] border border-og-grid/70 bg-black/20 p-3">{children}</div>
  </section>
);

const MiniHeader = ({ icon: Icon, title, action }: { icon: ComponentType<{ className?: string }>; title: string; action: string }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 text-xl font-black tracking-[-0.04em] text-white">
      <Icon className="h-5 w-5 text-og-lime" /> {title}
    </div>
    <span className="rounded-full border border-og-grid bg-black/24 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{action}</span>
  </div>
);

export default Index;
