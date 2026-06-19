import { Card } from "@/components/ui/card";
import { FileText, Zap } from "lucide-react";

interface TokenTimelineFeedProps {
  mint: string;
  token: any;
}

export const TokenTimelineFeed = ({ mint, token }: TokenTimelineFeedProps) => {
  const events = [
    { date: token.created_at || "Unknown", title: "Token Launched", type: "launch" },
    { date: new Date(Date.now() - 86400000).toISOString(), title: "Holder Count +2.3%", type: "growth" },
    { date: new Date(Date.now() - 172800000).toISOString(), title: "Top Holder Accumulated", type: "whale" },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-6 glass-card border-white/10">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#22d3ee]" />
          Token Timeline
        </h3>
        <div className="space-y-3 relative">
          {events.map((event, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-[#22d3ee] mt-1.5" />
                {idx !== events.length - 1 && (
                  <div className="absolute top-3 left-1.5 w-0.5 h-12 bg-white/10" />
                )}
              </div>
              <div className="pb-4">
                <p className="text-xs text-white/40">{new Date(event.date).toLocaleDateString()}</p>
                <p className="font-medium text-sm mt-0.5">{event.title}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
