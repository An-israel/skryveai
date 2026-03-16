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
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendSubscriptionReceipt(email: string, plan: string, amount: number, currency: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured, skipping receipt");
    return;
  }

  const planNames: Record<string, string> = {
    monthly: "Monthly Plan",
    yearly: "Yearly Plan",
    lifetime: "Lifetime Plan",
  };

  const formattedAmount = `${currency} ${(amount / 100).toLocaleString()}`;
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #0B162B; margin: 0;">SkryveAI</h2>
  </div>
  <h3 style="color: #333;">🎉 Thank you for subscribing!</h3>
  <p>We're thrilled to have you as a ${planNames[plan] || plan} subscriber! Your account has been upgraded and you now have full access to all premium features.</p>
  <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e9ecef;">
    <h4 style="margin: 0 0 16px; color: #333;">Payment Receipt</h4>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${planNames[plan] || plan}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedAmount}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${date}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Status</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #22c55e;">✅ Paid</td></tr>
    </table>
  </div>
  <p>Here's what you can do now:</p>
  <ul style="padding-left: 20px;">
    <li>Run unlimited outreach campaigns</li>
    <li>Use AI-powered website analysis</li>
    <li>Track email opens and replies</li>
    <li>Set up automated follow-ups</li>
  </ul>
  <p>If you have any questions, just reply to this email — we're here to help!</p>
  <p>Let's get you more clients 💪</p>
  <p style="margin: 0;">— The SkryveAI Team</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #666; text-align: center;">SkryveAI Limited | RC: 9388330Y</p>
</body>
</html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "SkryveAI <outreach@skryveai.com>",
        to: [email],
        subject: `🎉 Welcome to SkryveAI ${planNames[plan] || plan} — Payment Confirmed`,
        html: htmlBody,
      }),
    });
    console.log(`Subscription receipt sent to ${email}`);
  } catch (err) {
    console.error("Failed to send subscription receipt:", err);
  }
}

async function notifyStaffOfSubscription(email: string, plan: string, amount: number, currency: string) {
  try {
    const formattedAmount = `${currency} ${(amount / 100).toLocaleString()}`;
    const { data: staffUsers } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["super_admin", "content_editor"]);

    if (!staffUsers || staffUsers.length === 0) return;

    const uniqueUserIds = [...new Set(staffUsers.map((u: { user_id: string }) => u.user_id))];
    const notifications = uniqueUserIds.map(userId => ({
      user_id: userId,
      title: "💰 New Subscription!",
      message: `${email} subscribed to ${plan} plan (${formattedAmount})`,
      type: "subscription",
      data: { email, plan, amount: formattedAmount },
    }));

    await supabase.from("notifications").insert(notifications);
    console.log(`Notified ${uniqueUserIds.length} staff about new subscription`);
  } catch (err) {
    console.error("Failed to notify staff of subscription:", err);
  }
}


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
