import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { findEmail, verifyEmail, type PersonInput } from "../_shared/email-finder-engine.ts";

// Enterprise Email Finding Orchestrator
// 4-layer pipeline: DB cache → Hunter.io → Apollo.io → Firecrawl scrape + pattern
// Used by Pitch a Client, AutoPilot, and Smart Find for contact email enrichment

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrchestratorRequest {
  // Person details (optional — improves accuracy when provided)
  firstName?: string;
  lastName?: string;
  // Company details (at least one required)
  companyDomain?: string;
  companyName?: string;
  website?: string;
  // Context
  campaignId?: string;
  mode?: "find" | "verify";
  email?: string; // for verify mode
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const HUNTER_KEY = Deno.env.get("HUNTER_API_KEY");
    const APOLLO_KEY = Deno.env.get("APOLLO_API_KEY");

    if (!FIRECRAWL_KEY) {
      return new Response(JSON.stringify({ error: "Email discovery service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const authHeader = req.headers.get("authorization");
    const CRON_SECRET = Deno.env.get("AUTOPILOT_CRON_SECRET");
    const cronSecretHeader = req.headers.get("x-autopilot-cron-secret");
    const isCronCall = CRON_SECRET && cronSecretHeader === CRON_SECRET;
    const isUserCall = authHeader?.startsWith("Bearer ");

    if (!isCronCall && !isUserCall) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | undefined;
    if (isUserCall) {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: { user } } = await supabase.auth.getUser(authHeader!.replace("Bearer ", ""));
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    const body: OrchestratorRequest = await req.json();

    // Verify mode: just validate an existing email
    if (body.mode === "verify" && body.email) {
      const v = await verifyEmail(body.email);
      return new Response(JSON.stringify({
        email: body.email,
        valid: v.isDeliverable,
        status: v.status,
        confidence: v.score,
        isRoleBased: v.isRoleBased,
        isDisposable: v.isDisposable,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find mode: resolve the contact email for a person/company
    const input: PersonInput = {
      firstName: body.firstName,
      lastName: body.lastName,
      domain: body.companyDomain,
      website: body.website,
      company: body.companyName,
    };

    const result = await findEmail(input, {
      firecrawlKey: FIRECRAWL_KEY,
      supabaseUrl: SUPABASE_URL,
      serviceKey: SERVICE_KEY,
      hunterApiKey: HUNTER_KEY,
      apolloApiKey: APOLLO_KEY,
      userId,
    });

    return new Response(JSON.stringify({
      success: !!result.email,
      email: result.email,
      status: result.status,
      confidence: result.confidence,
      confidenceLabel: result.emailConfidence,
      source: result.emailSource,
      verified: result.emailVerified,
      domain: result.employerDomain,
      patternUsed: result.patternUsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[email-finder-orchestrator] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
