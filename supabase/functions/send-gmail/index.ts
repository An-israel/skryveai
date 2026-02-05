import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  userId: string;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
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
    body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text version
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    body,
    ``,
    `--${boundary}--`,
  ];

  const rawEmail = emailLines.join("\r\n");
  
  // Base64url encode
  const encoder = new TextEncoder();
  const data = encoder.encode(rawEmail);
  let base64 = btoa(String.fromCharCode(...data));
  // Make it URL safe
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return base64;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, userId }: SendEmailRequest = await req.json();

    if (!to || !subject || !body || !userId) {
      throw new Error("Missing required fields");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's Gmail tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (tokensError || !tokens) {
      throw new Error("Gmail not connected. Please connect your Gmail account in Settings.");
    }

    let accessToken = tokens.access_token;
    const tokenExpiry = new Date(tokens.token_expiry);

    // Check if token is expired or about to expire (within 5 minutes)
    if (tokenExpiry < new Date(Date.now() + 5 * 60 * 1000)) {
      console.log("Token expired, refreshing...");
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      accessToken = newTokens.access_token;

      // Update tokens in database
      const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
      await supabase
        .from("gmail_tokens")
        .update({
          access_token: accessToken,
          token_expiry: newExpiry.toISOString(),
        })
        .eq("user_id", userId);
    }

    // Get user's sender name from settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("sender_name")
      .eq("user_id", userId)
      .single();

    const senderName = settings?.sender_name || "Sender";
    const fromAddress = `${senderName} <${tokens.gmail_email}>`;

    // Create the raw email message
    const rawEmail = createEmailRaw(to, fromAddress, subject, body);

    // Send via Gmail API
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
      throw new Error(sendResult.error?.message || "Failed to send email via Gmail");
    }

    console.log(`Email sent successfully via Gmail to ${to}, Message ID: ${sendResult.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: sendResult.id,
      threadId: sendResult.threadId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Send Gmail error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
