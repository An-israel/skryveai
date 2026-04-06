const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { action, emailId, content } = await req.json();

    if (!emailId) {
      return new Response(JSON.stringify({ error: "Missing emailId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the admin email
    const emailRes = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_emails?select=id,subject,sent_by,to_email,to_user_id&id=eq.${emailId}&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    const emails = await emailRes.json();
    if (!Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "Email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = emails[0];

    if (action === "info") {
      // Get sender name
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=full_name&user_id=eq.${email.sent_by}&limit=1`,
        {
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
          },
        }
      );
      const profiles = await profileRes.json();
      const senderName = profiles?.[0]?.full_name || "SkryveAI Team";

      return new Response(JSON.stringify({ subject: email.subject, sender: senderName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reply") {
      if (!content?.trim()) {
        return new Response(JSON.stringify({ error: "Reply content is empty" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert reply into admin_email_replies
      const replyId = crypto.randomUUID();
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_email_replies`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          id: replyId,
          admin_email_id: emailId,
          reply_content: content.trim(),
          logged_by: email.to_user_id || "user",
          received_at: new Date().toISOString(),
        }),
      });

      if (!insertRes.ok) {
        const err = await insertRes.text();
        console.error("Failed to save reply:", err);
        return new Response(JSON.stringify({ error: "Failed to save reply" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create notification for admin/CS staff about the reply
      // Notify the original sender
      const notifRes = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          user_id: email.sent_by,
          title: "New Reply Received",
          message: `${email.to_email} replied to your email: "${email.subject}"`,
          type: "reply",
          data: { admin_email_id: emailId, reply_id: replyId },
        }),
      });

      if (!notifRes.ok) {
        console.error("Failed to create notification:", await notifRes.text());
      }

      console.log("Reply saved for email:", emailId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("submit-reply error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
