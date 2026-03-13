import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_DOMAINS = [
  "indeed.com", "linkedin.com", "glassdoor.com", "wellfound.com", "dice.com",
  "ziprecruiter.com", "weworkremotely.com", "remote.co", "monster.com",
  "careerbuilder.com", "simplyhired.com", "jobvite.com", "lever.co",
  "greenhouse.io", "workday.com", "icims.com", "taleo.net", "smartrecruiters.com",
  "booksrus.com", "example.com", "test.com", "sample.com",
];

// Verify domain has MX records using Google DNS-over-HTTPS
async function verifyDomainMX(domain: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.Status === 0 && data.Answer && data.Answer.length > 0;
  } catch {
    return false;
  }
}

// Build candidate domains from company name
function buildCandidateDomains(company: string): string[] {
  const cleaned = company
    .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Co\.?|Group|Holdings|Limited|Pvt\.?|Pty\.?|GmbH|AG|SA|PLC|Company)\s*$/gi, "")
    .trim();
  
  const base = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "");
  const hyphenated = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
  
  const domains = new Set<string>();
  domains.add(`${base}.com`);
  if (base !== hyphenated) domains.add(`${hyphenated}.com`);
  domains.add(`${base}.io`);
  domains.add(`${base}.co`);
  
  return [...domains];
}

