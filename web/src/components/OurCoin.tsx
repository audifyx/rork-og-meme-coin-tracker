import { memo, type ComponentType } from "react";
import { Bell, CalendarClock, LockKeyhole, Megaphone, RadioTower, ShieldAlert, Sparkles } from "lucide-react";
import { OGSCAN_SITE_URL, OGSCAN_X_URL } from "@/lib/og";

const launchSignals: { label: string; value: string; tone: "cyan" | "gold" | "lime" }[] = [
  { label: "Contract address", value: "Not published", tone: "gold" },
  { label: "Trading chart", value: "Coming soon", tone: "cyan" },
  { label: "Launch status", value: "Locked", tone: "lime" },
];

const safetyNotes: { Icon: ComponentType<{ className?: string }>; title: string; detail: string }[] = [
  {
    Icon: ShieldAlert,
    title: "No official CA yet",
    detail: "If someone posts a contract address before it appears here, treat it as unofficial.",
  },
  {
    Icon: Megaphone,
    title: "Announcements first",
    detail: "The official launch notice will be mirrored on the site and X before any trading links go live.",
  },
  {
    Icon: Bell,
    title: "Holder tech later",
    detail: "Reward mechanics and creator-fee features are planned, but not active until launch.",
  },
];

export const OurCoin = memo(() => {
  return (
    <section className="relative min-h-[620px] overflow-hidden border border-og-gold/35 bg-og-ink/90 shadow-og-gold">
      <div className="absolute inset-0 grid-bg opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,hsl(var(--og-gold)/0.18),transparent_34%),radial-gradient(circle_at_88%_16%,hsl(var(--og-cyan)/0.14),transparent_34%),linear-gradient(180deg,hsl(var(--og-ink)/0.4),hsl(var(--background)/0.96))]" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-og-cyan/20" />
      <div className="absolute -bottom-20 left-8 h-56 w-56 rounded-full border border-og-gold/20" />

      <div className="relative flex min-h-[620px] flex-col justify-between p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 border border-og-gold/45 bg-og-gold/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-og-gold">
            <LockKeyhole className="h-3.5 w-3.5" /> Launch bay sealed
          </div>
          <div className="inline-flex items-center gap-2 border border-og-cyan/40 bg-og-cyan/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.26em] text-og-cyan">
            <RadioTower className="h-3.5 w-3.5 animate-pulse" /> Monitoring only
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-5xl gap-8 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.42em] text-og-cyan">
              <span className="h-px w-12 bg-og-cyan" /> official token room
            </div>
            <h2 className="font-display text-[clamp(3rem,8vw,7.5rem)] font-black uppercase leading-[0.82] tracking-tighter">
              <span className="block text-og-gold text-glow-gold">No token</span>
              <span className="block text-og-lime text-glow">out yet.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-relaxed text-foreground sm:text-2xl">
              Coming soon. Until the official launch is posted here, OG Scan has no public CA, no live chart, and no buy/sell feed for its own token.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              The app tools stay live for scanning the Solana market. This page is now a clean launch banner only, so nobody confuses a placeholder or fake contract for the real thing.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={OGSCAN_X_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-og-lime bg-og-lime px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-og-ink transition hover:bg-og-lime/90"
              >
                Follow updates
              </a>
              <a
                href={OGSCAN_SITE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-og-grid bg-og-ink/75 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/70 transition hover:border-og-cyan hover:text-og-cyan"
              >
                Official site
              </a>
            </div>
          </div>

          <div className="grid gap-3">
            {launchSignals.map((signal) => (
              <LaunchSignal key={signal.label} {...signal} />
            ))}
            <div className="mt-2 border border-dashed border-og-gold/45 bg-og-gold/5 p-4">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-og-gold">
                <CalendarClock className="h-3.5 w-3.5" /> Roadmap slot
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Drop the roadmap when ready and this tab can become the launch timeline, reward plan, and holder-rule explainer.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {safetyNotes.map((note) => (
            <SafetyNote key={note.title} {...note} />
          ))}
        </div>
      </div>
    </section>
  );
});

OurCoin.displayName = "OurCoin";

const LaunchSignal = memo(({ label, value, tone }: { label: string; value: string; tone: "cyan" | "gold" | "lime" }) => {
  const toneClass: string = tone === "cyan" ? "text-og-cyan border-og-cyan/45 bg-og-cyan/10" : tone === "gold" ? "text-og-gold border-og-gold/45 bg-og-gold/10" : "text-og-lime border-og-lime/45 bg-og-lime/10";

  return (
    <div className={`relative overflow-hidden border p-4 ${toneClass}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-current opacity-70" />
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] opacity-70">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">{value}</span>
        <Sparkles className="h-5 w-5 shrink-0" />
      </div>
    </div>
  );
});

LaunchSignal.displayName = "LaunchSignal";

const SafetyNote = memo(({ Icon, title, detail }: { Icon: ComponentType<{ className?: string }>; title: string; detail: string }) => (
  <div className="border border-og-grid bg-og-ink/72 p-4 shadow-[inset_3px_0_0_hsl(var(--og-cyan)/0.4)]">
    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-og-cyan">
      <Icon className="h-3.5 w-3.5" /> {title}
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
  </div>
));

SafetyNote.displayName = "SafetyNote";
