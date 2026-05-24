/**
 * QAQueue — Q&A mode for Spaces.
 * Listeners submit text questions. Host picks which to answer. Live queue visible to all.
 */
import React, { useState, useEffect } from "react";
import { MessageCircleQuestion, Send, CheckCircle, XCircle, ChevronUp, ArrowUp, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  space_id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  question: string;
  is_answered: boolean;
  is_dismissed: boolean;
  upvotes: number;
  created_at: string;
}

interface QAQueueProps {
  spaceId: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  isHost: boolean;
  isCoHost?: boolean;
}

const QAQueue: React.FC<QAQueueProps> = ({ spaceId, userId, username, avatarUrl, isHost, isCoHost }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());

  // Fetch + subscribe
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("space_qa_questions")
        .select("*").eq("space_id", spaceId).eq("is_dismissed", false)
        .order("upvotes", { ascending: false }).order("created_at", { ascending: true });
      if (data) setQuestions(data as Question[]);
    };
    fetch();

    const channel = supabase.channel(`qa-${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "space_qa_questions", filter: `space_id=eq.${spaceId}` },
        (payload) => {
          if (payload.eventType === "INSERT") setQuestions(prev => [...prev, payload.new as Question]);
          else if (payload.eventType === "UPDATE") setQuestions(prev => prev.map(q => q.id === (payload.new as Question).id ? payload.new as Question : q));
          else if (payload.eventType === "DELETE") setQuestions(prev => prev.filter(q => q.id !== (payload.old as any).id));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  const submitQuestion = async () => {
    const q = input.trim();
    if (!q) return;
    setSending(true);
    await supabase.from("space_qa_questions").insert({
      space_id: spaceId, user_id: userId, username, avatar_url: avatarUrl, question: q,
    });
    setInput("");
    setSending(false);
  };

  const markAnswered = async (id: string) => {
    await supabase.from("space_qa_questions").update({ is_answered: true }).eq("id", id);
  };

  const dismiss = async (id: string) => {
    await supabase.from("space_qa_questions").update({ is_dismissed: true }).eq("id", id);
  };

  const upvote = async (id: string) => {
    if (upvoted.has(id)) return;
    setUpvoted(prev => new Set(prev).add(id));
    const q = questions.find(x => x.id === id);
    if (q) await supabase.from("space_qa_questions").update({ upvotes: (q.upvotes || 0) + 1 }).eq("id", id);
  };

  const pending = questions.filter(q => !q.is_answered && !q.is_dismissed);
  const answered = questions.filter(q => q.is_answered);

  return (
    <div className="space-y-2">
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-[11px] font-bold text-white/50">Q&A</span>
          {pending.length > 0 && (
            <span className="text-[9px] font-bold text-purple-400 px-1.5 py-0.5 rounded-full bg-purple-500/10">
              {pending.length} pending
            </span>
          )}
        </div>
        <ChevronUp className={cn("h-3 w-3 text-white/20 transition-transform", !expanded && "rotate-180")} />
      </button>

      {expanded && (
        <>
          {/* Question input */}
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitQuestion()}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[12px] text-white placeholder:text-white/15 focus:outline-none focus:border-purple-500/20" />
            <button onClick={submitQuestion} disabled={sending || !input.trim()}
              className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 disabled:opacity-30 transition-all">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Questions list */}
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
            {pending.map(q => (
              <div key={q.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 flex gap-2.5">
                {/* Upvote */}
                <button onClick={() => upvote(q.id)}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all",
                    upvoted.has(q.id) ? "bg-purple-500/10 text-purple-400" : "bg-white/[0.03] text-white/20 hover:text-purple-400 hover:bg-purple-500/5"
                  )}>
                  <ArrowUp className="h-3 w-3" />
                  <span className="text-[9px] font-bold">{q.upvotes || 0}</span>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/70 leading-relaxed">{q.question}</p>
                  <p className="text-[9px] text-white/20 mt-0.5">@{q.username || "anon"}</p>
                </div>

                {/* Host actions */}
                {(isHost || isCoHost) && (
                  <div className="shrink-0 flex flex-col gap-1">
                    <button onClick={() => markAnswered(q.id)}
                      className="p-1.5 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400/50 hover:text-emerald-400 transition-all" title="Mark answered">
                      <CheckCircle className="h-3 w-3" />
                    </button>
                    <button onClick={() => dismiss(q.id)}
                      className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-red-500/10 text-white/15 hover:text-red-400 transition-all" title="Dismiss">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {answered.length > 0 && (
              <div className="pt-1">
                <p className="text-[9px] text-white/15 font-bold px-1 mb-1">Answered</p>
                {answered.slice(0, 5).map(q => (
                  <div key={q.id} className="rounded-lg bg-white/[0.01] p-2 mb-1 opacity-50">
                    <p className="text-[11px] text-white/30 line-through">{q.question}</p>
                    <p className="text-[8px] text-emerald-400/40 mt-0.5">✓ Answered</p>
                  </div>
                ))}
              </div>
            )}

            {questions.length === 0 && (
              <p className="text-[10px] text-white/15 text-center py-3">No questions yet — be the first!</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default QAQueue;
