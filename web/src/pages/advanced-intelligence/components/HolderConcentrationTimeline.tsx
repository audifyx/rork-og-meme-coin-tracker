import { Card } from "@/components/ui/card";
import { Users, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface HolderConcentrationTimelineProps {
  mint: string;
  token: any;
}

export const HolderConcentrationTimeline = ({ mint, token }: HolderConcentrationTimelineProps) => {
  const mockData = [
    { date: "Day 1", top10: 85, top50: 92 },
    { date: "Day 7", top10: 80, top50: 89 },
    { date: "Day 14", top10: 75, top50: 86 },
    { date: "Day 30", top10: 70, top50: 82 },
    { date: "Today", top10: token.top_10_holders_pct || 65, top50: 78 },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-6 glass-card border-white/10">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-[#22d3ee]" />
          Holder Concentration
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip 
                contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <Line type="monotone" dataKey="top10" stroke="#f59e0b" name="Top 10 %" strokeWidth={2} />
              <Line type="monotone" dataKey="top50" stroke="#3b82f6" name="Top 50 %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 glass-card border-white/5">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Current Distribution
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40 uppercase">Top 10 Holders</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{token.top_10_holders_pct || 65}%</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase">Total Holders</p>
            <p className="text-2xl font-bold text-white mt-1">{(token.holders_count || 1000).toLocaleString()}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 glass-card border-white/5">
        <p className="text-xs text-white/60">📊 <strong>Healthy distribution</strong> shows decreasing concentration over time and growing holder diversity.</p>
      </Card>
    </div>
  );
};
