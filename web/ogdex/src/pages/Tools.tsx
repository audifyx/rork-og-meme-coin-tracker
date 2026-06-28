import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Shield, Wallet2, Users, Droplets, Bell, FileText, Sparkles,
  Flame, Trophy, Rocket, ShoppingBag, Copy, Code, ArrowRight, Crosshair,
} from "lucide-react";

const isAddr = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v.trim());

type Tool = { to: string; label: string; desc: string; Icon: typeof Search; tag: string };

// OG Scan — the core scanner + analytics tools (the crypto suite, grouped here)
const SCANNER_TOOLS: Tool[] = [
  { to: "/",            label: "Token Screener", desc: "Scan and filter tokens across the market with live risk + liquidity data.", Icon: Search,    tag: "OG Scan" },
  { to: "/new",         label: "Newly Listed",   desc: "Catch fresh launches the moment they hit the chain.",                      Icon: Sparkles,  tag: "OG Scan" },
  { to: "/pulse",       label: "Market Pulse",   desc: "Trending pairs, momentum and market activity in real time.",              Icon: Flame,     tag: "OG Scan" },
  { to: "/wallet",      label: "Wallet Profiler",desc: "Deep-dive any wallet: holdings, PnL, win-rate and timing.",               Icon: Wallet2,   tag: "Analytics" },
  { to: "/kol",         label: "KOL Scanner",    desc: "Track influential wallets and their on-chain moves.",                     Icon: Users,     tag: "Analytics" },
  { to: "/copy-trade",  label: "Copy Tracking",  desc: "Mirror and monitor top traders' activity.",                              Icon: Copy,      tag: "Analytics" },
];

const UTILITY_TOOLS: Tool[] = [
  { to: "/alerts",      label: "Smart Alerts",   desc: "Real-time alerts for launches, price targets and whale moves.",          Icon: Bell,      tag: "Tools" },
  { to: "/metadata",    label: "Metadata",       desc: "Pull and edit token metadata, logos and listings.",                      Icon: FileText,  tag: "Tools" },
  { to: "/leaderboard", label: "Leaderboard",    desc: "Top performers, tokens and traders ranked.",                             Icon: Trophy,    tag: "Tools" },
  { to: "/launch",      label: "Launch a Token", desc: "Create and list a token through OG DEX.",                                 Icon: Rocket,    tag: "Tools" },
  { to: "/store",       label: "List & Boost",   desc: "Promote your project with listings and boosts.",                         Icon: ShoppingBag,tag:"Tools" },
  { to: "/api",         label: "API & Docs",     desc: "Build on OG Scan data with our developer API.",                          Icon: Code,      tag: "Tools" },
];

function ToolCard({ t }: { t: Tool }) {
  return (
    <Link
      to={t.to}
      className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-panel2/60 p-5 transition hover:border-accent/50 hover:bg-panel2"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
          <t.Icon className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/70">{t.tag}</span>
      </div>
      <div>
        <h3 className="font-display text-[15px] font-bold text-white">{t.label}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{t.desc}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-[12px] font-bold text-accent opacity-0 transition group-hover:opacity-100">
        Open <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

export default function Tools() {
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const scan = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    if (isAddr(v)) nav(`/token/${v}`);
    else nav(`/?q=${encodeURIComponent(v)}`);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-6">
      {/* Hero scanner */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-glass p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-accent" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">OG Scan</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            Scan anything on-chain.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Paste a contract address or search a token to run an instant OG Scan, holders, liquidity, risk flags and forensics across the market.
          </p>
          <form onSubmit={scan} className="mt-5 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-bg/70 p-2 focus-within:border-accent/60">
            <Search className="ml-2 h-4 w-4 shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Paste a contract address or search…"
              className="flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-muted/60"
            />
            <button type="submit" className="rounded-xl bg-accent px-5 py-2 text-sm font-bold text-black transition hover:brightness-110">
              Scan
            </button>
          </form>
        </div>
      </section>

      {/* Scanner & analytics */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <h2 className="font-display text-lg font-bold text-white">Scanner & Analytics</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCANNER_TOOLS.map((t) => <ToolCard key={t.to + t.label} t={t} />)}
        </div>
      </section>

      {/* Utility tools */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Droplets className="h-4 w-4 text-accent" />
          <h2 className="font-display text-lg font-bold text-white">Tools & Utilities</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {UTILITY_TOOLS.map((t) => <ToolCard key={t.to + t.label} t={t} />)}
        </div>
      </section>
    </div>
  );
}
