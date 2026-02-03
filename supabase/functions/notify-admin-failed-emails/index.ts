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

    // Get count of failed emails that haven't been notified yet
    const { data: failedEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select(`
        id,
        to_email,
        subject,
        error_message,
        campaign_id,
        created_at
      `)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching failed emails:", fetchError);
      throw new Error("Failed to fetch failed emails");
    }

    if (!failedEmails || failedEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No failed emails to report", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin emails (users with super_admin role)
    const { data: admins, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw new Error("Failed to fetch admin users");
    }

    if (!admins || admins.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admin users to notify", count: failedEmails.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin emails from profiles
    const adminIds = admins.map(a => a.user_id);
    const { data: adminProfiles, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .in("user_id", adminIds);

    if (profileError || !adminProfiles || adminProfiles.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found", count: failedEmails.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean);

    // Build email content
    const failedEmailsList = failedEmails.map(e => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${e.to_email}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${e.subject.substring(0, 50)}...</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; color: #dc2626;">${e.error_message || "Unknown error"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(e.created_at).toLocaleString()}</td>
      </tr>
    `).join("");

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">⚠️ Failed Emails Alert</h1>
        <p>There are <strong>${failedEmails.length} failed emails</strong> in the queue that need attention.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Recipient</th>
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Subject</th>
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Error</th>
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Created</th>
            </tr>
          </thead>
          <tbody>
            ${failedEmailsList}
          </tbody>
        </table>
        
        <p>Please log in to the admin panel to retry or investigate these failures.</p>
        
        <p style="margin-top: 30px;">
          <a href="https://skryveai.com/admin" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Admin Panel</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated notification from SkryveAI.</p>
      </body>
      </html>
    `;

    // Send notification to all admins
    const { data: emailResponse, error: sendError } = await resend.emails.send({
      from: "SkryveAI Alerts <alerts@skryveai.com>",
      to: adminEmails,
      subject: `⚠️ ${failedEmails.length} Failed Emails Need Attention`,
      html: htmlBody,
    });

    if (sendError) {
      console.error("Error sending admin notification:", sendError);
      throw new Error(sendError.message || "Failed to send notification");
    }

    console.log(`Admin notification sent to ${adminEmails.length} admins about ${failedEmails.length} failed emails`);

    return new Response(
      JSON.stringify({ 
        success: true,
        failedCount: failedEmails.length,
        notifiedAdmins: adminEmails.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-admin-failed-emails:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
