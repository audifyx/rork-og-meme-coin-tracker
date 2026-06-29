import { buildOgRead, Tone } from "../lib/ogRead";
import {
  ShieldCheck, ShieldAlert, Shield, Sparkles, Check, X, AlertTriangle, Lock,
} from "lucide-react";

const TONE_CLS: Record<Tone, { text: string; bg: string; ring: string; dot: string }> = {
  good: { text: "text-up",   bg: "bg-up/10",   ring: "border-up/30",   dot: "bg-up" },
  warn: { text: "text-yellow-300", bg: "bg-yellow-400/10", ring: "border-yellow-400/30", dot: "bg-yellow-400" },
  bad:  { text: "text-down", bg: "bg-down/10", ring: "border-down/30", dot: "bg-down" },
};

function Chip({ ok, label, value }: { ok: boolean | null; label: string; value?: string }) {
  const t: Tone = ok === null ? "warn" : ok ? "good" : "bad";
  const c = TONE_CLS[t];
  const Icon = ok === null ? AlertTriangle : ok ? Check : X;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border ${c.ring} ${c.bg} px-2.5 py-1.5 text-[11px] font-semibold ${c.text}`}>
      <Icon className="h-3 w-3" /> {label}{value ? <span className="opacity-80">· {value}</span> : null}
    </span>
  );
}

export default function TrustPanel({ d }: { d: any }) {
  const flags = d?.flags || {};
  const safety = d?.safety || {};
  const meta = d?.meta || {};
  const t = d?.token || {};
  const score = d?.score?.total ?? meta.organicScore ?? null;
  const read = buildOgRead(d);
  const c = TONE_CLS[read.tone];

  const mint = safety.mintAuthorityRenounced ?? flags.mintAuthorityDisabled ?? null;
  const freeze = safety.freezeAuthorityRenounced ?? flags.freezeAuthorityDisabled ?? null;
  const lpLocked = safety.lpLockedPct != null ? Number(safety.lpLockedPct) : null;
  const top10 = meta.topHoldersPct ?? t.audit?.topHoldersPercentage ?? null;
  const verified = flags.isVerified ?? meta.isVerifiedJup ?? null;
  const clone = d?.score?.isPumpFunClone;
  const VerdictIcon = read.tone === "good" ? ShieldCheck : read.tone === "bad" ? ShieldAlert : Shield;

  return (
    <div className={`card mb-4 overflow-hidden border ${c.ring}`}>
      <div className={`relative ${c.bg}`}>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          {/* verdict */}
          <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${c.ring} bg-bg/40 ${c.text}`}>
              <VerdictIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Trust Verdict</div>
              <div className={`text-lg font-black leading-tight ${c.text}`}>{d?.verdict || (read.tone === "good" ? "Looks Solid" : read.tone === "bad" ? "High Risk" : "Mixed")}</div>
              {score != null && <div className="text-[11px] text-muted">OrbitX Score <span className="font-bold text-white">{Math.round(score)}</span>/100</div>}
            </div>
          </div>

          {/* flag chips */}
          <div className="flex flex-wrap gap-1.5">
            <Chip ok={mint} label={mint ? "Mint renounced" : "Mint active"} />
            <Chip ok={freeze} label={freeze ? "Freeze renounced" : "Freeze active"} />
            {flags.lpPulled
              ? <Chip ok={false} label="LP pulled" />
              : <Chip ok={lpLocked == null ? null : lpLocked >= 50} label="LP" value={lpLocked != null ? `${lpLocked.toFixed(0)}% locked` : "unknown"} />}
            {top10 != null && <Chip ok={Number(top10) < 25} label="Top 10" value={`${Number(top10).toFixed(0)}%`} />}
            {verified != null && <Chip ok={!!verified} label={verified ? "Verified" : "Unverified"} />}
            <Chip ok={!clone} label={clone ? "Possible clone" : "Original"} />
            {safety.riskScore != null && <Chip ok={Number(safety.riskScore) <= 20} label="Risk" value={String(safety.riskScore)} />}
          </div>
        </div>
      </div>

      {/* OG Read */}
      <div className="border-t border-line p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-bold text-white">OG Read</span>
          <span className="pill bg-panel2 text-muted text-[9px]">AI summary</span>
        </div>
        <p className={`mb-3 text-sm font-medium ${c.text}`}>{read.headline}</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {read.bullets.map((bl, i) => {
            const bc = TONE_CLS[bl.tone];
            return (
              <div key={i} className="flex items-start gap-2 text-[12.5px] text-white/80">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bc.dot}`} />
                <span>{bl.text}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] text-muted/60">Synthesized from live on-chain data — not financial advice. Always DYOR.</p>
      </div>
    </div>
  );
}
