import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { findEmail, type PersonInput } from "../_shared/email-finder-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_KEY) {
      return new Response(JSON.stringify({ error: "Email finder is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    let logSearch = true;

    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    }

    const body = await req.json().catch(() => ({}));
    const input: PersonInput = {
      firstName: body.firstName?.trim() || undefined,
      lastName: body.lastName?.trim() || undefined,
      domain: body.domain?.trim() || undefined,
      website: body.website?.trim() || undefined,
      company: body.company?.trim() || undefined,
    };

    if (body.skipLogging) logSearch = false;

    if (!input.domain && !input.website && !input.company) {
      return new Response(
        JSON.stringify({ error: "Provide a domain, website, or company name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await findEmail(input, {
      firecrawlKey: FIRECRAWL_KEY,
      supabaseUrl: SUPABASE_URL,
      serviceKey: SERVICE_KEY,
    });

    // Log search history if user is authenticated
    if (userId && logSearch) {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      await supabase.from("email_finder_searches").insert({
        user_id: userId,
        first_name: input.firstName,
        last_name: input.lastName,
        domain: input.domain,
        company: input.company,
        found_email: result.email,
        confidence: result.confidence,
        status: result.status,
        sources: result.sources,
        verification: { verified: result.emailVerified, confidence_label: result.emailConfidence },
        job_title: result.jobTitle,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[email-finder-search] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to find email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
