import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find trials ending tomorrow that haven't been reminded
    const { data: expiringTrials, error } = await supabase
      .from("subscriptions")
      .select(`
        id,
        user_id,
        trial_ends_at,
        profiles!inner(email, full_name)
      `)
      .eq("status", "trial")
      .eq("reminder_sent", false)
      .gte("trial_ends_at", now.toISOString())
      .lte("trial_ends_at", tomorrow.toISOString());

    if (error) {
      throw error;
    }

    console.log(`Found ${expiringTrials?.length || 0} trials expiring tomorrow`);

    const results = [];
    for (const trial of expiringTrials || []) {
      const profile = (trial as any).profiles;
      
      try {
        // Send reminder email
        await resend.emails.send({
          from: "OutreachPro <noreply@outreachpro.app>",
          to: [profile.email],
          subject: "Your OutreachPro trial ends tomorrow!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #8b5cf6;">Hi ${profile.full_name}!</h1>
              
              <p>Your OutreachPro trial ends tomorrow. Don't lose access to:</p>
              
              <ul>
                <li>🔍 AI-powered business discovery</li>
                <li>📊 Automated website analysis</li>
                <li>✉️ Personalized pitch generation</li>
                <li>📈 Campaign tracking & analytics</li>
              </ul>
              
              <p><strong>Special offer:</strong> Subscribe to our yearly plan and save over 6%!</p>
              
              <div style="margin: 30px 0;">
                <a href="https://outreachpro.app/pricing" 
                   style="background: linear-gradient(135deg, #8b5cf6, #a855f7); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px;
                          font-weight: bold;">
                  Subscribe Now
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Questions? Reply to this email and our team will help you out.
              </p>
            </div>
          `,
        });

        // Mark reminder as sent
        await supabase
          .from("subscriptions")
          .update({ reminder_sent: true })
          .eq("id", trial.id);

        results.push({ userId: trial.user_id, status: "sent" });
      } catch (emailError: unknown) {
        const emailErrorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error(`Failed to send reminder to ${profile.email}:`, emailError);
        results.push({ userId: trial.user_id, status: "failed", error: emailErrorMessage });
      }
    }

    // Also check for expired trials and update status
    await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("status", "trial")
      .lt("trial_ends_at", now.toISOString());

    return new Response(JSON.stringify({
      processed: results.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Process trial reminders error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
