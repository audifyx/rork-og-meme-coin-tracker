/**
 * SpaceNotifications — In-app notification center for Space events.
 * Shows when spaces you follow go live, when you get promoted, etc.
 */
import React, { useState, useEffect } from "react";
import { Bell, Radio, Mic, Users, ChevronRight, X, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpaceNotification {
  id: string;
  type: "space_live" | "promoted" | "mentioned" | "space_ending" | "reminder";
  title: string;
  message: string;
  spaceId?: string;
  timestamp: number;
  read: boolean;
}

interface SpaceNotificationsProps {
  onNavigateToSpace?: (spaceId: string) => void;
}

const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  space_live: { icon: Radio, color: "text-emerald-400 bg-emerald-500/10" },
  promoted: { icon: Mic, color: "text-amber-400 bg-amber-500/10" },
  mentioned: { icon: Users, color: "text-blue-400 bg-blue-500/10" },
  space_ending: { icon: Clock, color: "text-red-400 bg-red-500/10" },
  reminder: { icon: Bell, color: "text-purple-400 bg-purple-500/10" },
};

const SpaceNotifications: React.FC<SpaceNotificationsProps> = ({ onNavigateToSpace }) => {
  const [notifications, setNotifications] = useState<SpaceNotification[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("og-space-notifications");
      if (stored) setNotifications(JSON.parse(stored));
    } catch {}
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem("og-space-notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem("og-space-notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem("og-space-notifications");
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button onClick={() => setShowPanel(!showPanel)}
        className={cn(
          "relative p-2 rounded-xl transition-all",
          showPanel ? "bg-white/[0.08] text-white/60" : "bg-white/[0.04] text-white/30 hover:bg-white/[0.06]"
        )}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-[#0c1219] rounded-2xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <div className="flex gap-1.5">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[9px] text-blue-400/60 hover:text-blue-400 font-bold px-2 py-1 rounded-lg hover:bg-blue-500/5 transition-all">
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-[9px] text-white/20 hover:text-red-400 font-bold px-2 py-1 rounded-lg hover:bg-red-500/5 transition-all">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {notifications.length === 0 && (
                <div className="text-center py-10">
                  <Bell className="h-8 w-8 mx-auto text-white/[0.06] mb-2" />
                  <p className="text-[11px] text-white/15">No notifications yet</p>
                </div>
              )}
              {notifications.map(n => {
                const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.reminder;
                const Icon = cfg.icon;
                return (
                  <button key={n.id}
                    onClick={() => { markRead(n.id); if (n.spaceId && onNavigateToSpace) onNavigateToSpace(n.spaceId); }}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors border-b border-white/[0.04]",
                      !n.read && "bg-white/[0.01]"
                    )}>
                    <div className={cn("shrink-0 w-8 h-8 rounded-xl flex items-center justify-center", cfg.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[11px] font-bold", n.read ? "text-white/40" : "text-white/80")}>{n.title}</p>
                      <p className="text-[10px] text-white/25 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[8px] text-white/15 mt-1">{formatTime(n.timestamp)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SpaceNotifications;

// Helper to push a notification from anywhere
export const pushSpaceNotification = (notif: Omit<SpaceNotification, "id" | "timestamp" | "read">) => {
  try {
    const stored = localStorage.getItem("og-space-notifications");
    const existing: SpaceNotification[] = stored ? JSON.parse(stored) : [];
    const entry: SpaceNotification = {
      ...notif,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      read: false,
    };
    const updated = [entry, ...existing].slice(0, 50); // Cap at 50
    localStorage.setItem("og-space-notifications", JSON.stringify(updated));
  } catch {}
};
