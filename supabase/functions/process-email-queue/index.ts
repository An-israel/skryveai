import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

interface SMTPCredentials {
  user_id: string;
  email_address: string;
  app_password: string;
  smtp_host: string;
  smtp_port: number;
  is_verified: boolean;
}

interface GmailToken {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  gmail_email: string;
}

async function refreshGmailToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials not configured");
  }
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Failed to refresh token: ${data.error_description}`);
  }
  return data;
}

function createEmailRaw(to: string, from: string, subject: string, body: string): string {
  const boundary = "boundary_" + Date.now();
  
  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    body.replace(/<[^>]*>/g, ''),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    body,
    ``,
    `--${boundary}--`,
  ];

  const rawEmail = emailLines.join("\r\n");
  const encoder = new TextEncoder();
  const data = encoder.encode(rawEmail);
  let base64 = btoa(String.fromCharCode(...data));
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return base64;
}

// Send via SMTP with App Password (primary method)
async function sendViaSMTP(
  credentials: SMTPCredentials,
  to: string,
  subject: string,
  htmlBody: string,
  senderName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new SMTPClient({
      connection: {
        hostname: credentials.smtp_host,
        port: credentials.smtp_port,
        tls: credentials.smtp_port === 465,
        auth: {
          username: credentials.email_address,
          password: credentials.app_password,
        },
      },
    });

    const plainText = htmlBody.replace(/<[^>]*>/g, '');

    await client.send({
      from: `${senderName} <${credentials.email_address}>`,
      to: to,
      subject: subject,
      content: plainText,
      html: htmlBody,
    });

    await client.close();
    return { success: true };
  } catch (error) {
    console.error("SMTP send error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SMTP error" };
  }
}

// Send via Gmail API (legacy method for existing OAuth users)
async function sendViaGmail(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  to: string,
  subject: string,
  htmlBody: string,
  senderName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    const { data: tokens, error: tokensError } = await supabaseClient
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (tokensError || !tokens) {
      return { success: false, error: "Gmail not connected" };
    }

    const gmailTokens = tokens as unknown as GmailToken;
    let accessToken = gmailTokens.access_token;
    const tokenExpiry = new Date(gmailTokens.token_expiry);

    if (tokenExpiry < new Date(Date.now() + 5 * 60 * 1000)) {
      console.log("Refreshing Gmail token...");
      const newTokens = await refreshGmailToken(gmailTokens.refresh_token);
      accessToken = newTokens.access_token;
      
      const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
      await fetch(`${supabaseUrl}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          access_token: accessToken,
          token_expiry: newExpiry.toISOString(),
        }),
      });
    }

    const fromAddress = `${senderName} <${gmailTokens.gmail_email}>`;
    const rawEmail = createEmailRaw(to, fromAddress, subject, htmlBody);

    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEmail }),
    });

    const sendResult = await sendResponse.json();

    if (!sendResponse.ok) {
      console.error("Gmail send error:", sendResult);
      return { success: false, error: sendResult.error?.message || "Gmail API error" };
    }

    return { success: true, messageId: sendResult.id };
  } catch (error) {
    console.error("Gmail send exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Calculate warmup limit based on settings
function calculateWarmupLimit(settings: {
  warmup_enabled: boolean;
  warmup_start_volume: number;
  warmup_daily_increase: number;
  warmup_started_at: string | null;
}): number {
  if (!settings.warmup_enabled || !settings.warmup_started_at) {
    return Infinity; // No limit if warmup is disabled
  }
  
  const startDate = new Date(settings.warmup_started_at);
  const today = new Date();
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return settings.warmup_start_volume + (daysSinceStart * settings.warmup_daily_increase);
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

    // Get pending emails from queue
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50); // Fetch more, we'll filter by warmup limits

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

    // Get campaign user mappings
    const campaignIds = [...new Set(pendingEmails.map(e => e.campaign_id))];
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, user_id")
      .in("id", campaignIds);
    
    const campaignUserMap = new Map(campaigns?.map(c => [c.id, c.user_id]) || []);
    const userIds = [...new Set(campaigns?.map(c => c.user_id) || [])];

    // Get user settings for warmup limits
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("user_id, warmup_enabled, warmup_start_volume, warmup_daily_increase, warmup_started_at, emails_sent_today, last_send_date, daily_send_limit")
      .in("user_id", userIds);
    
    const userSettingsMap = new Map(
      (userSettings || []).map(s => [s.user_id, s])
    );

    // Reset daily counters if it's a new day
    const today = new Date().toISOString().split('T')[0];
    for (const settings of userSettings || []) {
      if (settings.last_send_date !== today) {
        await supabase
          .from("user_settings")
          .update({ emails_sent_today: 0, last_send_date: today })
          .eq("user_id", settings.user_id);
        settings.emails_sent_today = 0;
        settings.last_send_date = today;
      }
    }

    // Check for SMTP credentials (primary method)
    const { data: smtpCredentials } = await supabase
      .from("smtp_credentials")
      .select("*")
      .in("user_id", userIds);
    
    const smtpCredentialsMap = new Map(
      (smtpCredentials || []).map((c: SMTPCredentials) => [c.user_id, c])
    );

    // Check for Gmail tokens (legacy fallback)
    const { data: gmailTokens } = await supabase
      .from("gmail_tokens")
      .select("user_id, gmail_email")
      .in("user_id", userIds);
    
    const gmailConnectedUsers = new Set(gmailTokens?.map(t => t.user_id) || []);

    // Track emails sent per user in this batch
    const userEmailsSentThisBatch = new Map<string, number>();

    for (const queuedEmail of pendingEmails) {
      const userId = campaignUserMap.get(queuedEmail.campaign_id);
      
      // Check warmup and daily limits
      if (userId) {
        const settings = userSettingsMap.get(userId);
        if (settings) {
          const warmupLimit = calculateWarmupLimit({
            warmup_enabled: settings.warmup_enabled || false,
            warmup_start_volume: settings.warmup_start_volume || 5,
            warmup_daily_increase: settings.warmup_daily_increase || 2,
            warmup_started_at: settings.warmup_started_at,
          });
          
          const dailyLimit = Math.min(warmupLimit, settings.daily_send_limit || 50);
          const sentToday = (settings.emails_sent_today || 0) + (userEmailsSentThisBatch.get(userId) || 0);
          
          if (sentToday >= dailyLimit) {
            console.log(`User ${userId} has reached daily limit (${sentToday}/${dailyLimit}), skipping email ${queuedEmail.id}`);
            continue; // Skip this email, don't mark as failed
          }
        }
      }

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

        const userId = campaignUserMap.get(queuedEmail.campaign_id);
        const senderName = queuedEmail.sender_name || "SkryveAI";
        let emailSent = false;

        // Priority 1: SMTP with App Password (preferred method)
        if (userId && smtpCredentialsMap.has(userId)) {
          const creds = smtpCredentialsMap.get(userId)!;
          console.log(`Sending via SMTP for user ${userId}`);
          
          const smtpResult = await sendViaSMTP(
            creds,
            queuedEmail.to_email,
            queuedEmail.subject,
            htmlBody,
            senderName
          );

          if (smtpResult.success) {
            emailSent = true;
            console.log(`Email sent via SMTP to ${queuedEmail.to_email}`);
          } else {
            console.log(`SMTP failed: ${smtpResult.error}, trying next method`);
          }
        }

        // Priority 2: Gmail API (legacy for existing OAuth users)
        if (!emailSent && userId && gmailConnectedUsers.has(userId)) {
          console.log(`Sending via Gmail API for user ${userId}`);
          const gmailResult = await sendViaGmail(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            userId,
            queuedEmail.to_email,
            queuedEmail.subject,
            htmlBody,
            senderName
          );

          if (gmailResult.success) {
            emailSent = true;
            console.log(`Email sent via Gmail to ${queuedEmail.to_email}`);
          } else {
            console.log(`Gmail failed: ${gmailResult.error}, falling back to Resend`);
          }
        }

        // Priority 3: Resend (fallback)
        if (!emailSent) {
          const fromEmail = "outreach@skryveai.com";
          const { error: sendError } = await resend.emails.send({
            from: `${senderName} <${fromEmail}>`,
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
          console.log(`Email sent via Resend to ${queuedEmail.to_email}`);
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

        // Track emails sent for warmup/daily limits
        if (userId) {
          userEmailsSentThisBatch.set(userId, (userEmailsSentThisBatch.get(userId) || 0) + 1);
          
          // Update user's emails_sent_today counter
          await supabase
            .from("user_settings")
            .update({ 
              emails_sent_today: (userSettingsMap.get(userId)?.emails_sent_today || 0) + 
                                 (userEmailsSentThisBatch.get(userId) || 0)
            })
            .eq("user_id", userId);
        }

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

      // Small delay between emails
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
