import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PRICING_NGN, PRICING_NGN_NONAF, PRICING_USD, AFRICAN_COUNTRIES } from "../_shared/pricing.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const paystackSecretKey = Deno.env.get("Paystack_API") || Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface InitPaymentRequest {
  plan: string;
  currency?: string;
  callbackUrl: string;
  country?: string; // optional — detected by frontend
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) throw new Error("Unauthorized");

    const { plan, currency = "NGN", callbackUrl, country: requestCountry }: InitPaymentRequest = await req.json();

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, country")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Determine if African pricing
    // Priority: 1) country from frontend (IP-detected), 2) profile country, 3) default to African for NGN
    const countryCode = (requestCountry || profile.country || "").toUpperCase().trim().slice(0, 2);
    const isAfrican = !countryCode || AFRICAN_COUNTRIES.includes(countryCode) || currency === "NGN";

    let amount: number;
    if (currency === "NGN") {
      const prices = isAfrican ? PRICING_NGN : PRICING_NGN_NONAF;
      amount = prices[plan] || PRICING_NGN[plan] || 700000;
    } else {
      amount = PRICING_USD[plan] || 800;
    }

    const reference = `outreach_${plan}_${user.id}_${Date.now()}`;

    // Map plan key to the subscription_plan enum value
    // The subscription_plan enum only has: monthly, yearly, lifetime
    // Map all plan keys to the correct enum value
    let enumPlan: string;
    if (plan.includes("yearly")) {
      enumPlan = "yearly";
    } else {
      enumPlan = "monthly";
    }

    await supabase.from("payment_history").insert({
      user_id: user.id,
      paystack_reference: reference,
      amount: amount,
      currency: currency,
      plan: enumPlan as any,
      status: "pending",
    });

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: profile.email,
        amount: amount,
        currency: currency === "NGN" ? "NGN" : "USD",
        reference: reference,
        callback_url: callbackUrl,
        metadata: {
          user_id: user.id,
          plan: plan,
          plan_key: plan,
          custom_fields: [{ display_name: "Plan", variable_name: "plan", value: plan }],
        },
      }),
    });

    const paystackData = await paystackResponse.json();
    if (!paystackData.status) {
      throw new Error(paystackData.message || "Failed to initialize payment");
    }

    return new Response(JSON.stringify({
      authorization_url: paystackData.data.authorization_url,
      reference: reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Initialize payment error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
