import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FOLLOWUP_GAP_DAYS = 2;
const MAX_FOLLOWUPS = 3;

// Follow-up templates — short, punchy, reference the original
const FOLLOWUP_TEMPLATES = [
  {
    // Follow-up 1: Gentle bump
    subjectPrefix: "Re: ",
    bodyTemplate: (businessName: string, senderName: string) =>
      `Hi there,\n\nJust wanted to make sure my previous email didn't get buried — I know inboxes can get hectic.\n\nI genuinely think there's an opportunity for ${businessName} that's worth a quick look. Would love just 5 minutes of your time.\n\nHappy to work around your schedule.\n\nBest,\n${senderName}`,
  },
  {
    // Follow-up 2: Add value
    subjectPrefix: "Re: ",
    bodyTemplate: (businessName: string, senderName: string) =>
      `Hi again,\n\nI wanted to follow up one more time — I've been thinking more about ${businessName} and I'm confident I can help drive real results.\n\nNo pressure at all, but if you're even slightly curious, I'd love to share a few quick ideas. No strings attached.\n\nWould a brief chat this week work?\n\nCheers,\n${senderName}`,
  },
  {
    // Follow-up 3: Last chance / breakup
    subjectPrefix: "Re: ",
    bodyTemplate: (businessName: string, senderName: string) =>
      `Hi,\n\nI don't want to be a pest, so this will be my last note.\n\nIf the timing isn't right for ${businessName}, I completely understand. But if things change down the road, my door is always open.\n\nWishing you all the best either way.\n\n${senderName}`,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing env vars");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── STEP 1: Find opened emails that need follow-up scheduling ───
    // Get emails that were opened but don't have all 3 follow-ups scheduled yet
    const { data: openedEmails, error: openedError } = await supabase
      .from("emails")
      .select(`
        id, to_email, campaign_id, business_id, pitch_id, opened_at, replied_at,
        pitches!inner(subject, body),
        campaigns!inner(user_id)
      `)
      .not("opened_at", "is", null)
      .eq("status", "sent")
      .limit(100);

    if (openedError) {
      console.error("Error fetching opened emails:", openedError);
      throw openedError;
    }

    let scheduledCount = 0;
    let skippedCount = 0;

    for (const email of openedEmails || []) {
      // Skip if already replied
      if (email.replied_at) {
        continue;
      }

      const userId = (email.campaigns as any).user_id;
      const originalSubject = (email.pitches as any).subject;
      const businessId = email.business_id;

      // Check how many follow-ups already exist for this email
      const { data: existingFollowups, error: followupErr } = await supabase
        .from("email_followups")
        .select("followup_number")
        .eq("email_id", email.id);

      if (followupErr) {
        console.error(`Error checking followups for email ${email.id}:`, followupErr);
        continue;
      }

      const existingNumbers = new Set((existingFollowups || []).map(f => f.followup_number));

      // Get the business name
      const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .single();

      const businessName = business?.name || "your business";

      // Get sender name
      const { data: settings } = await supabase
        .from("user_settings")
        .select("sender_name")
        .eq("user_id", userId)
        .single();

      const senderName = settings?.sender_name || "There";

      // Schedule missing follow-ups
      for (let i = 1; i <= MAX_FOLLOWUPS; i++) {
        if (existingNumbers.has(i)) continue;

        const template = FOLLOWUP_TEMPLATES[i - 1];
        const scheduledFor = new Date(email.opened_at);
        scheduledFor.setDate(scheduledFor.getDate() + (i * FOLLOWUP_GAP_DAYS));

        // Don't schedule in the past — if it's already past, schedule for now + 5 min
        if (scheduledFor < new Date()) {
          scheduledFor.setTime(Date.now() + 5 * 60 * 1000);
        }

        const { error: insertError } = await supabase
          .from("email_followups")
          .insert({
            email_id: email.id,
            campaign_id: email.campaign_id,
            business_id: email.business_id,
            user_id: userId,
            followup_number: i,
            status: "scheduled",
            scheduled_for: scheduledFor.toISOString(),
            subject: template.subjectPrefix + originalSubject,
            body: template.bodyTemplate(businessName, senderName),
          });

        if (insertError) {
          // Unique constraint violation = already exists, skip
          if (insertError.code === "23505") {
            skippedCount++;
          } else {
            console.error(`Error scheduling followup ${i} for email ${email.id}:`, insertError);
          }
        } else {
          scheduledCount++;
          console.log(`Scheduled follow-up #${i} for ${email.to_email} at ${scheduledFor.toISOString()}`);
        }
      }
    }

    // ─── STEP 2: Process due follow-ups — add to email queue ───
    const { data: dueFollowups, error: dueError } = await supabase
      .from("email_followups")
      .select(`
        id, email_id, campaign_id, business_id, user_id,
        followup_number, subject, body, scheduled_for
      `)
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(20);

    if (dueError) {
      console.error("Error fetching due followups:", dueError);
      throw dueError;
    }

    let queuedCount = 0;
    let cancelledCount = 0;

    for (const followup of dueFollowups || []) {
      // Check if the original email has been replied to — if so, skip all remaining
      const { data: originalEmail } = await supabase
        .from("emails")
        .select("replied_at, to_email")
        .eq("id", followup.email_id)
        .single();

      if (originalEmail?.replied_at) {
        // Cancel this and all remaining follow-ups for this email
        await supabase
          .from("email_followups")
          .update({ status: "skipped" })
          .eq("email_id", followup.email_id)
          .eq("status", "scheduled");
        cancelledCount++;
        console.log(`Cancelled follow-ups for ${originalEmail.to_email} — they replied`);
        continue;
      }

      // Also check if a previous follow-up was replied to
      // (check email_replies for any reply to this recipient in this campaign)

      const toEmail = originalEmail?.to_email;
      if (!toEmail) {
        await supabase.from("email_followups").update({ status: "failed" }).eq("id", followup.id);
        continue;
      }

      // Get the pitch_id for the queue entry
      const { data: emailData } = await supabase
        .from("emails")
        .select("pitch_id")
        .eq("id", followup.email_id)
        .single();

      // Get sender info
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("sender_name, sender_email")
        .eq("user_id", followup.user_id)
        .single();

      // Queue the follow-up email
      const { error: queueError } = await supabase
        .from("email_queue")
        .insert({
          campaign_id: followup.campaign_id,
          business_id: followup.business_id,
          pitch_id: emailData?.pitch_id || followup.email_id, // fallback
          to_email: toEmail,
          subject: followup.subject,
          body: followup.body,
          sender_name: userSettings?.sender_name || "SkryveAI",
          sender_email: userSettings?.sender_email || null,
          status: "pending",
          scheduled_for: new Date().toISOString(),
        });

      if (queueError) {
        console.error(`Error queuing followup ${followup.id}:`, queueError);
        await supabase.from("email_followups").update({ status: "failed" }).eq("id", followup.id);
      } else {
        await supabase
          .from("email_followups")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", followup.id);
        queuedCount++;
        console.log(`Queued follow-up #${followup.followup_number} to ${toEmail}`);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`Follow-ups processed in ${elapsed}ms: ${scheduledCount} scheduled, ${queuedCount} queued, ${cancelledCount} cancelled, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        scheduled: scheduledCount,
        queued: queuedCount,
        cancelled: cancelledCount,
        skipped: skippedCount,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-followups:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
