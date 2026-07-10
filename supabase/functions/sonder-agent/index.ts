// Sonder — overnight job-application agent.
// Sources recent jobs matching each user's criteria, scores fit, tailors a
// cover letter, and queues them as Ready / Needs Review. The user reviews and
// submits in-app. Run per-user on demand ({ userId }) or for all active users
// (no body) from the nightly cron.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SONDER_BOT = "50fde12b-0000-4000-8000-000000000002";

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
    .slice(0, pref.daily_limit || 5);

  if (!scored.length) {
    await sb.from("sonder_preferences").update({ last_run_at: new Date().toISOString() }).eq("user_id", pref.user_id);
    return 0;
  }

  let prepared = 0;
  for (const j of scored) {
    const needsReview = !j.budget; // no salary listed → ask the user
    const letter = key && !needsReview ? await coverLetter(key, j, cvText) : "";
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
      needs_review_reason: needsReview ? "No salary listed — confirm before applying." : null,
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

  let prefs: any[] = [];
  if (body.userId) {
    const { data } = await sb.from("sonder_preferences").select("*").eq("user_id", body.userId).eq("active", true);
    prefs = data || [];
  } else {
    const { data } = await sb.from("sonder_preferences").select("*").eq("active", true).limit(500);
    prefs = data || [];
  }

  let total = 0;
  for (const p of prefs) {
    try { total += await runForUser(sb, key, p); } catch (e) { console.error("sonder user error:", e); }
  }

  return new Response(JSON.stringify({ users: prefs.length, prepared: total }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
