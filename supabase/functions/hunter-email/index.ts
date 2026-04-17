import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { findEmail, verifyEmail, type PersonInput } from "../_shared/email-finder-engine.ts";

// Backward-compat shim: this function used to call Hunter.io directly.
// It now delegates to the native email-finder engine but keeps the same response shape
// so existing callers continue working without changes.

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
      return new Response(JSON.stringify({ error: "Email discovery service not configured" }), {
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
    const { domain, website, company, email: emailToVerify, mode, firstName, lastName } = body;

    if (mode === "verify" && emailToVerify) {
      const v = await verifyEmail(emailToVerify);
      return new Response(JSON.stringify({
        valid: v.isDeliverable,
        score: v.score,
        status: v.status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const input: PersonInput = { domain, website, company, firstName, lastName };
    const result = await findEmail(input, {
      firecrawlKey: FIRECRAWL_KEY,
      supabaseUrl: SUPABASE_URL,
      serviceKey: SERVICE_KEY,
    });

    return new Response(JSON.stringify({
      email: result.email,
      emailVerified: result.emailVerified,
      emailConfidence: result.emailConfidence,
      emailSource: result.emailSource,
      employerDomain: result.employerDomain,
      hunterConfidence: result.confidence, // legacy field name
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[hunter-email shim] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
