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
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { teamId, email, role } = await req.json();

    if (!teamId || !email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user owns the team
    const { data: team, error: teamError } = await serviceClient
      .from("teams")
      .select("id, name, owner_id, max_members")
      .eq("id", teamId)
      .single();

    if (teamError || !team || team.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Team not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check member limit
    const { count } = await serviceClient
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId);

    if ((count || 0) >= team.max_members) {
      return new Response(JSON.stringify({ error: "Member limit reached" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already invited
    const { data: existing } = await serviceClient
      .from("team_members")
      .select("id, status")
      .eq("team_id", teamId)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: `This email is already ${existing.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert team_member record
    const { data: member, error: insertError } = await serviceClient
      .from("team_members")
      .insert({
        team_id: teamId,
        email,
        role,
        status: "invited",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Get inviter's name
    const { data: inviterProfile } = await serviceClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const inviterName = inviterProfile?.full_name || user.email || "Someone";

    // Check if invited user exists and create in-app notification
    const { data: invitedUser } = await serviceClient
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (invitedUser) {
      await serviceClient.from("notifications").insert({
        user_id: invitedUser.user_id,
        type: "team_invite",
        title: "Team Invitation",
        message: `${inviterName} invited you to join "${team.name}" as ${role}.`,
        data: {
          team_id: teamId,
          team_name: team.name,
          member_id: member.id,
          role,
          inviter_name: inviterName,
        },
      });
    }

    // Send invitation email
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);
      const appUrl = req.headers.get("origin") || "https://skryveai.lovable.app";

      await resend.emails.send({
        from: `SkryveAI <outreach@skryveai.com>`,
        to: [email],
        subject: `You've been invited to join ${team.name} on SkryveAI`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #7c3aed; margin: 0;">SkryveAI</h1>
            </div>
            <h2 style="margin-bottom: 16px;">You've been invited!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the team <strong>"${team.name}"</strong> as a <strong>${role}</strong>.</p>
            <p>Log in to your SkryveAI account to accept or decline this invitation.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${appUrl}/team" style="background: #7c3aed; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View Invitation
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">If you don't have an account, <a href="${appUrl}/signup" style="color: #7c3aed;">sign up here</a> with this email address to join the team.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">SkryveAI - AI-Powered Outreach Platform</p>
          </body>
          </html>
        `,
      });
    }

    return new Response(JSON.stringify({ success: true, memberId: member.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-team-invite:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
