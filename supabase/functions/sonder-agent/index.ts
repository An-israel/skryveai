// Sonder — overnight job-application agent.
// Sources recent jobs matching each user's criteria, scores fit, tailors a
// cover letter, and queues them as Ready / Needs Review. The user reviews and
// submits in-app. Run per-user on demand ({ userId }) or for all active users
// (no body) from the nightly cron.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SONDER_BOT = "50fde12b-0000-4000-8000-000000000002";

// Hard spend cap (the reason background Sonder was killed entirely in
// 20260712010000/20260714000000 — see those migrations). Two independent
// limits, both enforced server-side regardless of what's stored per-user:
//  - a per-user cap on how many cover letters one run can generate for them,
//  - a GLOBAL daily cap on total cover letters across every user, shared
//    across cron runs via the same rate_limit_events table used elsewhere,
//    so it holds even if the schedule ever fires more than once in a day.
const PER_USER_RUN_CAP = 10;
const GLOBAL_DAILY_LETTER_BUDGET = 150;

function scoreJob(job: any, titles: string[], skills: string[]): number {
  const hay = `${job.title || ""} ${(job.skill_tags || []).join(" ")}`.toLowerCase();
  let score = 0;
  for (const t of titles) {
    const words = t.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length && words.every((w) => hay.includes(w))) score += 45;
    else if (words.some((w) => hay.includes(w))) score += 20;
  }
  for (const s of skills) if (hay.includes(s.toLowerCase())) score += 10;
  return Math.min(score, 99);
}

async function coverLetter(key: string, job: any, cv: string): Promise<string> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 500,
        system: "You write concise, specific cover letters (max 160 words). No generic openers. Reference the role and the candidate's real experience. Output only the letter.",
        messages: [{ role: "user", content: `ROLE: ${job.title} at ${job.company || job.platform}\n\nJOB:\n${(job.description || "").slice(0, 1200)}\n\nCANDIDATE CV:\n${cv.slice(0, 1500)}` }],
      }),
    });
    if (!res.ok) return "";
    const d = await res.json();
    return d.content?.[0]?.text || "";
  } catch { return ""; }
}

