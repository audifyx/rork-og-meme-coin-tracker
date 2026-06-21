import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { FileText, ExternalLink, Loader2, RefreshCw, Sparkles, Download } from "lucide-react";

type Report = {
  id: string; query: string | null; instructions: string | null;
  token_name: string | null; token_symbol: string | null; token_mint: string | null;
  source: string | null; public_url: string | null; created_at: string;
};

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
};

const fileName = (r: Report) => {
  const base = (r.token_symbol || r.token_name || "report").replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return `${base || "report"}_report.html`;
};

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(60);
      setReports((data as Report[]) || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Fetch the report as a blob and save it as an .html file so it opens
  // fully rendered locally (the hosted file is served as text).
  const download = async (r: Report) => {
    if (!r.public_url) { toast.error("No file for this report"); return; }
    setDownloading(r.id);
    try {
      const res = await fetch(r.public_url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(new Blob([blob], { type: "text/html" }));
      const a = document.createElement("a");
      a.href = url; a.download = fileName(r);
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded — open it to view");
    } catch {
      toast.error("Download failed. Try Open instead.");
    } finally { setDownloading(null); }
  };

  return (
    <AppLayout>
      <PageHeader title="Reports" description="Every AI-generated OG Scan report from the bot" />
      <div className="px-4 pb-24 max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white/40 text-[12px]">{reports.length} report{reports.length === 1 ? "" : "s"}</div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {loading && !reports.length ? (
          <div className="flex items-center gap-2 text-white/40 text-[13px] p-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading reports…</div>
        ) : reports.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.map((r) => (
              <Card key={r.id} className="glass-card p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="h-4 w-4 text-og-lime shrink-0" />
                  <span className="font-semibold text-white/90 text-[14px] truncate">{r.token_name || r.token_symbol || "Report"}{r.token_symbol ? ` ($${r.token_symbol})` : ""}</span>
                  <Badge variant="outline" className="ml-auto text-[9px] uppercase shrink-0">{r.source || "bot"}</Badge>
                </div>
                {r.instructions ? (
                  <div className="text-white/45 text-[11px] flex items-start gap-1 mb-1.5"><Sparkles className="h-3 w-3 mt-0.5 text-og-cyan shrink-0" /><span className="line-clamp-2">{r.instructions}</span></div>
                ) : null}
                {r.token_mint ? <div className="text-white/25 text-[10px] font-mono truncate">{r.token_mint}</div> : null}
                <div className="text-white/30 text-[10px] mt-0.5 mb-3">{ago(r.created_at)}</div>

                <div className="flex items-center gap-2 mt-auto">
                  <Button size="sm" disabled={downloading === r.id || !r.public_url} onClick={() => download(r)}
                    className="flex-1 rounded-xl bg-og-lime/90 text-black hover:bg-og-lime font-bold">
                    {downloading === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                    Download
                  </Button>
                  {r.public_url ? (
                    <a href={r.public_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="rounded-xl" title="Open in new tab"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </a>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-white/30 text-[13px] p-4">No reports yet. Generate one with <code className="text-white/50">/report &lt;ca&gt;</code> in the bot.</div>
        )}
      </div>
    </AppLayout>
  );
}
