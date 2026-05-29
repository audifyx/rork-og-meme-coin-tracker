/**
 * RaidTab — Community Raid queue + active raid interactive view.
 *
 * Users pick a community post, set like/comment/repost goals, and start a raid.
 * Raids auto-run for 30 min or until goals are met. All engagement syncs to
 * the community_posts counters so likes here = likes everywhere.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Repeat2,
  Send,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

/* ────────── Types ────────── */
type CommunityPost = {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  comments_count: number;
  created_at: string;
  post_type: string;
};

type Raid = {
  id: string;
  room_id: string;
  post_id: string;
  creator_id: string;
  target_likes: number;
  target_comments: number;
  target_reposts: number;
  current_likes: number;
  current_comments: number;
  current_reposts: number;
  status: "queued" | "active" | "completed" | "expired";
  started_at: string | null;
  ends_at: string | null;
  completed_at: string | null;
  created_at: string;
  post?: CommunityPost;
  creator?: { username: string; avatar_url: string | null };
  participant_count?: number;
};

type Participant = {
  raid_id: string;
  user_id: string;
  liked: boolean;
  commented: boolean;
  reposted: boolean;
};

/* ────────── Props ────────── */
type RaidTabProps = {
  roomId: string;
};

/* ────────── Helpers ────────── */
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function progressPct(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((current / target) * 100));
}

