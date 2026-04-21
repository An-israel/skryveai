// Welcome onboarding email — fires immediately after signup.
// Plain Resend send (separate from the queued cold-outreach pipeline).
// Logs every send (success or failure) to public.welcome_email_log so
// Customer Success can troubleshoot delivery issues per user.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  email: string;
  fullName?: string;
  userId?: string;
  // Personalization context — drives CTA copy/URL.
  plan?: string;          // e.g. "trial", "popular", "lifetime"
  firstAction?: string;   // e.g. "campaign", "email-finder", "autopilot", "cv-builder"
  source?: string;        // e.g. "signup", "referral"
}

const APP_URL = "https://skryveai.com";
const FROM = "SkryveAI <welcome@skryveai.com>";
const SUPPORT_EMAIL = "skryveai@gmail.com";
const CS_NAME = "Aniekan";
const CS_TITLE = "Customer Success Manager";

// Map a user's first action (or plan) to a contextual CTA.
// Each entry returns the CTA path and label users will see in the email.
function buildCta(opts: { plan?: string; firstAction?: string }): {
  url: string;
  label: string;
  subhint: string;
} {
  const action = (opts.firstAction || "").toLowerCase();
  const plan = (opts.plan || "").toLowerCase();

  // First-action takes priority — it's the strongest signal of intent.
  switch (action) {
    case "campaign":
    case "new-campaign":
      return {
        url: `${APP_URL}/campaigns/new`,
        label: "▶ Finish Building Your First Campaign",
        subhint: "Pick up where you left off and launch your first outreach.",
      };
    case "email-finder":
      return {
        url: `${APP_URL}/email-finder`,
        label: "▶ Find Your First Verified Email",
        subhint: "A 2-minute walkthrough of the Email Finder.",
      };
    case "autopilot":
      return {
        url: `${APP_URL}/auto-pilot`,
        label: "▶ Set Up AutoPilot in 3 Minutes",
        subhint: "Let SkryveAI find and pitch clients for you daily.",
      };
    case "cv-builder":
    case "ats":
    case "linkedin":
      return {
        url: `${APP_URL}/dashboard`,
        label: "▶ Continue with Your Career Tools",
        subhint: "Jump back into the CV / ATS / LinkedIn tools.",
      };
  }

  // Fall back to plan-based personalization.
  if (plan === "lifetime") {
    return {
      url: `${APP_URL}/dashboard`,
      label: "▶ Unlock Your Lifetime Dashboard",
      subhint: "A short walkthrough of every premium feature you now own.",
    };
  }
  if (plan === "popular" || plan === "unlimited") {
    return {
      url: `${APP_URL}/dashboard`,
      label: "▶ Watch the Pro Quick Start Guide",
      subhint: `A short walkthrough tailored for ${plan} users.`,
    };
  }

  // Default — generic onboarding.
  return {
    url: `${APP_URL}/dashboard`,
    label: "▶ Watch the Quick Start Guide",
    subhint: "A short walkthrough to help you navigate the platform.",
  };
}

