import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, ThumbsUp, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ResearchNote {
  id: string;
  mint: string;
  author: string;
  content: string;
  category: "flag" | "positive" | "analysis" | "question";
  upvotes: number;
  created_at: string;
  user_upvoted?: boolean;
}

interface ResearchNotesProps {
  mint: string;
  token: any;
  user: any;
}

export const ResearchNotes = ({ mint, token, user }: ResearchNotesProps) => {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [category, setCategory] = useState<"flag" | "positive" | "analysis" | "question">("analysis");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [mint]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("token_research_notes")
        .select("*")
        .eq("mint", mint)
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error("Error loading notes:", err);
      toast.error("Failed to load research notes");
    } finally {
      setLoading(false);
    }
  };

  const handlePostNote = async () => {
    if (!user) {
      toast.error("You must be logged in to post");
      return;
    }

    if (!newNote.trim()) {
      toast.error("Please write a note");
      return;
    }

    if (newNote.length < 10) {
      toast.error("Note must be at least 10 characters");
      return;
    }

    setPosting(true);
    try {
      const { error } = await supabase.from("token_research_notes").insert({
        mint,
        author: user.id,
        author_username: user.user_metadata?.username || user.email,
        content: newNote,
        category,
        upvotes: 0,
      });

      if (error) throw error;

      toast.success("Research note posted!");
      setNewNote("");
      setCategory("analysis");
      loadNotes();
    } catch (err: any) {
      console.error("Error posting note:", err);
      toast.error(err?.message || "Failed to post note");
    } finally {
      setPosting(false);
    }
  };

  const handleUpvote = async (noteId: string) => {
    if (!user) {
      toast.error("You must be logged in to upvote");
      return;
    }

    try {
      // This would normally use a votes table to track user votes
      // For now, just increment the count
      const { error } = await supabase
        .from("token_research_notes")
        .update({ upvotes: notes.find(n => n.id === noteId)!.upvotes + 1 })
        .eq("id", noteId);

      if (error) throw error;
      loadNotes();
    } catch (err) {
      toast.error("Failed to upvote");
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "flag":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "positive":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "analysis":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "question":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-white/10 text-white/60";
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "flag":
        return "🚨";
      case "positive":
        return "✅";
      case "analysis":
        return "🔍";
      case "question":
        return "❓";
      default:
        return "📝";
    }
  };

  return (
    <div className="space-y-4">
      {/* Post new note */}
      {user && (
        <Card className="p-4 glass-card border-white/10">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#22d3ee]" />
            Add Your Findings
          </h3>
          <div className="space-y-3">
            <Textarea
              placeholder="Share what you've discovered about this token... (min 10 characters)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="bg-white/5 border-white/10 text-sm resize-none"
              rows={4}
            />
            <div className="flex gap-2 items-center">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="text-xs px-3 py-2 rounded bg-white/5 border border-white/10 text-white"
              >
                <option value="analysis">🔍 Analysis</option>
                <option value="flag">🚨 Red Flag</option>
                <option value="positive">✅ Positive Signal</option>
                <option value="question">❓ Question</option>
              </select>
              <Button
                onClick={handlePostNote}
                disabled={posting || !newNote.trim()}
                className="btn-3d gap-2 ml-auto"
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Post
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Research notes list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : notes.length === 0 ? (
          <Card className="p-8 text-center glass-card border-white/5">
            <FileText className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No research notes yet</p>
            <p className="text-xs text-white/30 mt-1">Be the first to share your findings!</p>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-4 glass-card border-white/5 hover:border-white/10 transition">
              <div className="flex gap-3">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(note.category)}</span>
                      <Badge className={`text-[10px] ${getCategoryColor(note.category)}`}>
                        {note.category.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-white/80 mb-2">{note.content}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{note.author_username || "Anonymous"}</span>
                    <span>•</span>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleUpvote(note.id)}
                  variant="ghost"
                  className="flex-shrink-0 gap-1 text-white/40 hover:text-white/60 hover:bg-white/5"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-xs">{note.upvotes}</span>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
