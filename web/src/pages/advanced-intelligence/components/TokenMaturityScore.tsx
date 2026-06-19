import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, Users, Shield, Code2 } from "lucide-react";
import { useState, useEffect } from "react";

interface TokenMaturityScoreProps {
  mint: string;
  token: any;
}

export const TokenMaturityScore = ({ mint, token }: TokenMaturityScoreProps) => {
  const [scores, setScores] = useState({
    ageScore: 0,
    holderHealthScore: 0,
    contractScore: 0,
    devScore: 0,
    communityScore: 0,
  });

  useEffect(() => {
    calculateScores();
  }, [token]);

  const calculateScores = () => {
    const now = new Date();
    const tokenAge = token.created_at 
      ? (now.getTime() - new Date(token.created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    // Age score: 0 at 0 days, 100 at 365+ days
    const ageScore = Math.min(100, (tokenAge / 365) * 100);

    // Holder health: based on holder diversity and growth
    const holderHealthScore = token.top_10_holders_pct
      ? Math.max(0, 100 - (token.top_10_holders_pct * 1.5))
      : 50;

    // Contract score: verified + renounced + locked LP = 100
    let contractScore = 0;
    if (token.contract_verified) contractScore += 35;
    if (token.contract_renounced) contractScore += 35;
    if (token.liquidity_locked) contractScore += 30;

    // Dev score: history + responsiveness
    const devScore = token.dev_responsiveness_score || 50;

    // Community score: holder growth + activity
    const communityScore = token.holder_growth_24h 
      ? Math.min(100, token.holder_growth_24h * 10)
      : 30;

    setScores({
      ageScore: Math.round(ageScore),
      holderHealthScore: Math.round(holderHealthScore),
      contractScore: Math.round(contractScore),
      devScore: Math.round(devScore),
      communityScore: Math.round(communityScore),
    });
  };

  const overallScore = Math.round(
    (scores.ageScore + scores.holderHealthScore + scores.contractScore + scores.devScore + scores.communityScore) / 5
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="p-6 glass-card border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-[#22d3ee]" />
            <h3 className="text-lg font-semibold">Maturity Score</h3>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore}/100
          </div>
        </div>
        <Progress value={overallScore} className="h-2" />
        <p className="text-xs text-white/40 mt-2">
          {overallScore >= 80 ? "✅ Healthy and mature" : overallScore >= 60 ? "⚠️ Moderate risk" : "🚨 High risk"}
        </p>
      </Card>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: "Age Score", score: scores.ageScore, icon: Clock, desc: "How established is this token" },
          { label: "Holder Health", score: scores.holderHealthScore, icon: Users, desc: "Distribution and diversity" },
          { label: "Contract Safety", score: scores.contractScore, icon: Code2, desc: "Verification and locks" },
          { label: "Developer Reputation", score: scores.devScore, icon: Shield, desc: "Dev history and responsiveness" },
          { label: "Community Growth", score: scores.communityScore, icon: TrendingUp, desc: "Organic adoption" },
        ].map(({ label, score, icon: Icon, desc }) => (
          <Card key={label} className="p-4 glass-card border-white/5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[#22d3ee]" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <span className={`font-bold ${getScoreColor(score)}`}>{score}</span>
            </div>
            <Progress value={score} className="h-1.5 mb-1" />
            <p className="text-xs text-white/30">{desc}</p>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      <Card className="p-4 glass-card border-white/5">
        <h4 className="font-semibold text-sm mb-3">Recommendations</h4>
        <ul className="text-xs text-white/60 space-y-2">
          <li>• Monitor holder concentration — diversification indicates health</li>
          <li>• Check contract verification for ability to audit code</li>
          <li>• Verify LP locks and renounced ownership</li>
          <li>• Track dev's history across other projects</li>
          <li>• Watch for organic community growth, not just hype</li>
        </ul>
      </Card>
    </div>
  );
};
