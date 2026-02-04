import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing daily credits...");

    // Add 5 credits to all users who haven't received daily credits in 24 hours
    // Exclude lifetime users who have unlimited credits
    const { data: subscriptions, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, user_id, credits, plan, last_daily_credit")
      .neq("plan", "lifetime");

    if (fetchError) {
      throw fetchError;
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let updatedCount = 0;

    for (const sub of subscriptions || []) {
      const lastCredit = sub.last_daily_credit ? new Date(sub.last_daily_credit) : null;
      
      // If never received daily credits or last credit was more than 24 hours ago
      if (!lastCredit || lastCredit < oneDayAgo) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            credits: (sub.credits || 0) + 5,
            last_daily_credit: now.toISOString(),
          })
          .eq("id", sub.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(`Failed to update credits for user ${sub.user_id}:`, updateError);
        }
      }
    }

    console.log(`Daily credits added to ${updatedCount} users`);

    return new Response(JSON.stringify({
      success: true,
      usersUpdated: updatedCount,
      processedAt: now.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Process daily credits error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
