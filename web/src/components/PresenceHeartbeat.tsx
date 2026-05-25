import { usePresence } from "@/hooks/usePresence";

/** Invisible component that runs the presence heartbeat + auto level-up */
export function PresenceHeartbeat() {
  usePresence();
  return null;
}
