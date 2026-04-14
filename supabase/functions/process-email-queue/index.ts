import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

// ─── Safety constants ───
const FUNCTION_TIME_BUDGET_MS = 45_000;
const PER_EMAIL_TIMEOUT_MS = 15_000;
const SMTP_READ_TIMEOUT_MS = 5_000;
const MAX_BATCH_SIZE = 10;
const INTER_EMAIL_DELAY_MS = 200;

// ─── Monthly email limits per plan ───
const MONTHLY_EMAIL_LIMITS: Record<string, number> = {
  basic: 250,
  monthly: 500,    // Popular plan
  yearly: 500,     // Popular plan (yearly)
  unlimited: 999999,
  team_basic: 1500,
  team_pro: 2500,
};

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

// ─── Timeout utility ───

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// ─── Native SMTP implementation ───

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function readResponse(reader: ReadableStreamDefaultReader<Uint8Array>, timeoutMs = SMTP_READ_TIMEOUT_MS): Promise<string> {
  let result = "";
  const deadline = Date.now() + timeoutMs;
  
  while (Date.now() < deadline) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined; done: true }>((resolve) =>
        setTimeout(() => resolve({ value: undefined, done: true }), Math.max(100, deadline - Date.now()))
      ),
    ]);
    
    if (done && !value) break;
    if (value) {
      result += decoder.decode(value, { stream: true });
      if (result.includes("\r\n") && /^\d{3}[\s-]/.test(result)) {
        const lines = result.split("\r\n").filter(l => l.length > 0);
        const lastLine = lines[lines.length - 1];
        if (lastLine && /^\d{3}\s/.test(lastLine)) break;
      }
    }
  }
  
  return result.trim();
}

async function sendSmtpCommand(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  command: string,
  expectedCode: number
): Promise<string> {
  await writer.write(encoder.encode(command + "\r\n"));
  const response = await readResponse(reader);
  
  if (!response.startsWith(String(expectedCode))) {
    throw new Error(`SMTP error: expected ${expectedCode}, got: ${response}`);
  }
  
  return response;
}

