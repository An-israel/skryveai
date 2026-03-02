import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find users who signed up 2+ hours ago but haven't confirmed their email
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get profiles where reminder hasn't been sent, created 2-24 hours ago
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .eq("confirmation_reminder_sent", false)
      .lt("created_at", twoHoursAgo)
      .gt("created_at", twentyFourHoursAgo);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users need reminders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const profile of profiles) {
      // Check if user has confirmed their email via auth admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.user_id);
      
      if (authError || !authUser?.user) {
        console.error(`Failed to get auth user ${profile.user_id}:`, authError);
        continue;
      }

      // Skip if already confirmed
      if (authUser.user.email_confirmed_at) {
        // Mark as sent so we don't check again
        await supabase
          .from("profiles")
          .update({ confirmation_reminder_sent: true })
          .eq("user_id", profile.user_id);
        continue;
      }

      // Send reminder email via Resend
      if (resendApiKey) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "SkryveAI <onboarding@resend.dev>",
              to: [profile.email],
              subject: "Confirm Your SkryveAI Account ✉️",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #0B162B;">Hi ${profile.full_name || "there"} 👋</h2>
                  <p>We noticed you signed up for SkryveAI but haven't confirmed your email yet.</p>
                  <p>To get started, please check your inbox (and spam folder) for the original confirmation email and click the verification link.</p>
                  <p>If you can't find it or the link has expired, you can request a new one by visiting the login page and attempting to sign in — we'll send a fresh confirmation link.</p>
                  <p style="margin-top: 20px;">Need help? Reply to this email and we'll sort it out!</p>
                  <p style="color: #666; font-size: 14px; margin-top: 30px;">— The SkryveAI Team</p>
                </div>
              `,
            }),
          });

          const emailBody = await emailRes.text();
          if (emailRes.ok) {
            sent++;
          } else {
            console.error(`Failed to send reminder to ${profile.email}:`, emailBody);
          }
        } catch (emailError) {
          console.error(`Email send error for ${profile.email}:`, emailError);
        }
      }

      // Also try to resend the confirmation via Supabase auth
      try {
        await supabase.auth.resend({
          type: "signup",
          email: profile.email,
        });
      } catch (resendError) {
        console.error(`Failed to resend confirmation for ${profile.email}:`, resendError);
      }

      // Mark reminder as sent
      await supabase
        .from("profiles")
        .update({ confirmation_reminder_sent: true })
        .eq("user_id", profile.user_id);
    }

    return new Response(
      JSON.stringify({ message: `Processed ${profiles.length} users, sent ${sent} reminders` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-confirmation-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
