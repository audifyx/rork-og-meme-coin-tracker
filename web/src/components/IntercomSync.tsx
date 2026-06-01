import { useEffect } from "react";
import Intercom from "@intercom/messenger-js-sdk";
import { useAuth } from "@/hooks/useAuth";

export function IntercomSync() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      Intercom({
        app_id: "wlc3xyxr",
        user_id: user.id,
        name: profile?.display_name || profile?.username || user.email || undefined,
        email: user.email || undefined,
        created_at: profile?.created_at
          ? Math.floor(new Date(profile.created_at).getTime() / 1000)
          : Math.floor(new Date(user.created_at).getTime() / 1000),
      });
    } else {
      // Logged-out visitor — boot without identity
      Intercom({ app_id: "wlc3xyxr" });
    }
  }, [user?.id, profile?.id]);

  return null;
}
