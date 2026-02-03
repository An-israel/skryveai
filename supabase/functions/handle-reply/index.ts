import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This endpoint receives incoming emails from email service (e.g., SendGrid, Resend inbound)
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
      // Handle form data from email services
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

    // Extract the unique reply-to address
    const replyToAddress = emailData.to.toLowerCase();

    // Find the email_reply record
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
