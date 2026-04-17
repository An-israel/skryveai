import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { findEmail } from "../_shared/email-finder-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

interface Business {
  id: string;
  campaign_id: string;
  name: string;
  email: string | null;
  website: string | null;
}

async function enrichBusinesses(
  campaignId: string,
  userId: string,
  env: { firecrawlKey: string; supabaseUrl: string; serviceKey: string },
) {
  const supabase = createClient(env.supabaseUrl, env.serviceKey);

  // Get businesses needing enrichment for this campaign
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, campaign_id, name, email, website")
    .eq("campaign_id", campaignId);

  if (!businesses || businesses.length === 0) return;

  for (const biz of businesses as Business[]) {
    try {
      // Skip if it already has a real email
      if (biz.email && !biz.email.startsWith("info@") && !biz.email.startsWith("contact@")) continue;

      // Check existing enrichment
      const { data: existing } = await supabase
        .from("business_email_enrichment")
        .select("id, status")
        .eq("business_id", biz.id)
        .maybeSingle();

      if (existing && existing.status === "completed") continue;

      // Upsert pending row
      await supabase.from("business_email_enrichment").upsert({
        business_id: biz.id,
        campaign_id: campaignId,
        user_id: userId,
        original_email: biz.email,
        status: "processing",
        attempted_at: new Date().toISOString(),
      }, { onConflict: "business_id" });

      const result = await findEmail({
        company: biz.name,
        website: biz.website || undefined,
      }, env);

      const finalStatus = result.email ? "completed" : "failed";

      await supabase.from("business_email_enrichment").update({
        enriched_email: result.email,
        confidence: result.confidence,
        status: finalStatus,
        sources: result.sources,
        verification: { verified: result.emailVerified, confidence_label: result.emailConfidence },
      }).eq("business_id", biz.id);

      // Update the business record if we found a better email
      if (result.email && result.confidence > 50) {
        await supabase.from("businesses").update({
          email: result.email,
        }).eq("id", biz.id);
      }
    } catch (e) {
      console.error(`[enrich] error for business ${biz.id}:`, (e as Error).message);
      await supabase.from("business_email_enrichment").update({
        status: "failed",
      }).eq("business_id", biz.id);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_KEY) {
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const campaignId = body.campaignId;
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, user_id")
      .eq("id", campaignId)
      .single();
    if (!campaign || campaign.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = { firecrawlKey: FIRECRAWL_KEY, supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY };
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(enrichBusinesses(campaignId, user.id, env));
    } else {
      enrichBusinesses(campaignId, user.id, env).catch((e) => console.error("[enrich bg]:", e));
    }

    return new Response(JSON.stringify({ success: true, status: "enrichment_started" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[enrich-campaign-emails]:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Enrichment failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
