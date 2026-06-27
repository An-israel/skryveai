import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const SITE_URL = "https://skryveai.com";

const encouragementEmails = [
  {
    subject: "🚀 Fresh jobs just landed on Skryve",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${SITE_URL}/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Hey ${name}! 👋</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">New remote roles from across the web land on Skryve every single day — and the freshest ones get the fewest applicants.</p>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Applying early gives you the best shot, so it pays to check in often.</p>
        <div style="background: #f0f4ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #1a1a2e; font-size: 15px; margin: 0;"><strong>💡 Today's challenge:</strong> Browse the jobs posted in the last 24 hours and apply to at least one that matches your skills.</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${SITE_URL}/jobs" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Browse Today's Jobs →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">Keep going, ${name}. Your next opportunity is closer than you think! 💪</p>
      </div>
    `,
  },
  {
    subject: "💪 A complete profile gets hired faster",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${SITE_URL}/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Stand out, ${name}! 🔥</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Clients on Skryve search for talent every day. Here's how to make sure they pick you:</p>
        <ul style="color: #444; font-size: 15px; line-height: 2;">
          <li>🧑‍💻 Add your <strong>top skills</strong> so you match more jobs</li>
          <li>🖼️ Show off your <strong>portfolio</strong> — proof beats promises</li>
          <li>💵 Set a clear <strong>rate</strong> so clients know what to expect</li>
          <li>⚡ Reply quickly to <strong>messages and offers</strong></li>
        </ul>
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #1a1a2e; font-size: 15px; margin: 0;"><strong>🎯 Tip:</strong> Profiles with a portfolio and a clear headline get noticed first when clients browse talent.</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${SITE_URL}/profile" style="background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Complete Your Profile →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">Every expert was once a beginner. You've got this! 🌟</p>
      </div>
    `,
  },
  {
    subject: "⚡ 5 minutes to move your career forward",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${SITE_URL}/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">5 minutes is all it takes, ${name} ⏱️</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">You don't need hours to make progress. Try this <strong>5-minute routine</strong>:</p>
        <div style="margin: 24px 0;">
          <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; margin-right: 12px;">1</span>
            <span style="color: #444; font-size: 15px;">Open Skryve and scan today's job matches (1 min)</span>
          </div>
          <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; margin-right: 12px;">2</span>
            <span style="color: #444; font-size: 15px;">Apply to one role that fits your skills (2 min)</span>
          </div>
          <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; margin-right: 12px;">3</span>
            <span style="color: #444; font-size: 15px;">Reply to any client messages or offers (2 min)</span>
          </div>
        </div>
        <p style="color: #444; font-size: 16px; line-height: 1.6; font-weight: 600;">That's it! 5 minutes → real momentum. 🎯</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${SITE_URL}/jobs" style="background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Start Your 5-Minute Routine →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">Small daily actions lead to big results. Let's go! 🚀</p>
      </div>
    `,
  },
  {
    subject: "🏆 Level up your skills, get more hireable",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${SITE_URL}/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Invest in yourself, ${name} 📈</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">The most hireable talent never stops learning. Skryve's courses help you pick up in-demand skills and earn certificates you can show off on your profile.</p>
        <div style="background: #fefce8; padding: 20px; border-radius: 12px; margin: 24px 0;">
          <p style="color: #444; font-size: 18px; font-weight: 700; text-align: center; margin: 8px 0;">📚 Learn a new skill</p>
          <p style="color: #444; font-size: 18px; font-weight: 700; text-align: center; margin: 8px 0;">🎓 Earn a certificate</p>
          <p style="color: #444; font-size: 18px; font-weight: 700; text-align: center; margin: 8px 0;">💼 Win more projects</p>
        </div>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">A little learning today opens bigger doors tomorrow. Pick up where you left off, or start something new.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${SITE_URL}/learn" style="background: #f59e0b; color: #1a1a2e; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Start Learning →</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 32px;">Consistency is the key. We believe in you, ${name}! 💪</p>
      </div>
    `,
  },
  {
    subject: "🌟 Remember why you started — keep going!",
    getBody: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${SITE_URL}/logo.png" alt="Skryve" style="height: 40px;" />
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Remember your "why", ${name} 💭</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">You joined Skryve because you wanted something more — freedom, financial independence, or to build something of your own.</p>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">That dream is still alive, and every job you apply to brings you one step closer to it.</p>
        <div style="background: linear-gradient(135deg, #eff6ff, #f0fdf4); padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <p style="color: #1a1a2e; font-size: 18px; font-style: italic; margin: 0;">"I didn't get lucky. I just didn't quit."</p>
          <p style="color: #666; font-size: 13px; margin-top: 8px;">— Every successful freelancer ever</p>
        </div>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Here's what you can do <strong>right now</strong>:</p>
        <ul style="color: #444; font-size: 15px; line-height: 2;">
          <li>✅ Apply to fresh jobs matching your skills</li>
          <li>✅ Polish your profile and portfolio</li>
          <li>✅ Reply to client messages and offers</li>
          <li>✅ Finish a course and earn a certificate</li>
        </ul>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${SITE_URL}/dashboard" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Open Your Dashboard →</a>
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
