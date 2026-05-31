import { useIntercom } from "@/hooks/useIntercom";

/** Keeps Intercom / Fin messenger in sync with auth state. Renders nothing. */
export const IntercomSync = () => {
  useIntercom();
  return null;
};
