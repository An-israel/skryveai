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

const PLAN_CREDITS: Record<string, number> = {
  basic: 50,
  monthly: 100,
  yearly: 1200,
  unlimited: -1,
  team_basic: 300,
  team_pro: -1,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { reference } = await req.json();
    if (!reference) {
      throw new Error("Reference is required");
    }

    // Check if already processed
    const { data: existingPayment } = await supabase
      .from("payment_history")
      .select("status, plan, user_id")
      .eq("paystack_reference", reference)
      .single();

    if (existingPayment?.status === "success") {
      return new Response(JSON.stringify({ status: "success", already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Paystack API directly
    console.log("Verifying payment with Paystack:", reference);
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const contentType = verifyResponse.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await verifyResponse.text();
      console.error("Non-JSON response from Paystack:", text.substring(0, 500));
      throw new Error("Unexpected response from payment provider");
    }

    const verifyData = await verifyResponse.json();
    console.log("Paystack verify response:", JSON.stringify(verifyData));

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(JSON.stringify({ 
        status: "failed", 
        message: verifyData.data?.gateway_response || "Payment not confirmed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment is confirmed by Paystack - process it
    const paymentData = verifyData.data;
    const planKey = paymentData.metadata?.plan_key || paymentData.metadata?.plan || existingPayment?.plan;
    const plan = existingPayment?.plan || (planKey?.includes("yearly") ? "yearly" : "monthly");
    const paymentUserId = existingPayment?.user_id || user.id;

    if (!plan) {
      throw new Error("Could not determine plan from payment");
    }

    // Update payment history
    await supabase
      .from("payment_history")
      .update({ status: "success" })
      .eq("paystack_reference", reference);

    // Update subscription
    const now = new Date();
    let periodEnd: Date;
    if (planKey?.includes("yearly") || plan === "yearly") {
      periodEnd = new Date(now.getTime());
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd = new Date(now.getTime());
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Determine if unlimited plan
    const isUnlimited = planKey === "unlimited" || planKey === "team_pro" || planKey === "team_pro_yearly";

    const creditsToAdd = PLAN_CREDITS[planKey || plan] || PLAN_CREDITS[plan] || 100;

    const { data: currentSub } = await supabase
      .from("subscriptions")
      .select("credits")
      .eq("user_id", paymentUserId)
      .single();

    const newCredits = isUnlimited || creditsToAdd === -1 ? 999999 : (currentSub?.credits || 0) + creditsToAdd;

    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        plan: plan as any,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        paystack_customer_code: paymentData.customer?.customer_code,
        paystack_authorization_code: paymentData.authorization?.authorization_code,
        amount_paid: paymentData.amount,
        currency: paymentData.currency,
        reminder_sent: false,
        credits: newCredits,
        campaign_limit: null,
      })
      .eq("user_id", paymentUserId);

    // Handle referral commission (40% for 6 months)
    const { data: profile } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("user_id", paymentUserId)
      .single();

    if (profile?.referred_by) {
      const { data: referral } = await supabase
        .from("referrals")
        .select("id, commission_rate, status, created_at")
        .eq("referred_id", paymentUserId)
        .single();

      if (referral) {
        // Check if within 6 months of referral creation
        const referralDate = new Date(referral.created_at);
        const sixMonthsLater = new Date(referralDate.getTime());
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        const withinWindow = new Date() <= sixMonthsLater;

        if (withinWindow) {
          const commissionRate = referral.commission_rate || 0.40;
          const commissionAmount = Math.floor(paymentData.amount * commissionRate);

          await supabase
            .from("referrals")
            .update({
              status: "completed",
              commission_amount: (referral.status === "completed" ? 0 : 0) + commissionAmount,
              commission_currency: paymentData.currency,
              completed_at: new Date().toISOString(),
            })
            .eq("id", referral.id);

          // Give referrer bonus credits
          const bonusCredits = Math.floor((creditsToAdd === -1 ? 100 : creditsToAdd) * 0.1);
          if (bonusCredits > 0) {
            const { data: referrerSub } = await supabase
              .from("subscriptions")
              .select("credits")
              .eq("user_id", profile.referred_by)
              .single();

            if (referrerSub) {
              await supabase
                .from("subscriptions")
                .update({ credits: (referrerSub.credits || 0) + bonusCredits })
                .eq("user_id", profile.referred_by);
            }
          }
        }
      }
    }

    console.log("Payment verified and processed successfully:", reference);

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({ error: message, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