function buildEmailContent(
  from: string,
  to: string,
  subject: string,
  htmlBody: string,
  senderName: string
): string {
  const plainText = htmlBody.replace(/<[^>]*>/g, '');
  const boundary = "boundary_" + Date.now();
  return [
    `From: ${senderName} <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    plainText,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
    `.`,
  ].join("\r\n");
}

async function smtpSession(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  credentials: SMTPCredentials,
  to: string,
  subject: string,
  htmlBody: string,
  senderName: string
): Promise<void> {
  await sendSmtpCommand(writer, reader, `EHLO skryveai.com`, 250);
  await sendSmtpCommand(writer, reader, "AUTH LOGIN", 334);
  await sendSmtpCommand(writer, reader, btoa(credentials.email_address), 334);
  await sendSmtpCommand(writer, reader, btoa(credentials.app_password.replace(/\s/g, "")), 235);
  await sendSmtpCommand(writer, reader, `MAIL FROM:<${credentials.email_address}>`, 250);
  await sendSmtpCommand(writer, reader, `RCPT TO:<${to}>`, 250);
  await sendSmtpCommand(writer, reader, "DATA", 354);
  const emailContent = buildEmailContent(credentials.email_address, to, subject, htmlBody, senderName);
  await sendSmtpCommand(writer, reader, emailContent, 250);
  await writer.write(encoder.encode("QUIT\r\n"));
}

async function sendViaSMTP(
  credentials: SMTPCredentials,
  to: string,
  subject: string,
  htmlBody: string,
  senderName: string
): Promise<{ success: boolean; error?: string }> {
  let conn: Deno.TcpConn | Deno.TlsConn | null = null;
  
  try {
    const port = credentials.smtp_port;
    const hostname = credentials.smtp_host;
    
    if (port === 465) {
      conn = await Deno.connectTls({ hostname, port });
    } else {
      conn = await Deno.connect({ hostname, port });
    }
    
    const reader = conn.readable.getReader();
    const writer = conn.writable.getWriter();
    
    const greeting = await readResponse(reader);
    if (!greeting.startsWith("220")) {
      throw new Error(`Bad SMTP greeting: ${greeting}`);
    }
    
    if (port === 587) {
      await sendSmtpCommand(writer, reader, `EHLO skryveai.com`, 250);
      await sendSmtpCommand(writer, reader, "STARTTLS", 220);
      
      reader.releaseLock();
      writer.releaseLock();
      
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname });
      
      const tlsReader = conn.readable.getReader();
      const tlsWriter = conn.writable.getWriter();
      
      await smtpSession(tlsReader, tlsWriter, credentials, to, subject, htmlBody, senderName);
      tlsReader.releaseLock();
      tlsWriter.releaseLock();
    } else {
      await smtpSession(reader, writer, credentials, to, subject, htmlBody, senderName);
      reader.releaseLock();
      writer.releaseLock();
    }
    
    return { success: true };
  } catch (error) {
    console.error("SMTP send error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SMTP error" };
  } finally {
    try { conn?.close(); } catch { /* ignore */ }
  }
}

// ─── Gmail API sending ───

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
  const data = encoder.encode(rawEmail);
  let base64 = btoa(String.fromCharCode(...data));
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return base64;
}

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

// ─── Warmup limit calculation ───

function calculateWarmupLimit(settings: {
  warmup_enabled: boolean;
  warmup_start_volume: number;
  warmup_daily_increase: number;
  warmup_started_at: string | null;
}): number {
  if (!settings.warmup_enabled || !settings.warmup_started_at) {
    return Infinity;
  }
  
  const startDate = new Date(settings.warmup_started_at);
  const today = new Date();
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return settings.warmup_start_volume + (daysSinceStart * settings.warmup_daily_increase);
}

// ─── Email validation ───

const INVALID_EMAIL_TLDS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'avif',
  'mp4', 'mp3', 'wav', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ogg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt',
  'zip', 'rar', 'tar', 'gz', '7z',
  'js', 'css', 'html', 'htm', 'xml', 'json', 'ts', 'tsx', 'jsx',
  'woff', 'woff2', 'ttf', 'eot', 'otf', 'blink',
  'exe', 'dll', 'dmg', 'apk', 'msi',
]);

const INVALID_LOCAL_PATTERNS = [
  /^\d+x\d*$/i, /^image/i, /^img/i, /^photo/i, /^icon/i, /^logo/i,
  /^banner/i, /^bg/i, /^thumb/i, /^screen/i, /^avatar/i, /^placeholder/i,
  /^sprite/i, /^asset/i, /^file/i, /^\d+$/, /^[a-f0-9]{8,}$/i,
  /^data$/i, /^no-?reply$/i, /^mailer-?daemon$/i, /^frame-/i,
];

function isValidEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const lower = email.toLowerCase().trim();
  const parts = lower.split("@");
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || localPart.length < 1 || localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return false;

  if (!domain || domain.length < 3) return false;
  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return false;
  if (INVALID_EMAIL_TLDS.has(tld)) return false;

  for (const pattern of INVALID_LOCAL_PATTERNS) {
    if (pattern.test(localPart)) return false;
  }

  if (domain.includes('/') || domain.includes('\\')) return false;
  if (domainParts[0].length < 2) return false;

  return true;
}

// ─── MX Record Check (pre-send validation) ───

async function hasMXRecord(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Skip check for well-known domains
    const trustedDomains = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com', 'live.com']);
    if (trustedDomains.has(domain)) return true;

    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { signal: AbortSignal.timeout(3000) }
    );

    if (!response.ok) return true; // On failure, don't block

    const data = await response.json();
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      return data.Answer.some((a: { type: number }) => a.type === 15);
    }

    // Check A record fallback
    const aResponse = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (aResponse.ok) {
      const aData = await aResponse.json();
      if (aData.Status === 0 && aData.Answer && aData.Answer.length > 0) return true;
    }

    return false;
  } catch {
    return true; // On error, don't block sending
  }
}

// ─── Single email send with timeout ───

async function sendSingleEmail(
  queuedEmail: Record<string, unknown>,
  userId: string | undefined,
  smtpCredentialsMap: Map<string, SMTPCredentials>,
  gmailConnectedUsers: Set<string>,
  supabase: any,
  SUPABASE_URL: string,
  SUPABASE_SERVICE_ROLE_KEY: string
): Promise<"sent" | "failed" | "skipped"> {
  // Validate email format
  if (!isValidEmail(queuedEmail.to_email as string)) {
    console.log(`Invalid email format: ${queuedEmail.to_email}, skipping`);
    await supabase
      .from("email_queue")
      .update({ status: "failed", processed_at: new Date().toISOString(), error_message: "Invalid email address format" })
      .eq("id", queuedEmail.id);
    return "skipped";
  }

  // MX record validation - reject emails to domains that can't receive mail
  const mxValid = await hasMXRecord(queuedEmail.to_email as string);
  if (!mxValid) {
    console.log(`No MX record for ${queuedEmail.to_email}, skipping - domain cannot receive email`);
    await supabase
      .from("email_queue")
      .update({ status: "failed", processed_at: new Date().toISOString(), error_message: "Domain has no MX record - cannot receive email" })
      .eq("id", queuedEmail.id);
    return "skipped";
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

    if (insertError) throw new Error("Failed to create email record");

    // Build HTML
    const baseUrl = SUPABASE_URL.replace('.supabase.co', '.supabase.co/functions/v1');
    const trackingPixelUrl = `${baseUrl}/email-webhook?type=open&emailId=${emailRecord.id}`;
    const unsubscribeUrl = `${baseUrl}/email-webhook?type=unsubscribe&emailId=${emailRecord.id}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${(queuedEmail.body as string).split('\n').map((line: string) => `<p style="margin: 0 0 16px 0;">${line}</p>`).join('')}
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="font-size: 12px; color: #666;">
          <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> from future emails
        </p>
        <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="">
      </body>
      </html>
    `;

    const senderName = (queuedEmail.sender_name as string) || "SkryveAI";
    let emailSent = false;

    // Priority 1: SMTP (PRIMARY - best for deliverability)
    if (userId && smtpCredentialsMap.has(userId)) {
      const creds = smtpCredentialsMap.get(userId)!;
      console.log(`Sending via SMTP to ${queuedEmail.to_email}`);
      try {
        const smtpResult = await withTimeout(
          sendViaSMTP(creds, queuedEmail.to_email as string, queuedEmail.subject as string, htmlBody, senderName),
          PER_EMAIL_TIMEOUT_MS,
          `SMTP to ${queuedEmail.to_email}`
        );
        if (smtpResult.success) {
          emailSent = true;
          console.log(`✓ Sent via SMTP to ${queuedEmail.to_email}`);
        } else {
          console.log(`SMTP failed: ${smtpResult.error}, trying Gmail`);
        }
      } catch (smtpError) {
        console.error(`SMTP error: ${smtpError}`);
      }
    }

    // Priority 2: Gmail API (ALTERNATIVE)
    if (!emailSent && userId && gmailConnectedUsers.has(userId)) {
      console.log(`Trying Gmail API for ${queuedEmail.to_email}`);
      try {
        const gmailResult = await withTimeout(
          sendViaGmail(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, userId, queuedEmail.to_email as string, queuedEmail.subject as string, htmlBody, senderName),
          PER_EMAIL_TIMEOUT_MS,
          `Gmail to ${queuedEmail.to_email}`
        );
        if (gmailResult.success) {
          emailSent = true;
          console.log(`✓ Sent via Gmail to ${queuedEmail.to_email}`);
        } else {
          console.log(`Gmail failed: ${gmailResult.error}`);
        }
      } catch (gmailError) {
        console.error(`Gmail error: ${gmailError}`);
      }
    }

    // NO Resend fallback — only send from user's own email to maximize deliverability and avoid spam
    if (!emailSent) {
      const errorMsg = "No personal email connected. Connect SMTP or Gmail in Settings to send emails.";
      console.log(`Cannot send to ${queuedEmail.to_email}: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Success
    await supabase.from("emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", emailRecord.id);
    await supabase.from("email_queue").update({ status: "sent", processed_at: new Date().toISOString() }).eq("id", queuedEmail.id);
    await supabase.rpc("increment_campaign_emails_sent", { campaign_id: queuedEmail.campaign_id });

    return "sent";
  } catch (error) {
    console.error(`Failed email ${queuedEmail.id}:`, error);
    await supabase
      .from("email_queue")
      .update({ status: "failed", processed_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : "Unknown error" })
      .eq("id", queuedEmail.id);
    return "failed";
  }
}

// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env vars not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Reset stuck "processing" emails older than 2 minutes
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    await supabase
      .from("email_queue")
      .update({ status: "pending" })
      .eq("status", "processing")
      .lt("created_at", twoMinAgo);

    // Fetch pending emails
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(MAX_BATCH_SIZE);

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
    let skippedCount = 0;

    // Pre-fetch all user data
    const campaignIds = [...new Set(pendingEmails.map(e => e.campaign_id))];
    const { data: campaigns } = await supabase.from("campaigns").select("id, user_id, campaign_type").in("id", campaignIds);
    const campaignUserMap = new Map(campaigns?.map(c => [c.id, c.user_id]) || []);
    const campaignTypeMap = new Map(campaigns?.map(c => [c.id, c.campaign_type]) || []);
    const userIds = [...new Set(campaigns?.map(c => c.user_id) || [])];

    // Fetch user settings, SMTP creds, and Gmail tokens
    const [settingsRes, smtpRes, gmailRes] = await Promise.all([
      supabase.from("user_settings")
        .select("user_id, warmup_enabled, warmup_start_volume, warmup_daily_increase, warmup_started_at, emails_sent_today, last_send_date, daily_send_limit")
        .in("user_id", userIds),
      supabase.from("smtp_credentials").select("*").in("user_id", userIds),
      supabase.from("gmail_tokens").select("user_id, gmail_email").in("user_id", userIds),
    ]);

    const userSettingsMap = new Map((settingsRes.data || []).map(s => [s.user_id, s]));
    const smtpCredentialsMap = new Map((smtpRes.data || []).map((c: SMTPCredentials) => [c.user_id, c]));
    const gmailConnectedUsers = new Set(gmailRes.data?.map(t => t.user_id) || []);

    // Reset daily counters for new day
    const today = new Date().toISOString().split('T')[0];
    for (const settings of settingsRes.data || []) {
      if (settings.last_send_date !== today) {
        await supabase
          .from("user_settings")
          .update({ emails_sent_today: 0, last_send_date: today })
          .eq("user_id", settings.user_id);
        settings.emails_sent_today = 0;
      }
    }

    const userEmailsSentThisBatch = new Map<string, number>();

    for (const queuedEmail of pendingEmails) {
      if (Date.now() - startTime > FUNCTION_TIME_BUDGET_MS) {
        console.log(`Time budget exhausted after ${Date.now() - startTime}ms, stopping.`);
        break;
      }

      const userId = campaignUserMap.get(queuedEmail.campaign_id);

      // Warmup / daily limit check
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
            console.log(`User ${userId} hit daily limit (${sentToday}/${dailyLimit}), skipping`);
            continue;
          }
        }

        // Monthly email limit check per plan
        const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", userId).single();
        if (sub) {
          const monthlyLimit = MONTHLY_EMAIL_LIMITS[sub.plan] ?? 500;
          // Count emails sent this month by user
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          const { count: monthlyCount } = await supabase
            .from("emails")
            .select("*", { count: "exact", head: true })
            .eq("status", "sent")
            .in("campaign_id", campaignIds.filter(cid => campaignUserMap.get(cid) === userId))
            .gte("sent_at", startOfMonth.toISOString());
          if ((monthlyCount || 0) >= monthlyLimit) {
            console.log(`User ${userId} hit monthly limit (${monthlyCount}/${monthlyLimit}), skipping`);
            await supabase.from("email_queue").update({ status: "failed", error_message: `Monthly email limit (${monthlyLimit}) reached` }).eq("id", queuedEmail.id);
            skippedCount++;
            continue;
          }
        }
      }

      try {
        const result = await withTimeout(
          sendSingleEmail(queuedEmail, userId, smtpCredentialsMap, gmailConnectedUsers, supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
          PER_EMAIL_TIMEOUT_MS,
          `email ${queuedEmail.id}`
        );

        if (result === "sent") {
          successCount++;
          if (userId) {
            userEmailsSentThisBatch.set(userId, (userEmailsSentThisBatch.get(userId) || 0) + 1);
            await supabase
              .from("user_settings")
              .update({ emails_sent_today: (userSettingsMap.get(userId)?.emails_sent_today || 0) + (userEmailsSentThisBatch.get(userId) || 0) })
              .eq("user_id", userId);

            // Deduct credits based on campaign type
            const campaignType = campaignTypeMap.get(queuedEmail.campaign_id) || "freelancer";
            const creditCost = campaignType === "investor" ? 0.5 : 0.2;
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("credits, plan")
              .eq("user_id", userId)
              .single();
            if (sub && sub.plan !== "lifetime") {
              const newCredits = Math.max(0, (sub.credits || 0) - creditCost);
              await supabase
                .from("subscriptions")
                .update({ credits: newCredits })
                .eq("user_id", userId);
              console.log(`Deducted ${creditCost} credit from user ${userId}, remaining: ${newCredits}`);
            }
          }
        } else if (result === "failed") {
          failCount++;
        } else {
          skippedCount++;
        }
      } catch (timeoutErr) {
        console.error(`Email ${queuedEmail.id} timed out:`, timeoutErr);
        await supabase
          .from("email_queue")
          .update({ status: "failed", processed_at: new Date().toISOString(), error_message: "Send timed out after 15s" })
          .eq("id", queuedEmail.id);
        failCount++;
      }

      await new Promise(r => setTimeout(r, INTER_EMAIL_DELAY_MS));
    }

    const elapsed = Date.now() - startTime;
    console.log(`Done in ${elapsed}ms: ${successCount} sent, ${failCount} failed, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({ processed: pendingEmails.length, success: successCount, failed: failCount, skipped: skippedCount, elapsed_ms: elapsed }),
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
