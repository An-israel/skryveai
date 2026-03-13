import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  userId: string;
}

// MX record verification via Google DNS
async function verifyMX(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;
    const trusted = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com', 'zoho.com', 'live.com']);
    if (trusted.has(domain)) return true;
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return true;
    const data = await resp.json();
    if (data.Status === 0 && data.Answer?.some((a: { type: number }) => a.type === 15)) return true;
    const aResp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, { signal: AbortSignal.timeout(3000) });
    if (aResp.ok) { const aData = await aResp.json(); if (aData.Status === 0 && aData.Answer?.length > 0) return true; }
    return false;
  } catch { return true; }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email) || email.length > 254) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  const badDomains = ['booksrus.com', 'example.com', 'test.com', 'sample.com',
    'indeed.com', 'linkedin.com', 'glassdoor.com', 'wellfound.com'];
  if (badDomains.includes(domain)) return false;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, userId }: SendEmailRequest = await req.json();

    if (!to || !subject || !body || !userId) {
      throw new Error("Missing required fields: to, subject, body, userId");
    }

    if (!isValidEmail(to)) {
      throw new Error("Invalid or blocked email address");
    }

    const mxValid = await verifyMX(to);
    if (!mxValid) {
      throw new Error("Email domain cannot receive mail (no MX record)");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's SMTP credentials
    const { data: credentials, error: credError } = await supabase
      .from("smtp_credentials")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (credError || !credentials) {
      throw new Error("SMTP not configured. Please connect your email account in Settings.");
    }

    // Get user's sender name from settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("sender_name")
      .eq("user_id", userId)
      .single();

    const senderName = settings?.sender_name || "Sender";

    // Configure SMTP client
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

    // Create plain text version by stripping HTML
    const plainText = body.replace(/<[^>]*>/g, '');

    // Send email
    await client.send({
      from: `${senderName} <${credentials.email_address}>`,
      to: to,
      subject: subject,
      content: plainText,
      html: body,
    });

    await client.close();

    console.log(`Email sent successfully via SMTP to ${to} from ${credentials.email_address}`);

    // Update credentials as verified if not already
    if (!credentials.is_verified) {
      await supabase
        .from("smtp_credentials")
        .update({ is_verified: true, last_verified_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: `smtp-${Date.now()}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Send SMTP error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
