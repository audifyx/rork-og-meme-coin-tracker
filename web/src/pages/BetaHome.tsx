import { memo, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Flame,
  Globe2,
  MessageCircle,
  Radio,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Scanlines } from "@/components/Scanlines";
import { OGSCAN_DEV_WALLET, OGSCAN_TOKEN_MINT, shortAddr } from "@/lib/og";
import { cn } from "@/lib/utils";

const OGSCAN_TELEGRAM_URL = "https://t.me/ogscanner";
const OGSCAN_BACKUP_X_URL = "https://x.com/ogscanbackup";

type CommunityCard = {
  title: string;
  eyebrow: string;
  Icon: LucideIcon;
  ctaLabel: string;
  url: string;
  description: string;
  accent: "cyan" | "lime";
};

const communityCards: CommunityCard[] = [
  {
    title: "Telegram",
    eyebrow: "Live community",
    Icon: MessageCircle,
    ctaLabel: "Join the chat",
    url: OGSCAN_TELEGRAM_URL,
    description: "The fastest place for OGScan updates, feedback, bug reports, and community notes.",
    accent: "lime",
  },
  {
    title: "Backup X",
    eyebrow: "Official posts",
    Icon: Radio,
    ctaLabel: "Follow on X",
    url: OGSCAN_BACKUP_X_URL,
    description: "Follow our backup X for DEX progress, launch notes, and important announcements.",
    accent: "cyan",
  },
];

const issueTips: string[] = ["Join Telegram for the fastest support", "Watch backup X for DEX status posts", "Use the scanner while the next DEX update is prepared"];

