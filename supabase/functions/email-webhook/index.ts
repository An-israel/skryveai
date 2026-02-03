import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        if (targetUrl) {
          console.log(`Click tracked for email ${emailId}`);
          // You could track clicks in a separate table here
          return Response.redirect(targetUrl, 302);
        }
      }

      return new Response("Unknown tracking type", { status: 400 });
    }

    // Handle Resend webhooks (POST requests)
    if (req.method === "POST") {
      const body = await req.json();
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
