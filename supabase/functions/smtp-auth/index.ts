import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Test SMTP connection using raw socket
async function testSmtpConnection(host: string, port: number, username: string, password: string): Promise<{ success: boolean; message: string }> {
  try {
    // Use Deno's native TLS connection for SMTP testing
    const useDirectTLS = port === 465;
    
    let conn: Deno.Conn;
    
    if (useDirectTLS) {
      // Direct TLS connection for port 465
      conn = await Deno.connectTls({
        hostname: host,
        port: port,
      });
    } else {
      // Plain connection for port 587 (will upgrade with STARTTLS)
      conn = await Deno.connect({
        hostname: host,
        port: port,
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Helper to read response
    async function readResponse(): Promise<string> {
      const n = await conn.read(buffer);
      if (n === null) throw new Error("Connection closed");
      return decoder.decode(buffer.subarray(0, n));
    }

    // Helper to send command
    async function sendCommand(cmd: string): Promise<string> {
      await conn.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    }

    // Read greeting
    const greeting = await readResponse();
    console.log("SMTP Greeting:", greeting.trim());
    
    if (!greeting.startsWith("220")) {
      conn.close();
      throw new Error("Invalid SMTP server response");
    }

    // Send EHLO
    const ehloResponse = await sendCommand(`EHLO localhost`);
    console.log("EHLO Response:", ehloResponse.substring(0, 100));
    
    if (!ehloResponse.includes("250")) {
      conn.close();
      throw new Error("EHLO command failed");
    }

    // For port 587, we need STARTTLS
    if (!useDirectTLS) {
      const starttlsResponse = await sendCommand("STARTTLS");
      console.log("STARTTLS Response:", starttlsResponse.trim());
      
      if (!starttlsResponse.startsWith("220")) {
        conn.close();
        throw new Error("STARTTLS not supported or failed");
      }

      // Upgrade to TLS
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });
      
      // Send EHLO again after TLS
      await sendCommand(`EHLO localhost`);
    }

    // Authenticate using AUTH LOGIN
    const authResponse = await sendCommand("AUTH LOGIN");
    console.log("AUTH Response:", authResponse.trim());
    
    if (!authResponse.startsWith("334")) {
      conn.close();
      throw new Error("AUTH LOGIN not supported");
    }

    // Send base64 encoded username
    const usernameB64 = btoa(username);
    const userResponse = await sendCommand(usernameB64);
    
    if (!userResponse.startsWith("334")) {
      conn.close();
      throw new Error("Username rejected");
    }

    // Send base64 encoded password
    const passwordB64 = btoa(password);
    const passResponse = await sendCommand(passwordB64);
    
    if (!passResponse.startsWith("235")) {
      conn.close();
      console.error("Auth failed response:", passResponse.trim());
      throw new Error("Authentication failed - check your App Password");
    }

    // Send QUIT
    await sendCommand("QUIT");
    conn.close();

    return { success: true, message: "SMTP connection and authentication successful" };
  } catch (error) {
    console.error("SMTP test error:", error);
    const message = error instanceof Error ? error.message : "Connection failed";
    return { success: false, message };
  }
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
      const creds: SMTPCredentials = credentials;
      
      if (!creds.email_address || !creds.app_password) {
        throw new Error("Email and App Password are required");
      }

      // Clean up app password (remove spaces that users might copy)
      const cleanPassword = creds.app_password.replace(/\s/g, "");
      
      const result = await testSmtpConnection(
        creds.smtp_host || "smtp.gmail.com",
        creds.smtp_port || 587,
        creds.email_address,
        cleanPassword
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: result.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save-credentials") {
      const creds: SMTPCredentials = credentials;
      
      if (!creds.email_address || !creds.app_password) {
        throw new Error("Email and App Password are required");
      }

      // Clean up app password
      const cleanPassword = creds.app_password.replace(/\s/g, "");

      // Upsert credentials
      const { error: upsertError } = await supabase
        .from("smtp_credentials")
        .upsert({
          user_id: user.id,
          email_address: creds.email_address,
          app_password: cleanPassword,
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
        .maybeSingle();

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
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
