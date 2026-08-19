import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Server-side verification for paid course enrollment. LearnPath.tsx's Paystack
// popup runs client-side and can't be trusted to report its own success — this
// mirrors verify-payment's pattern (call Paystack directly with the secret key,
// only the service role ever writes the "paid" enrollment) but additionally
// checks the amount against the course's real price, since course purchases
// aren't logged to payment_history the way subscription purchases are.

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

    const { reference, courseId } = await req.json();
    if (!reference || !courseId) throw new Error("reference and courseId are required");

    const { data: talent } = await supabase
      .from("talent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!talent) throw new Error("Complete your profile first");

    // Already enrolled? Idempotent — no need to re-verify with Paystack.
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id, payment_status")
      .eq("course_id", courseId)
      .eq("talent_id", talent.id)
      .maybeSingle();
    if (existing?.payment_status === "paid") {
      return new Response(JSON.stringify({ status: "success", already_enrolled: true, enrollment: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: course } = await supabase
      .from("courses")
      .select("id, price")
      .eq("id", courseId)
      .single();
    if (!course) throw new Error("Course not found");

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

    // The transaction really was for THIS course, by THIS user, for at least the
    // course's real price — never trust the client's claim of what it paid for.
    const expectedKobo = Math.round(Number(course.price) * 100);
    const paidEnough = typeof paymentData.amount === "number" && paymentData.amount >= expectedKobo;
    const rightCourse = paymentData.metadata?.course_id === courseId;
    const rightUser = paymentData.metadata?.user_id === user.id;
    if (!paidEnough || !rightCourse || !rightUser) {
      console.error("Course payment mismatch:", { reference, courseId, userId: user.id, metadata: paymentData.metadata, amount: paymentData.amount, expectedKobo });
      return new Response(JSON.stringify({ status: "failed", message: "Payment does not match this course" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: enrollment, error: enrollError } = await supabase
      .from("enrollments")
      .upsert(
        { course_id: courseId, talent_id: talent.id, payment_status: "paid", progress_percent: 0 },
        { onConflict: "course_id,talent_id" },
      )
      .select("*")
      .single();
    if (enrollError) throw enrollError;

    return new Response(JSON.stringify({ status: "success", enrollment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Verify course payment error:", error);
    return new Response(JSON.stringify({ error: message, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
