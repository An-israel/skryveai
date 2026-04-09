import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hunter.io API helpers
async function hunterDomainSearch(
  apiKey: string,
  domain: string,
): Promise<{ email: string | null; confidence: number; firstName?: string; lastName?: string; position?: string; sources: number }> {
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=5`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await resp.json();

    if (data.errors) {
      console.error("[Hunter] Domain search error:", data.errors);
      return { email: null, confidence: 0, sources: 0 };
    }

    const emails = data.data?.emails || [];
    if (emails.length === 0) {
      // Try the generic email pattern
      const pattern = data.data?.pattern;
      const domainName = data.data?.domain;
      if (pattern && domainName) {
        // Return generic contact pattern
        const genericEmail = `info@${domainName}`;
        return { email: genericEmail, confidence: 30, sources: 0 };
      }
      return { email: null, confidence: 0, sources: 0 };
    }

    // Prefer emails with highest confidence and most sources
    // Prioritize generic/department emails (info@, contact@, hr@, careers@) over personal
    const DEPT_PREFIXES = ["info", "contact", "hello", "hr", "hiring", "careers", "career", "jobs",
      "recruit", "recruiting", "recruitment", "talent", "people", "team", "admin", "office", "support", "apply"];

    const scored = emails.map((e: any) => {
      const prefix = (e.value || "").split("@")[0]?.toLowerCase();
      const isDept = DEPT_PREFIXES.some((p) => prefix === p || prefix.startsWith(p + "."));
      return {
        ...e,
        sortScore: (isDept ? 1000 : 0) + (e.confidence || 0) + (e.sources || 0) * 5,
      };
    });

    scored.sort((a: any, b: any) => b.sortScore - a.sortScore);
    const best = scored[0];

    return {
      email: best.value,
      confidence: best.confidence || 0,
      firstName: best.first_name || undefined,
      lastName: best.last_name || undefined,
      position: best.position || undefined,
      sources: best.sources || 0,
    };
  } catch (e) {
    console.error("[Hunter] Domain search exception:", e);
    return { email: null, confidence: 0, sources: 0 };
  }
}

async function hunterEmailVerify(
  apiKey: string,
  email: string,
): Promise<{ valid: boolean; score: number; status: string }> {
  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await resp.json();

    if (data.errors) {
      console.error("[Hunter] Verify error:", data.errors);
      return { valid: false, score: 0, status: "error" };
    }

    const result = data.data;
    return {
      valid: result?.result === "deliverable" || result?.result === "risky",
      score: result?.score || 0,
      status: result?.result || "unknown",
    };
  } catch (e) {
    console.error("[Hunter] Verify exception:", e);
    return { valid: false, score: 0, status: "error" };
  }
}

async function hunterEmailFinder(
  apiKey: string,
  domain: string,
  company: string,
): Promise<{ email: string | null; confidence: number; verified: boolean }> {
  // Step 1: Domain search
  const domainResult = await hunterDomainSearch(apiKey, domain);

  if (domainResult.email) {
    // Step 2: Verify the found email
    const verification = await hunterEmailVerify(apiKey, domainResult.email);
    const confidence = Math.max(domainResult.confidence, verification.score);

    return {
      email: domainResult.email,
      confidence,
      verified: verification.valid,
    };
  }

  return { email: null, confidence: 0, verified: false };
}

// Extract domain from a URL or company name
function extractDomain(input: string): string | null {
  // If it looks like a URL
  try {
    if (input.includes("://") || input.includes(".")) {
      const url = input.startsWith("http") ? input : `https://${input}`;
      return new URL(url).hostname.replace(/^www\./, "");
    }
  } catch { /* not a URL */ }
  return null;
}

function guessDomainFromCompany(company: string): string | null {
  if (!company || company === "Company") return null;
  const base = company
    .toLowerCase()
    .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Co\.?|Group|Holdings|Limited)\s*$/gi, "")
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "");
  if (!base || base.length < 2) return null;
  return `${base}.com`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY");
    if (!HUNTER_API_KEY) {
      return new Response(JSON.stringify({ error: "Email discovery service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { domain, website, company, email: emailToVerify, mode } = body;

    // Mode 1: Verify an existing email
    if (mode === "verify" && emailToVerify) {
      const result = await hunterEmailVerify(HUNTER_API_KEY, emailToVerify);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Find email by domain/website/company
    const targetDomain =
      domain ||
      (website ? extractDomain(website) : null) ||
      (company ? guessDomainFromCompany(company) : null);

    if (!targetDomain) {
      return new Response(
        JSON.stringify({ error: "Provide domain, website URL, or company name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[Hunter] Finding email for domain: ${targetDomain} (company: ${company || "unknown"})`);

    const result = await hunterEmailFinder(HUNTER_API_KEY, targetDomain, company || targetDomain);

    // Map to the standard email result format used across the app
    let emailConfidence: "high" | "medium" | "low" = "low";
    if (result.confidence >= 80) emailConfidence = "high";
    else if (result.confidence >= 50) emailConfidence = "medium";

    return new Response(
      JSON.stringify({
        email: result.email,
        emailVerified: result.verified,
        emailConfidence,
        emailSource: result.email ? "hunter" : "none",
        employerDomain: targetDomain,
        hunterConfidence: result.confidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in hunter-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to find email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
