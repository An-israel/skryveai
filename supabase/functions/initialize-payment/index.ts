import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Pricing in kobo (NGN smallest unit) - base prices
// Africa prices (discounted by 5000 NGN)
const PRICING_NGN = {
  monthly: 700000, // 7,000 NGN (was 12,000)
  yearly: 8500000, // 85,000 NGN (was 135,000)
  lifetime: 25000000, // 250,000 NGN (unchanged)
};

// Base USD prices for conversion (US/Europe)
const PRICING_USD = {
  monthly: 800, // $8 USD in cents
  yearly: 9000, // $90 USD in cents
  lifetime: 16700, // $167 USD in cents
};

// Credits per plan
const PLAN_CREDITS = {
  monthly: 100,
  yearly: 1200,
  lifetime: -1, // -1 means unlimited
};

interface InitPaymentRequest {
  plan: "monthly" | "yearly" | "lifetime";
  currency?: string;
  callbackUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { plan, currency = "NGN", callbackUrl }: InitPaymentRequest = await req.json();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Calculate amount based on currency
    let amount: number;
    if (currency === "NGN") {
      amount = PRICING_NGN[plan];
    } else {
      // For other currencies, use USD pricing (Paystack will convert)
      amount = PRICING_USD[plan];
    }

    // Generate unique reference
    const reference = `outreach_${plan}_${user.id}_${Date.now()}`;

    // Create payment record
    await supabase.from("payment_history").insert({
      user_id: user.id,
      paystack_reference: reference,
      amount: amount,
      currency: currency,
      plan: plan,
      status: "pending",
    });

    // Initialize transaction with Paystack
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
          custom_fields: [
            {
              display_name: "Plan",
              variable_name: "plan",
              value: plan,
            },
          ],
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
