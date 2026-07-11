// Win-back re-engagement (Gamification spec, Prompt 9) — done RIGHT.
// For talents who've been away a few days, ONE notification with REAL value:
// "N new [skill] jobs since you were here." Never guilt, never fake urgency,
// and never for a user who has nothing genuinely useful waiting.
//
// Trigger: admin/owner (manual) or the service role (cron). Intended to run
// once daily via pg_cron. Deduped to at most one re-engagement per user / 7 days.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const OWNER_EMAIL = "aniekaneazy@gmail.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DAY = 86400_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = req.headers.get("authorization")?.replace("Bearer ", "") || "";
  const service = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

  // Gate: the service role (cron) OR an admin/owner user.
  let authorized = token === SERVICE_KEY;
  if (!authorized && token) {
    const { data: { user } } = await service.auth.getUser(token);
    if (user) {
      if ((user.email || "").toLowerCase() === OWNER_EMAIL) authorized = true;
      else {
        const { data: roles } = await service.from("user_roles").select("role").eq("user_id", user.id);
        authorized = (roles || []).some((r: any) => ["super_admin"].includes(r.role));
      }
    }
  }
  if (!authorized) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

  const now = Date.now();
  const awayMin = new Date(now - 3 * DAY).toISOString();   // away at least 3 days
  const awayMax = new Date(now - 21 * DAY).toISOString();  // but not long-churned
  const freshSince = new Date(now - 7 * DAY).toISOString();

  // Candidate away users (first page — a daily cron sweeps everyone over time).
  const { data: list } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
  const away = (list?.users || []).filter((u: any) =>
    u.last_sign_in_at && u.last_sign_in_at <= awayMin && u.last_sign_in_at >= awayMax
  );

  let sent = 0;
  for (const u of away) {
    // Only talents with a stated skill — that's how we find real value for them.
    const { data: tp } = await service.from("talent_profiles")
      .select("primary_skill").eq("user_id", u.id).maybeSingle();
    const skill = tp?.primary_skill;
    if (!skill) continue;

    // Don't nag: skip if they got a re-engagement in the last 7 days.
    const { count: recent } = await service.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id).eq("type", "reengagement").gte("created_at", freshSince);
    if ((recent ?? 0) > 0) continue;

    // Real value: new active jobs in their skill since they were last here.
    const { count: jobs } = await service.from("aggregated_jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("posted_at", u.last_sign_in_at)
      .or(`skill_tags.cs.{${skill}},title.ilike.%${skill}%`);
    if (!jobs || jobs < 3) continue;   // nothing worth the interruption

    await service.from("notifications").insert({
      user_id: u.id,
      type: "reengagement",
      title: `${jobs} new ${skill} jobs`,
      message: `${jobs} new ${skill} jobs were posted since you were last here. Take a look — one might be your next client.`,
      link: "/jobs",
      data: { skill, count: jobs },
    });
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, scanned: away.length, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