const BetaHome = memo(() => {
  const [copied, setCopied] = useState<"coin" | null>(null);

  const communityUpdates: string[] = useMemo<string[]>(
    () => ["Telegram is the main room for quick updates", "Backup X will carry launch notes and status posts", "DEX updates are next and will be announced there first"],
    [],
  );

  const copyValue = useCallback(async (kind: "coin", value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout((): void => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }, []);


  const copyCoinCa = useCallback((): void => {
    void copyValue("coin", OGSCAN_TOKEN_MINT);
  }, [copyValue]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Scanlines />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,hsl(var(--og-cyan)/0.22),transparent_31%),radial-gradient(circle_at_90%_10%,hsl(var(--og-lime)/0.18),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--og-ink))_58%,#020511)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-30" />

      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 border border-og-grid bg-og-ink/82 p-3 shadow-og backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-og-lime bg-og-ink shadow-og">
              <img src="/icon.png" alt="OG Scan icon" className="h-full w-full object-cover" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-og-cyan shadow-og" />
            </div>
            <div>
              <p className="font-display text-sm font-black uppercase tracking-[0.28em] text-white">OGScan</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-og-cyan">Community HQ</p>
            </div>
          </div>
          <Link
            to="/scanner"
            className="hidden border border-og-lime bg-og-lime px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-og-ink transition hover:bg-transparent hover:text-og-lime sm:inline-flex"
          >
            Enter app
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-5 py-7 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8 lg:py-10">
          <section className="relative overflow-hidden border border-og-grid bg-og-ink/84 p-5 shadow-[0_0_0_1px_hsl(var(--og-grid)),0_34px_120px_-72px_hsl(var(--og-cyan))] sm:p-7 lg:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-og-cyan via-og-lime to-white" />
            <div className="absolute right-4 top-4 hidden border border-og-cyan/40 bg-og-cyan/10 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-[0.26em] text-og-cyan sm:block">
              Community links live
            </div>

            <div className="mb-5 inline-flex items-center gap-2 border border-og-lime/45 bg-og-lime/10 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.26em] text-og-lime">
              <Sparkles className="h-3.5 w-3.5" /> Updates moving here first
            </div>

            <h1 className="font-display text-4xl font-black uppercase leading-[0.92] tracking-tighter text-white text-glow sm:text-6xl lg:text-7xl">
              OGScan community is open
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              The next OGScan DEX update is being worked on now. Until it lands, follow the live community channels for status updates, beta notes, and every official announcement.
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {communityUpdates.map((step: string, index: number) => (
                <div key={step} className="border border-og-grid bg-black/24 p-3">
                  <span className="mb-2 grid h-7 w-7 place-items-center border border-og-cyan/50 bg-og-cyan/10 font-mono text-[10px] font-black text-og-cyan">
                    {index + 1}
                  </span>
                  <p className="text-xs font-bold leading-relaxed text-white/82">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={OGSCAN_TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 border border-og-lime bg-og-lime px-5 py-3 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-og-ink shadow-og transition hover:bg-white hover:text-og-ink active:scale-[0.98]"
              >
                Join Telegram <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={OGSCAN_BACKUP_X_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 border border-og-grid bg-black/24 px-5 py-3 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:border-og-cyan hover:text-og-cyan active:scale-[0.98]"
              >
                Follow backup X <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="border border-og-lime/45 bg-og-lime/10 p-4 shadow-og">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-og-lime">
                <Coins className="h-4 w-4" /> Token is live
              </div>
              <p className="text-sm font-semibold leading-6 text-white/86">
                Official CA: <span className="font-mono text-og-gold">{shortAddr(OGSCAN_TOKEN_MINT, 6)}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Dev wallet: <span className="font-mono text-og-cyan">{shortAddr(OGSCAN_DEV_WALLET, 5)}</span>
              </p>
              <button
                type="button"
                onClick={copyCoinCa}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 border border-og-gold/60 bg-og-gold/10 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-og-gold transition hover:bg-og-gold hover:text-og-ink"
              >
                {copied === "coin" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "coin" ? "CA copied" : "Copy official CA"}
              </button>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {communityCards.map((card: CommunityCard) => (
                <CommunityCardView key={card.title} card={card} />
              ))}
            </div>

            <section className="border border-og-gold/40 bg-og-gold/10 p-4 shadow-og-gold">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-og-gold">
                <AlertTriangle className="h-4 w-4" /> Please note
              </div>
              <p className="text-sm leading-6 text-white/78">
                We&apos;re updating the DEX experience as fast as possible. For now, Telegram and backup X are the best places to follow progress, report issues, and catch official OGScan updates.
              </p>
            </section>

            <section className="border border-og-grid bg-og-ink/82 p-4">
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-og-cyan">
                <Globe2 className="h-4 w-4" /> Having issues?
              </div>
              <ul className="space-y-2">
                {issueTips.map((tip: string) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-og-lime" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-og-grid pt-3 text-xs leading-5 text-white/60">
                Found a bug or have feedback? Join Telegram or follow backup X so we can keep everyone updated in one place.
              </p>
            </section>
          </aside>
        </div>

        <footer className="pb-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-og-lime" /> Want the web tools instead?
          </div>
          <Link
            to="/scanner"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-white/20 bg-white px-5 py-3 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-og-ink transition hover:border-og-lime hover:bg-og-lime sm:w-auto"
          >
            Or go ahead and enter OG scanner <ArrowRight className="h-4 w-4" />
          </Link>
        </footer>
      </section>
    </main>
  );
});

BetaHome.displayName = "BetaHome";

const CommunityCardView = memo(({ card }: { card: CommunityCard }) => {
  const accentClass: string = card.accent === "cyan" ? "border-og-cyan/45 bg-og-cyan/10 text-og-cyan" : "border-og-lime/45 bg-og-lime/10 text-og-lime";
  const underlineClass: string = card.accent === "cyan" ? "decoration-og-cyan/50 hover:text-og-cyan" : "decoration-og-lime/50 hover:text-og-lime";

  return (
    <section className="border border-og-grid bg-og-ink/82 p-4 shadow-og">
      <div className="flex items-start gap-3">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center border", accentClass)}>
          <card.Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.26em] text-muted-foreground">{card.eyebrow}</p>
          <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-white">{card.title}</h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">{card.description}</p>
      <a href={card.url} target="_blank" rel="noreferrer" className={cn("mt-3 inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white underline underline-offset-4 transition", underlineClass)}>
        {card.ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </section>
  );
});

CommunityCardView.displayName = "CommunityCardView";

export default BetaHome;
