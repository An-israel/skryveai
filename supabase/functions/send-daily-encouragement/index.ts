import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const encouragementEmails = [
  {
    subject: "🚀 Your Next Client Is One Email Away",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://skryveai.lovable.app/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Hey ${name}! 👋</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Did you know that <strong>80% of sales require 5+ follow-ups</strong>, but most people give up after just one?</p>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">The difference between freelancers who thrive and those who struggle isn't talent — it's <strong>consistent outreach</strong>.</p>
        <div style="background: #f0f4ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #1a1a2e; font-size: 15px; margin: 0;"><strong>💡 Today's Challenge:</strong> Send at least 5 personalized pitches. Let our AI analyze websites and craft the perfect message for each business.</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://skryveai.lovable.app/campaigns/new" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Start Sending Pitches →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">Keep pushing, ${name}. Your breakthrough is closer than you think! 💪</p>
      </div>
    `,
  },
  {
    subject: "💪 Don't Give Up — Here's Why Cold Email Works",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://skryveai.lovable.app/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Keep Going, ${name}! 🔥</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">We get it — sending cold emails can feel daunting. But here's the truth:</p>
        <ul style="color: #444; font-size: 15px; line-height: 2;">
          <li>📧 Cold email has a <strong>15-25% response rate</strong> when personalized</li>
          <li>💰 One good client can pay for <strong>months of work</strong></li>
          <li>🤖 Skryve's AI does the hard part — <strong>you just review and send</strong></li>
          <li>📈 The more you send, the better your <strong>results get</strong></li>
        </ul>
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #1a1a2e; font-size: 15px; margin: 0;"><strong>🎯 Success Story:</strong> Freelancers using Skryve who send 10+ emails daily see their first client within 2 weeks on average.</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://skryveai.lovable.app/dashboard" style="background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Open Your Dashboard →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">Every expert was once a beginner. You've got this! 🌟</p>
      </div>
    `,
  },
  {
    subject: "⚡ 5 Minutes Could Change Your Business Today",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://skryveai.lovable.app/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">5 Minutes Is All It Takes, ${name} ⏱️</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">You don't need hours to grow your freelance business. Here's a <strong>5-minute power routine</strong>:</p>
        <div style="margin: 24px 0;">
          <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; margin-right: 12px;">1</span>
            <span style="color: #444; font-size: 15px;">Open Skryve and create a quick campaign (1 min)</span>
          </div>
          <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; margin-right: 12px;">2</span>
            <span style="color: #444; font-size: 15px;">Let AI find businesses & analyze their sites (2 min)</span>
          </div>
          <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; margin-right: 12px;">3</span>
            <span style="color: #444; font-size: 15px;">Review AI pitches and hit send (2 min)</span>
          </div>
        </div>
        <p style="color: #444; font-size: 16px; line-height: 1.6; font-weight: 600;">That's it! 5 minutes → potential new clients. 🎯</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://skryveai.lovable.app/campaigns/new" style="background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Start Your 5-Minute Routine →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">Small daily actions lead to massive results. Let's go! 🚀</p>
      </div>
    `,
  },
  {
    subject: "🏆 Winners Send More Emails — Here's Proof",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://skryveai.lovable.app/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">The Numbers Don't Lie, ${name} 📊</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Here's what the data shows about successful freelancers:</p>
        <div style="background: #fefce8; padding: 20px; border-radius: 12px; margin: 24px 0;">
          <p style="color: #444; font-size: 28px; font-weight: 700; text-align: center; margin: 8px 0;">📧 10 emails/day = 300/month</p>
          <p style="color: #444; font-size: 28px; font-weight: 700; text-align: center; margin: 8px 0;">📬 15% reply rate = 45 responses</p>
          <p style="color: #444; font-size: 28px; font-weight: 700; text-align: center; margin: 8px 0;">🤝 10% close rate = 4-5 new clients</p>
        </div>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">That's <strong>4-5 new clients every month</strong> just from spending a few minutes daily on Skryve. The math works — you just have to show up consistently.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://skryveai.lovable.app/campaigns/new" style="background: #f59e0b; color: #1a1a2e; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Start Sending Now →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">Consistency is the key. We believe in you, ${name}! 💪</p>
      </div>
    `,
  },
  {
    subject: "🌟 Remember Why You Started — Keep Pushing!",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://skryveai.lovable.app/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Remember Your "Why", ${name} 💭</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">You signed up for Skryve because you wanted something more — freedom, financial independence, or to build something of your own.</p>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">That dream is still alive. And every cold email you send brings you one step closer to it.</p>
        <div style="background: linear-gradient(135deg, #eff6ff, #f0fdf4); padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <p style="color: #1a1a2e; font-size: 18px; font-style: italic; margin: 0;">"I didn't get lucky. I just didn't quit."</p>
          <p style="color: #666; font-size: 13px; margin-top: 8px;">— Every successful freelancer ever</p>
        </div>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Here's what you can do <strong>right now</strong>:</p>
        <ul style="color: #444; font-size: 15px; line-height: 2;">
          <li>✅ Search for businesses in your niche</li>
          <li>✅ Let AI craft personalized pitches</li>
          <li>✅ Send them out and let the results come</li>
          <li>✅ Apply to jobs matching your skills</li>
        </ul>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://skryveai.lovable.app/dashboard" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Get Back To Work →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">We're rooting for you. Now go make it happen! 🚀</p>
      </div>
    `,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split("T")[0];

    console.log(`Processing daily encouragement emails for ${today}...`);

    // Get all users with profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email");

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get already sent today
    const { data: alreadySent } = await supabase
      .from("daily_email_log")
      .select("user_id")
      .eq("sent_date", today);

    const sentUserIds = new Set((alreadySent || []).map((s) => s.user_id));

    // Filter out users who already received email today
    const usersToEmail = profiles.filter((p) => !sentUserIds.has(p.user_id));

    if (usersToEmail.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "All users already emailed today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a random email template for today
    const template = encouragementEmails[Math.floor(Math.random() * encouragementEmails.length)];

    let sent = 0;
    let failed = 0;

    for (const user of usersToEmail) {
      try {
        const name = user.full_name || "there";
        const html = template.getBody(name);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Skryve AI <hello@skryve.ai>",
            to: [user.email],
            subject: template.subject,
            html,
          }),
        });

        if (res.ok) {
          // Log that we sent to this user today
          await supabase
            .from("daily_email_log")
            .insert({ user_id: user.user_id, sent_date: today });
          sent++;
        } else {
          const errText = await res.text();
          console.error(`Failed to send to ${user.email}:`, errText);
          failed++;
        }

        // Throttle: 200ms between sends
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        console.error(`Error sending to ${user.email}:`, e);
        failed++;
      }
    }

    console.log(`Daily encouragement emails: sent=${sent}, failed=${failed}`);

    return new Response(JSON.stringify({ sent, failed, template: template.subject }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Daily encouragement error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
