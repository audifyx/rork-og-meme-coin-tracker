import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, TrendingUp, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

interface DevHistoryDashboardProps {
  mint: string;
  token: any;
}

export const DevHistoryDashboard = ({ mint, token }: DevHistoryDashboardProps) => {
  const [devData, setDevData] = useState<any>(null);

  useEffect(() => {
    loadDevData();
  }, [token]);

  const loadDevData = async () => {
    // Mock dev data structure
    const mockDev = {
      address: token.deployer || "Unknown",
      projects: [
        { name: token.name, status: "active", age: "recent" },
        { name: "Previous Project 1", status: "rugged", age: "6 months ago" },
        { name: "Previous Project 2", status: "active", age: "1 year ago" },
      ],
      rugRate: 33,
      avgProjectAge: "8 months",
      responsiveness: 65,
    };
    setDevData(mockDev);
  };

  if (!devData) {
    return <div className="text-white/40">Loading dev data...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Dev Identity */}
      <Card className="p-6 glass-card border-white/10">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Code2 className="h-5 w-5 text-[#22d3ee]" />
          Developer Profile
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Wallet Address</p>
            <p className="text-sm font-mono text-white mt-1 break-all">{devData.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Projects Created</p>
              <p className="text-2xl font-bold text-white mt-1">{devData.projects.length}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Rug Rate</p>
              <p className={`text-2xl font-bold mt-1 ${devData.rugRate > 30 ? 'text-red-400' : 'text-green-400'}`}>
                {devData.rugRate}%
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Responsiveness Score</p>
            <div className="mt-1 w-full bg-white/5 rounded h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-red-500 h-full"
                style={{ width: `${devData.responsiveness}%` }}
              />
            </div>
            <p className="text-xs text-white/30 mt-1">{devData.responsiveness}% to community engagement</p>
          </div>
        </div>
      </Card>

      {/* Project History */}
      <Card className="p-6 glass-card border-white/10">
        <h3 className="font-semibold mb-4">Project History</h3>
        <div className="space-y-2">
          {devData.projects.map((proj: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] rounded border border-white/[0.05]">
              <div>
                <p className="font-medium text-sm">{proj.name}</p>
                <p className="text-xs text-white/40">{proj.age}</p>
              </div>
              <Badge className={
                proj.status === "rugged" 
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : proj.status === "active"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              }>
                {proj.status.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Red Flags */}
      {devData.rugRate > 25 && (
        <Card className="p-4 glass-card border-red-500/20 bg-red-950/10">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-red-400">High Rug Rate</p>
              <p className="text-xs text-white/60 mt-1">This developer has rugged {devData.rugRate}% of their projects. Proceed with caution.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
