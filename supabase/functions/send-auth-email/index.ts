import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sends auth emails (signup confirmation, resend, password recovery) directly
// through Resend, bypassing the Supabase built-in mailer and the Lovable email
// dispatcher entirely. The confirmation/recovery links are generated with the
// service-role admin API (generateLink), so they are real, working links.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "Skryve <noreply@skryveai.com>";
const APP_URL = "https://skryveai.com";

function emailHtml(opts: {
  heading: string;
  intro: string;
  ctaUrl: string;
  ctaLabel: string;
  note?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f766e 100%); padding: 36px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -1px;">
      <span style="background: linear-gradient(135deg, #14b8a6, #2dd4bf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Skryve</span>
    </h1>
  </div>
  <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
    <h2 style="color: #1a1a2e; margin: 0 0 16px;">${opts.heading}</h2>
    <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">${opts.intro}</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${opts.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: white; padding: 15px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">${opts.ctaLabel}</a>
    </div>
    <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px;">Or paste this link into your browser:</p>
    <p style="margin: 0 0 20px; word-break: break-all;"><a href="${opts.ctaUrl}" style="color: #0f766e; font-size: 12px;">${opts.ctaUrl}</a></p>
    ${opts.note ? `<p style="margin: 0 0 10px; color: #94a3b8; font-size: 13px;">${opts.note}</p>` : ""}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">
    <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Skryve. All rights reserved.</p>
  </div>
</body>
</html>`;
}

async function sendViaResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend error ${res.status}: ${detail}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!RESEND_API_KEY) return json({ error: "Email service not configured" }, 500);

    const { action, email, password, fullName, role, referralCode, redirectTo } = await req.json();
    if (!email || !action) return json({ error: "Missing email or action" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === "signup") {
      if (!password) return json({ error: "Missing password" }, 400);
      const { data, error } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          data: { full_name: fullName ?? null, role: role ?? null, referral_code: referralCode ?? null },
          redirectTo: redirectTo || `${APP_URL}/login`,
        },
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already") && (msg.includes("registered") || msg.includes("exist"))) {
          return json({ error: "already_registered" });
        }
        throw error;
      }
      const link = data.properties?.action_link;
      if (!link) throw new Error("No confirmation link generated");
      await sendViaResend(
        email,
        "Confirm your Skryve account",
        emailHtml({
          heading: "Welcome to Skryve 👋",
          intro:
            "Thanks for joining Skryve — where talent and clients meet. Confirm your email to activate your account and start finding work, getting hired, and growing your skills.",
          ctaUrl: link,
          ctaLabel: "Confirm my account",
          note: "If you didn't sign up for Skryve, you can safely ignore this email.",
        }),
      );
      return json({ success: true });
    }

    if (action === "resend") {
      // User exists but hasn't confirmed — a magic link both signs them in and
      // confirms their email, and doesn't require their password.
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: redirectTo || `${APP_URL}/dashboard` },
      });
      if (error) throw error;
      const link = data.properties?.action_link;
      if (!link) throw new Error("No link generated");
      await sendViaResend(
        email,
        "Confirm your Skryve account",
        emailHtml({
          heading: "Confirm your account",
          intro: "Click below to confirm your email and sign in to Skryve.",
          ctaUrl: link,
          ctaLabel: "Confirm & sign in",
          note: "This link expires shortly. If you didn't request it, you can ignore this email.",
        }),
      );
      return json({ success: true });
    }

    if (action === "recovery") {
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectTo || `${APP_URL}/reset-password` },
      });
      if (error) {
        // Don't reveal whether the account exists.
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("not") && msg.includes("found")) return json({ success: true });
        throw error;
      }
      const link = data.properties?.action_link;
      if (!link) throw new Error("No reset link generated");
      await sendViaResend(
        email,
        "Reset your Skryve password",
        emailHtml({
          heading: "Reset your password",
          intro: "We received a request to reset your Skryve password. Click below to choose a new one.",
          ctaUrl: link,
          ctaLabel: "Reset password",
          note: "This link expires in 1 hour. If you didn't request it, your password stays unchanged.",
        }),
      );
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("send-auth-email error:", message);
    return json({ error: message }, 500);
  }
});
