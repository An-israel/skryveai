// event-register — the public webinar registration endpoint. Creates a real
// Skryve account for new registrants (deduped by email), adds them to the
// waitlist, records the event registration, and returns the community link.
//
// Runs with the service role because creating auth users and writing the waitlist
// must happen server-side. Consent is required (legal basis for later emails).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { magicEmailHtml } from "../_shared/magic-email.ts";

const FROM = "Skryve <welcome@skryve.app>";
const ROOT = "https://skryve.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomPassword(): string {
  return crypto.randomUUID() + crypto.randomUUID().toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const slug = (body.slug || "").toString().trim();
    const email = (body.email || "").toString().trim().toLowerCase();
    const name = (body.name || "").toString().trim();
    const phone = (body.phone || "").toString().trim();
    const country = (body.country || "").toString().trim();
    const skill = (body.skill || "").toString().trim();
    const consent = body.consent === true;

    if (!slug) return json({ error: "Missing event." }, 400);
    if (!email || !email.includes("@")) return json({ error: "A valid email is required." }, 400);
    if (!name) return json({ error: "Your name is required." }, 400);
    if (!consent) return json({ error: "Please accept the consent to continue." }, 400);

    // 1. Resolve the webinar (must be active). Community link stays server-side
    //    until we return it to a genuine registrant.
    const { data: webinar } = await svc
      .from("webinars")
      .select("id, community_link, community_type, is_active, title")
      .eq("slug", slug)
      .maybeSingle();
    if (!webinar || !webinar.is_active) return json({ error: "This event isn't available." }, 404);

    // 2. Dedupe by email.
    const { data: existingId } = await svc.rpc("auth_user_id_by_email", { _email: email });
    let userId: string | null = (existingId as string | null) ?? null;
    let isNewAccount = false;

    if (!userId) {
      // New person → create a real Skryve account (seamless; they experience it
      // as "registering for the webinar").
      const { data: created, error: createErr } = await svc.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: { full_name: name, role: "talent", source: `event_${slug}` },
      });
      if (createErr || !created?.user) {
        console.error("createUser failed:", createErr?.message);
        return json({ error: "Couldn't complete registration. Please try again." }, 500);
      }
      userId = created.user.id;
      isNewAccount = true;

      // Prefill their talent profile + tag the source (drives the two-path rule).
      await svc.from("talent_profiles").upsert(
        { user_id: userId, full_name: name || null, location: country || null,
          primary_skill: skill || null, signup_source: `event_${slug}` },
        { onConflict: "user_id" },
      );
    }

    // 3. Waitlist (dedupe by email; never double-count).
    let waitlistId: string | null = null;
    const { data: existingWl } = await svc
      .from("waitlist").select("id").eq("email", email).maybeSingle();
    if (existingWl) {
      waitlistId = existingWl.id;
    } else {
      const { data: wl } = await svc.from("waitlist").insert({
        email, full_name: name || null, primary_skill: skill || null,
        country: country || null, phone: phone || null,
        source: `event_${slug}`, consent: true, consent_at: new Date().toISOString(),
        user_id: userId,
      }).select("id").single();
      waitlistId = wl?.id ?? null;
    }

    // 4. Event registration (one per person per event). Increment count only when
    //    the registration row is genuinely new.
    const { data: priorReg } = await svc
      .from("event_registrations").select("id")
      .eq("webinar_id", webinar.id).eq("user_id", userId).maybeSingle();

    let registrationId = priorReg?.id ?? null;
    if (!priorReg) {
      const { data: reg } = await svc.from("event_registrations").insert({
        webinar_id: webinar.id, user_id: userId, waitlist_id: waitlistId,
      }).select("id").single();
      registrationId = reg?.id ?? null;
      // Keep the event's registration count in sync with the actual rows.
      const { count } = await svc.from("event_registrations")
        .select("id", { count: "exact", head: true }).eq("webinar_id", webinar.id);
      await svc.from("webinars").update({ registration_count: count ?? 0 }).eq("id", webinar.id);
    }

    // Send the confirmation email (event details + community link + a one-click
    // sign-in link) via Resend — the reliable path. Best-effort; never fail the
    // registration if the email hiccups.
    let emailSent = false;
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const { data: linkData } = await svc.auth.admin.generateLink({
          type: "magiclink", email, options: { redirectTo: `${ROOT}/vetting` },
        });
        const actionLink = linkData?.properties?.action_link;
        if (actionLink) {
          const resend = new Resend(RESEND_API_KEY);
          const { error: sendErr } = await resend.emails.send({
            from: FROM,
            to: [email],
            subject: `You're registered — ${webinar.title}`,
            html: magicEmailHtml(actionLink, {
              eventTitle: webinar.title,
              communityLink: webinar.community_link ?? undefined,
              communityType: webinar.community_type ?? undefined,
            }),
          });
          emailSent = !sendErr;
          if (sendErr) console.error("event confirmation email failed:", sendErr);
        }
      }
    } catch (e) {
      console.error("event confirmation email threw:", e);
    }

    return json({
      ok: true,
      is_new_account: isNewAccount,
      registration_id: registrationId,
      community_link: webinar.community_link,
      community_type: webinar.community_type,
      event_title: webinar.title,
      account_email: email,
      email_sent: emailSent,
    });
  } catch (e) {
    console.error("event-register fatal:", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
