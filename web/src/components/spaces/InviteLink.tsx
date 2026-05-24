/**
 * InviteLink — Generate shareable invite links with optional role assignment.
 * Links can pre-assign speaker or listener role when someone joins.
 */
import React, { useState } from "react";
import { Link2, Copy, Check, Mic, Headphones, Share2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteLinkProps {
  spaceId: string;
  spaceName: string;
  isHost: boolean;
}

const InviteLink: React.FC<InviteLinkProps> = ({ spaceId, spaceName, isHost }) => {
  const [role, setRole] = useState<"listener" | "speaker">("listener");
  const [copied, setCopied] = useState(false);

  const baseUrl = `${window.location.origin}`;
  const inviteUrl = `${baseUrl}?join=${spaceId}&role=${role}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: `Join: ${spaceName}`, text: `Join this OG Space: ${spaceName}`, url: inviteUrl });
    } else {
      copyLink();
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-[11px] font-bold text-white/50">Invite Link</span>
      </div>

      {/* Role selector */}
      {isHost && (
        <div className="flex gap-2">
          <button onClick={() => setRole("listener")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all border",
              role === "listener"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-white/[0.03] text-white/25 border-white/[0.06] hover:bg-white/[0.05]"
            )}>
            <Headphones className="h-3 w-3" /> Listener
          </button>
          <button onClick={() => setRole("speaker")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all border",
              role === "speaker"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-white/[0.03] text-white/25 border-white/[0.06] hover:bg-white/[0.05]"
            )}>
            <Mic className="h-3 w-3" /> Speaker
          </button>
        </div>
      )}

      {/* Link display */}
      <div className="flex gap-1.5">
        <div className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/30 font-mono truncate">
          {inviteUrl}
        </div>
        <button onClick={copyLink}
          className={cn(
            "px-3 py-2 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold",
            copied
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-white/[0.04] text-white/30 border border-white/[0.06] hover:bg-white/[0.08]"
          )}>
          {copied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>

      {/* Share button */}
      <button onClick={shareNative}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold hover:bg-blue-500/20 transition-all">
        <Share2 className="h-3.5 w-3.5" /> Share Invite
      </button>
    </div>
  );
};

export default InviteLink;
