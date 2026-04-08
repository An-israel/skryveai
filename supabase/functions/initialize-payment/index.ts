import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const paystackSecretKey = Deno.env.get("Paystack_API") || Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Pricing in kobo (NGN smallest unit) - African base
const PRICING_NGN: Record<string, number> = {
  basic: 500000,
  monthly: 700000,
  yearly: 7400000,
  unlimited: 1500000,
  team_basic: 1800000,
  team_basic_yearly: 18400000,
  team_pro: 3000000,
  team_pro_yearly: 30000000,
};

// Non-African prices (add 5000 NGN = 500000 kobo on monthly, proportional on yearly)
const PRICING_NGN_NONAF: Record<string, number> = {
  basic: 1000000,
  monthly: 1200000,
  yearly: 12600000,
  unlimited: 2000000,
  team_basic: 2300000,
  team_basic_yearly: 23500000,
  team_pro: 3500000,
  team_pro_yearly: 35000000,
};

// USD pricing for non-NGN currencies
const PRICING_USD: Record<string, number> = {
  basic: 500,
  monthly: 800,
  yearly: 8400,
  unlimited: 1300,
  team_basic: 1500,
  team_basic_yearly: 15300,
  team_pro: 2500,
  team_pro_yearly: 25000,
};

const PLAN_CREDITS: Record<string, number> = {
  basic: 50,
  monthly: 100,
  yearly: 1200,
  unlimited: -1,
  team_basic: 300,
  team_basic_yearly: 3600,
  team_pro: -1,
  team_pro_yearly: -1,
};

const AFRICAN_COUNTRIES = [
  "NG", "GH", "KE", "ZA", "UG", "TZ", "RW", "ET", "EG", "MA",
  "SN", "CI", "CM", "BJ", "BF", "ML", "NE", "TD", "CF", "CG",
];

interface InitPaymentRequest {
  plan: string;
  currency?: string;
  callbackUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) throw new Error("Unauthorized");

    const { plan, currency = "NGN", callbackUrl }: InitPaymentRequest = await req.json();

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, country")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Determine if African pricing
    // If paying in NGN, always use African pricing (NGN = Nigerian currency)
    // Only use non-African pricing for NGN if user is explicitly from a non-African country
    const profileCountry = (profile.country || "").toUpperCase().trim();
    const isAfrican = !profileCountry || AFRICAN_COUNTRIES.includes(profileCountry.slice(0, 2));

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
