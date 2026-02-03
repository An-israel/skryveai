import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendEmailRequest {
  campaignId: string;
  businessId: string;
  pitchId: string;
  toEmail: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
}

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

    const { 
      campaignId, 
      businessId, 
      pitchId, 
      toEmail, 
      subject, 
      body,
      fromName = "OutreachPro",
      fromEmail = "outreach@resend.dev" // Change to your verified domain
    }: SendEmailRequest = await req.json();

    if (!campaignId || !businessId || !pitchId || !toEmail || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create email record first
    const { data: emailRecord, error: insertError } = await supabase
      .from("emails")
      .insert({
        pitch_id: pitchId,
        business_id: businessId,
        campaign_id: campaignId,
        to_email: toEmail,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating email record:", insertError);
      throw new Error("Failed to create email record");
    }

    // Generate tracking URL and unsubscribe link
    const baseUrl = SUPABASE_URL.replace('.supabase.co', '.supabase.co/functions/v1');
    const trackingPixelUrl = `${baseUrl}/email-webhook?type=open&emailId=${emailRecord.id}`;
    const unsubscribeUrl = `${baseUrl}/email-webhook?type=unsubscribe&emailId=${emailRecord.id}`;

    // Convert plain text body to HTML with tracking
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${body.split('\n').map(line => `<p style="margin: 0 0 16px 0;">${line}</p>`).join('')}
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="font-size: 12px; color: #666;">
          <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> from future emails
        </p>
        
        <!-- Tracking pixel -->
        <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="">
      </body>
      </html>
    `;

    // Send email via Resend
    const { data: emailResponse, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      subject: subject,
      html: htmlBody,
      headers: {
        "X-Entity-Ref-ID": emailRecord.id,
      },
    });

    if (sendError) {
      console.error("Resend API error:", sendError);
      
      // Update email record with failure
      await supabase
        .from("emails")
        .update({ 
          status: "failed", 
          error_message: sendError.message || "Unknown send error" 
        })
        .eq("id", emailRecord.id);

      throw new Error(sendError.message || "Failed to send email");
    }

    // Update email record with success
    await supabase
      .from("emails")
      .update({ 
        status: "sent", 
        sent_at: new Date().toISOString() 
      })
      .eq("id", emailRecord.id);

    // Update campaign sent count
    await supabase.rpc("increment_campaign_emails_sent", { 
      campaign_id: campaignId 
    });

    console.log(`Email sent to ${toEmail}, Resend ID: ${emailResponse?.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailRecord.id,
        resendId: emailResponse?.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
