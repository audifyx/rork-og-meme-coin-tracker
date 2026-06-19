import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface Signal {
  id: string;
  type: "danger" | "warning" | "info" | "positive";
  title: string;
  description: string;
  severity: number; // 1-10
  timestamp: string;
}

interface SmartSignalsProps {
  mint: string;
  token: any;
}

export const SmartSignals = ({ mint, token }: SmartSignalsProps) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSignals();
  }, [mint]);

  const loadSignals = async () => {
    setLoading(true);
    try {
      // Generate signals based on token data
      const generatedSignals: Signal[] = [];

      // Check holder concentration
      if (token.top_10_holders_pct && token.top_10_holders_pct > 70) {
        generatedSignals.push({
          id: "concentration-high",
          type: "danger",
          title: "Extreme Holder Concentration",
          description: `Top 10 holders control ${token.top_10_holders_pct}% of supply. High rug risk.`,
          severity: 9,
          timestamp: new Date().toISOString(),
        });
      }

      // Check age
      if (token.created_at) {
        const age = (Date.now() - new Date(token.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (age < 7) {
          generatedSignals.push({
            id: "new-token",
            type: "warning",
            title: "Very New Token",
            description: `Only ${Math.floor(age)} days old. High volatility expected.`,
            severity: 7,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Check contract verification
      if (token.contract_verified === false) {
        generatedSignals.push({
          id: "unverified-contract",
          type: "warning",
          title: "Unverified Contract",
          description: "Contract source code is not verified. Unable to audit code.",
          severity: 6,
          timestamp: new Date().toISOString(),
        });
      } else if (token.contract_verified === true) {
        generatedSignals.push({
          id: "verified-contract",
          type: "positive",
          title: "Contract Verified",
          description: "Contract source code is publicly verified and auditable.",
          severity: 1,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if LP is locked
      if (token.liquidity_locked === true) {
        generatedSignals.push({
          id: "locked-lp",
          type: "positive",
          title: "Liquidity Locked",
          description: `LP locked until ${token.liquidity_lock_until || "future date"}. Rug-proof.`,
          severity: 1,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if contract is renounced
      if (token.contract_renounced === true) {
        generatedSignals.push({
          id: "renounced",
          type: "positive",
          title: "Ownership Renounced",
          description: "Contract ownership has been renounced. No admin privileges.",
          severity: 1,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for recent minting
      if (token.recent_mint_detected === true) {
        generatedSignals.push({
          id: "recent-mint",
          type: "danger",
          title: "Recent Minting Detected",
          description: "New tokens were minted recently. Possible inflation or honeypot.",
          severity: 9,
          timestamp: new Date().toISOString(),
        });
      }

      // Check holder distribution
      if (token.holders_count && token.market_cap) {
        const avgHoldingSize = token.market_cap / token.holders_count;
        if (avgHoldingSize > token.market_cap * 0.05) {
          generatedSignals.push({
            id: "skewed-distribution",
            type: "warning",
            title: "Skewed Holder Distribution",
            description: "Average holding size is very large. Few large holders control token.",
            severity: 7,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Positive: growing holder count
      if (token.holder_growth_24h && token.holder_growth_24h > 10) {
        generatedSignals.push({
          id: "organic-growth",
          type: "positive",
          title: "Organic Holder Growth",
          description: `${token.holder_growth_24h}% new holders in last 24h. Healthy adoption.`,
          severity: 2,
          timestamp: new Date().toISOString(),
        });
      }

      // Sort by severity (highest first)
      generatedSignals.sort((a, b) => b.severity - a.severity);
      setSignals(generatedSignals);
    } catch (err) {
      console.error("Error loading signals:", err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "danger":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "positive":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Zap className="h-5 w-5 text-blue-500" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "danger":
        return "border-red-500/20 bg-red-950/10";
      case "warning":
        return "border-amber-500/20 bg-amber-950/10";
      case "positive":
        return "border-green-500/20 bg-green-950/10";
      default:
        return "border-blue-500/20 bg-blue-950/10";
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "danger":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "positive":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <Card className="p-8 text-center glass-card">
        <CheckCircle className="h-12 w-12 text-green-500/30 mx-auto mb-4" />
        <p className="text-white/40">No significant signals detected</p>
        <p className="text-sm text-white/30 mt-1">This token appears healthy, but always do your own research</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <Card key={signal.id} className={`p-4 glass-card border ${getColor(signal.type)}`}>
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">{getIcon(signal.type)}</div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    {signal.title}
                    <Badge className={`text-[10px] ${getBadgeColor(signal.type)}`}>
                      {signal.type.toUpperCase()}
                    </Badge>
                  </h3>
                  <p className="text-sm text-white/60 mt-1">{signal.description}</p>
                </div>
                <div className="text-right text-xs text-white/30 flex-shrink-0">
                  Risk {signal.severity}/10
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