/* ────────── Component ────────── */
export function RaidTab({ roomId }: RaidTabProps) {
  const { user } = useAuth();

  /* ── State ── */
  const [raids, setRaids] = useState<Raid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [goals, setGoals] = useState({ likes: 20, comments: 10, reposts: 10 });
  const [creating, setCreating] = useState(false);
  const [activeRaidView, setActiveRaidView] = useState<Raid | null>(null);
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [participants, setParticipants] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Tick for countdown ── */
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  /* ── Load raids ── */
  const loadRaids = useCallback(async () => {
    const { data, error } = await supabase
      .from("community_raids")
      .select("*")
      .eq("room_id", roomId)
      .in("status", ["queued", "active", "completed"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) { console.error(error); return; }
    if (!data) { setRaids([]); setLoading(false); return; }

    // Hydrate post + creator info
    const postIds = [...new Set(data.map(r => r.post_id))];
    const creatorIds = [...new Set(data.map(r => r.creator_id))];

    const [postsRes, creatorsRes, participantCounts] = await Promise.all([
      postIds.length > 0
        ? supabase.from("community_posts").select("id, user_id, username, avatar_url, content, image_url, likes_count, replies_count, reposts_count, comments_count, created_at, post_type").in("id", postIds)
        : Promise.resolve({ data: [] }),
      creatorIds.length > 0
        ? supabase.from("profiles").select("id, username, avatar_url").in("id", creatorIds)
        : Promise.resolve({ data: [] }),
      supabase.from("community_raid_participants").select("raid_id").in("raid_id", data.map(r => r.id)),
    ]);

    const postsMap = new Map((postsRes.data || []).map(p => [p.id, p]));
    const creatorsMap = new Map((creatorsRes.data || []).map(c => [c.id, c]));

    // Count participants per raid
    const pCountMap = new Map<string, number>();
    for (const p of (participantCounts.data || [])) {
      pCountMap.set(p.raid_id, (pCountMap.get(p.raid_id) || 0) + 1);
    }

    const hydrated: Raid[] = data.map(r => ({
      ...r,
      post: postsMap.get(r.post_id) as CommunityPost | undefined,
      creator: creatorsMap.get(r.creator_id) as { username: string; avatar_url: string | null } | undefined,
      participant_count: pCountMap.get(r.id) || 0,
    }));

    setRaids(hydrated);
    setLoading(false);

    // Auto-advance queued raids to active if none active
    const activeRaid = hydrated.find(r => r.status === "active");
    if (!activeRaid) {
      const nextQueued = hydrated.find(r => r.status === "queued");
      if (nextQueued) {
        await activateRaid(nextQueued.id);
      }
    }
  }, [roomId]);

  useEffect(() => { loadRaids(); }, [loadRaids]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const chan = supabase
      .channel(`raids-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_raids", filter: `room_id=eq.${roomId}` }, () => {
        loadRaids();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_raid_participants" }, () => {
        loadRaids();
        if (activeRaidView && user) loadMyParticipation(activeRaidView.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, [roomId, loadRaids, activeRaidView, user]);

  /* ── Activate a raid (set to active + timer) ── */
  const activateRaid = async (raidId: string) => {
    const startedAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase.from("community_raids").update({
      status: "active",
      started_at: startedAt,
      ends_at: endsAt,
    }).eq("id", raidId).eq("status", "queued");
    loadRaids();
  };

  /* ── Check if active raid expired ── */
  useEffect(() => {
    const active = raids.find(r => r.status === "active");
    if (!active || !active.ends_at) return;
    const remaining = new Date(active.ends_at).getTime() - now;
    if (remaining <= 0) {
      // Expire it
      supabase.from("community_raids").update({
        status: active.current_likes >= active.target_likes &&
                active.current_comments >= active.target_comments &&
                active.current_reposts >= active.target_reposts ? "completed" : "expired",
        completed_at: new Date().toISOString(),
      }).eq("id", active.id).eq("status", "active").then(() => loadRaids());
    }
  }, [raids, now, loadRaids]);

  /* ── Check goals met ── */
  useEffect(() => {
    const active = raids.find(r => r.status === "active");
    if (!active) return;
    if (active.current_likes >= active.target_likes &&
        active.current_comments >= active.target_comments &&
        active.current_reposts >= active.target_reposts) {
      supabase.from("community_raids").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", active.id).eq("status", "active").then(() => {
        toast.success("🎉 Raid complete! All goals reached!");
        loadRaids();
      });
    }
  }, [raids, loadRaids]);

  /* ── Load posts for picker ── */
  const loadPosts = async () => {
    setLoadingPosts(true);
    const { data } = await supabase
      .from("community_posts")
      .select("id, user_id, username, avatar_url, content, image_url, likes_count, replies_count, reposts_count, comments_count, created_at, post_type")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30);
    setPosts(data || []);
    setLoadingPosts(false);
  };

  /* ── Create raid ── */
  const createRaid = async () => {
    if (!user || !selectedPost) return;
    setCreating(true);
    const { error } = await supabase.from("community_raids").insert({
      room_id: roomId,
      post_id: selectedPost.id,
      creator_id: user.id,
      target_likes: goals.likes,
      target_comments: goals.comments,
      target_reposts: goals.reposts,
    });
    setCreating(false);
    if (error) { toast.error(error.message || "Could not create raid"); return; }
    toast.success("Raid added to queue! 🚀");
    setShowCreate(false);
    setSelectedPost(null);
    setGoals({ likes: 20, comments: 10, reposts: 10 });
    loadRaids();
  };

  /* ── Open active raid view ── */
  const openRaidView = async (raid: Raid) => {
    setActiveRaidView(raid);
    if (user) loadMyParticipation(raid.id);
    // Count participants
    const { count } = await supabase
      .from("community_raid_participants")
      .select("*", { count: "exact", head: true })
      .eq("raid_id", raid.id);
    setParticipants(count || 0);
  };

  /* ── Load my participation ── */
  const loadMyParticipation = async (raidId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("community_raid_participants")
      .select("raid_id, user_id, liked, commented, reposted")
      .eq("raid_id", raidId)
      .eq("user_id", user.id)
      .maybeSingle();
    setMyParticipation(data);
  };

  /* ── Participate actions (like/repost) ── */
  const raidAction = async (action: "liked" | "reposted") => {
    if (!user || !activeRaidView) return;
    const raid = raids.find(r => r.id === activeRaidView.id) || activeRaidView;
    if (raid.status !== "active") { toast.error("Raid is not active"); return; }

    // Upsert participant
    const { error: pErr } = await supabase.from("community_raid_participants").upsert(
      { raid_id: raid.id, user_id: user.id, [action]: true },
      { onConflict: "raid_id,user_id" }
    );
    if (pErr) { toast.error("Action failed"); return; }

    // Update raid counter
    const field = action === "liked" ? "current_likes" : "current_reposts";
    await supabase.from("community_raids").update({
      [field]: (raid as any)[field] + 1,
    }).eq("id", raid.id);

    // Sync to community_posts
    if (raid.post) {
      const postField = action === "liked" ? "likes_count" : "reposts_count";
      await supabase.from("community_posts").update({
        [postField]: (raid.post as any)[postField] + 1,
      }).eq("id", raid.post_id);

      // Also insert into the proper engagement table
      if (action === "liked") {
        await supabase.from("community_post_likes").upsert(
          { post_id: raid.post_id, user_id: user.id },
          { onConflict: "post_id,user_id" }
        ).then(() => {});
      } else {
        await supabase.from("community_post_reposts").upsert(
          { post_id: raid.post_id, user_id: user.id },
          { onConflict: "post_id,user_id" }
        ).then(() => {});
      }
    }

    loadMyParticipation(raid.id);
    loadRaids();
  };

  /* ── Post comment ── */
  const postComment = async () => {
    if (!user || !activeRaidView || !commentText.trim()) return;
    const raid = raids.find(r => r.id === activeRaidView.id) || activeRaidView;
    if (raid.status !== "active") { toast.error("Raid is not active"); return; }

    setSendingComment(true);

    // Insert comment
    const { error: cErr } = await supabase.from("community_post_comments").insert({
      post_id: raid.post_id,
      user_id: user.id,
      content: commentText.trim(),
    });

    if (cErr) {
      toast.error("Comment failed");
      setSendingComment(false);
      return;
    }

    // Update raid counter
    await supabase.from("community_raids").update({
      current_comments: raid.current_comments + 1,
    }).eq("id", raid.id);

    // Sync to community_posts
    await supabase.from("community_posts").update({
      comments_count: (raid.post?.comments_count || 0) + 1,
    }).eq("id", raid.post_id);

    // Mark participant
    await supabase.from("community_raid_participants").upsert(
      { raid_id: raid.id, user_id: user.id, commented: true },
      { onConflict: "raid_id,user_id" }
    );

    setCommentText("");
    setSendingComment(false);
    loadMyParticipation(raid.id);
    loadRaids();
    toast.success("Comment posted! 💬");
  };

  /* ── Derived ── */
  const activeRaid = useMemo(() => raids.find(r => r.status === "active"), [raids]);
  const queuedRaids = useMemo(() => raids.filter(r => r.status === "queued"), [raids]);
  const completedRaids = useMemo(() => raids.filter(r => r.status === "completed" || r.status === "expired").slice(0, 10), [raids]);

  const viewRaid = activeRaidView ? (raids.find(r => r.id === activeRaidView.id) || activeRaidView) : null;
  const timeRemaining = viewRaid?.ends_at ? Math.max(0, new Date(viewRaid.ends_at).getTime() - now) : 0;

  /* ────────── Render ────────── */

  // Active raid detail view
  if (viewRaid && viewRaid.post) {
    const post = viewRaid.post;
    const likePct = progressPct(viewRaid.current_likes, viewRaid.target_likes);
    const commentPct = progressPct(viewRaid.current_comments, viewRaid.target_comments);
    const repostPct = progressPct(viewRaid.current_reposts, viewRaid.target_reposts);
    const isActive = viewRaid.status === "active";
    const isComplete = viewRaid.status === "completed";

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <button onClick={() => { setActiveRaidView(null); setMyParticipation(null); }} className="rounded-lg p-1.5 text-white/35 hover:bg-white/[0.05] hover:text-white">
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Zap className={cn("h-4 w-4", isActive ? "text-og-gold animate-pulse" : isComplete ? "text-emerald-400" : "text-white/25")} />
              <span className="text-sm font-black uppercase tracking-widest">
                {isActive ? "RAID ACTIVE" : isComplete ? "RAID COMPLETE" : "RAID EXPIRED"}
              </span>
            </div>
          </div>
          {isActive && (
            <div className="flex items-center gap-1.5 rounded-full border border-og-gold/20 bg-og-gold/10 px-3 py-1">
              <Clock className="h-3.5 w-3.5 text-og-gold" />
              <span className="text-sm font-black tabular-nums text-og-gold">{formatCountdown(timeRemaining)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
            <Users className="h-3 w-3 text-white/40" />
            <span className="text-xs font-bold text-white/50">{viewRaid.participant_count || participants}</span>
          </div>
        </div>

        {/* Post showcase */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-lg">
            {/* Post card */}
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center gap-3">
                {post.avatar_url ? (
                  <img src={post.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/50">
                    {(post.username || "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">{post.username || "Anonymous"}</p>
                  <p className="text-[10px] text-white/30">{timeAgo(post.created_at)}</p>
                </div>
                <span className="ml-auto rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white/25">
                  {post.post_type}
                </span>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{post.content}</p>

              {post.image_url && (
                <img src={post.image_url} alt="" className="mt-3 max-h-[300px] w-full rounded-2xl object-cover" />
              )}
            </div>

            {/* Progress bars */}
            <div className="mt-5 space-y-3">
              {[
                { label: "Likes", icon: Heart, current: viewRaid.current_likes, target: viewRaid.target_likes, pct: likePct, color: "bg-red-400", textColor: "text-red-400" },
                { label: "Comments", icon: MessageCircle, current: viewRaid.current_comments, target: viewRaid.target_comments, pct: commentPct, color: "bg-og-cyan", textColor: "text-og-cyan" },
                { label: "Reposts", icon: Repeat2, current: viewRaid.current_reposts, target: viewRaid.target_reposts, pct: repostPct, color: "bg-og-lime", textColor: "text-og-lime" },
              ].map(item => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <item.icon className={cn("h-3.5 w-3.5", item.textColor)} />
                      <span className="text-xs font-bold text-white/50">{item.label}</span>
                    </div>
                    <span className={cn("text-xs font-black tabular-nums", item.pct >= 100 ? "text-emerald-400" : item.textColor)}>
                      {item.current}/{item.target} {item.pct >= 100 && "✓"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={cn("h-full rounded-full transition-all duration-500", item.color)} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            {isActive && (
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => raidAction("liked")}
                    disabled={myParticipation?.liked}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all",
                      myParticipation?.liked
                        ? "border-red-400/20 bg-red-400/10 text-red-400"
                        : "border-white/[0.08] bg-white/[0.04] text-white hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-400"
                    )}
                  >
                    <Heart className={cn("h-5 w-5", myParticipation?.liked && "fill-current")} />
                    {myParticipation?.liked ? "Liked ✓" : "Like"}
                  </button>
                  <button
                    onClick={() => raidAction("reposted")}
                    disabled={myParticipation?.reposted}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all",
                      myParticipation?.reposted
                        ? "border-og-lime/20 bg-og-lime/10 text-og-lime"
                        : "border-white/[0.08] bg-white/[0.04] text-white hover:border-og-lime/30 hover:bg-og-lime/10 hover:text-og-lime"
                    )}
                  >
                    <Repeat2 className="h-5 w-5" />
                    {myParticipation?.reposted ? "Reposted ✓" : "Repost"}
                  </button>
                </div>

                {/* Comment input */}
                <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                  <MessageCircle className="h-4 w-4 text-white/25" />
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                    placeholder="Drop a comment for the raid..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/20"
                  />
                  <button onClick={postComment} disabled={!commentText.trim() || sendingComment} className={cn("rounded-xl p-2 transition-all", commentText.trim() ? "bg-og-cyan text-background hover:bg-white" : "bg-white/[0.04] text-white/20")}>
                    {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>

                {myParticipation?.commented && (
                  <p className="text-center text-xs text-og-cyan/60">✓ You commented — post more to boost!</p>
                )}
              </div>
            )}

            {isComplete && (
              <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-center">
                <Trophy className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="mt-2 text-sm font-black text-emerald-400">Raid Complete! 🎉</p>
                <p className="mt-1 text-xs text-white/40">All goals were reached. The community delivered.</p>
              </div>
            )}

            {viewRaid.status === "expired" && (
              <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-center">
                <Clock className="mx-auto h-8 w-8 text-white/20" />
                <p className="mt-2 text-sm font-black text-white/40">Time's Up</p>
                <p className="mt-1 text-xs text-white/25">This raid expired before reaching all goals.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Queue / List view ── */
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <Zap className="h-5 w-5 text-og-gold" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black uppercase tracking-widest">Raid Queue</h2>
          <p className="text-[10px] text-white/25">Boost community posts together — 30 min raids</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); loadPosts(); }}
          className="flex items-center gap-1.5 rounded-xl border border-og-cyan/20 bg-og-cyan/10 px-3 py-1.5 text-xs font-black text-og-cyan hover:bg-og-cyan/20"
        >
          <Plus className="h-3.5 w-3.5" /> New Raid
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-og-cyan/60" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active raid banner */}
            {activeRaid && activeRaid.post && (
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-og-gold/60">⚡ Active Now</p>
                <button
                  onClick={() => openRaidView(activeRaid)}
                  className="w-full rounded-2xl border border-og-gold/20 bg-og-gold/[0.06] p-4 text-left transition-all hover:border-og-gold/30 hover:bg-og-gold/[0.1]"
                >
                  <div className="flex items-start gap-3">
                    {activeRaid.post.avatar_url ? (
                      <img src={activeRaid.post.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/50">
                        {(activeRaid.post.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{activeRaid.post.username || "Anonymous"}</p>
                        <Zap className="h-3.5 w-3.5 animate-pulse text-og-gold" />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{activeRaid.post.content}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 rounded-full border border-og-gold/20 bg-og-gold/10 px-2 py-0.5">
                        <Clock className="h-3 w-3 text-og-gold" />
                        <span className="text-[10px] font-black tabular-nums text-og-gold">
                          {activeRaid.ends_at ? formatCountdown(new Date(activeRaid.ends_at).getTime() - now) : "--"}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/25" />
                    </div>
                  </div>
                  {/* Mini progress */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "❤️", c: activeRaid.current_likes, t: activeRaid.target_likes },
                      { label: "💬", c: activeRaid.current_comments, t: activeRaid.target_comments },
                      { label: "🔁", c: activeRaid.current_reposts, t: activeRaid.target_reposts },
                    ].map(g => (
                      <div key={g.label} className="rounded-xl bg-black/30 px-2 py-1 text-center">
                        <span className="text-xs">{g.label}</span>
                        <span className="ml-1 text-[10px] font-black tabular-nums text-white/50">{g.c}/{g.t}</span>
                      </div>
                    ))}
                  </div>
                </button>
              </div>
            )}

            {/* Queued */}
            {queuedRaids.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/25">📋 Up Next ({queuedRaids.length})</p>
                <div className="space-y-2">
                  {queuedRaids.map((raid, i) => raid.post && (
                    <div key={raid.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-xs font-black text-white/30">
                        {i + 1}
                      </div>
                      {raid.post.avatar_url ? (
                        <img src={raid.post.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/40">
                          {(raid.post.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white/60">{raid.post.content}</p>
                        <p className="text-[10px] text-white/25">
                          ❤️{raid.target_likes} · 💬{raid.target_comments} · 🔁{raid.target_reposts}
                        </p>
                      </div>
                      <span className="text-[10px] text-white/20">{timeAgo(raid.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedRaids.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/25">✅ Recent</p>
                <div className="space-y-2">
                  {completedRaids.map(raid => raid.post && (
                    <button
                      key={raid.id}
                      onClick={() => openRaidView(raid)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.015] p-3 text-left opacity-60 transition-all hover:opacity-80"
                    >
                      {raid.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400/60" />
                      ) : (
                        <Clock className="h-5 w-5 shrink-0 text-white/20" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white/50">{raid.post.content}</p>
                        <p className="text-[10px] text-white/20">
                          ❤️{raid.current_likes}/{raid.target_likes} · 💬{raid.current_comments}/{raid.target_comments} · 🔁{raid.current_reposts}/{raid.target_reposts}
                          · {raid.participant_count || 0} raiders
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!activeRaid && queuedRaids.length === 0 && completedRaids.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Target className="h-12 w-12 text-white/10" />
                <p className="mt-3 text-sm font-bold text-white/30">No raids yet</p>
                <p className="mt-1 max-w-xs text-xs text-white/18">Pick a community post and set engagement goals. The community has 30 minutes to make it happen.</p>
                <button
                  onClick={() => { setShowCreate(true); loadPosts(); }}
                  className="mt-4 flex items-center gap-1.5 rounded-xl border border-og-cyan/20 bg-og-cyan/10 px-4 py-2 text-xs font-black text-og-cyan hover:bg-og-cyan/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Start First Raid
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Raid Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#11131b] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">🎯 New Raid</h3>
                <p className="text-xs text-white/30">Pick a post from the community, set goals, and let the squad do the rest.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-white/35 hover:bg-white/[0.05]">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Post picker */}
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/25">Choose a post</p>
              {loadingPosts ? (
                <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
              ) : (
                <div className="max-h-[220px] space-y-1.5 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                  {posts.map(post => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                        selectedPost?.id === post.id ? "border-og-cyan/30 bg-og-cyan/[0.08]" : "border-transparent hover:bg-white/[0.03]"
                      )}
                    >
                      {post.avatar_url ? (
                        <img src={post.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/40">
                          {(post.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-white/70">{post.username || "Anonymous"}</p>
                          <span className="text-[9px] text-white/20">{timeAgo(post.created_at)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-white/40">{post.content}</p>
                        <div className="mt-1 flex gap-2 text-[9px] text-white/20">
                          <span>❤️ {post.likes_count}</span>
                          <span>💬 {post.comments_count}</span>
                          <span>🔁 {post.reposts_count}</span>
                        </div>
                      </div>
                      {post.image_url && (
                        <img src={post.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      )}
                    </button>
                  ))}
                  {posts.length === 0 && (
                    <p className="py-8 text-center text-xs text-white/20">No community posts found</p>
                  )}
                </div>
              )}
            </div>

            {/* Goals */}
            <div className="mb-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/25">Set goals</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "❤️ Likes", key: "likes" as const },
                  { label: "💬 Comments", key: "comments" as const },
                  { label: "🔁 Reposts", key: "reposts" as const },
                ].map(item => (
                  <div key={item.key} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center">
                    <p className="text-[10px] text-white/30">{item.label}</p>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={goals[item.key]}
                      onChange={e => setGoals(prev => ({ ...prev, [item.key]: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="mt-1 w-full bg-transparent text-center text-lg font-black text-white outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={createRaid}
              disabled={!selectedPost || creating}
              className="w-full rounded-xl bg-og-cyan px-4 py-3 text-sm font-black text-background transition-colors hover:bg-white disabled:opacity-40"
            >
              {creating ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "🚀 Add to Raid Queue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
