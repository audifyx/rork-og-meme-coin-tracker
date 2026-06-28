import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield, Users, Droplets, Wallet2, Calculator, Search, Loader2, ArrowRight,
  Crosshair, Sparkles, Flame, ExternalLink, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import {
  isMint, scanToken, tokenHolders, liquidityScan, walletProfile,
  type ScanResult, type Holder, type Pool, type WalletProfile,
} from "../lib/scan";

type ToolId = "scanner" | "holders" | "liquidity" | "wallet" | "staking";
const TOOLS: { id: ToolId; label: string; desc: string; Icon: typeof Shield; kind: "mint" | "wallet" | "calc"; ph: string }[] = [
  { id: "scanner",  label: "OrbitX Scanner",      desc: "Rug check + risk score",     Icon: Shield,    kind: "mint",   ph: "Paste a token contract address" },
  { id: "holders",  label: "Holder Scanner",  desc: "Top holder distribution",    Icon: Users,     kind: "mint",   ph: "Paste a token contract address" },
  { id: "liquidity",label: "Liquidity Scanner",desc: "Pools & liquidity depth",   Icon: Droplets,  kind: "mint",   ph: "Paste a token contract address" },
  { id: "wallet",   label: "Wallet Profiler", desc: "Holdings & activity",        Icon: Wallet2,   kind: "wallet", ph: "Paste a wallet address" },
  { id: "staking",  label: "Staking Calc",    desc: "Estimate staking rewards",   Icon: Calculator,kind: "calc",   ph: "" },
];

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : n >= 1e9 ? (n / 1e9).toFixed(d) + "B" : n >= 1e6 ? (n / 1e6).toFixed(d) + "M" : n >= 1e3 ? (n / 1e3).toFixed(d) + "K" : n.toFixed(d);
const short = (a: string) => (a && a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

export default function Tools() {
  const [tool, setTool] = useState<ToolId>("scanner");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const active = TOOLS.find((t) => t.id === tool)!;

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(""); setResult(null);
    const v = input.trim();
    if (active.kind !== "calc") {
      if (!isMint(v)) { setError(active.kind === "wallet" ? "Enter a valid wallet address" : "Enter a valid contract address"); return; }
    }
    setLoading(true);
    try {
      if (tool === "scanner") setResult(await scanToken(v));
      else if (tool === "holders") setResult(await tokenHolders(v));
      else if (tool === "liquidity") setResult(await liquidityScan(v));
      else if (tool === "wallet") setResult(await walletProfile(v));
    } catch (err: any) {
      setError(err?.message || "Lookup failed. Try again.");
    } finally { setLoading(false); }
  };

  const pickTool = (id: ToolId) => { setTool(id); setResult(null); setError(""); setInput(""); };

  return (
    <div className="mx-auto max-w-[1080px] space-y-6 px-4 py-6">
      <div className="flex items-center gap-2">
        <Crosshair className="h-5 w-5 text-accent" />
        <h1 className="font-display text-2xl font-black text-white">OrbitX Tools</h1>
      </div>

      {/* Tool selector */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => pickTool(t.id)}
            className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${tool === t.id ? "border-accent/60 bg-accent/10" : "border-line bg-panel2/60 hover:border-accent/30"}`}>
            <t.Icon className={`h-4 w-4 ${tool === t.id ? "text-accent" : "text-muted"}`} />
            <span className="text-[12.5px] font-bold text-white">{t.label}</span>
            <span className="text-[10.5px] text-muted leading-tight">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      {active.kind !== "calc" ? (
        <form onSubmit={run} className="flex items-center gap-2 rounded-2xl border border-line bg-bg/70 p-2 focus-within:border-accent/60">
          <Search className="ml-2 h-4 w-4 shrink-0 text-muted" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={active.ph}
            className="flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-muted/60" />
          <button type="submit" disabled={loading}
            className="rounded-xl bg-accent px-5 py-2 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run"}
          </button>
        </form>
      ) : <StakingCalc />}

      {error && <div className="rounded-xl border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">{error}</div>}
      {loading && <div className="grid place-items-center py-12 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      {!loading && result && tool === "scanner" && <ScannerResult r={result as ScanResult} />}
      {!loading && result && tool === "holders" && <HoldersResult r={result} />}
      {!loading && result && tool === "liquidity" && <LiquidityResult r={result} />}
      {!loading && result && tool === "wallet" && <WalletResult r={result as WalletProfile} input={input.trim()} />}

      {/* Live feeds shortcut */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/new" className="flex items-center gap-3 rounded-2xl border border-line bg-panel2/60 p-4 transition hover:border-accent/40">
          <Sparkles className="h-5 w-5 text-accent" />
          <div><div className="text-sm font-bold text-white">Token Sniper</div><div className="text-[12px] text-muted">Live newly-listed launches</div></div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted" />
        </Link>
        <Link to="/pulse" className="flex items-center gap-3 rounded-2xl border border-line bg-panel2/60 p-4 transition hover:border-accent/40">
          <Flame className="h-5 w-5 text-accent" />
          <div><div className="text-sm font-bold text-white">Flow / MEV Radar</div><div className="text-[12px] text-muted">Trending pairs & market activity</div></div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-panel2/60 p-3"><div className="text-[10px] uppercase tracking-wider text-muted">{label}</div><div className="mt-0.5 text-sm font-bold text-white">{value}</div></div>;
}

function ScannerResult({ r }: { r: ScanResult }) {
  const tone = r.riskScore >= 70 ? "text-up" : r.riskScore >= 45 ? "text-gold" : "text-down";
  const ring = r.riskScore >= 70 ? "#14F195" : r.riskScore >= 45 ? "#FFC53D" : "#FF4D6D";
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-panel2/40 p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: `conic-gradient(${ring} ${r.riskScore * 3.6}deg, rgba(255,255,255,0.08) 0)` }}>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-bg"><span className={`text-lg font-black ${tone}`}>{r.riskScore}</span></div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><h3 className="truncate font-display text-lg font-black text-white">{r.name}</h3><span className="text-sm text-muted">${r.symbol}</span></div>
          <div className={`text-sm font-bold ${tone}`}>{r.riskLabel}</div>
          {r.launchpad && <div className="text-[11px] text-muted">via {r.launchpad}</div>}
        </div>
        <Link to={`/token/${r.mint}`} className="ml-auto inline-flex items-center gap-1 rounded-xl bg-accent/10 px-3 py-2 text-[12px] font-bold text-accent hover:bg-accent/20">Full scan <ExternalLink className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Price" value={r.price != null ? "$" + (r.price < 0.01 ? r.price.toExponential(2) : r.price.toFixed(4)) : "—"} />
        <Stat label="Market cap" value={r.mcap != null ? "$" + fmt(r.mcap) : "—"} />
        <Stat label="Liquidity" value={r.liquidity != null ? "$" + fmt(r.liquidity) : "—"} />
        <Stat label="Holders" value={r.holderCount != null ? fmt(r.holderCount, 0) : "—"} />
      </div>
      <div className="space-y-1.5">
        {r.flags.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px]">
            {f.tone === "good" ? <CheckCircle2 className="h-4 w-4 text-up" /> : f.tone === "warn" ? <AlertTriangle className="h-4 w-4 text-gold" /> : <XCircle className="h-4 w-4 text-down" />}
            <span className="text-white/85">{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoldersResult({ r }: { r: { holders: Holder[]; supply: number | null } }) {
  if (!r.holders.length) return <Empty text="No holder data available." />;
  return (
    <div className="rounded-2xl border border-line bg-panel2/40 p-4">
      <div className="mb-3 text-sm font-bold text-white">Top {r.holders.length} holders</div>
      <div className="space-y-1.5">
        {r.holders.map((h) => (
          <div key={h.address} className="flex items-center gap-3 text-[13px]">
            <span className="w-6 text-right text-muted">{h.rank}</span>
            <span className="font-mono text-white/80">{short(h.address)}</span>
            <div className="ml-auto flex w-40 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent" style={{ width: `${Math.min(100, h.pct || 0)}%` }} /></div>
              <span className="w-12 text-right font-bold text-white">{h.pct != null ? h.pct.toFixed(1) + "%" : "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiquidityResult({ r }: { r: { totalLiquidity: number | null; pools: Pool[]; launchpad: string | null } }) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-panel2/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-white">Total liquidity</div>
        <div className="text-lg font-black text-accent">{r.totalLiquidity != null ? "$" + fmt(r.totalLiquidity) : "—"}</div>
      </div>
      {r.pools.length ? r.pools.map((p, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-bg/50 p-3 text-[13px]">
          <span className="font-bold text-white">{p.dex}</span>
          <span className="text-muted">{p.pair}</span>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-white">${fmt(p.liquidity)}</span>
            {p.volume24h != null && <span className="text-muted">vol ${fmt(p.volume24h)}</span>}
            {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-accent"><ExternalLink className="h-3.5 w-3.5" /></a>}
          </div>
        </div>
      )) : <Empty text="No pools found." />}
    </div>
  );
}

function WalletResult({ r, input }: { r: WalletProfile; input: string }) {
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-panel2/40 p-5">
      <div className="flex items-center gap-2"><Wallet2 className="h-4 w-4 text-accent" /><span className="font-mono text-sm text-white">{short(input)}</span>
        <Link to={`/wallet/${input}`} className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-accent">Full profile <ExternalLink className="h-3.5 w-3.5" /></Link></div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="SOL balance" value={r.sol != null ? r.sol.toFixed(3) : "—"} />
        <Stat label="Tokens held" value={String(r.tokenCount)} />
        <Stat label="Recent txns" value={String(r.recentTx)} />
      </div>
      {r.topTokens.length > 0 && (
        <div><div className="mb-2 text-[11px] uppercase tracking-wider text-muted">Top holdings</div>
          <div className="space-y-1">{r.topTokens.map((t) => (
            <div key={t.mint} className="flex items-center justify-between text-[12.5px]"><Link to={`/token/${t.mint}`} className="font-mono text-white/80 hover:text-accent">{short(t.mint)}</Link><span className="text-muted">{fmt(t.amount, 2)}</span></div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-line bg-panel2/60 p-6 text-center text-sm text-muted">{text}</div>;
}

function StakingCalc() {
  const [amount, setAmount] = useState("100");
  const [apy, setApy] = useState("8");
  const [days, setDays] = useState("365");
  const p = Number(amount) || 0, a = (Number(apy) || 0) / 100, d = Number(days) || 0;
  const reward = p * a * (d / 365);
  const total = p + reward;
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-panel2/40 p-5">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Amount" value={amount} onChange={setAmount} suffix="tokens" />
        <Field label="APY %" value={apy} onChange={setApy} suffix="%" />
        <Field label="Duration" value={days} onChange={setDays} suffix="days" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-bg/50 p-4"><div className="text-[11px] uppercase tracking-wider text-muted">Est. rewards</div><div className="mt-1 text-xl font-black text-up">+{reward.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>
        <div className="rounded-xl border border-line bg-bg/50 p-4"><div className="text-[11px] uppercase tracking-wider text-muted">Total after period</div><div className="mt-1 text-xl font-black text-white">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>
      </div>
      <p className="text-[11px] text-muted">Simple linear estimate. Actual staking rewards vary with rate changes and compounding.</p>
    </div>
  );
}
function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <div><div className="mb-1 text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="flex items-center rounded-xl border border-line bg-bg/70 px-3 focus-within:border-accent/60">
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" className="w-full bg-transparent py-2.5 text-sm text-white outline-none" />
        <span className="text-[11px] text-muted">{suffix}</span>
      </div>
    </div>
  );
}
