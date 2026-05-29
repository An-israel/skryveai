import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
  }

  const { data: prefs } = await supabase
    .from("job_preferences")
    .select("*, talent_profiles(user_id, full_name, primary_skill, secondary_skills, experience_level)")
    .eq("digest_enabled", true);

  if (!prefs?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;

  for (const pref of prefs) {
    const talentProfile = pref.talent_profiles;
    if (!talentProfile?.user_id) continue;

    const { data: { user } } = await supabase.auth.admin.getUserById(talentProfile.user_id);
    if (!user?.email) continue;

    let query = supabase
      .from("aggregated_jobs")
      .select("*")
      .eq("is_active", true)
      .gte("posted_at", since)
      .limit(50);

    if (pref.preferred_platforms?.length) {
      query = query.in("platform", pref.preferred_platforms);
    }

    const { data: jobs } = await query;
    if (!jobs?.length) continue;

    const skills = [
      talentProfile.primary_skill,
      ...(talentProfile.secondary_skills || []),
    ].filter(Boolean).map((s: string) => s.toLowerCase());

    const scored = jobs.map((job: any) => {
      const tags = (job.skill_tags || []).map((t: string) => t.toLowerCase());
      const titleLower = (job.title || "").toLowerCase();
      let score = 0;
      for (const skill of skills) {
        if (tags.includes(skill) || titleLower.includes(skill)) score += 30;
        else if (tags.some((t: string) => t.includes(skill) || skill.includes(t))) score += 15;
      }
      return { ...job, matchScore: Math.min(score, 95) };
    }).sort((a: any, b: any) => b.matchScore - a.matchScore).slice(0, 15);

    if (!scored.length) continue;

    const jobRows = scored.map((job: any) => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:16px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="background:${platformColor(job.platform)};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase">${job.platform}</span>
            <span style="background:${scoreColor(job.matchScore)};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${job.matchScore}% match</span>
          </div>
          <div style="font-weight:600;font-size:15px;margin-bottom:4px">${job.title}</div>
          ${job.budget ? `<div style="color:#059669;font-size:13px">💰 ${job.budget}</div>` : ""}
          <div style="color:#666;font-size:13px;margin-top:4px">${(job.description || "").slice(0, 120)}...</div>
          <div style="margin-top:8px">
            <a href="${Deno.env.get("SITE_URL") || "https://skryve.com"}/jobs/${job.id}" style="background:#2563EB;color:white;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;margin-right:8px">Generate Proposal</a>
            <a href="${job.external_url}" style="color:#2563EB;font-size:13px" target="_blank">View on ${job.platform}</a>
          </div>
        </td>
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#1E3A5F;font-size:24px;margin:0">Your Daily Job Digest</h1>
          <p style="color:#666;margin:8px 0">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <p>Hi ${talentProfile.full_name || "there"}, here are your top matches today:</p>
        <table style="width:100%;border-collapse:collapse">${jobRows}</table>
        <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #eee">
          <a href="${Deno.env.get("SITE_URL") || "https://skryve.com"}/jobs" style="background:#2563EB;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">View All Jobs</a>
          <p style="color:#999;font-size:12px;margin-top:16px">
            <a href="${Deno.env.get("SITE_URL") || "https://skryve.com"}/jobs/preferences" style="color:#999">Manage digest preferences</a>
          </p>
        </div>
      </body></html>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Skryve Jobs <jobs@skryve.com>",
        to: user.email,
        subject: `Your ${scored.length} job matches for today — Skryve`,
        html,
      }),
    });

    if (emailRes.ok) sent++;
  }

  return new Response(JSON.stringify({ sent }), { headers: corsHeaders });
});

function platformColor(platform: string): string {
  const colors: Record<string, string> = {
    upwork: "#6fda44", remoteok: "#14a800", weworkremotely: "#1a1a1a",
    linkedin: "#0077b5", indeed: "#2164f3", jobberman: "#e84118",
  };
  return colors[platform] || "#666";
}

function scoreColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#2563EB";
  return "#6b7280";
}
