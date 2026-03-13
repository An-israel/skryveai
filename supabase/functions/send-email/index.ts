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

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email) || email.length > 254) return false;
  // Reject known-bad domains
  const domain = email.split('@')[1]?.toLowerCase();
  const badDomains = ['booksrus.com', 'example.com', 'test.com', 'sample.com',
    'indeed.com', 'linkedin.com', 'glassdoor.com', 'wellfound.com'];
  if (badDomains.includes(domain)) return false;
  // Reject file-extension-like TLDs
  const tld = domain?.split('.').pop();
  const badTlds = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'css', 'js', 'html']);
  if (tld && badTlds.has(tld)) return false;
  return true;
}

// MX record verification via Google DNS
async function verifyMX(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;
    const trusted = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com', 'zoho.com', 'live.com']);
    if (trusted.has(domain)) return true;
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return true; // Don't block on DNS failure
    const data = await resp.json();
    if (data.Status === 0 && data.Answer?.some((a: { type: number }) => a.type === 15)) return true;
    // Fallback: check A record
    const aResp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, { signal: AbortSignal.timeout(3000) });
    if (aResp.ok) { const aData = await aResp.json(); if (aData.Status === 0 && aData.Answer?.length > 0) return true; }
    return false;
  } catch { return true; }
}

// Simple UUID validation
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Escape HTML to prevent XSS in emails
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(RESEND_API_KEY);
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      campaignId, 
      businessId, 
      pitchId, 
      toEmail, 
      subject, 
      body,
      fromName = "SkryveAI",
      fromEmail = "outreach@skryveai.com"
    }: SendEmailRequest = await req.json();

    // Input validation
    if (!campaignId || !businessId || !pitchId || !toEmail || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUIDs
    if (!isValidUUID(campaignId) || !isValidUUID(businessId) || !isValidUUID(pitchId)) {
      return new Response(
        JSON.stringify({ error: "Invalid ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email
    if (!isValidEmail(toEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MX verification - prevent sending to domains that can't receive mail
    const mxValid = await verifyMX(toEmail);
    if (!mxValid) {
      return new Response(
        JSON.stringify({ error: "Email domain cannot receive mail (no MX record)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate subject and body lengths
    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Email body too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the campaign
    const { data: campaign, error: campaignError } = await serviceClient
      .from("campaigns")
      .select("id, user_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign || campaign.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Campaign not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create email record first
    const { data: emailRecord, error: insertError } = await serviceClient
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

    // Generate unique reply-to address for reply tracking
    const replyToId = emailRecord.id.replace(/-/g, "").substring(0, 16);
    const replyToAddress = `reply-${replyToId}@inbound.outreachpro.app`;

    // Create email_reply record for tracking
    await serviceClient.from("email_replies").insert({
      email_id: emailRecord.id,
      reply_to_address: replyToAddress,
    });

    // Generate tracking URL and unsubscribe link
    const baseUrl = SUPABASE_URL.replace('.supabase.co', '.supabase.co/functions/v1');
    const trackingPixelUrl = `${baseUrl}/email-webhook?type=open&emailId=${emailRecord.id}`;
    const unsubscribeUrl = `${baseUrl}/email-webhook?type=unsubscribe&emailId=${emailRecord.id}`;

    // Escape HTML in body to prevent XSS, then convert to HTML with tracking
    const escapedBody = escapeHtml(body);
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${escapedBody.split('\n').map(line => `<p style="margin: 0 0 16px 0;">${line}</p>`).join('')}
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="font-size: 12px; color: #666;">
          <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> from future emails
        </p>
        
        <!-- Tracking pixel -->
        <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="">
      </body>
      </html>
    `;

    // Send email via Resend with unique reply-to
    const { data: emailResponse, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      reply_to: replyToAddress,
      subject: subject,
      html: htmlBody,
      headers: {
        "X-Entity-Ref-ID": emailRecord.id,
      },
    });

    if (sendError) {
      console.error("Resend API error:", sendError);
      
      // Update email record with failure
      await serviceClient
        .from("emails")
        .update({ 
          status: "failed", 
          error_message: sendError.message || "Unknown send error" 
        })
        .eq("id", emailRecord.id);

      throw new Error(sendError.message || "Failed to send email");
    }

    // Update email record with success
    await serviceClient
      .from("emails")
      .update({ 
        status: "sent", 
        sent_at: new Date().toISOString() 
      })
      .eq("id", emailRecord.id);

    // Update campaign sent count
    await serviceClient.rpc("increment_campaign_emails_sent", { 
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
