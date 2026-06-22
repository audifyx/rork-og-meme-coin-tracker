/**
 * TokenIntel — Single, ordered deep-dive for any token.
 * One clean view (no sub-tabs): Vitals, New Pairs, Whales + Wallet X-Ray + Copy Trading, and live TX tape.
 */
import { useState } from "react";
import { Activity } from "lucide-react";
import { EmeraldHeader, SectionDivider } from "@/components/ToolPageShell";
import { shortAddr } from "@/lib/og";

import { OgStats } from "@/components/OgStats";
import { PairTracker } from "@/components/PairTracker";
import { Whales } from "@/components/Whales";
import { TxFeed } from "@/components/TxFeed";
import { WalletXRay } from "@/components/wallets-20x/WalletXRay";
import { CopyTradingFeed } from "@/components/wallets-20x/CopyTradingFeed";

type Props = {
  mint: string;
  onSelect: (mint: string) => void;
  initialTab?: string;
};

export const TokenIntel = ({ mint, onSelect }: Props) => {
  const [selectedWallet, setSelectedWallet] = useState("");

  return (
    <section className="space-y-4">
      <EmeraldHeader
        icon={Activity}
        title="Token Intel"
        subtitle="Everything on one token in a single ordered view — vitals, new pairs, whale concentration, wallet x-ray and the live transaction tape."
        badge="Deep Dive"
      />

      <SectionDivider label="Vitals" />
      <OgStats mint={mint} onSelect={onSelect} />

      <SectionDivider label="New Pairs" />
      <PairTracker onSelect={onSelect} />

      <SectionDivider label="Whales & Wallets" />
      <div className="space-y-4">
        <Whales mint={mint} onSelectWallet={setSelectedWallet} />
        {selectedWallet ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">Wallet X-Ray: {shortAddr(selectedWallet)}</h3>
              <button onClick={() => setSelectedWallet("")} className="text-[10px] text-white/40 hover:text-white">Clear</button>
            </div>
            <WalletXRay walletAddress={selectedWallet} compact={false} />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-white/30">Select a whale above to x-ray their wallet</p>
          </div>
        )}
        <CopyTradingFeed onSelectMint={onSelect} />
      </div>

      <SectionDivider label="Live Transactions" />
      <TxFeed mint={mint} />
    </section>
  );
};
