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
          from: "SkryveAI <noreply@skryveai.com>",
          to: [profile.email],
          subject: "Your SkryveAI trial ends tomorrow!",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f766e 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800;">
                  <span style="background: linear-gradient(135deg, #14b8a6, #2dd4bf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">SkryveAI</span>
                </h1>
              </div>
              
              <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                <h2 style="color: #1a1a2e; margin: 0 0 20px;">Hi ${profile.full_name}! 👋</h2>
                
                <p style="margin: 0 0 20px; color: #64748b; font-size: 16px;">
                  Your SkryveAI trial ends <strong>tomorrow</strong>. Don't lose access to:
                </p>
                
                <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <ul style="margin: 0; padding: 0 0 0 20px; color: #475569;">
                    <li style="margin-bottom: 10px;">🔍 AI-powered business discovery</li>
                    <li style="margin-bottom: 10px;">📊 Automated website analysis</li>
                    <li style="margin-bottom: 10px;">✉️ Personalized pitch generation</li>
                    <li style="margin-bottom: 0;">📈 Campaign tracking & analytics</li>
                  </ul>
                </div>
                
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; padding: 16px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0; color: #92400e; font-weight: 600;">
                    🎉 Special offer: Subscribe to yearly and save over 16%!
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://skryveai.com/pricing" 
                     style="display: inline-block;
                            background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); 
                            color: white; 
                            padding: 16px 32px; 
                            text-decoration: none; 
                            border-radius: 10px;
                            font-weight: 600;
                            font-size: 16px;
                            box-shadow: 0 4px 15px rgba(15, 118, 110, 0.3);">
                    Subscribe Now
                  </a>
                </div>
                
                <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                  Questions? Reply to this email and our team will help you out.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                  © ${new Date().getFullYear()} SkryveAI. All rights reserved.
                </p>
              </div>
            </body>
            </html>
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