async function runForUser(sb: any, key: string | undefined, pref: any): Promise<number> {
  const titles = pref.titles || [];
  if (!titles.length) return 0;

  // Talent skills + a base CV to tailor against.
  const { data: tp } = await sb.from("talent_profiles")
    .select("primary_skill, secondary_skills, full_name").eq("user_id", pref.user_id).maybeSingle();
  const skills = [tp?.primary_skill, ...(tp?.secondary_skills || [])].filter(Boolean);

  let cvText = "";
  if (pref.base_cv_id) {
    const { data: cv } = await sb.from("skryve_cvs").select("summary, experiences, skills").eq("id", pref.base_cv_id).maybeSingle();
    if (cv) cvText = `${cv.summary || ""}\nSkills: ${(cv.skills || []).join(", ")}\n` +
      (cv.experiences || []).map((e: any) => `${e.jobTitle} at ${e.company}: ${(e.bullets || []).join("; ")}`).join("\n");
  }

  // Already-queued jobs to dedupe.
  const { data: existing } = await sb.from("sonder_applications")
    .select("aggregated_job_id").eq("user_id", pref.user_id);
  const seen = new Set((existing || []).map((r: any) => r.aggregated_job_id));

  // Source a recent pool and score it.
  let q = sb.from("aggregated_jobs").select("*").eq("is_active", true)
    .order("scraped_at", { ascending: false }).limit(400);
  if (pref.remote_only) q = q.ilike("location", "%remote%");
  const { data: jobs } = await q;

  const scored = (jobs || [])
    .filter((j: any) => !seen.has(j.id))
    .map((j: any) => ({ ...j, fit: scoreJob(j, titles, skills) }))
    .filter((j: any) => j.fit >= 40)
    .sort((a: any, b: any) => b.fit - a.fit)
    // Never trust a client-set daily_limit beyond the hard per-run cap — the
    // Sonder.tsx UI clamps to 1-20, but that's not enforced server-side.
    .slice(0, Math.min(pref.daily_limit || 5, PER_USER_RUN_CAP));

  if (!scored.length) {
    await sb.from("sonder_preferences").update({ last_run_at: new Date().toISOString() }).eq("user_id", pref.user_id);
    return 0;
  }

  let prepared = 0;
  for (const j of scored) {
    let needsReview = !j.budget; // no salary listed → ask the user
    let needsReviewReason = needsReview ? "No salary listed — confirm before applying." : null;
    let letter = "";
    if (key && !needsReview) {
      // Global daily budget, shared across every user and every cron run —
      // this, not just the per-user cap above, is what actually bounds spend.
      const budget = await enforceRateLimit(sb, "sonder:cover-letters", GLOBAL_DAILY_LETTER_BUDGET, 86400);
      if (budget.allowed) {
        letter = await coverLetter(key, j, cvText);
      } else {
        needsReview = true;
        needsReviewReason = "Today's AI writing budget is used up — write your own cover letter for this one.";
      }
    }
    const { error } = await sb.from("sonder_applications").insert({
      user_id: pref.user_id,
      source: "aggregated",
      aggregated_job_id: j.id,
      company: j.company || j.platform,
      title: j.title,
      job_url: j.external_url,
      platform: j.platform,
      fit_score: j.fit,
      status: needsReview ? "needs_review" : "ready",
      cover_letter: letter || null,
      needs_review_reason: needsReviewReason,
    });
    if (!error) prepared++;
  }

  await sb.from("sonder_preferences").update({ last_run_at: new Date().toISOString() }).eq("user_id", pref.user_id);

  if (prepared > 0) {
    // DM from the Sonder bot + in-app notification.
    try {
      await sb.rpc("system_send_dm", {
        _from: SONDER_BOT,
        _to: pref.user_id,
        _body: `🌙 Good morning! I prepared ${prepared} application${prepared === 1 ? "" : "s"} for you overnight. Review and submit them here: /sonder`,
      });
      await sb.from("notifications").insert({
        user_id: pref.user_id, type: "sonder",
        title: "Sonder prepared your applications",
        message: `${prepared} application${prepared === 1 ? "" : "s"} ready to review`,
        link: "/sonder", read: false,
      });
    } catch (_e) { /* best effort */ }
  }
  return prepared;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const key = Deno.env.get("ANTHROPIC_API_KEY");

  let body: any = {};
  try { body = await req.json(); } catch { /* cron: no body */ }

  // This function now runs with the gateway's verify_jwt off (config.toml) —
  // the daily cron calls it with no auth header at all, the same way
  // scrape-jobs/send-digest/event-reminders do. A manual "Run now" request
  // (body.userId set) still needs to genuinely be that user, so check it here
  // instead of relying on the gateway.
  if (body.userId) {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    const { data: { user } } = authHeader ? await sb.auth.getUser(authHeader) : { data: { user: null } };
    if (!user || user.id !== body.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let prefs: any[] = [];
  if (body.userId) {
    const { data } = await sb.from("sonder_preferences").select("*").eq("user_id", body.userId).eq("active", true);
    prefs = data || [];
  } else {
    // Background/cron mode. Sonder is Business-plan-only by product design
    // (use-entitlements.ts' canUseSonder) — re-check that server-side rather
    // than trusting sonder_preferences.active alone, since that flag predates
    // the plan-taxonomy fix and this is the one feature that must never
    // silently mass-run for free/basic users again.
    const { data: bizSubs } = await sb.from("subscriptions").select("user_id").eq("plan", "business").eq("status", "active");
    const { data: ownerProfile } = await sb.from("profiles").select("user_id").ilike("email", "aniekaneazy@gmail.com").maybeSingle();
    const eligibleIds = [...new Set([...(bizSubs || []).map((s: any) => s.user_id), ownerProfile?.user_id].filter(Boolean))];

    if (eligibleIds.length) {
      const { data } = await sb.from("sonder_preferences").select("*").eq("active", true).in("user_id", eligibleIds).limit(500);
      prefs = data || [];
    }
  }

  let total = 0;
  for (const p of prefs) {
    try { total += await runForUser(sb, key, p); } catch (e) { console.error("sonder user error:", e); }
  }

  return new Response(JSON.stringify({ users: prefs.length, prepared: total }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
