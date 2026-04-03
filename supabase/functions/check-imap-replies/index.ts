import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with SMTP credentials
    const { data: allCredentials, error: credError } = await supabase
      .from("smtp_credentials")
      .select("*");

    if (credError) {
      throw new Error("Failed to fetch SMTP credentials");
    }

    let totalRepliesFound = 0;

    for (const credentials of allCredentials || []) {
      try {
        // Connect to IMAP
        const client = new ImapFlow({
          host: credentials.imap_host,
          port: credentials.imap_port,
          secure: true,
          auth: {
            user: credentials.email_address,
            pass: credentials.app_password,
          },
          logger: false,
        });

        await client.connect();

        // Select INBOX
        const mailbox = await client.mailboxOpen("INBOX");
        console.log(`Checking ${credentials.email_address}: ${mailbox.exists} messages`);

        // Get emails from the last 7 days
        const since = new Date();
        since.setDate(since.getDate() - 7);

        // Search for recent emails
        const messages = client.fetch(
          { since },
          { envelope: true, source: { start: 0, maxLength: 5000 } }
        );

        for await (const message of messages) {
          const from = message.envelope?.from?.[0]?.address;
          const subject = message.envelope?.subject || "";
          const inReplyTo = message.envelope?.inReplyTo;

          if (!from) continue;

          // Check if this is a reply to one of our sent emails
          // Look for emails sent to this address that haven't been marked as replied
          const { data: sentEmail } = await supabase
            .from("emails")
            .select("id, campaign_id")
            .eq("to_email", from)
            .eq("status", "sent")
            .is("replied_at", null)
            .single();

          if (sentEmail) {
            // Mark as replied
            await supabase
              .from("emails")
              .update({ 
                replied_at: new Date().toISOString(),
                status: "replied"
              })
              .eq("id", sentEmail.id);

            // Increment campaign replies
            await supabase.rpc("increment_campaign_replies", {
              campaign_id: sentEmail.campaign_id,
            });

            // Store the reply
            await supabase
              .from("email_replies")
              .insert({
                email_id: sentEmail.id,
                from_email: from,
                reply_to_address: credentials.email_address,
                received_at: message.envelope?.date?.toISOString() || new Date().toISOString(),
                reply_content: subject,
              });

            totalRepliesFound++;
            console.log(`Found reply from ${from} for email ${sentEmail.id}`);
          }
        }

        await client.logout();
      } catch (userError) {
        console.error(`Error checking replies for ${credentials.email_address}:`, userError);
        // Continue with next user
      }
    }

    console.log(`IMAP check complete. Found ${totalRepliesFound} new replies.`);

    return new Response(JSON.stringify({ 
      success: true, 
      repliesFound: totalRepliesFound,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("IMAP check error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