// Extract real company name from job title
function extractCompanyFromTitle(title: string, fallback: string): string {
  const platformNames = ["indeed", "linkedin", "glassdoor", "wellfound", "remote.co", 
    "company", "weworkremotely", "dice", "monster", "ziprecruiter"];
  
  const fallbackLower = fallback.toLowerCase().trim();
  const isGeneric = platformNames.some(p => fallbackLower === p || fallbackLower.includes(p));
  
  if (!isGeneric && fallback !== "Company") return fallback;

  // "Role at CompanyName" or "Role job at CompanyName"
  const atMatch = title.match(/(?:job\s+)?at\s+([A-Z][A-Za-z\s&.,'-]+?)(?:\s+in\s|\s*$)/i);
  if (atMatch) return atMatch[1].trim();

  // "Role — CompanyName" or "Role | CompanyName"
  const parts = title.split(/\s*[—|–]\s*/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1].trim();
    if (!platformNames.some(p => last.toLowerCase().includes(p))) return last;
  }

  return fallback;
}

// Smart email discovery with MX verification
async function discoverEmailForCompany(company: string): Promise<{ email: string | null; verified: boolean }> {
  if (!company || company === "Company") return { email: null, verified: false };

  const candidateDomains = buildCandidateDomains(company);
  
  // Check MX records in parallel
  const mxResults = await Promise.allSettled(
    candidateDomains.map(async (domain) => {
      const hasMX = await verifyDomainMX(domain);
      return { domain, hasMX };
    })
  );

  for (const r of mxResults) {
    if (r.status === "fulfilled" && r.value.hasMX) {
      const domain = r.value.domain;
      console.log(`[MX] Verified: ${domain} for "${company}"`);
      return { email: `careers@${domain}`, verified: true };
    }
  }

  // No MX verified - return unverified fallback
  return { email: `careers@${candidateDomains[0]}`, verified: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`User ${user.id} searching for jobs`);

    const { data: sub } = await serviceClient
      .from("subscriptions")
      .select("credits, plan")
      .eq("user_id", user.id)
      .single();

    if (sub && sub.plan !== "lifetime" && (sub.credits || 0) < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits. Please upgrade your plan." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { expertise, location, limit = 50 } = await req.json();

    if (!expertise || expertise.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Expertise/skill is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Search service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationFilter = location ? ` ${location}` : "";
    const searchQueries = [
      `${expertise} jobs hiring${locationFilter} site:linkedin.com/jobs OR site:indeed.com OR site:glassdoor.com`,
      `${expertise} job openings${locationFilter} site:wellfound.com OR site:remote.co OR site:weworkremotely.com OR site:dice.com`,
    ];

    const allJobs: any[] = [];
    const seenUrls = new Set<string>();

    // Phase 1: Collect job listings (NO email extraction from page content)
    for (const query of searchQueries) {
      try {
        console.log("Searching:", query);
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: Math.min(limit, 30),
            tbs: "qdr:d",
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        const data = await response.json();
        console.log(`Search returned ${data.data?.length || 0} results`);

        if (data.success !== false && data.data) {
          for (const result of data.data) {
            if (seenUrls.has(result.url)) continue;
            seenUrls.add(result.url);

            let platform = "Other";
            if (result.url?.includes("linkedin.com")) platform = "LinkedIn";
            else if (result.url?.includes("indeed.com")) platform = "Indeed";
            else if (result.url?.includes("glassdoor.com")) platform = "Glassdoor";
            else if (result.url?.includes("wellfound.com")) platform = "Wellfound";
            else if (result.url?.includes("remote.co")) platform = "Remote.co";
            else if (result.url?.includes("weworkremotely.com")) platform = "WeWorkRemotely";
            else if (result.url?.includes("dice.com")) platform = "Dice";

            const title = result.title || "Untitled Position";
            const description = result.description || "";

            const titleParts = title.split(/\s[-–|]\s/);
            const jobTitle = titleParts[0]?.trim() || title;
            const rawCompany = titleParts.length > 1 ? titleParts[titleParts.length - 1]?.trim() : "Company";
            
            // Extract real company name (not platform name)
            const company = extractCompanyFromTitle(title, rawCompany);

            allJobs.push({
              id: crypto.randomUUID(),
              jobTitle,
              company,
              platform,
              url: result.url,
              description: description.substring(0, 500),
              fullContent: result.markdown?.substring(0, 3000) || description,
              location: locationFilter.trim() || "Remote/Not specified",
              postedDate: "Within 24 hours",
              selected: false,
              email: null, // Will be discovered via MX verification
            });
          }
        }
      } catch (searchErr) {
        console.error("Search query failed:", searchErr);
      }
    }

    // Phase 2: MX-verified email discovery for unique companies (parallel)
    const uniqueCompanies = [...new Set(allJobs.map(j => j.company).filter(c => c && c !== "Company"))];
    const companyEmailCache = new Map<string, { email: string | null; verified: boolean }>();

    console.log(`[EmailDiscovery] Verifying MX for ${uniqueCompanies.length} companies`);

    // Process in parallel batches of 5 (MX checks are fast, just DNS lookups)
    const MX_BATCH = 5;
    for (let i = 0; i < uniqueCompanies.length; i += MX_BATCH) {
      const batch = uniqueCompanies.slice(i, i + MX_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (company) => {
          const result = await discoverEmailForCompany(company);
          return { company, ...result };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          companyEmailCache.set(r.value.company, { email: r.value.email, verified: r.value.verified });
        }
      }
    }

    // Apply discovered emails to jobs
    for (const job of allJobs) {
      const cached = companyEmailCache.get(job.company);
      if (cached) {
        job.email = cached.email;
        job.emailVerified = cached.verified;
      }
    }

    // Deduct 1 credit for search
    if (sub && sub.plan !== "lifetime") {
      await serviceClient
        .from("subscriptions")
        .update({ credits: Math.max(0, (sub.credits || 0) - 1) })
        .eq("user_id", user.id);
    }

    const withEmail = allJobs.filter(j => j.email).length;
    const verified = allJobs.filter(j => j.emailVerified).length;
    console.log(`Found ${allJobs.length} jobs, ${withEmail} with emails (${verified} MX-verified) for "${expertise}"`);

    return new Response(
      JSON.stringify({
        jobs: allJobs.slice(0, limit),
        total: allJobs.length,
        expertise,
        location: locationFilter.trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-jobs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to search jobs" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
