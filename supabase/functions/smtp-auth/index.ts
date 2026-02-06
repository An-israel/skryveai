import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SMTPCredentials {
  email_address: string;
  app_password: string;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  provider_type: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, credentials } = await req.json();
    
    // Get user from auth header
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    if (action === "test-connection") {
      // Test SMTP connection with provided credentials
      const creds: SMTPCredentials = credentials;
      
      if (!creds.email_address || !creds.app_password) {
        throw new Error("Email and App Password are required");
      }

      try {
        const client = new SMTPClient({
          connection: {
            hostname: creds.smtp_host || "smtp.gmail.com",
            port: creds.smtp_port || 587,
            tls: creds.smtp_port === 465,
            auth: {
              username: creds.email_address,
              password: creds.app_password,
            },
          },
        });

        // Just connecting and closing validates the credentials
        await client.close();

        return new Response(JSON.stringify({ 
          success: true, 
          message: "SMTP connection successful" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (smtpError) {
        console.error("SMTP test failed:", smtpError);
        throw new Error("Invalid credentials or SMTP settings. Please check your email and App Password.");
      }
    }

    if (action === "save-credentials") {
      const creds: SMTPCredentials = credentials;
      
      if (!creds.email_address || !creds.app_password) {
        throw new Error("Email and App Password are required");
      }

      // Upsert credentials
      const { error: upsertError } = await supabase
        .from("smtp_credentials")
        .upsert({
          user_id: user.id,
          email_address: creds.email_address,
          app_password: creds.app_password,
          smtp_host: creds.smtp_host || "smtp.gmail.com",
          smtp_port: creds.smtp_port || 587,
          imap_host: creds.imap_host || "imap.gmail.com",
          imap_port: creds.imap_port || 993,
          provider_type: creds.provider_type || "gmail",
          is_verified: true,
          last_verified_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Failed to save credentials:", upsertError);
        throw new Error("Failed to save SMTP credentials");
      }

      // Update user_settings with the email as sender
      await supabase
        .from("user_settings")
        .update({ sender_email: creds.email_address })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ 
        success: true, 
        email: creds.email_address 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      const { error: deleteError } = await supabase
        .from("smtp_credentials")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        throw new Error("Failed to disconnect email");
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check-status") {
      const { data: creds } = await supabase
        .from("smtp_credentials")
        .select("email_address, is_verified, provider_type")
        .eq("user_id", user.id)
        .single();

      return new Response(JSON.stringify({ 
        connected: !!creds,
        email: creds?.email_address || null,
        provider: creds?.provider_type || null,
        verified: creds?.is_verified || false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("SMTP auth error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
