/**
 * AboutOgScan — Merged page combining Our Coin, Roadmap, and Tech Stack.
 */
import { useState } from "react";
import { Coins, Map, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolHeader } from "@/components/ToolPageShell";

/* Lazy-load the three sections */
import { OurCoin } from "@/components/OurCoin";
import { SolToolsRoadmap } from "@/components/SolToolsRoadmap";
import { TechStack } from "@/components/TechStack";

type AboutTab = "token" | "roadmap" | "tech";

const ABOUT_TABS: { id: AboutTab; label: string; Icon: typeof Coins }[] = [
  { id: "token",   label: "Token",     Icon: Coins },
  { id: "roadmap", label: "Roadmap",   Icon: Map },
  { id: "tech",    label: "Tech Stack", Icon: Cpu },
];

export const AboutOgScan = ({ initialTab = "token" }: { initialTab?: AboutTab }) => {
  const [active, setActive] = useState<AboutTab>(initialTab);

  return (
    <section className="space-y-4">
      <ToolHeader
        icon={Coins}
        title="About OGScan"
        subtitle="Official token, project roadmap, and the data infrastructure powering everything."
        gradient="from-amber-400 to-yellow-500"
        glowColor="rgba(251,191,36,0.25)"
        badge="PROJECT"
        badgeColor="gold"
      />

      {/* Tab nav */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {ABOUT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-all duration-200",
              active === t.id
                ? "bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.03)]"
                : "bg-white/[0.03] text-white/30 hover:bg-white/[0.06] hover:text-white/50",
            )}
          >
            <t.Icon className={cn("h-3.5 w-3.5", active === t.id ? "text-og-gold" : "text-white/20")} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {active === "token" && <OurCoin />}
      {active === "roadmap" && <SolToolsRoadmap />}
      {active === "tech" && <TechStack />}
    </section>
  );
};
