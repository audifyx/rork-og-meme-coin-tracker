import { Card } from "@/components/ui/card";
import { Network } from "lucide-react";

interface EcosystemMapperProps {
  mint: string;
  token: any;
}

export const EcosystemMapper = ({ mint, token }: EcosystemMapperProps) => {
  return (
    <Card className="p-6 glass-card border-white/10">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Network className="h-5 w-5 text-[#22d3ee]" />
        Ecosystem Map
      </h3>
      <div className="h-64 flex items-center justify-center border border-white/10 rounded bg-white/[0.01]">
        <div className="text-center">
          <Network className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Network visualization showing dev, holder, and token relationships</p>
          <p className="text-xs text-white/30 mt-2">(Interactive graph view coming)</p>
        </div>
      </div>
    </Card>
  );
};