function htmlTemplate(name: string, cta: ReturnType<typeof buildCta>) {
  const safeName = name?.trim() || "there";
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Welcome to SkryveAI</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',Arial,sans-serif;color:#0B162B;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">

  <!-- Logo at the top -->
  <div style="text-align:center;margin-bottom:32px;">
    <img src="${APP_URL}/logo.png" alt="SkryveAI" width="56" height="56" style="display:inline-block;border-radius:10px;">
    <div style="font-weight:800;font-size:20px;color:#0B162B;letter-spacing:-0.01em;margin-top:8px;">SkryveAI</div>
  </div>

  <p style="font-size:16px;line-height:1.6;color:#0B162B;margin:0 0 18px;">
    Hi ${safeName},
  </p>

  <h1 style="font-size:22px;line-height:1.3;font-weight:800;margin:0 0 16px;color:#0B162B;">
    Welcome to SkryveAI — we're excited to have you here!
  </h1>

  <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px;">
    We built <strong>SkryveAI</strong> with one clear mission: to help freelancers and founders find businesses that actually need their services, without wasting hours on cold emails that go nowhere.
  </p>

  <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px;">
    After seeing how frustrating it is to send dozens of emails with little to no response, we decided to do things differently. <strong>SkryveAI</strong> is designed to help you identify the right prospects, understand their needs, and reach out with messages that feel personal and get replies.
  </p>

  <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 24px;">
    Over the next few days, we'll guide you on how to get the best out of the platform — from finding qualified leads to sending smarter, more effective outreach.
  </p>

  <!-- Personalized CTA -->
  <div style="text-align:center;margin:0 0 28px;">
    <a href="${cta.url}" style="display:inline-block;background:#1E6BFF;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;">
      ${cta.label}
    </a>
    <div style="font-size:12px;color:#94A3B8;margin-top:8px;">${cta.subhint}</div>
  </div>

  <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px;">
    If you have any questions or need help getting started, feel free to reply to this email — we're here for you.
  </p>

  <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 28px;">
    Thank you for choosing <strong>SkryveAI</strong>. We're excited to be part of your journey to landing more clients.
  </p>

  <p style="font-size:15px;line-height:1.6;color:#0B162B;margin:0 0 4px;">
    Warm regards,
  </p>
  <p style="font-size:15px;line-height:1.4;color:#0B162B;font-weight:700;margin:0 0 2px;">
    ${CS_NAME}
  </p>
  <p style="font-size:13px;line-height:1.4;color:#475569;margin:0 0 32px;">
    ${CS_TITLE}, SkryveAI
  </p>

  <!-- Support footer -->
  <div style="padding:16px;background:#F8FAFC;border:1px solid #E5E9F2;border-radius:12px;margin-bottom:24px;text-align:center;">
    <div style="font-size:13px;color:#475569;line-height:1.6;">
      Need assistance? Email us at
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#1E6BFF;text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a>
      or
      <a href="${APP_URL}/contact" style="color:#1E6BFF;text-decoration:none;font-weight:600;">schedule a meeting with us</a>.
    </div>
  </div>

  <hr style="border:none;border-top:1px solid #E5E9F2;margin:0 0 16px;">
  <p style="font-size:11px;color:#94A3B8;line-height:1.5;margin:0;text-align:center;">
    This email was sent to you from SkryveAI.<br>
    <a href="${APP_URL}" style="color:#94A3B8;">skryveai.com</a> · <a href="${APP_URL}/contact" style="color:#94A3B8;">Contact</a> · <a href="${APP_URL}/privacy-policy" style="color:#94A3B8;">Privacy</a>
  </p>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Service-role client so we can write to welcome_email_log even when called
  // unauthenticated (the signup flow fires this before the JWT exists).
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const admin =
    SUPABASE_URL && SERVICE_ROLE
      ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
      : null;

  let logId: string | null = null;
  let emailForLog = "";

  const recordLog = async (fields: Record<string, unknown>) => {
    if (!admin) return;
    try {
      if (logId) {
        await admin.from("welcome_email_log").update(fields).eq("id", logId);
      } else {
        const { data } = await admin
          .from("welcome_email_log")
          .insert(fields)
          .select("id")
          .single();
        logId = (data as { id?: string } | null)?.id ?? null;
      }
    } catch (e) {
      console.warn("[send-welcome-email] log write failed:", e);
    }
  };

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[send-welcome-email] RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    const { email, fullName, userId, plan, firstAction, source } = body;

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    emailForLog = email;

    // Insert pending log row up front so admins can see the attempt even if
    // the Resend call hangs or crashes mid-flight.
    await recordLog({
      user_id: userId || null,
      email,
      full_name: fullName || null,
      status: "pending",
      context: { plan: plan || null, firstAction: firstAction || null, source: source || "signup" },
    });

    const cta = buildCta({ plan, firstAction });
    const resend = new Resend(RESEND_API_KEY);
    const firstName = (fullName || "").split(" ")[0] || "";

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Welcome to SkryveAI${firstName ? `, ${firstName}` : ""} 👋`,
      html: htmlTemplate(firstName, cta),
      reply_to: SUPPORT_EMAIL,
    });

    if (error) {
      console.error("[send-welcome-email] Resend error:", error);
      await recordLog({
        status: "failed",
        error_message: error.message || "Send failed",
      });
      return new Response(JSON.stringify({ error: error.message || "Send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await recordLog({
      status: "sent",
      resend_id: data?.id || null,
      error_message: null,
    });

    console.log(`[send-welcome-email] Sent to ${email} (id=${data?.id})`);
    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-welcome-email] crash:", e);
    if (emailForLog) {
      await recordLog({
        status: "failed",
        error_message: e instanceof Error ? e.message : "Unknown error",
      });
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
