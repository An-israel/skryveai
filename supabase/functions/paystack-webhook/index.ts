import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPaystackSignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(paystackSecretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signatureBuffer = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return computedSignature === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    // Verify webhook signature
    const isValid = await verifyPaystackSignature(body, signature);
    if (!isValid) {
      console.error("Invalid Paystack signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    // Credits per plan
    const PLAN_CREDITS: Record<string, number> = {
      monthly: 100,
      yearly: 1200,
      lifetime: -1, // -1 means unlimited
    };

    switch (event.event) {
      case "charge.success": {
        const { reference, customer, amount, currency, authorization } = event.data;
        
        // Get user by email
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, referred_by")
          .eq("email", customer.email)
          .single();

        if (profile) {
          // Update payment history
          await supabase
            .from("payment_history")
            .update({ status: "success" })
            .eq("paystack_reference", reference);

          // Get payment to determine plan
          const { data: payment } = await supabase
            .from("payment_history")
            .select("plan")
            .eq("paystack_reference", reference)
            .single();

          if (payment) {
            const now = new Date();
            let periodEnd: Date;
            
            if (payment.plan === "monthly") {
              periodEnd = new Date(now.setMonth(now.getMonth() + 1));
            } else if (payment.plan === "yearly") {
              periodEnd = new Date(now.setFullYear(now.getFullYear() + 1));
            } else {
              // Lifetime - set to far future
              periodEnd = new Date("2099-12-31");
            }

            // Calculate credits to add
            const creditsToAdd = PLAN_CREDITS[payment.plan] || 0;
            const isUnlimited = payment.plan === "lifetime";

            // Get current credits
            const { data: currentSub } = await supabase
              .from("subscriptions")
              .select("credits")
              .eq("user_id", profile.user_id)
              .single();

            const newCredits = isUnlimited ? 999999 : (currentSub?.credits || 0) + creditsToAdd;

            // Update subscription with credits
            await supabase
              .from("subscriptions")
              .update({
                status: "active",
                plan: payment.plan,
                current_period_start: new Date().toISOString(),
                current_period_end: periodEnd.toISOString(),
                paystack_customer_code: customer.customer_code,
                paystack_authorization_code: authorization?.authorization_code,
                amount_paid: amount,
                currency: currency,
                reminder_sent: false,
                credits: newCredits,
                campaign_limit: null, // Remove limit on paid plans
              })
              .eq("user_id", profile.user_id);

            // Send subscription receipt email to user
            await sendSubscriptionReceipt(customer.email, payment.plan, amount, currency);

            // Notify admin and marketing staff in-app
            await notifyStaffOfSubscription(customer.email, payment.plan, amount, currency);

            // Handle referral commission
            if (profile.referred_by) {
              // Get referral record
              const { data: referral } = await supabase
                .from("referrals")
                .select("id, commission_rate, status")
                .eq("referred_id", profile.user_id)
                .single();

              if (referral && referral.status === "pending") {
                const commissionRate = referral.commission_rate || 0.20;
                const commissionAmount = Math.floor(amount * commissionRate);

                // Update referral with commission
                await supabase
                  .from("referrals")
                  .update({
                    status: "completed",
                    commission_amount: commissionAmount,
                    commission_currency: currency,
                    completed_at: new Date().toISOString(),
                  })
                  .eq("id", referral.id);

                // Add bonus credits to referrer (10% of plan credits)
                const bonusCredits = Math.floor(creditsToAdd * 0.1);
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
        }
        break;
      }

      case "subscription.create": {
        const { customer, subscription_code, plan } = event.data;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", customer.email)
          .single();

        if (profile) {
          await supabase
            .from("subscriptions")
            .update({
              paystack_subscription_code: subscription_code,
            })
            .eq("user_id", profile.user_id);
        }
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        const { customer } = event.data;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", customer.email)
          .single();

        if (profile) {
          await supabase
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("user_id", profile.user_id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const { customer } = event.data;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", customer.email)
          .single();

        if (profile) {
          // Log activity
          await supabase.from("activity_log").insert({
            user_id: profile.user_id,
            action: "payment_failed",
            entity_type: "subscription",
            details: { reason: "Invoice payment failed" },
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Paystack webhook error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
