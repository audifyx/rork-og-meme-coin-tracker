import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Code2 } from "lucide-react";

interface ContractAnalyzerProps {
  mint: string;
  token: any;
}

export const ContractAnalyzer = ({ mint, token }: ContractAnalyzerProps) => {
  const features = [
    { name: "Contract Verified", value: token.contract_verified, icon: "✓" },
    { name: "Ownership Renounced", value: token.contract_renounced, icon: "✓" },
    { name: "Liquidity Locked", value: token.liquidity_locked, icon: "✓" },
    { name: "Minting Disabled", value: token.minting_disabled, icon: "✓" },
    { name: "Recent Mint Detected", value: token.recent_mint_detected === true, critical: true },
    { name: "Honeypot Detected", value: token.honeypot_detected === true, critical: true },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-6 glass-card border-white/10">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Code2 className="h-5 w-5 text-[#22d3ee]" />
          Contract Analysis
        </h3>
        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature.name} className="flex items-center justify-between p-3 bg-white/[0.02] rounded border border-white/[0.05]">
              <span className="text-sm font-medium">{feature.name}</span>
              {feature.value ? (
                <Badge className={feature.critical ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
                  {feature.critical ? "DETECTED" : "ENABLED"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-white/40">DISABLED</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 glass-card border-white/5">
        <h4 className="font-semibold text-sm mb-2">Contract Address</h4>
        <p className="text-xs font-mono text-white/60 break-all">{mint}</p>
      </Card>

      <Card className="p-4 glass-card border-white/5">
        <h4 className="font-semibold text-sm mb-3">Safety Checklist</h4>
        <ul className="text-xs text-white/60 space-y-1">
          <li>✓ Verify contract source code on explorer</li>
          <li>✓ Check for hidden minting functions</li>
          <li>✓ Confirm ownership renounced (no admin keys)</li>
          <li>✓ Verify LP lock duration</li>
          <li>✓ Test buy/sell for honeypot (swap tax issues)</li>
        </ul>
      </Card>
    </div>
  );
};
