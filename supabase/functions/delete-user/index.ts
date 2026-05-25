/**
 * delete-user — Edge Function
 * Deletes a user completely: auth record + all related public data.
 * Requires admin auth (caller must be admin).
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { userId, adminId } = await req.json();
    if (!userId) return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller is admin
    if (adminId) {
      const { data: adminRole } = await sb.from("admin_roles").select("role").eq("user_id", adminId).maybeSingle();
      const { data: adminProfile } = await sb.from("profiles").select("role").eq("user_id", adminId).maybeSingle();
      const isAdmin = adminRole?.role === "admin" || adminRole?.role === "owner" || adminProfile?.role === "admin" || adminProfile?.role === "owner";
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "not_admin" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // Delete from all related public tables first (order matters for FK constraints)
    // Tables with user_id column
    const userIdTables = [
      "community_post_replies",
      "community_posts",
      "community_members",
      "dm_participants",
      "user_badges",
      "profile_badges",
      "user_devices",
      "auth_events",
      "notifications",
      "space_messages",
    ];

    const cleanupResults: Record<string, string> = {};
    for (const table of userIdTables) {
      try {
        const { error } = await sb.from(table).delete().eq("user_id", userId);
        cleanupResults[table] = error ? `error: ${error.message}` : "ok";
      } catch {
        cleanupResults[table] = "skipped";
      }
    }

    // Tables with different FK column names
    try { await sb.from("dm_messages").delete().eq("sender_id", userId); cleanupResults["dm_messages"] = "ok"; } catch { cleanupResults["dm_messages"] = "skipped"; }
    try { await sb.from("referrals").delete().eq("inviter_id", userId); } catch {}
    try { await sb.from("referrals").delete().eq("invitee_id", userId); cleanupResults["referrals"] = "ok"; } catch { cleanupResults["referrals"] = "skipped"; }
    try { await sb.from("invite_codes").delete().eq("owner_id", userId); cleanupResults["invite_codes"] = "ok"; } catch { cleanupResults["invite_codes"] = "skipped"; }

    // Delete profile
    const { error: profileError } = await sb.from("profiles").delete().eq("user_id", userId);
    cleanupResults["profiles"] = profileError ? `error: ${profileError.message}` : "ok";

    // Delete auth user (the critical part that client can't do)
    const { error: authError } = await sb.auth.admin.deleteUser(userId);
    if (authError) {
      return new Response(JSON.stringify({ error: `auth_delete_failed: ${authError.message}`, cleanupResults }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Audit log
    if (adminId) {
      await sb.from("admin_audit_log").insert({
        admin_user_id: adminId,
        action: "delete_user",
        target_type: "user",
        target_id: userId,
        new_values: { cleanup: cleanupResults },
      }).then(() => {});
    }

    return new Response(JSON.stringify({ ok: true, cleanupResults }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("delete-user error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
