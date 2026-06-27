import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Central notification dispatcher: creates an in-app notification for the
// recipient AND emails them (via Resend) when their preference for that
// category is enabled. Runs with the service role so it can notify any user
// (cross-user inserts that RLS would otherwise block).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = "Skryve <noreply@skryveai.com>";
const APP_URL = "https://skryveai.com";

// emailCategory -> talent_profiles preference column
const PREF_COLUMN: Record<string, string> = {
  jobs: "notif_email_jobs",
  apps: "notif_email_apps",
  messages: "notif_email_messages",
  offers: "notif_email_offers",
  projects: "notif_email_projects",
  events: "notif_email_events",
  learning: "notif_email_learning",
  marketing: "notif_email_marketing",
};

function emailHtml(title: string, message: string, ctaUrl: string | null): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f766e 100%); padding: 32px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">
      <span style="background: linear-gradient(135deg, #14b8a6, #2dd4bf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Skryve</span>
    </h1>
  </div>
  <div style="background: white; padding: 36px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
    <h2 style="color: #1a1a2e; margin: 0 0 14px; font-size: 20px;">${title}</h2>
    <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">${message}</p>
    ${
      ctaUrl
        ? `<div style="text-align: center; margin: 24px 0;"><a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: white; padding: 13px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">View on Skryve</a></div>`
        : ""
    }
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">
    <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
      You're receiving this because of your Skryve notification settings. Manage them in
      <a href="${APP_URL}/settings" style="color: #0f766e;">Settings</a>.
    </p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { userId, type, title, message, link, emailCategory } = await req.json();
    if (!userId || !title || !message) return json({ error: "Missing userId, title or message" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Always create the in-app notification.
    const { error: insErr } = await admin.from("notifications").insert({
      user_id: userId,
      type: type || "info",
      title,
      message,
      link: link ?? null,
      read: false,
    });
    if (insErr) console.error("notification insert failed:", insErr.message);

    // 2) Email the recipient if their preference for this category is enabled.
    let emailed = false;
    if (RESEND_API_KEY && emailCategory && PREF_COLUMN[emailCategory]) {
      const col = PREF_COLUMN[emailCategory];
      // Talents have explicit preferences; users without a talent profile
      // (e.g. clients) get transactional emails by default, but never marketing.
      const { data: prefs } = await admin
        .from("talent_profiles")
        .select(col)
        .eq("user_id", userId)
        .maybeSingle();

      let shouldEmail: boolean;
      if (prefs) shouldEmail = (prefs as Record<string, boolean>)[col] !== false;
      else shouldEmail = emailCategory !== "marketing";

      if (shouldEmail) {
        const { data: userRes } = await admin.auth.admin.getUserById(userId);
        const to = userRes?.user?.email;
        if (to) {
          const ctaUrl = link ? `${APP_URL}${link.startsWith("/") ? link : `/${link}`}` : null;
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: FROM, to: [to], subject: title, html: emailHtml(title, message, ctaUrl) }),
          });
          emailed = res.ok;
          if (!res.ok) console.error("notification email failed:", await res.text());
        }
      }
    }

    return json({ success: true, emailed });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("send-notification error:", message);
    return json({ error: message }, 500);
  }
});
