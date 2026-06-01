/**
 * VoiceLobbies — Pure voice-first hangout rooms backed by the `voice_lobbies` DB table.
 * Each room uses LiveKit SFU for real-time audio (speakers / listeners model).
 * Distinct from Trading Lobbies which are text-chat + watchlist focused.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Mic, MicOff, PhoneOff, Phone, Plus, Lock, Globe,
  Radio, Users, Clock, Crown, ChevronLeft, Loader2,
  Volume2, VolumeX, Tag, Hash, Headphones
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LiveKitVoicePanel } from "@/components/lobbies/LiveKitVoicePanel";
import type { VoicePanelHandle } from "@/components/lobbies/VoicePanel";
import { formatDistanceToNow } from "date-fns";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface VoiceLobby {
  id: string;
  host_id: string;
  community_id: string | null;
  name: string;
  topic: string | null;
  is_private: boolean;
  status: "live" | "scheduled" | "ended";
  tags: string[];
  livekit_room: string;
  speakers_count: number;
  listeners_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  created_at: string;
  updated_at: string;
  recording_enabled: boolean;
  token_gated: boolean;
  max_speakers: number;
  // Enriched
  host_username?: string;
  host_avatar?: string;
}

/* ═══════════════════════════════════════════════════════════════
   VoiceLobbies Page
   ═══════════════════════════════════════════════════════════════ */

