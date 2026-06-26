// Platform-wide stats endpoint — returns a mix of live and static values.
// Live: daysLive (auto-calculated from OGS token launch date 2026-05-07).
// Static: tokenCount (screener is dynamic, not per-row stored), activeUsers, telegram, xFollowers, volume.
import { send, cache } from "../_lib.js";

// OGS token pair created on Dexscreener: 2026-05-07
const LAUNCH_MS = new Date("2026-05-07T00:00:00Z").getTime();

export default async function handler(_req, res) {
  cache(res, 120, 600); // 2-min fresh, 10-min stale-while-revalidate

  // "Tokens Listed" = tokens surfaced through the screener (discovered dynamically
  // from Jupiter / DexScreener, not stored per-row). Static value updated manually.
  const tokenCount = 847;
  const daysLive = Math.max(1, Math.floor((Date.now() - LAUNCH_MS) / 86_400_000));

  return send(res, 200, {
    ok: true,
    activeUsers: 55,        // static — no server-side analytics infra yet
    telegram: 185,          // static — needs Telegram Bot API token
    xFollowers: 182,        // static — needs X/Twitter API
    tokenCount,             // live from DB
    volume: "$2.4M",        // static — platform aggregate; update manually or wire DexScreener later
    daysLive,               // live — calculated from OGS token launch date
  });
}
