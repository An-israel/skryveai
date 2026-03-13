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
];

const GENERIC_PREFIXES = [
  "noreply", "no-reply", "donotreply", "support", "privacy", "feedback",
  "terms", "legal", "info@indeed", "careerguide", "mailer-daemon", "postmaster",
  "webmaster", "admin@indeed", "notifications",
];

function isValidCompanyEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif")) return false;
  for (const domain of PLATFORM_DOMAINS) {
    if (lower.includes(`@${domain}`)) return false;
  }
  for (const prefix of GENERIC_PREFIXES) {
    if (lower.startsWith(prefix) || lower.includes(prefix)) return false;
  }
  return true;
}

function extractBestEmail(content: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = (content.match(emailRegex) || []).filter(isValidCompanyEmail);
  if (emails.length === 0) return null;

  // Priority: hr@ > hiring@ > careers@ > jobs@ > recruit/talent > any
  const priority = emails.find((e) => {
    const l = e.toLowerCase();
    return l.startsWith("hr@") || l.startsWith("hiring@") || l.startsWith("careers@") ||
      l.startsWith("jobs@") || l.startsWith("recruit") || l.startsWith("talent") ||
      l.startsWith("people@") || l.startsWith("humanresources@");
  });
  return priority || emails[0];
}

function extractDomainFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    // Skip platform domains
    for (const pd of PLATFORM_DOMAINS) {
      if (hostname.includes(pd)) return null;
    }
    return hostname;
  } catch { return null; }
}

function guessCompanyDomain(company: string): string {
  return company
    .toLowerCase()
    .replace(/\s*(inc|llc|ltd|corp|corporation|co|group|holdings|limited|pvt|pty|gmbh|ag|sa|plc)\s*\.?\s*$/gi, "")
    .replace(/[^a-z0-9]/g, "")
    + ".com";
}

async function findCompanyEmail(company: string, firecrawlKey: string): Promise<string | null> {
  // Strategy 1: Scrape company website contact/about page
  const domain = guessCompanyDomain(company);
  console.log(`[Email Discovery] Trying domain: ${domain} for "${company}"`);

  const pagesToTry = [
    `https://${domain}/contact`,
    `https://${domain}/contact-us`,
    `https://${domain}/about`,
    `https://${domain}/careers`,
    `https://${domain}`,
  ];

  for (const pageUrl of pagesToTry) {
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: pageUrl, formats: ["markdown"], onlyMainContent: false, timeout: 10000 }),
      });

      if (!resp.ok) continue;
      const data = await resp.json();
      const content = data?.data?.markdown || data?.markdown || "";
      const email = extractBestEmail(content);
      if (email) {
        console.log(`[Email Discovery] Found ${email} on ${pageUrl}`);
        return email;
      }
    } catch { /* continue to next page */ }
  }

  // Strategy 2: Search for company HR/contact email
  try {
    console.log(`[Email Discovery] Searching web for "${company}" HR email`);
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `"${company}" HR email OR careers email OR contact email`,
        limit: 3,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchResp.json();
    if (searchData.success !== false && searchData.data) {
      for (const result of searchData.data) {
        const content = result.markdown || result.description || "";
        const email = extractBestEmail(content);
        if (email) {
          console.log(`[Email Discovery] Found ${email} from web search`);
          return email;
        }
      }
    }
  } catch (e) {
    console.error("[Email Discovery] Web search failed:", e);
  }

  // Strategy 3: Generate common HR email pattern from domain
  console.log(`[Email Discovery] Generating HR pattern for ${domain}`);
  return `hr@${domain}`;
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

    // Phase 1: Collect job listings
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
            const company = titleParts.length > 1 ? titleParts[titleParts.length - 1]?.trim() : "Company";

            // Quick check for email in the scraped content
            const content = result.markdown || description;
            const quickEmail = extractBestEmail(content);

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
              email: quickEmail,
            });
          }
        }
      } catch (searchErr) {
        console.error("Search query failed:", searchErr);
      }
    }

    // Phase 2: For jobs without email, find the company's real email (in parallel batches)
    const jobsNeedingEmail = allJobs.filter(j => !j.email && j.company && j.company !== "Company");
    const uniqueCompanies = [...new Set(jobsNeedingEmail.map(j => j.company))];
    const companyEmailCache = new Map<string, string | null>();

    console.log(`[Email Discovery] ${jobsNeedingEmail.length} jobs need email from ${uniqueCompanies.length} unique companies`);

    // Process company email lookups in parallel batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < uniqueCompanies.length && i < 15; i += BATCH_SIZE) {
      const batch = uniqueCompanies.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (company) => {
          const email = await findCompanyEmail(company, FIRECRAWL_API_KEY);
          return { company, email };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          companyEmailCache.set(result.value.company, result.value.email);
        }
      }
    }

    // Apply discovered emails back to jobs
    for (const job of allJobs) {
      if (!job.email && companyEmailCache.has(job.company)) {
        job.email = companyEmailCache.get(job.company) || null;
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
    console.log(`Found ${allJobs.length} jobs, ${withEmail} with emails for "${expertise}"`);

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
