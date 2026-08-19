import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Server-side verification for paid event tickets. The "Buy Ticket" button's
// Paystack popup runs client-side and can't be trusted to report its own
// success — mirrors verify-course-payment's pattern: re-verify the charge
// directly with Paystack, check the amount against the event's real ticket
// price, and only the service role ever writes the "paid" RSVP.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const paystackSecretKey = Deno.env.get("Paystack_API") || Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) throw new Error("Unauthorized");

    const { reference, eventId } = await req.json();
    if (!reference || !eventId) throw new Error("reference and eventId are required");

    // Already have a paid ticket? Idempotent — skip re-verifying with Paystack.
    const { data: existing } = await supabase
      .from("event_rsvps")
      .select("id, payment_status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.payment_status === "paid") {
      return new Response(JSON.stringify({ status: "success", already_registered: true, rsvp: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: event } = await supabase
      .from("events")
      .select("id, ticket_price, price_type")
      .eq("id", eventId)
      .single();
    if (!event) throw new Error("Event not found");

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecretKey}` },
    });
    const contentType = verifyResponse.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Unexpected response from payment provider");
    }
    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(JSON.stringify({
        status: "failed",
        message: verifyData.data?.gateway_response || "Payment not confirmed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentData = verifyData.data;

    // The transaction really was for THIS event, by THIS user, for at least the
    // ticket's real price — never trust the client's claim of what it paid for.
    const expectedKobo = Math.round(Number(event.ticket_price || 0) * 100);
    const paidEnough = typeof paymentData.amount === "number" && paymentData.amount >= expectedKobo;
    const rightEvent = paymentData.metadata?.event_id === eventId;
    const rightUser = paymentData.metadata?.user_id === user.id;
    if (!paidEnough || !rightEvent || !rightUser) {
      console.error("Event payment mismatch:", { reference, eventId, userId: user.id, metadata: paymentData.metadata, amount: paymentData.amount, expectedKobo });
      return new Response(JSON.stringify({ status: "failed", message: "Payment does not match this event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rsvp, error: rsvpError } = await supabase
      .from("event_rsvps")
      .upsert(
        { event_id: eventId, user_id: user.id, payment_status: "paid" },
        { onConflict: "event_id,user_id" },
      )
      .select("*")
      .single();
    if (rsvpError) throw rsvpError;

    return new Response(JSON.stringify({ status: "success", rsvp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Verify event payment error:", error);
    return new Response(JSON.stringify({ error: message, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
