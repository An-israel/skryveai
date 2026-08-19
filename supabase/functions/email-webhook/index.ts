import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Resend signs webhook deliveries using Svix — HMAC-SHA256 over
// "{svix-id}.{svix-timestamp}.{raw body}", keyed by the webhook's signing
// secret (starts "whsec_"). Verifying this is what stops anyone from forging
// a POST claiming an email was "delivered"/"bounced"/etc for any emailId.
// Requires RESEND_WEBHOOK_SECRET to be set (Resend dashboard → Webhooks →
// this endpoint → Signing Secret); until it is, POSTs are rejected outright
// (fail closed) rather than silently accepted unverified.
async function verifyResendSignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not configured — rejecting webhook");
    return false;
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  try {
    const secretBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

    // Header can carry multiple space-delimited "v1,<base64>" signatures.
    const candidates = svixSignature.split(" ").map((s) => s.split(",")[1]).filter(Boolean);
    return candidates.includes(expected);
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

// Only ever redirect to an absolute http(s) URL that this email is actually on
// record as having sent — never trust a bare caller-supplied `url` param
// as-is, or this is a textbook open redirect off Skryve's own domain.
function isSafeRedirectTarget(targetUrl: string): boolean {
  try {
    const u = new URL(targetUrl);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    
    // Handle tracking pixel opens and unsubscribes (GET requests)
    if (req.method === "GET") {
      const type = url.searchParams.get("type");
      const emailId = url.searchParams.get("emailId");

      if (!emailId) {
        return new Response("Missing emailId", { status: 400 });
      }

      if (type === "open") {
        // Record email open
        const { error } = await supabase
          .from("emails")
          .update({ 
            status: "opened",
            opened_at: new Date().toISOString() 
          })
          .eq("id", emailId)
          .neq("status", "replied"); // Don't downgrade from replied

        if (error) {
          console.error("Error recording open:", error);
        } else {
          console.log(`Email ${emailId} opened`);
          
          // Get campaign ID and increment opened count
          const { data: email } = await supabase
            .from("emails")
            .select("campaign_id")
            .eq("id", emailId)
            .single();
          
          if (email?.campaign_id) {
            await supabase.rpc("increment_campaign_emails_opened", { 
              campaign_id: email.campaign_id 
            });
          }
        }

        // Return 1x1 transparent GIF
        const gif = Uint8Array.from([
          0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
          0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
          0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
          0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
          0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
          0x01, 0x00, 0x3b
        ]);
        
        return new Response(gif, {
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });
      }

      if (type === "admin-open") {
        // Track admin email opens
        const adminEmailId = url.searchParams.get("adminEmailId");
        if (adminEmailId) {
          const { error: adminOpenErr } = await supabase
            .from("admin_emails")
            .update({ opened_at: new Date().toISOString() })
            .eq("id", adminEmailId)
            .is("opened_at", null); // Only record first open

          if (adminOpenErr) {
            console.error("Error recording admin email open:", adminOpenErr);
          } else {
            console.log(`Admin email ${adminEmailId} opened`);
          }
        }

        // Return 1x1 transparent GIF
        const adminGif = Uint8Array.from([
          0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
          0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
          0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
          0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
          0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
          0x01, 0x00, 0x3b
        ]);
        return new Response(adminGif, {
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        });
      }

      if (type === "unsubscribe") {
        // Mark as unsubscribed (you could create a separate unsubscribe table)
        console.log(`Unsubscribe requested for email ${emailId}`);
        
        return new Response(
          `<!DOCTYPE html>
          <html>
          <head>
            <title>Unsubscribed</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
              .card { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
              h1 { color: #333; margin-bottom: 16px; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>You've been unsubscribed</h1>
              <p>You won't receive any more emails from us.</p>
            </div>
          </body>
          </html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      if (type === "click") {
        const targetUrl = url.searchParams.get("url");
        // Require both a well-formed http(s) URL AND a real, known email —
        // ties the redirect to an actual tracked send instead of accepting any
        // caller-supplied destination (this endpoint is fully public/GET, so
        // an unchecked redirect here is an open redirect off skryveai.com).
        if (targetUrl && isSafeRedirectTarget(targetUrl)) {
          const { data: knownEmail } = await supabase
            .from("emails")
            .select("id")
            .eq("id", emailId)
            .maybeSingle();
          if (knownEmail) {
            console.log(`Click tracked for email ${emailId}`);
            return Response.redirect(targetUrl, 302);
          }
        }
        return new Response("Invalid link", { status: 400 });
      }

      return new Response("Unknown tracking type", { status: 400 });
    }

    // Handle Resend webhooks (POST requests)
    if (req.method === "POST") {
      const rawBody = await req.text();
      const verified = await verifyResendSignature(req, rawBody);
      if (!verified) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = JSON.parse(rawBody);
      const eventType = body.type;
      const emailData = body.data;

      console.log(`Webhook received: ${eventType}`, emailData);

      // Extract email ID from headers if available
      const emailId = emailData?.headers?.["X-Entity-Ref-ID"];

      if (!emailId) {
        console.log("No email ID in webhook, using Resend email lookup");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      switch (eventType) {
        case "email.delivered":
          await supabase
            .from("emails")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", emailId);
          break;

        case "email.opened":
          const { data: openedEmail } = await supabase
            .from("emails")
            .select("status, campaign_id")
            .eq("id", emailId)
            .single();
          
          if (openedEmail && openedEmail.status !== "replied") {
            await supabase
              .from("emails")
              .update({ status: "opened", opened_at: new Date().toISOString() })
              .eq("id", emailId);
            
            if (openedEmail.campaign_id) {
              await supabase.rpc("increment_campaign_emails_opened", { 
                campaign_id: openedEmail.campaign_id 
              });
            }
          }
          break;

        case "email.clicked":
          console.log(`Click tracked via webhook for email ${emailId}`);
          break;

        case "email.bounced":
          await supabase
            .from("emails")
            .update({ 
              status: "bounced", 
              error_message: emailData?.bounce?.message || "Email bounced" 
            })
            .eq("id", emailId);
          break;

        case "email.complained":
          await supabase
            .from("emails")
            .update({ 
              status: "failed", 
              error_message: "Recipient marked as spam" 
            })
            .eq("id", emailId);
          break;
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Error in email-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
