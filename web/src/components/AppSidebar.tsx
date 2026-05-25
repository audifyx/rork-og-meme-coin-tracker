import { ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity, Bell, Bot, Coins, Compass, Crown, Home, LineChart, LogOut,
  MessageSquare, Rocket, Search, Settings, Sparkles, Target, Trophy,
  TrendingUp, User, Users, Wallet, Wrench, X, Zap,
  Globe2, Radio, Shield, Palette, Menu, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/hooks/useAdmin";

export type ExternalNavItem = {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  eyebrow: string;
};

const ExternalNavLink = ({ item, currentPath, onClose }: { item: ExternalNavItem; currentPath: string; onClose: () => void }) => {
  const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
  return (
    <Link
      to={item.to}
      onClick={onClose}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
        isActive ? "bg-white/[0.09] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white/90",
      )}
    >
      <span className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition",
        isActive ? "border-og-lime/40 bg-og-lime/10 text-og-lime" : "border-white/10 bg-white/[0.04]",
      )}>
        <item.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight">{item.label}</span>
        <span className="block truncate text-[10px] text-white/35">{item.eyebrow}</span>
      </span>
      {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-og-lime" />}
    </Link>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p>
);

export const AppSidebar = ({
  activeId,
  mint,
  open,
  onClose,
  onChangeMint,
  onNavigate,
}: {
  activeId: string;
  mint: string;
  open: boolean;
  onClose: () => void;
  onChangeMint: () => void;
  onNavigate: (t: string) => void;
}) => {
  const location = useLocation();
  const { isAdmin } = useAdmin();

  const ogScanItems: ExternalNavItem[] = [
    { to: "/app",          icon: Home,          label: "Dashboard",       eyebrow: "OGScan home" },
    { to: "/scanner",      icon: Search,        label: "Truth Scan",      eyebrow: "Mint forensics" },
    { to: "/snipe-feed",   icon: Target,        label: "Launch Radar",    eyebrow: "New launches" },
    { to: "/feed",         icon: Activity,      label: "Market Feed",     eyebrow: "Live market" },
    { to: "/swap",         icon: Zap,           label: "Swap",            eyebrow: "Jupiter route" },
    { to: "/communities",  icon: Globe2,        label: "Communities",     eyebrow: "Social hub" },
    { to: "/discover",     icon: Compass,       label: "Discover",        eyebrow: "Top traders" },
    { to: "/art",          icon: Palette,       label: "Memes",           eyebrow: "Art & vibes" },
    { to: "/spaces",       icon: Mic,           label: "Spaces",          eyebrow: "Live audio rooms" },
  ];

  const solToolsItems: ExternalNavItem[] = [
    { to: "/wallets",         icon: Wallet,        label: "Wallets",         eyebrow: "Tracked wallets" },
    { to: "/tokens",          icon: Coins,         label: "Tokens",          eyebrow: "Token tracker" },
    { to: "/charts",          icon: LineChart,      label: "Charts",          eyebrow: "Live charts" },
    { to: "/live-feed-page",  icon: Radio,          label: "Live Feed",       eyebrow: "Tape stream" },
    { to: "/alpha-chat",      icon: Bot,            label: "Alpha Chat",      eyebrow: "AI assistant" },
    { to: "/live-trading",    icon: TrendingUp,     label: "Live Trading",    eyebrow: "P&L · Signals" },
    { to: "/callouts",        icon: Bell,           label: "Callouts",        eyebrow: "Trade alerts" },
    { to: "/trading-lobbies", icon: MessageSquare,  label: "Trading Lobbies", eyebrow: "Voice + charts" },
    { to: "/leaderboard",     icon: Trophy,         label: "Leaderboard",     eyebrow: "Top traders" },
    { to: "/pumpv5",          icon: Rocket,         label: "Launch Pad",      eyebrow: "Token listings" },
    { to: "/notifications",   icon: Bell,           label: "Notifications",   eyebrow: "Your alerts" },
  ];

  const accountItems: ExternalNavItem[] = [
    { to: "/profile",   icon: User,     label: "Profile",   eyebrow: "Your account" },
    { to: "/settings",  icon: Settings, label: "Settings",  eyebrow: "Preferences" },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-card/80 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
        <button type="button" onClick={() => onNavigate("overview")} className="flex items-center gap-3 text-left">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-og-lime/50 bg-og-lime/10">
            <img src="/icon.png" alt="OGScan" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-og-lime shadow-[0_0_6px_#bef264]" />
          </div>
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-white">OGScan</div>
            <div className="text-[10px] font-semibold tracking-widest text-[#22d3ee]/80">PRO TRADING SUITE</div>
          </div>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" style={{ scrollbarWidth: "none" }}>
        {/* OGScan */}
        <div className="mb-1">
          <SectionLabel label="OGScan" />
          <div className="space-y-0.5">
            {ogScanItems.map((item) => (
              <ExternalNavLink key={item.to} item={item} currentPath={location.pathname} onClose={onClose} />
            ))}
          </div>
        </div>

        {/* SolTools Features */}
        <div className="mb-1 mt-5">
          <SectionLabel label="SolTools Features" />
          <div className="space-y-0.5">
            {solToolsItems.map((item) => (
              <ExternalNavLink key={item.to} item={item} currentPath={location.pathname} onClose={onClose} />
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="mb-1 mt-5">
          <SectionLabel label="Account" />
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <ExternalNavLink key={item.to} item={item} currentPath={location.pathname} onClose={onClose} />
            ))}
          </div>
        </div>

        {/* Admin */}
        {isAdmin && (
          <div className="mt-2 px-1">
            <Link
              to="/admin"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                location.pathname === "/admin"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Shield className="h-4 w-4" />
              <span className="text-[12px] font-semibold">Admin Panel</span>
            </Link>
          </div>
        )}

        {/* Legal */}
        <div className="mt-4 flex gap-3 px-3 pb-2">
          <Link to="/privacy" className="text-[9px] text-white/25 hover:text-white/50">Privacy</Link>
          <span className="text-[9px] text-white/15">·</span>
          <Link to="/terms" className="text-[9px] text-white/25 hover:text-white/50">Terms</Link>
        </div>
      </nav>
    </aside>
  );
};
