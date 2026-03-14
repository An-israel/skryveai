import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Domains that are job platforms, NOT employer websites
const PLATFORM_DOMAINS = [
  "indeed.com", "linkedin.com", "glassdoor.com", "wellfound.com", "dice.com",
  "ziprecruiter.com", "weworkremotely.com", "remote.co", "monster.com",
  "careerbuilder.com", "simplyhired.com", "jobvite.com", "lever.co",
  "greenhouse.io", "workday.com", "icims.com", "taleo.net", "smartrecruiters.com",
  "booksrus.com", "example.com", "test.com", "sample.com", "google.com",
  "facebook.com", "twitter.com", "youtube.com", "wikipedia.org", "reddit.com",
  "instagram.com", "tiktok.com", "pinterest.com", "yelp.com",
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const NOREPLY_PREFIXES = ["noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon", "postmaster"];

const HR_PREFIXES = ["hr", "hiring", "recruit", "recruiting", "recruitment", "careers", "career", "jobs", "talent", "people", "humanresources", "human.resources"];
const GOOD_PREFIXES = [...HR_PREFIXES, "info", "hello", "contact", "team", "apply", "applications", "admin", "office"];

function isDomainPlatform(domain: string): boolean {
  const lower = domain.toLowerCase();
  return PLATFORM_DOMAINS.some(p => lower === p || lower.endsWith(`.${p}`));
}

function isNoreplyEmail(email: string): boolean {
  const prefix = email.split("@")[0].toLowerCase();
  return NOREPLY_PREFIXES.some(n => prefix.includes(n));
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (isDomainPlatform(domain)) return false;
  if (isNoreplyEmail(email)) return false;
  // Filter out image/file extensions mistaken as emails
  if (/\.(png|jpg|jpeg|gif|svg|css|js)$/i.test(domain)) return false;
  return true;
}

function scoreEmail(email: string): number {
  const prefix = email.split("@")[0].toLowerCase();
  if (HR_PREFIXES.some(h => prefix === h || prefix.startsWith(h + "."))) return 100;
  if (GOOD_PREFIXES.some(g => prefix === g)) return 50;
  // Personal-looking emails (first.last) are decent
  if (/^[a-z]+\.[a-z]+$/.test(prefix)) return 30;
  return 10;
}

function extractEmails(text: string): string[] {
  if (!text) return [];
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches)].filter(isValidEmail);
}

function getDomainFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname;
  } catch { return null; }
}

// Extract real company name from job title
function extractCompanyFromTitle(title: string, fallback: string): string {
  const platformNames = ["indeed", "linkedin", "glassdoor", "wellfound", "remote.co",
    "company", "weworkremotely", "dice", "monster", "ziprecruiter"];

  const fallbackLower = fallback.toLowerCase().trim();
  const isGeneric = platformNames.some(p => fallbackLower === p || fallbackLower.includes(p));

  if (!isGeneric && fallback !== "Company") return fallback;

  const atMatch = title.match(/(?:job\s+)?at\s+([A-Z][A-Za-z\s&.,'-]+?)(?:\s+in\s|\s*$)/i);
  if (atMatch) return atMatch[1].trim();

  const parts = title.split(/\s*[—|–]\s*/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1].trim();
    if (!platformNames.some(p => last.toLowerCase().includes(p))) return last;
  }

  return fallback;
}

// Firecrawl helpers
async function firecrawlSearch(apiKey: string, query: string, limit = 3): Promise<any[]> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await resp.json();
    return data.data || [];
  } catch (e) {
    console.error("[Firecrawl search error]", e);
    return [];
  }
}

async function firecrawlScrape(apiKey: string, url: string): Promise<string> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await resp.json();
    return data.data?.markdown || data.markdown || "";
  } catch (e) {
    console.error("[Firecrawl scrape error]", url, e);
    return "";
  }
}

async function firecrawlMap(apiKey: string, url: string): Promise<string[]> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, search: "contact careers about team", limit: 10, includeSubdomains: false }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await resp.json();
    return data.links || [];
  } catch (e) {
    console.error("[Firecrawl map error]", url, e);
    return [];
  }
}

// MX verification fallback
async function verifyDomainMX(domain: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.Status === 0 && data.Answer && data.Answer.length > 0;
  } catch { return false; }
}

