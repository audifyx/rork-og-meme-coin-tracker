import {
  Activity,
  AtSign,
  BarChart3,
  Bell,
  Coins,
  Compass,
  Copy,
  Crosshair,
  ExternalLink,
  Flame,
  Globe2,
  Headphones,
  Layers3,
  Map,
  MessageSquare,
  Newspaper,
  Radio,
  Radar,
  Rocket,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  Wallet,
  Webhook,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OGSCAN_SITE_URL, OGSCAN_TECH_POST_URL, OGSCAN_X_URL, shortAddr } from "@/lib/og";

type NavItem = { id: string; label: string };

type Props = {
  navItems: NavItem[];
  activeId: string;
  mint: string;
  query: string;
  onQueryChange: (nextQuery: string) => void;
  onRunSearch: (query?: string) => void;
  onCopyMint: () => void;
  onNavigate: (id: string) => void;
};

const NAV_ICONS: Record<string, LucideIcon> = {
  home: Coins,
  "snipe-feed": Target,
  scanner: Search,
  pairs: Radar,
  "og-finder": Crosshair,
  migrations: Rocket,
  trending: Flame,
  swap: Zap,
  token: Coins,
  roadmap: Map,
  tech: Layers3,
};

const SUBTITLES: Record<string, string> = {
  home: "Monitor coins",
  "snipe-feed": "Live launches",
  scanner: "Search coins",
  pairs: "Live charts",
  "og-finder": "Analysis suite",
  migrations: "3D+ pro tools",
  trending: "Hot coins",
  swap: "Coming soon",
  token: "SSOLTOOLS",
  roadmap: "Ecosystem plan",
  tech: "Data stack",
};

const SIDE_EXTRA: { id: string; label: string; subtitle: string; Icon: LucideIcon; disabled?: boolean }[] = [
  { id: "wallets", label: "Wallets", subtitle: "Track wallets", Icon: Wallet, disabled: true },
  { id: "charts", label: "Charts", subtitle: "Live charts", Icon: BarChart3, disabled: true },
  { id: "lobbies", label: "Trading Lobbies", subtitle: "Voice + charts", Icon: Headphones, disabled: true },
  { id: "communities", label: "Communities", subtitle: "Social hub", Icon: Users, disabled: true },
  { id: "launchpad", label: "Launch Pad", subtitle: "Token listings", Icon: Rocket, disabled: true },
  { id: "trading", label: "Live Trading", subtitle: "Coming soon", Icon: SlidersHorizontal, disabled: true },
];

const COMMUNITY_LINKS: { label: string; Icon: LucideIcon }[] = [
  { label: "Alpha Chat", Icon: MessageSquare },
  { label: "Live Feed", Icon: Radio },
  { label: "Discover", Icon: Users },
  { label: "Callouts", Icon: Bell },
  { label: "Support", Icon: Headphones },
  { label: "Credits", Icon: Coins },
  { label: "Settings", Icon: Settings },
  { label: "Webhooks", Icon: Webhook },
];

