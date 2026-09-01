// send-magic-link — generates a Supabase magic sign-in link server-side and
// emails it via Resend (the app's reliable transactional path), instead of
// relying on Supabase's built-in auth email delivery. Used by the event
// "Start vetting" button and the login page's passwordless option.
//
// Only sends when the email already belongs to a Skryve account (generateLink
// for a magic link fails otherwise), so it can't be used to spam arbitrary
// inboxes with login links.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { magicEmailHtml } from "../_shared/magic-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM = "Skryve <welcome@skryve.app>";
const ROOT = "https://skryve.app";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "Email service not configured" }, 500);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    const { email, next } = await req.json().catch(() => ({}));
    const addr = (email || "").toString().trim().toLowerCase();
    if (!addr || !addr.includes("@")) return json({ error: "A valid email is required." }, 400);

    const redirectTo = `${ROOT}${(next && String(next).startsWith("/")) ? next : "/feed"}`;

    // Generate the magic link. Fails if the user doesn't exist — which is fine:
    // we return a generic ok so we don't leak which emails have accounts.
    const { data, error } = await svc.auth.admin.generateLink({
      type: "magiclink", email: addr, options: { redirectTo },
    });
    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      console.warn("generateLink failed:", error?.message);
      return json({ ok: true }); // don't reveal account existence
    }

    const resend = new Resend(RESEND_API_KEY);
    const { error: sendErr } = await resend.emails.send({
      from: FROM,
      to: [addr],
      subject: "Your Skryve sign-in link",
      html: magicEmailHtml(actionLink),
    });
    if (sendErr) {
      console.error("resend send failed:", sendErr);
      return json({ error: "Couldn't send the email. Please try again." }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("send-magic-link fatal:", e);
    return json({ error: "Something went wrong." }, 500);
  }
});