// ============================================================
// MAIN EMAIL DISCOVERY AGENT — per company, with 10s timeout
// ============================================================
async function discoverRealEmail(
  apiKey: string,
  company: string
): Promise<{ email: string | null; verified: boolean; discoveryMethod: string }> {
  if (!company || company === "Company") return { email: null, verified: false, discoveryMethod: "none" };

  // --- Step 1: Find company website via Firecrawl search ---
  console.log(`[Agent] Step 1 — Finding website for "${company}"`);
  const searchResults = await firecrawlSearch(apiKey, `"${company}" official website contact`, 5);

  let companyDomain: string | null = null;
  let companyUrl: string | null = null;

  for (const r of searchResults) {
    const domain = getDomainFromUrl(r.url);
    if (domain && !isDomainPlatform(domain)) {
      companyDomain = domain;
      companyUrl = r.url;
      break;
    }
    // Also check for emails in search result snippets
    const snippetEmails = extractEmails((r.markdown || "") + " " + (r.description || ""));
    if (snippetEmails.length > 0) {
      const best = snippetEmails.sort((a, b) => scoreEmail(b) - scoreEmail(a))[0];
      console.log(`[Agent] Found email in search snippet for "${company}": ${best}`);
      return { email: best, verified: true, discoveryMethod: "searched" };
    }
  }

  // --- Step 2: Scrape company website contact/careers pages ---
  if (companyDomain && companyUrl) {
    console.log(`[Agent] Step 2 — Scraping ${companyDomain} for emails`);

    // Map the site to find contact-related pages
    const baseUrl = `https://${companyDomain}`;
    const siteUrls = await firecrawlMap(apiKey, baseUrl);

    // Pick best pages to scrape (contact, about, careers, team)
    const contactPatterns = [/contact/i, /about/i, /career/i, /team/i, /jobs/i, /hiring/i, /join/i];
    const pagesToScrape: string[] = [];

    for (const url of siteUrls) {
      if (contactPatterns.some(p => p.test(url))) {
        pagesToScrape.push(url);
        if (pagesToScrape.length >= 3) break;
      }
    }

    // Always include the homepage
    if (pagesToScrape.length === 0) pagesToScrape.push(baseUrl);

    // Scrape pages in parallel
    const scrapeResults = await Promise.allSettled(
      pagesToScrape.map(url => firecrawlScrape(apiKey, url))
    );

    const allEmails: string[] = [];
    for (const r of scrapeResults) {
      if (r.status === "fulfilled" && r.value) {
        allEmails.push(...extractEmails(r.value));
      }
    }

    if (allEmails.length > 0) {
      const best = [...new Set(allEmails)].sort((a, b) => scoreEmail(b) - scoreEmail(a))[0];
      console.log(`[Agent] Scraped email for "${company}": ${best}`);
      return { email: best, verified: true, discoveryMethod: "scraped" };
    }
  }

  // --- Step 3: Targeted web search fallback ---
  console.log(`[Agent] Step 3 — Web search fallback for "${company}"`);
  const fallbackResults = await firecrawlSearch(apiKey, `"${company}" HR email contact hiring`, 5);

  const searchEmails: string[] = [];
  for (const r of fallbackResults) {
    searchEmails.push(...extractEmails((r.markdown || "") + " " + (r.description || "") + " " + (r.title || "")));
  }

  if (searchEmails.length > 0) {
    const best = [...new Set(searchEmails)].sort((a, b) => scoreEmail(b) - scoreEmail(a))[0];
    console.log(`[Agent] Search fallback email for "${company}": ${best}`);
    return { email: best, verified: true, discoveryMethod: "searched" };
  }

  // --- Step 4: Pattern fallback (last resort) ---
  console.log(`[Agent] Step 4 — Pattern fallback for "${company}"`);
  if (companyDomain) {
    const hasMX = await verifyDomainMX(companyDomain);
    if (hasMX) {
      return { email: `info@${companyDomain}`, verified: false, discoveryMethod: "pattern" };
    }
  }

  // Build domain from company name as absolute last resort
  const base = company.toLowerCase()
    .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Co\.?|Group|Holdings|Limited)\s*$/gi, "")
    .trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "");
  const fallbackDomain = `${base}.com`;
  const hasMX = await verifyDomainMX(fallbackDomain);
  if (hasMX) {
    return { email: `info@${fallbackDomain}`, verified: false, discoveryMethod: "pattern" };
  }

  return { email: null, verified: false, discoveryMethod: "none" };
}

// ============================================================
// MAIN HANDLER
// ============================================================
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
            const rawCompany = titleParts.length > 1 ? titleParts[titleParts.length - 1]?.trim() : "Company";

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
              email: null,
            });
          }
        }
      } catch (searchErr) {
        console.error("Search query failed:", searchErr);
      }
    }

    // Phase 2: Real email discovery agent — parallel batches of 5
    const uniqueCompanies = [...new Set(allJobs.map(j => j.company).filter(c => c && c !== "Company"))];
    const companyEmailCache = new Map<string, { email: string | null; verified: boolean; discoveryMethod: string }>();

    console.log(`[EmailAgent] Discovering emails for ${uniqueCompanies.length} companies`);

    const BATCH_SIZE = 5;
    for (let i = 0; i < uniqueCompanies.length; i += BATCH_SIZE) {
      const batch = uniqueCompanies.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (company) => {
          // Wrap with 10s timeout per company
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          try {
            const result = await discoverRealEmail(FIRECRAWL_API_KEY, company);
            return { company, ...result };
          } catch (e) {
            console.error(`[EmailAgent] Timeout/error for "${company}":`, e);
            return { company, email: null, verified: false, discoveryMethod: "none" };
          } finally {
            clearTimeout(timeout);
          }
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          companyEmailCache.set(r.value.company, {
            email: r.value.email,
            verified: r.value.verified,
            discoveryMethod: r.value.discoveryMethod,
          });
        }
      }
    }

    // Apply discovered emails to jobs
    for (const job of allJobs) {
      const cached = companyEmailCache.get(job.company);
      if (cached) {
        job.email = cached.email;
        job.emailVerified = cached.verified;
        job.discoveryMethod = cached.discoveryMethod;
      }
    }

    // Deduct 1 credit
    if (sub && sub.plan !== "lifetime") {
      await serviceClient
        .from("subscriptions")
        .update({ credits: Math.max(0, (sub.credits || 0) - 1) })
        .eq("user_id", user.id);
    }

    const withEmail = allJobs.filter(j => j.email).length;
    const scraped = allJobs.filter(j => j.discoveryMethod === "scraped").length;
    const searched = allJobs.filter(j => j.discoveryMethod === "searched").length;
    const pattern = allJobs.filter(j => j.discoveryMethod === "pattern").length;
    console.log(`Found ${allJobs.length} jobs: ${scraped} scraped, ${searched} searched, ${pattern} pattern, ${allJobs.length - withEmail} no email`);

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
