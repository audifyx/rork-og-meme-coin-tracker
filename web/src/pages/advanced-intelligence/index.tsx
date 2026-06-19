import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertTriangle, CheckCircle, AlertCircle, TrendingUp, Users, Code2, Network, FileText, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DevHistoryDashboard } from "./components/DevHistoryDashboard";
import { ContractAnalyzer } from "./components/ContractAnalyzer";
import { HolderConcentrationTimeline } from "./components/HolderConcentrationTimeline";
import { TokenTimelineFeed } from "./components/TokenTimelineFeed";
import { SmartSignals } from "./components/SmartSignals";
import { TokenMaturityScore } from "./components/TokenMaturityScore";
import { ResearchNotes } from "./components/ResearchNotes";
import { EcosystemMapper } from "./components/EcosystemMapper";

interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  image_url?: string;
  current_price?: number;
  market_cap?: number;
  holders_count?: number;
  created_at?: string;
}

export const AdvancedTokenIntelligence = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const initialMint = searchParams.get("mint") || "";
  const [mint, setMint] = useState(initialMint);
  const [searchInput, setSearchInput] = useState(initialMint);
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signals");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (initialMint) {
      handleSearch(initialMint);
    }
  }, [initialMint]);

  const handleSearch = async (searchValue: string) => {
    if (!searchValue.trim()) {
      toast.error("Enter a mint address or token name");
      return;
    }

    setSearching(true);
    setLoading(true);
    try {
      // Query token by mint or name
      const { data, error } = await supabase
        .from("tokens")
        .select("*")
        .or(`mint.eq.${searchValue},name.ilike.%${searchValue}%,symbol.ilike.%${searchValue}%`)
        .limit(1)
        .single();

      if (error || !data) {
        toast.error("Token not found");
        setToken(null);
        return;
      }

      setToken(data);
      setMint(data.mint);
      setSearchInput(data.name || data.mint);
      toast.success(`Loaded: ${data.name || data.symbol}`);
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Failed to load token");
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(searchInput);
    }
  };

  return (
    <AppLayout>
      <PageHeader 
        title="ADVANCED INTELLIGENCE"
        description="Deep analysis of token contracts, developers, holders, and risk signals"
      />

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Enter mint address or token name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
          <Button
            onClick={() => handleSearch(searchInput)}
            disabled={searching}
            className="btn-3d gap-2"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Analyze
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : !token ? (
        <Card className="p-12 text-center glass-card">
          <Zap className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 mb-2">No token selected</p>
          <p className="text-sm text-white/30">Search for a token to begin advanced analysis</p>
        </Card>
      ) : (
        <>
          {/* Token Header */}
          <Card className="p-6 glass-card mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {token.image_url && (
                  <img src={token.image_url} alt={token.symbol} className="h-16 w-16 rounded-lg" />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-white">{token.name}</h2>
                  <p className="text-white/40 font-mono text-sm">{token.mint}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {token.holders_count && (
                      <Badge variant="outline" className="gap-1 border-white/10">
                        <Users className="h-3 w-3" />
                        {token.holders_count.toLocaleString()} holders
                      </Badge>
                    )}
                    {token.market_cap && (
                      <Badge variant="outline" className="gap-1 border-white/10">
                        <TrendingUp className="h-3 w-3" />
                        ${(token.market_cap / 1e9).toFixed(2)}B market cap
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-2 bg-white/5 p-1">
              <TabsTrigger value="signals" className="gap-1 text-xs lg:text-sm">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Signals</span>
              </TabsTrigger>
              <TabsTrigger value="maturity" className="gap-1 text-xs lg:text-sm">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Maturity</span>
              </TabsTrigger>
              <TabsTrigger value="dev" className="gap-1 text-xs lg:text-sm">
                <Code2 className="h-4 w-4" />
                <span className="hidden sm:inline">Dev</span>
              </TabsTrigger>
              <TabsTrigger value="contract" className="gap-1 text-xs lg:text-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Contract</span>
              </TabsTrigger>
              <TabsTrigger value="holders" className="gap-1 text-xs lg:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Holders</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1 text-xs lg:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="ecosystem" className="gap-1 text-xs lg:text-sm">
                <Network className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </TabsTrigger>
              <TabsTrigger value="research" className="gap-1 text-xs lg:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Notes</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="signals">
                <SmartSignals mint={mint} token={token} />
              </TabsContent>

              <TabsContent value="maturity">
                <TokenMaturityScore mint={mint} token={token} />
              </TabsContent>

              <TabsContent value="dev">
                <DevHistoryDashboard mint={mint} token={token} />
              </TabsContent>

              <TabsContent value="contract">
                <ContractAnalyzer mint={mint} token={token} />
              </TabsContent>

              <TabsContent value="holders">
                <HolderConcentrationTimeline mint={mint} token={token} />
              </TabsContent>

              <TabsContent value="timeline">
                <TokenTimelineFeed mint={mint} token={token} />
              </TabsContent>

              <TabsContent value="ecosystem">
                <EcosystemMapper mint={mint} token={token} />
              </TabsContent>

              <TabsContent value="research">
                <ResearchNotes mint={mint} token={token} user={user} />
              </TabsContent>
            </div>
          </Tabs>
        </>
      )}
    </AppLayout>
  );
};

export default AdvancedTokenIntelligence;
