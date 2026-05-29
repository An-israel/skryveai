import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const siteUrl = Deno.env.get("SITE_URL") || "https://skryve.io";

  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  let sent24h = 0;
  let sent1h = 0;
  let errors = 0;

  const sendEmail = async (to: string, subject: string, html: string) => {
    if (!resendKey) return;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Skryve Events <events@skryve.io>", to, subject, html }),
    });
  };

  // ── 24-hour reminders ─────────────────────────────────────────────
  const { data: events24h } = await supabase
    .from("events")
    .select("id, title, date_time, timezone, format, platform_name, event_link, location_address, organizer_id")
    .eq("status", "published")
    .eq("reminder_24h_sent", false)
    .gte("date_time", in24h.toISOString())
    .lte("date_time", in25h.toISOString());

  for (const event of (events24h || [])) {
    try {
      // Get attendees
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", event.id);

      if (!rsvps?.length) continue;

      // Get user emails
      for (const rsvp of rsvps) {
        const { data: { user } } = await supabase.auth.admin.getUserById(rsvp.user_id);
        if (!user?.email) continue;

        const eventDate = new Date(event.date_time).toLocaleString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit", timeZone: event.timezone || "UTC",
        });

        const locationInfo = event.platform_name
          ? `<p><strong>Platform:</strong> ${event.platform_name}</p>${event.event_link ? `<p><strong>Join link:</strong> <a href="${event.event_link}">${event.event_link}</a></p>` : ""}`
          : event.location_address
          ? `<p><strong>Location:</strong> ${event.location_address}</p>`
          : "";

        await sendEmail(
          user.email,
          `Reminder: "${event.title}" is tomorrow!`,
          `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1E3A5F;">Your event is tomorrow 🗓️</h2>
              <h3>${event.title}</h3>
              <p><strong>When:</strong> ${eventDate} (${event.timezone})</p>
              ${locationInfo}
              <p style="margin-top: 24px;">
                <a href="${siteUrl}/events/${event.id}"
                   style="background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                  View Event Details
                </a>
              </p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                You're receiving this because you RSVPed to this event on Skryve.
              </p>
            </div>
          `
        );
      }

      // Mark reminder sent
      await supabase.from("events").update({ reminder_24h_sent: true }).eq("id", event.id);
      sent24h++;
    } catch {
      errors++;
    }
  }

  // ── 1-hour reminders ──────────────────────────────────────────────
  const { data: events1h } = await supabase
    .from("events")
    .select("id, title, date_time, timezone, format, platform_name, event_link, location_address")
    .eq("status", "published")
    .eq("reminder_1h_sent", false)
    .gte("date_time", in1h.toISOString())
    .lte("date_time", in2h.toISOString());

  for (const event of (events1h || [])) {
    try {
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", event.id);

      if (!rsvps?.length) continue;

      for (const rsvp of rsvps) {
        const { data: { user } } = await supabase.auth.admin.getUserById(rsvp.user_id);
        if (!user?.email) continue;

        const joinLink = event.event_link
          ? `<p style="margin-top: 16px;"><a href="${event.event_link}" style="background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Join Now</a></p>`
          : "";

        await sendEmail(
          user.email,
          `Starting in 1 hour: "${event.title}"`,
          `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1E3A5F;">Your event starts in 1 hour! ⏰</h2>
              <h3>${event.title}</h3>
              ${event.platform_name ? `<p><strong>Platform:</strong> ${event.platform_name}</p>` : ""}
              ${joinLink}
              <p style="margin-top: 16px;">
                <a href="${siteUrl}/events/${event.id}"
                   style="background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                  View Event Details
                </a>
              </p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                You're receiving this because you RSVPed to this event on Skryve.
              </p>
            </div>
          `
        );
      }

      await supabase.from("events").update({ reminder_1h_sent: true }).eq("id", event.id);
      sent1h++;
    } catch {
      errors++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent_24h: sent24h, sent_1h: sent1h, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
