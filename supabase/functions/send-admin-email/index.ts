const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-admin-email: request received");

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user via Supabase REST API directly
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error("Auth verification failed:", userRes.status, errText);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await userRes.json();
    const userId = user.id;
    console.log("Authenticated user:", userId);

    // Check roles via REST API with service role key
    const rolesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${userId}`,
      {
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    const roles = await rolesRes.json();
    console.log("User roles:", JSON.stringify(roles));

    const hasPermission = Array.isArray(roles) && roles.some((r: { role: string }) =>
      ["super_admin", "support_agent"].includes(r.role)
    );

    if (!hasPermission) {
      console.error("User lacks permission");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqBody = await req.json();
    const { toEmail, toUserId, subject, body, templateType } = reqBody;

    if (!toEmail || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender name
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=full_name&user_id=eq.${userId}&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Accept": "application/json",
        },
      }
    );
    const profiles = await profileRes.json();
    const senderName = profiles?.[0]?.full_name || "SkryveAI Team";

    // Generate a unique ID for tracking this admin email
    const adminEmailId = crypto.randomUUID();

    // Build tracking pixel URL
    const baseUrl = SUPABASE_URL.replace('.supabase.co', '.supabase.co/functions/v1');
    const trackingPixelUrl = `${baseUrl}/email-webhook?type=admin-open&adminEmailId=${adminEmailId}`;

    // Build HTML email with tracking pixel
    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #0B162B; margin: 0;">SkryveAI</h2>
  </div>
  ${body.split('\n').map((line: string) => `<p style="margin: 0 0 16px 0;">${line}</p>`).join('')}
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #666;">Sent by ${senderName} from SkryveAI Team</p>
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="">
</body>
</html>`;

    console.log("Sending email to:", toEmail);

    // Send via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SkryveAI <outreach@skryveai.com>",
        to: [toEmail],
        subject,
        html: htmlBody,
      }),
    });

    const resendResult = await resendResponse.text();
    console.log("Resend response:", resendResponse.status, resendResult);

    if (!resendResponse.ok) {
      return new Response(JSON.stringify({ error: `Email service error: ${resendResult}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resendId: string | null = null;
    try {
      const parsed = JSON.parse(resendResult);
      resendId = parsed?.id || null;
    } catch { /* ignore */ }

    // Log email in admin_emails table with the tracking ID
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_emails`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        id: adminEmailId,
        sent_by: userId,
        to_email: toEmail,
        to_user_id: toUserId || null,
        subject,
        body,
        template_type: templateType || null,
        status: "sent",
        resend_id: resendId,
      }),
    });

    if (!insertRes.ok) {
      const insertErr = await insertRes.text();
      console.error("Failed to log email:", insertErr);
    }

    console.log("Email sent successfully to", toEmail);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send admin email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