const VoiceLobbies: React.FC = () => {
  const { user, profile } = useAuth();
  const [lobbies, setLobbies] = useState<VoiceLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<VoiceLobby | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const voiceRef = useRef<VoicePanelHandle>(null);

  // Create form
  const [cName, setCName] = useState("");
  const [cTopic, setCTopic] = useState("");
  const [cPrivate, setCPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchLobbies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("voice_lobbies")
        .select("*")
        .in("status", ["live", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(50);
      const items = (data || []) as VoiceLobby[];

      // Enrich with host profiles
      const hostIds = [...new Set(items.map((l) => l.host_id))];
      if (hostIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", hostIds);
        const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        items.forEach((l) => {
          const p = map.get(l.host_id) as any;
          if (p) { l.host_username = p.username; l.host_avatar = p.avatar_url; }
        });
      }
      setLobbies(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLobbies(); }, [fetchLobbies]);

  // Real-time updates
  useEffect(() => {
    const ch = supabase.channel("voice-lobbies-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_lobbies" }, fetchLobbies)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLobbies]);

  const createLobby = async () => {
    if (!user) { toast.error("Sign in first"); return; }
    if (!cName.trim()) { toast.error("Name required"); return; }
    setCreating(true);
    try {
      const id = crypto.randomUUID();
      const lkRoom = `voice-${id}`;
      const { data, error } = await supabase.from("voice_lobbies").insert({
        id,
        host_id: user.id,
        name: cName.trim(),
        topic: cTopic.trim() || null,
        is_private: cPrivate,
        status: "live",
        tags: [],
        livekit_room: lkRoom,
        speakers_count: 0,
        listeners_count: 0,
        started_at: new Date().toISOString(),
        recording_enabled: false,
        token_gated: false,
        gate_type: "none",
        gate_config: {},
        max_speakers: 8,
      }).select().maybeSingle();
      if (error) throw error;
      toast.success("🎙️ Voice lobby created!");
      setShowCreate(false);
      setCName(""); setCTopic(""); setCPrivate(false);
      await fetchLobbies();
      if (data) setActive(data as VoiceLobby);
    } catch (e: any) {
      toast.error(e.message || "Failed to create lobby");
    } finally { setCreating(false); }
  };

  const leaveLobby = async () => {
    if (!active || !user) return;
    try { await voiceRef.current?.leaveVoice(); } catch {}
    // If host, end the lobby
    if (active.host_id === user.id) {
      await supabase.from("voice_lobbies").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", active.id);
    }
    setActive(null);
    fetchLobbies();
  };

  /* ── Inside a lobby ── */
  if (active) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] bg-background/80 backdrop-blur shrink-0">
          <button onClick={leaveLobby}
            className="p-1.5 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-og-lime opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-og-lime" />
              </span>
              <h2 className="text-sm font-black text-white truncate">{active.name}</h2>
            </div>
            {active.topic && <p className="text-[11px] text-white/30 truncate mt-0.5">{active.topic}</p>}
          </div>
          <button onClick={leaveLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-black hover:bg-red-500/30 transition-all">
            <PhoneOff className="h-3.5 w-3.5" /> Leave
          </button>
        </div>

        {/* Voice panel */}
        <div className="flex-1 overflow-y-auto p-4">
          <LiveKitVoicePanel
            ref={voiceRef}
            lobbyId={active.livekit_room}
            lobbyName={active.name}
            hostId={active.host_id}
            autoJoin={true}
            maxSpeakers={active.max_speakers}
          />
        </div>
      </div>
    );
  }

  /* ── Lobby list ── */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-background/80 backdrop-blur shrink-0">
        <div>
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <Headphones className="h-4 w-4 text-og-cyan" /> Voice Lobbies
          </h2>
          <p className="text-[10px] text-white/25 mt-0.5">{lobbies.filter(l => l.status === "live").length} live rooms</p>
        </div>
        {user && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-og-cyan/15 border border-og-cyan/30 text-og-cyan text-[11px] font-black hover:bg-og-cyan/25 transition-all">
            <Plus className="h-3.5 w-3.5" /> New Room
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-white/20 animate-spin" />
          </div>
        ) : lobbies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-og-cyan/10 border border-og-cyan/20 flex items-center justify-center">
              <Mic className="h-7 w-7 text-og-cyan/60" />
            </div>
            <p className="text-sm font-bold text-white/50">No voice lobbies yet</p>
            <p className="text-xs text-white/25">Start a room and hang with the community</p>
            {user && (
              <button onClick={() => setShowCreate(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-og-cyan/15 border border-og-cyan/30 text-og-cyan text-xs font-black hover:bg-og-cyan/25 transition-all">
                🎙️ Create First Room
              </button>
            )}
          </div>
        ) : (
          lobbies.map((lobby) => {
            const live = lobby.status === "live";
            const totalPeople = (lobby.speakers_count || 0) + (lobby.listeners_count || 0);
            return (
              <div key={lobby.id} className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    live ? "bg-og-lime/10 border border-og-lime/20" : "bg-white/[0.04] border border-white/[0.08]")}>
                    {live
                      ? <Radio className="h-5 w-5 text-og-lime" />
                      : <Clock className="h-5 w-5 text-white/30" />
                    }
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {live && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-og-lime">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-og-lime opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-og-lime" />
                          </span>
                          LIVE
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-white truncate">{lobby.name}</h3>
                      {lobby.is_private && <Lock className="h-3 w-3 text-white/25 shrink-0" />}
                    </div>
                    {lobby.topic && (
                      <p className="text-[11px] text-white/40 mt-0.5 truncate">{lobby.topic}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {lobby.host_username && (
                        <span className="flex items-center gap-1 text-[10px] text-white/25">
                          <Crown className="h-3 w-3" /> {lobby.host_username}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-white/25">
                        <Mic className="h-3 w-3" /> {lobby.speakers_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-white/25">
                        <Headphones className="h-3 w-3" /> {lobby.listeners_count || 0}
                      </span>
                      <span className="text-[10px] text-white/15">
                        {formatDistanceToNow(new Date(lobby.started_at || lobby.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {lobby.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {lobby.tags.map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/30 font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Join button */}
                  {live && (
                    <button onClick={() => setActive(lobby)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-og-lime/15 border border-og-lime/30 text-og-lime text-[11px] font-black hover:bg-og-lime/25 hover:scale-105 active:scale-95 transition-all">
                      <Phone className="h-3.5 w-3.5" /> Join
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center px-3"
          onClick={() => setShowCreate(false)}>
          <div className="bg-[#08080e] border border-white/[0.09] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
              <div className="w-8 h-8 rounded-xl bg-og-cyan/10 border border-og-cyan/20 flex items-center justify-center">
                <Mic className="h-4 w-4 text-og-cyan" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-white">Start a Voice Room</h3>
                <p className="text-[10px] text-white/30">Live audio hangout with the community</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-white/25 hover:text-white/60">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-1.5">Room Name *</label>
                <input
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  placeholder="e.g. Alpha Hunters 🔥"
                  maxLength={60}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-og-cyan/40 transition-colors"
                />
              </div>

              {/* Topic */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-1.5">Topic / Description</label>
                <input
                  value={cTopic}
                  onChange={e => setCTopic(e.target.value)}
                  placeholder="What are you talking about?"
                  maxLength={120}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-og-cyan/40 transition-colors"
                />
              </div>

              {/* Privacy toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={cn("relative w-10 h-5 rounded-full transition-colors",
                  cPrivate ? "bg-og-cyan" : "bg-white/[0.08]")}
                  onClick={() => setCPrivate(!cPrivate)}>
                  <div className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                    cPrivate && "translate-x-5")} />
                </div>
                <span className="text-xs text-white/60">Private room</span>
              </label>

              <button onClick={createLobby} disabled={creating || !cName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-og-cyan text-background text-sm font-black uppercase tracking-wider disabled:opacity-40 hover:bg-og-cyan/90 transition-all">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                {creating ? "Creating…" : "Start Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceLobbies;