export const SiteHeader = ({
  navItems,
  activeId,
  mint,
  query,
  onQueryChange,
  onRunSearch,
  onCopyMint,
  onNavigate,
}: Props) => {
  const primaryNav: NavItem[] = navItems.filter((item) => item.id !== "roadmap" && item.id !== "tech");
  const projectNav: NavItem[] = navItems.filter((item) => item.id === "roadmap" || item.id === "tech");

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[274px] border-r border-og-lime/18 bg-[#03100e]/96 shadow-[28px_0_80px_-72px_hsl(var(--og-lime))] backdrop-blur-2xl lg:flex lg:flex-col">
        <div className="border-b border-og-grid/50 px-5 py-4">
          <button onClick={() => onNavigate("home")} className="flex w-full items-center gap-3 text-left" aria-label="Open SolTools home">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-og-lime text-[#04100e] shadow-[0_0_28px_-10px_hsl(var(--og-lime))]">
              <img src="/icon.png" alt="SolTools icon" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] font-black uppercase tracking-[0.04em] text-og-gold">SOL TOOLS</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground">PRO TRADING SUITE</span>
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-7 ios-scroll">
          <NavGroup title="MAIN" items={primaryNav} activeId={activeId} onNavigate={onNavigate} />
          <ExtraNav items={SIDE_EXTRA} />
          {projectNav.length > 0 ? <NavGroup title="PROJECT" items={projectNav} activeId={activeId} onNavigate={onNavigate} compact /> : null}

          <div className="mt-7 px-2 font-mono text-[10px] font-black uppercase tracking-[0.34em] text-muted-foreground/55">COMMUNITY</div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {COMMUNITY_LINKS.map((item) => (
              <button key={item.label} className="rounded-[12px] border border-og-grid/45 bg-white/[0.018] px-3 py-3 text-center text-muted-foreground/70 transition hover:border-og-lime/30 hover:bg-og-lime/5 hover:text-og-lime">
                <item.Icon className="mx-auto mb-2 h-4 w-4" />
                <span className="block text-[10px] font-semibold">{item.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate("token")}
            className="group mt-5 flex w-full items-center gap-3 rounded-[13px] border border-og-lime/14 bg-og-lime/[0.065] p-3 text-left transition hover:border-og-lime/40"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-og-lime text-[#04100e]">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black uppercase tracking-[-0.02em] text-og-gold">PRO FEATURES</span>
              <span className="mt-0.5 block text-[9px] text-muted-foreground">AI, Alerts, P&L</span>
            </span>
            <Wrench className="h-4 w-4 text-og-lime/60" />
          </button>

          <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-transparent px-3 py-2 text-muted-foreground/65">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-semibold">Admin Panel</span>
          </div>

          <div className="mt-5 flex gap-3 px-2 text-[10px] text-muted-foreground/42">
            <span>Privacy</span>
            <span>·</span>
            <span>Terms</span>
          </div>
        </div>

        <div className="border-t border-og-grid/50 p-4">
          <button
            onClick={onCopyMint}
            className="flex w-full items-center gap-3 rounded-[12px] border border-og-lime/18 bg-og-lime/8 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-og-lime/40"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-og-lime/12 text-og-lime">
              <Copy className="h-4 w-4" />
            </span>
            <span className="font-mono text-sm font-black text-og-lime">$6.4K</span>
            <span className="h-1.5 flex-1 rounded-full bg-og-lime/18">
              <span className="block h-full w-4/5 rounded-full bg-og-lime shadow-[0_0_12px_hsl(var(--og-lime)/0.65)]" />
            </span>
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-og-grid/70 bg-[#03100e]/96 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => onNavigate("home")} className="grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] bg-og-lime" aria-label="Open SolTools home">
            <img src="/icon.png" alt="SolTools icon" className="h-full w-full object-cover" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black uppercase tracking-[0.08em] text-og-gold">SOL TOOLS</div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">Pro trading suite</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-og-lime/25 bg-og-lime/10 px-2.5 py-1 font-mono text-[10px] font-bold text-og-lime">
            <Activity className="h-3 w-3" /> Live
          </span>
        </div>

        <div className="px-4 pb-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onRunSearch();
            }}
            className="flex items-center gap-2 rounded-[13px] border border-og-grid bg-black/25 px-3 py-2.5 focus-within:border-og-lime/50"
          >
            <Search className="h-4 w-4 shrink-0 text-og-lime" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search or paste token address..."
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="rounded-[11px] bg-og-lime px-3 py-1.5 text-[10px] font-black text-[#04100e]">
              Scan
            </button>
          </form>
        </div>

        <nav className="flex gap-2 overflow-x-auto border-t border-og-grid/60 px-4 py-2 ios-scroll" aria-label="Mobile tool page navigation">
          {navItems.map((item) => {
            const Icon = NAV_ICONS[item.id] ?? Wrench;
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-[12px] border px-3 py-2 text-[11px] font-black transition",
                  active
                    ? "border-og-lime/30 bg-og-lime/12 text-og-lime"
                    : "border-og-grid bg-white/[0.025] text-muted-foreground hover:text-og-lime",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>
    </>
  );
};

const NavGroup = ({
  title,
  items,
  activeId,
  onNavigate,
  compact = false,
}: {
  title: string;
  items: NavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  compact?: boolean;
}) => (
  <div className={cn("mb-6", compact && "mb-4")}>
    <div className="mb-3 px-3 font-mono text-[10px] font-black uppercase tracking-[0.34em] text-og-lime/62">{title}</div>
    <div className="space-y-1.5">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.id] ?? Wrench;
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-[13px] border px-3 py-3 text-left transition",
              active
                ? "border-og-lime/18 bg-og-lime/[0.07] text-og-lime shadow-[inset_3px_0_0_hsl(var(--og-lime))]"
                : "border-transparent text-muted-foreground/70 hover:border-og-grid/70 hover:bg-white/[0.025] hover:text-white/90",
            )}
          >
            <span className={cn("grid h-8 w-8 place-items-center rounded-[11px]", active ? "bg-og-lime/12 text-og-lime" : "text-muted-foreground/70 group-hover:text-og-lime")}> 
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-sm font-black tracking-[-0.03em]", active ? "text-og-lime" : "text-white/70")}>{item.label}</span>
              <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/60">{SUBTITLES[item.id] ?? "Tool page"}</span>
            </span>
            {active ? <ChevronHint /> : null}
          </button>
        );
      })}
    </div>
  </div>
);

const ExtraNav = ({ items }: { items: { id: string; label: string; subtitle: string; Icon: LucideIcon; disabled?: boolean }[] }) => (
  <div className="mb-6 space-y-1.5">
    {items.map((item) => (
      <button key={item.id} disabled={item.disabled} className="group flex w-full items-center gap-3 rounded-[13px] border border-transparent px-3 py-3 text-left text-muted-foreground/48 transition hover:border-og-grid/60 hover:bg-white/[0.02] hover:text-white/80 disabled:cursor-default">
        <span className="grid h-8 w-8 place-items-center rounded-[11px] text-muted-foreground/58 group-hover:text-og-lime">
          <item.Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black tracking-[-0.03em] text-white/52">{item.label}</span>
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/45">{item.subtitle}</span>
        </span>
      </button>
    ))}
  </div>
);

const ChevronHint = () => <ExternalLink className="h-3.5 w-3.5 text-og-lime/65" />;
