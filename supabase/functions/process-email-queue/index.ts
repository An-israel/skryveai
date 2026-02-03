import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const resend = new Resend(RESEND_API_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get pending emails from queue that are scheduled for now or earlier
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(10); // Process 10 at a time

    if (fetchError) {
      console.error("Error fetching queue:", fetchError);
      throw new Error("Failed to fetch email queue");
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending emails" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pendingEmails.length} queued emails`);
    let successCount = 0;
    let failCount = 0;

    for (const queuedEmail of pendingEmails) {
      // Mark as processing
      await supabase
        .from("email_queue")
        .update({ status: "processing" })
        .eq("id", queuedEmail.id);

      try {
        // Create email record
        const { data: emailRecord, error: insertError } = await supabase
          .from("emails")
          .insert({
            pitch_id: queuedEmail.pitch_id,
            business_id: queuedEmail.business_id,
            campaign_id: queuedEmail.campaign_id,
            to_email: queuedEmail.to_email,
            status: "pending",
          })
          .select()
          .single();

        if (insertError) {
          throw new Error("Failed to create email record");
        }

        // Generate tracking URLs
        const baseUrl = SUPABASE_URL.replace('.supabase.co', '.supabase.co/functions/v1');
        const trackingPixelUrl = `${baseUrl}/email-webhook?type=open&emailId=${emailRecord.id}`;
        const unsubscribeUrl = `${baseUrl}/email-webhook?type=unsubscribe&emailId=${emailRecord.id}`;

        // Build HTML email
        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${queuedEmail.body.split('\n').map((line: string) => `<p style="margin: 0 0 16px 0;">${line}</p>`).join('')}
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
            <p style="font-size: 12px; color: #666;">
              <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> from future emails
            </p>
            
            <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="">
          </body>
          </html>
        `;

        // Send via Resend
        const fromEmail = queuedEmail.sender_email || "outreach@resend.dev";
        const fromName = queuedEmail.sender_name || "OutreachPro";

        const { data: emailResponse, error: sendError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [queuedEmail.to_email],
          subject: queuedEmail.subject,
          html: htmlBody,
          headers: {
            "X-Entity-Ref-ID": emailRecord.id,
          },
        });

        if (sendError) {
          throw new Error(sendError.message || "Failed to send");
        }

        // Update records
        await supabase
          .from("emails")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", emailRecord.id);

        await supabase
          .from("email_queue")
          .update({ status: "sent", processed_at: new Date().toISOString() })
          .eq("id", queuedEmail.id);

        await supabase.rpc("increment_campaign_emails_sent", { 
          campaign_id: queuedEmail.campaign_id 
        });

        console.log(`Email sent to ${queuedEmail.to_email}`);
        successCount++;

      } catch (error) {
        console.error(`Failed to send email ${queuedEmail.id}:`, error);
        
        await supabase
          .from("email_queue")
          .update({ 
            status: "failed", 
            processed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : "Unknown error"
          })
          .eq("id", queuedEmail.id);

        failCount++;
      }

      // Small delay between emails to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    }

    return new Response(
      JSON.stringify({ 
        processed: pendingEmails.length,
        success: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-email-queue:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
