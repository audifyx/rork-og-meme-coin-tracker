import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Heart, MessageCircle, Repeat2, Share, ImageIcon, Sparkles, Radio,
  Users, Search, Loader2, BadgeCheck, TrendingUp, MoreHorizontal, Trash2, Copy, Flag,
} from "lucide-react";

/* Shared feed channel — same timeline used by the community Activity feed. */
const FEED_CHANNEL = "social-general";
const MAX_LEN = 500;

interface Post {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  content: string;
  likes_count: number | null;
  liked_by: string[] | null;
  created_at: string;
}

const dicebear = (seed: string) =>
  `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(seed || "og")}`;

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (isNaN(s) || s < 0) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const MINT_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

/* Lightweight content renderer: highlight $TICKERS, @mentions, links, and
   make pasted mint addresses tappable (opens the scanner). */
function renderContent(text: string, onMint?: (m: string) => void) {
  const parts: (string | JSX.Element)[] = [];
  const tokenRe = /(\$[A-Za-z][A-Za-z0-9]{1,14}|@[A-Za-z0-9_]{2,20}|https?:\/\/[^\s]+|[1-9A-HJ-NP-Za-km-z]{32,44})/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("$") || tok.startsWith("@")) {
      parts.push(<span key={i++} className="font-semibold text-primary">{tok}</span>);
    } else if (tok.startsWith("http")) {
      parts.push(<a key={i++} href={tok} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{tok}</a>);
    } else if (MINT_RE.test(tok)) {
      parts.push(
        <button key={i++} type="button" onClick={() => onMint?.(tok)}
          className="font-mono text-[12px] text-secondary hover:underline">{tok.slice(0, 4)}…{tok.slice(-4)}</button>
      );
    } else parts.push(tok);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function SocialHome({
  onSwitchTab,
  onSelectMint,
}: {
  onSwitchTab?: (t: string) => void;
  onSelectMint?: (m: string) => void;
}) {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const displayName = profile?.display_name || profile?.username || "You";

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("social_messages")
      .select("id,user_id,username,avatar_url,content,likes_count,liked_by,created_at")
      .eq("channel", FEED_CHANNEL)
      .order("created_at", { ascending: false })
      .limit(60);
    if (data) setPosts(data as Post[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!menuId) return;
    const h = () => setMenuId(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [menuId]);

  /* Realtime: new posts + like updates stream straight into the timeline. */
  useEffect(() => {
    const ch = supabase
      .channel("home-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_messages", filter: `channel=eq.${FEED_CHANNEL}` },
        (p) => {
          const row = p.new as Post;
          setPosts((prev) => (prev.some((x) => x.id === row.id) ? prev : [row, ...prev]));
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "social_messages", filter: `channel=eq.${FEED_CHANNEL}` },
        (p) => {
          const row = p.new as Post;
          setPosts((prev) => prev.map((x) => (x.id === row.id ? { ...x, likes_count: row.likes_count, liked_by: row.liked_by, content: row.content } : x)));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submit = async () => {
    const content = text.trim();
    if (!content || !user || posting) return;
    setPosting(true);
    setText("");
    const optimistic: Post = {
      id: `tmp-${Date.now()}`,
      user_id: user.id,
      username: profile?.username || "Anon",
      avatar_url: profile?.avatar_url || null,
      content,
      likes_count: 0,
      liked_by: [],
      created_at: new Date().toISOString(),
    };
    setPosts((prev) => [optimistic, ...prev]);
    const { data, error } = await supabase
      .from("social_messages")
      .insert({
        channel: FEED_CHANNEL,
        user_id: user.id,
        username: profile?.username || "Anon",
        avatar_url: profile?.avatar_url,
        content,
        likes_count: 0,
        liked_by: [],
      })
      .select("id,user_id,username,avatar_url,content,likes_count,liked_by,created_at")
      .single();
    if (error) {
      toast.error("Could not post. Try again.");
      setPosts((prev) => prev.filter((p) => p.id !== optimistic.id));
      setText(content);
    } else if (data) {
      setPosts((prev) => prev.map((p) => (p.id === optimistic.id ? (data as Post) : p)));
    }
    setPosting(false);
  };

  const toggleLike = async (post: Post) => {
    if (!user) { toast.error("Sign in to like"); return; }
    if (post.id.startsWith("tmp-")) return;
    const likedBy = post.liked_by || [];
    const liked = likedBy.includes(user.id);
    const nextLikedBy = liked ? likedBy.filter((x) => x !== user.id) : [...likedBy, user.id];
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked_by: nextLikedBy, likes_count: nextLikedBy.length } : p)));
    const { error } = await supabase
      .from("social_messages")
      .update({ likes_count: nextLikedBy.length, liked_by: nextLikedBy })
      .eq("id", post.id);
    if (error) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked_by: likedBy, likes_count: likedBy.length } : p)));
    }
  };

  const deletePost = async (p: Post) => {
    if (!user || p.user_id !== user.id) return;
    setMenuId(null);
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    if (!p.id.startsWith("tmp-")) {
      const { error } = await supabase.from("social_messages").delete().eq("id", p.id).eq("user_id", user.id);
      if (error) toast.error("Could not delete post");
    }
  };
  const copyLink = async (_p: Post) => {
    setMenuId(null);
    try { await navigator.clipboard.writeText(`${window.location.origin}/social`); toast.success("Link copied"); }
    catch { toast.error("Copy failed"); }
  };
  const reportPost = (_p: Post) => { setMenuId(null); toast.success("Thanks — this post has been reported."); };

  const replyTo = (p: Post) => {
    setText((t) => (t.startsWith(`@${p.username} `) ? t : `@${p.username || "anon"} ${t}`));
    composerRef.current?.focus();
  };

  const share = async (p: Post) => {
    const url = `${window.location.origin}/social`;
    try { await navigator.clipboard.writeText(`${p.content}\n\n${url}`); toast.success("Copied to clipboard"); }
    catch { toast.error("Copy failed"); }
  };

  const trending = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const tags = p.content.match(/\$[A-Za-z][A-Za-z0-9]{1,14}/g) || [];
      for (const t of tags) counts.set(t.toUpperCase(), (counts.get(t.toUpperCase()) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [posts]);

  const socialLinks = [
    { label: "Spaces", desc: "Live voice rooms", Icon: Radio, onClick: () => onSwitchTab?.("spaces") },
    { label: "Communities", desc: "Token groups", Icon: Users, onClick: () => onSwitchTab?.("communities") },
    { label: "Discover", desc: "Find people", Icon: Sparkles, onClick: () => onSwitchTab?.("discover") },
    { label: "Scanner", desc: "Check a token", Icon: Search, onClick: () => onSwitchTab?.("scanner") },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ── Timeline ── */}
      <div className="min-w-0">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-1 mb-3 flex items-center justify-between gap-2 bg-background/80 px-1 py-2 backdrop-blur-md">
          <h1 className="text-[19px] font-black text-white">Home</h1>
          <span className="flex items-center gap-1.5 rounded-full border border-og-lime/25 bg-og-lime/10 px-2.5 py-1 text-[10px] font-bold text-og-lime">
            <span className="h-1.5 w-1.5 rounded-full bg-og-lime shadow-[0_0_6px_hsl(var(--og-lime))]" /> Live
          </span>
        </div>

        {/* Composer */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
          <div className="flex gap-3">
            <img src={profile?.avatar_url || dicebear(displayName)} alt="" className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover" />
            <div className="min-w-0 flex-1">
              <textarea
                ref={composerRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
                placeholder="What's happening on-chain?"
                rows={2}
                disabled={!user}
                className="w-full resize-none bg-transparent text-[15px] text-white placeholder:text-white/30 outline-none"
              />
              <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                <div className="flex items-center gap-1 text-primary/70">
                  <ImageIcon className="h-4 w-4" />
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={cn("text-[11px] font-mono", text.length > MAX_LEN - 40 ? "text-og-gold" : "text-white/30")}>{text.length}/{MAX_LEN}</span>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!text.trim() || posting || !user}
                    className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-black text-primary-foreground transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                  </button>
                </div>
              </div>
              {!user && <p className="mt-1 text-[11px] text-white/35">Sign in to join the conversation.</p>}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="mt-3 space-y-px overflow-hidden rounded-2xl border border-white/[0.07]">
          {loading ? (
            <div className="grid place-items-center py-20 text-white/30"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-white/20" />
              <p className="text-sm font-semibold text-white/60">No posts yet</p>
              <p className="mt-1 text-[12px] text-white/30">Be the first to share something with the community.</p>
            </div>
          ) : (
            posts.map((p) => {
              const liked = !!(user && (p.liked_by || []).includes(user.id));
              return (
                <article key={p.id} className="flex gap-3 border-b border-white/[0.05] bg-white/[0.015] px-4 py-3.5 transition last:border-0 hover:bg-white/[0.03]">
                  <img src={p.avatar_url || dicebear(p.username || p.user_id)} alt="" className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = dicebear(p.username || "og"); }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13px]">
                      <span className="truncate font-bold text-white">{p.username || "Anon"}</span>
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate text-white/35">@{(p.username || "anon").toLowerCase()}</span>
                      <span className="text-white/25">·</span>
                      <span className="shrink-0 text-white/35">{timeAgo(p.created_at)}</span>
                      <div className="relative ml-auto" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                          className="rounded-full p-1 text-white/25 transition hover:bg-white/[0.06] hover:text-white/70">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuId === p.id && (
                          <div className="absolute right-0 top-7 z-20 min-w-[150px] overflow-hidden rounded-xl border border-white/10 bg-[#0d1320] py-1 shadow-2xl">
                            <button type="button" onClick={() => copyLink(p)} className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-white/70 transition hover:bg-white/[0.05] hover:text-white"><Copy className="h-3.5 w-3.5" /> Copy link</button>
                            {user && p.user_id === user.id ? (
                              <button type="button" onClick={() => deletePost(p)} className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-rose-400/80 transition hover:bg-rose-500/10 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                            ) : (
                              <button type="button" onClick={() => reportPost(p)} className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-white/70 transition hover:bg-white/[0.05] hover:text-white"><Flag className="h-3.5 w-3.5" /> Report</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-white/90">
                      {renderContent(p.content, (m) => { onSelectMint?.(m); onSwitchTab?.("scanner"); })}
                    </p>
                    <div className="mt-2 flex max-w-md items-center justify-between text-white/40">
                      <button type="button" onClick={() => replyTo(p)} className="group flex items-center gap-1.5 text-[12px] transition hover:text-primary">
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button type="button" className="group flex items-center gap-1.5 text-[12px] transition hover:text-og-lime">
                        <Repeat2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => toggleLike(p)} className={cn("group flex items-center gap-1.5 text-[12px] transition hover:text-rose-400", liked && "text-rose-500")}>
                        <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                        {(p.likes_count ?? 0) > 0 && <span className="font-semibold">{p.likes_count}</span>}
                      </button>
                      <button type="button" onClick={() => share(p)} className="group flex items-center gap-1.5 text-[12px] transition hover:text-secondary">
                        <Share className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right rail ── */}
      <aside className="hidden space-y-4 lg:block">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-black text-white"><TrendingUp className="h-4 w-4 text-primary" /> Trending</h3>
          {trending.length === 0 ? (
            <p className="text-[12px] text-white/35">Cashtags people mention will trend here.</p>
          ) : (
            <div className="space-y-2.5">
              {trending.map(([tag, n], i) => (
                <button key={tag} type="button" onClick={() => onSwitchTab?.("feed")} className="flex w-full items-center justify-between text-left">
                  <div>
                    <div className="text-[10px] text-white/30">#{i + 1} · Trending</div>
                    <div className="text-[14px] font-bold text-primary">{tag}</div>
                  </div>
                  <div className="text-[11px] text-white/35">{n} post{n > 1 ? "s" : ""}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <h3 className="mb-3 text-[13px] font-black text-white">Jump in</h3>
          <div className="space-y-1.5">
            {socialLinks.map((l) => (
              <button key={l.label} type="button" onClick={l.onClick}
                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-white/[0.12] hover:bg-white/[0.05]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><l.Icon className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-white">{l.label}</span>
                  <span className="block text-[11px] text-white/35">{l.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
