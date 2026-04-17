// Welcome onboarding email — fires immediately after signup.
// Plain Resend send (separate from the queued cold-outreach pipeline).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  email: string;
  fullName?: string;
}

const APP_URL = "https://skryveai.com";
const FROM = "SkryveAI <welcome@skryveai.com>";

function htmlTemplate(name: string) {
  const safeName = name?.trim() || "there";
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Welcome to SkryveAI</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',Arial,sans-serif;color:#0B162B;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
    <img src="${APP_URL}/logo.png" alt="SkryveAI" width="32" height="32" style="display:block;border-radius:6px;">
    <span style="font-weight:800;font-size:22px;color:#0B162B;letter-spacing:-0.01em;">SkryveAI</span>
  </div>

  <h1 style="font-size:26px;line-height:1.25;font-weight:800;margin:0 0 12px;color:#0B162B;">
    Welcome to SkryveAI, ${safeName} 👋
  </h1>
  <p style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 24px;">
    You're in. Your account is ready and your <strong>7-day free trial</strong> just started — with <strong>5 free credits</strong> loaded so you can test everything end-to-end.
  </p>

  <a href="${APP_URL}/dashboard" style="display:inline-block;background:#1E6BFF;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:999px;margin-bottom:32px;">
    Open Your Dashboard →
  </a>

  <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;color:#0B162B;">Here's what you can try first</h2>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:8px;">
    <tr><td style="padding:14px 16px;border:1px solid #E5E9F2;border-radius:12px;background:#F8FAFC;">
      <div style="font-weight:700;font-size:14px;color:#0B162B;margin-bottom:4px;">🎯 Smart Campaigns</div>
      <div style="font-size:13px;color:#475569;line-height:1.5;">Find businesses by type and location, get an AI website audit, and send hyper-personalized cold emails — all in one flow.</div>
    </td></tr>
  </table>
  <div style="height:10px;"></div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:8px;">
    <tr><td style="padding:14px 16px;border:1px solid #E5E9F2;border-radius:12px;background:#F8FAFC;">
      <div style="font-weight:700;font-size:14px;color:#0B162B;margin-bottom:4px;">⚡ AutoPilot</div>
      <div style="font-size:13px;color:#475569;line-height:1.5;">Set your service + locations once. AutoPilot finds qualified leads and sends pitches every day, on its own. Hands-off outreach.</div>
    </td></tr>
  </table>
  <div style="height:10px;"></div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:8px;">
    <tr><td style="padding:14px 16px;border:1px solid #E5E9F2;border-radius:12px;background:#F8FAFC;">
      <div style="font-weight:700;font-size:14px;color:#0B162B;margin-bottom:4px;">📧 Email Finder</div>
      <div style="font-size:13px;color:#475569;line-height:1.5;">Look up verified business emails by name + domain. Bulk CSV upload supported. Built-in confidence scores.</div>
    </td></tr>
  </table>
  <div style="height:10px;"></div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:32px;">
    <tr><td style="padding:14px 16px;border:1px solid #E5E9F2;border-radius:12px;background:#F8FAFC;">
      <div style="font-weight:700;font-size:14px;color:#0B162B;margin-bottom:4px;">📄 Career Tools</div>
      <div style="font-size:13px;color:#475569;line-height:1.5;">CV Builder, ATS Score Checker, and LinkedIn Profile Analyzer — free for everyone.</div>
    </td></tr>
  </table>

  <div style="padding:18px;background:#EEF4FF;border:1px solid #D7E4FF;border-radius:12px;margin-bottom:24px;">
    <div style="font-weight:700;font-size:14px;color:#0B162B;margin-bottom:6px;">💡 Pro tip</div>
    <div style="font-size:13px;color:#475569;line-height:1.5;">
      Connect your Gmail or SMTP under <a href="${APP_URL}/settings" style="color:#1E6BFF;text-decoration:none;font-weight:600;">Settings</a> first. Sending from your own address gets <strong>3-5×</strong> better open rates than generic addresses.
    </div>
  </div>

  <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">
    Reply to this email any time — a real person reads every response.
  </p>
  <p style="font-size:14px;color:#0B162B;font-weight:600;margin:0 0 32px;">— The SkryveAI team</p>

  <hr style="border:none;border-top:1px solid #E5E9F2;margin:0 0 16px;">
  <p style="font-size:11px;color:#94A3B8;line-height:1.5;margin:0;text-align:center;">
    You're getting this because you just created a SkryveAI account.<br>
    <a href="${APP_URL}" style="color:#94A3B8;">skryveai.com</a> · <a href="${APP_URL}/contact" style="color:#94A3B8;">Contact</a> · <a href="${APP_URL}/privacy-policy" style="color:#94A3B8;">Privacy</a>
  </p>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[send-welcome-email] RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, fullName }: Body = await req.json();
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

    const resend = new Resend(RESEND_API_KEY);
    const firstName = (fullName || "").split(" ")[0] || "";

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Welcome to SkryveAI${firstName ? `, ${firstName}` : ""} — your trial just started 🚀`,
      html: htmlTemplate(firstName),
      reply_to: "skryveai@gmail.com",
    });

    if (error) {
      console.error("[send-welcome-email] Resend error:", error);
      return new Response(JSON.stringify({ error: error.message || "Send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-welcome-email] Sent to ${email} (id=${data?.id})`);
    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-welcome-email] crash:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
