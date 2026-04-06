import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "aniekaneazy@gmail.com";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationId, message, userName } = await req.json();

    // Update unread count and last_message_at
    await supabase
      .from("chat_conversations" as any)
      .update({
        last_message_at: new Date().toISOString(),
        unread_by_admin: 999, // will be read properly from DB
      })
      .eq("id", conversationId);

    // Increment unread properly
    const { data: conv } = await supabase
      .from("chat_conversations" as any)
      .select("unread_by_admin")
      .eq("id", conversationId)
      .single();

    if (conv) {
      await supabase
        .from("chat_conversations" as any)
        .update({ unread_by_admin: ((conv as any).unread_by_admin || 0) + 1 })
        .eq("id", conversationId);
    }

    // Send email notification if Resend is configured
    if (RESEND_API_KEY) {
      const adminUrl = `https://skryveai.com/admin`;
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">💬 New Chat Message</h2>
          <p style="color: #555;">You have a new message from a SkryveAI user.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f4f4f5; font-size: 13px; color: #666; width: 100px;">From</td>
              <td style="padding: 8px 12px; font-size: 14px; font-weight: 500;">${userName || user.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f4f4f5; font-size: 13px; color: #666;">Message</td>
              <td style="padding: 8px 12px; font-size: 14px;">${message}</td>
            </tr>
          </table>
          <a href="${adminUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Reply in Admin Panel →
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">SkryveAI Customer Success Notifications</p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SkryveAI Support <support@skryveai.com>",
          to: [ADMIN_EMAIL],
          subject: `💬 New message from ${userName || user.email}`,
          html: emailHtml,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("chat-notify error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
