import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function notifyStaffRoles(roles: string[], title: string, message: string, data: Record<string, unknown>) {
  try {
    const { data: staffUsers } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", roles);

    if (!staffUsers || staffUsers.length === 0) return;

    const uniqueUserIds = [...new Set(staffUsers.map(u => u.user_id))];

    const notifications = uniqueUserIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type: "reply",
      data,
    }));

    await supabase.from("notifications").insert(notifications);
    console.log(`Notified ${uniqueUserIds.length} staff members about reply`);
  } catch (err) {
    console.error("Failed to notify staff:", err);
  }
}

async function sendReplyAlertEmail(toEmail: string, toName: string, fromEmail: string, replySubject: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured, skipping reply alert email");
    return;
  }

  try {
    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #0B162B; margin: 0;">SkryveAI</h2>
  </div>
  <h3 style="color: #333;">🎉 You got a reply!</h3>
  <p>Hey ${toName},</p>
  <p>Great news — someone replied to your outreach email!</p>
  <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>From:</strong> ${fromEmail}</p>
    <p style="margin: 0;"><strong>Subject:</strong> ${replySubject || "Re: Your outreach"}</p>
  </div>
  <p>Log in to your dashboard to view the full reply and follow up.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #666;">SkryveAI — Your outreach assistant</p>
</body>
</html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SkryveAI <outreach@skryveai.com>",
        to: [toEmail],
        subject: `🎉 Reply received from ${fromEmail}`,
        html: htmlBody,
      }),
    });
    console.log(`Reply alert email sent to ${toEmail}`);
  } catch (err) {
    console.error("Failed to send reply alert email:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    
    let emailData: {
      to: string;
      from: string;
      subject?: string;
      text?: string;
      html?: string;
    };

    if (contentType.includes("application/json")) {
      emailData = await req.json();
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      emailData = {
        to: formData.get("to") as string || "",
        from: formData.get("from") as string || "",
        subject: formData.get("subject") as string || "",
        text: formData.get("text") as string || "",
        html: formData.get("html") as string || "",
      };
    } else {
      throw new Error("Unsupported content type");
    }

    console.log("Received reply email:", {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject?.substring(0, 50),
    });

    const replyToAddress = emailData.to.toLowerCase();

    const { data: emailReply, error: findError } = await supabase
      .from("email_replies")
      .select("id, email_id")
      .eq("reply_to_address", replyToAddress)
      .single();

    if (findError || !emailReply) {
      console.log("No matching reply-to address found:", replyToAddress);
      return new Response(JSON.stringify({ status: "ignored", reason: "no_match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the email_reply record
    await supabase
      .from("email_replies")
      .update({
        received_at: new Date().toISOString(),
        reply_content: emailData.text || emailData.html || "",
        from_email: emailData.from,
      })
      .eq("id", emailReply.id);

    // Update the email status to replied
    const { data: email } = await supabase
      .from("emails")
      .update({
        status: "replied",
        replied_at: new Date().toISOString(),
      })
      .eq("id", emailReply.email_id)
      .select("campaign_id")
      .single();

    // Increment campaign replies count
    if (email) {
      await supabase.rpc("increment_campaign_replies", {
        campaign_id: email.campaign_id,
      });

      // Get campaign owner info for notification
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("user_id, name")
        .eq("id", email.campaign_id)
        .single();

      if (campaign) {
        // Notify the campaign owner (in-app)
        await supabase.from("notifications").insert({
          user_id: campaign.user_id,
          title: "🎉 New Reply Received!",
          message: `Someone replied to your "${campaign.name}" campaign from ${emailData.from}`,
          type: "reply",
          data: {
            campaign_id: email.campaign_id,
            email_id: emailReply.email_id,
            from: emailData.from,
          },
        });

        // Send email alert to campaign owner
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", campaign.user_id)
          .single();

        if (ownerProfile) {
          await sendReplyAlertEmail(
            ownerProfile.email,
            ownerProfile.full_name || "there",
            emailData.from,
            emailData.subject || ""
          );
        }

        // Notify admin and support staff (in-app)
        await notifyStaffRoles(
          ["super_admin", "support_agent"],
          "Reply Received",
          `Reply from ${emailData.from} on campaign "${campaign.name}"`,
          {
            campaign_id: email.campaign_id,
            email_id: emailReply.email_id,
            from: emailData.from,
            campaign_owner: campaign.user_id,
          }
        );
      }
    }

    // Log activity
    await supabase.from("activity_log").insert({
      action: "email_reply_received",
      entity_type: "email",
      entity_id: emailReply.email_id,
      details: {
        from: emailData.from,
        subject: emailData.subject,
      },
    });

    return new Response(JSON.stringify({
      status: "processed",
      emailId: emailReply.email_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Handle reply error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
