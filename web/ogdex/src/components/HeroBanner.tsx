import { Link } from "react-router-dom";
import { Rocket, ShoppingBag, ShieldCheck } from "lucide-react";

export default function HeroBanner() {
  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/10 ring-brand">
      {/* banner image */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/OGDEX/ogdex-banner.jpg)" }} />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />

      <div className="relative flex items-center gap-4 px-4 sm:px-6 py-4">
        <img src="/OGDEX/ogdex-logo.png" alt="OG DEX" width={64} height={64}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ring-brand shrink-0 animate-float-slow" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight leading-tight">
            OG<span className="text-brand-gradient">DEX</span>
            <span className="hidden sm:inline text-muted font-semibold text-base"> — Solana Token Screener</span>
          </h1>
          <p className="text-[11px] sm:text-sm text-muted mt-0.5 truncate">
            OG Score · organic momentum · instant safety checks · live multi-chain discovery
          </p>
          <div className="hidden sm:flex items-center gap-3 mt-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-accent" /> Safety checks</span>
            <span className="inline-flex items-center gap-1"><Rocket className="w-3.5 h-3.5 text-accent2" /> Pump.fun live</span>
          </div>
        </div>
        <div className="hidden sm:flex flex-col gap-2 shrink-0">
          <Link to="/launch" className="btn brand-gradient text-black font-bold inline-flex items-center gap-1.5 justify-center shadow-lg shadow-accent/20">
            <Rocket className="w-3.5 h-3.5" /> Launch a Token
          </Link>
          <Link to="/store" className="btn bg-white/5 border border-white/10 text-white hover:bg-white/10 inline-flex items-center gap-1.5 justify-center">
            <ShoppingBag className="w-3.5 h-3.5" /> List &amp; Boost
          </Link>
        </div>
      </div>
    </div>
  );
}
