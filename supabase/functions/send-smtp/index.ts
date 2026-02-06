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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, userId }: SendEmailRequest = await req.json();

    if (!to || !subject || !body || !userId) {
      throw new Error("Missing required fields: to, subject, body, userId");
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
