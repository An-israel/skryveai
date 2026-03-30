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
  "booksrus.com", "example.com", "test.com", "sample.com", "google.com",
  "facebook.com", "twitter.com", "youtube.com", "wikipedia.org", "reddit.com",
  "instagram.com", "tiktok.com", "pinterest.com", "yelp.com", "apply.workable.com",
  "jobs.lever.co", "boards.greenhouse.io",
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
  if (/\.(png|jpg|jpeg|gif|svg|css|js)$/i.test(domain)) return false;
  return true;
}

function scoreEmail(email: string): number {
  const prefix = email.split("@")[0].toLowerCase();
  if (HR_PREFIXES.some(h => prefix === h || prefix.startsWith(h + "."))) return 100;
  if (GOOD_PREFIXES.some(g => prefix === g)) return 50;
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
    return new URL(url).hostname.replace(/^www\./, "");
  } catch { return null; }
}

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

// ============================================================
// Firecrawl helpers
// ============================================================
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
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: false }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    return data.data?.markdown || data.markdown || "";
  } catch (e) {
    console.error("[Firecrawl scrape error]", url, e);
    return "";
  }
}

async function firecrawlScrapeWithLinks(apiKey: string, url: string): Promise<{ markdown: string; links: string[] }> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: false }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    return {
      markdown: data.data?.markdown || data.markdown || "",
      links: data.data?.links || data.links || [],
    };
  } catch (e) {
    console.error("[Firecrawl scrape+links error]", url, e);
    return { markdown: "", links: [] };
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

// ============================================================
// PER-JOB EMAIL RESOLVER — scrapes the actual job URL first
// ============================================================

type EmailResult = {
  email: string | null;
  emailVerified: boolean;
  emailSource: "job_page" | "employer_site" | "search_snippet" | "none";
  emailConfidence: "high" | "medium" | "low";
  employerDomain: string | null;
};

// Extract employer domain from job page outbound links
function resolveEmployerDomain(links: string[], jobUrl: string): string | null {
  const jobDomain = getDomainFromUrl(jobUrl);
  for (const link of links) {
    const domain = getDomainFromUrl(link);
    if (domain && !isDomainPlatform(domain) && domain !== jobDomain) {
      return domain;
    }
  }
  return null;
}

// Hunter.io integration for high-confidence email discovery
async function hunterDomainSearch(domain: string): Promise<{ email: string | null; confidence: number; verified: boolean }> {
  const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY");
  if (!HUNTER_API_KEY) return { email: null, confidence: 0, verified: false };
  
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}&limit=5`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await resp.json();
    
    if (data.errors || !data.data?.emails?.length) {
      return { email: null, confidence: 0, verified: false };
    }
    
    const emails = data.data.emails;
    // Prefer HR/hiring/generic department emails
    const scored = emails.map((e: any) => {
      const prefix = (e.value || "").split("@")[0]?.toLowerCase();
      const isHR = HR_PREFIXES.some(h => prefix === h || prefix.startsWith(h + "."));
      const isGood = GOOD_PREFIXES.some(g => prefix === g);
      return { ...e, sortScore: (isHR ? 2000 : 0) + (isGood ? 1000 : 0) + (e.confidence || 0) + (e.sources || 0) * 5 };
    });
    scored.sort((a: any, b: any) => b.sortScore - a.sortScore);
    const best = scored[0];
    
    // Optionally verify
    let verified = (best.confidence || 0) >= 80;
    if (!verified && best.value) {
      try {
        const vUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(best.value)}&api_key=${HUNTER_API_KEY}`;
        const vResp = await fetch(vUrl, { signal: AbortSignal.timeout(5000) });
        const vData = await vResp.json();
        verified = vData.data?.result === "deliverable";
      } catch { /* skip verification */ }
    }
    
    console.log(`[Hunter] Found ${best.value} for ${domain} (confidence: ${best.confidence}, verified: ${verified})`);
    return { email: best.value, confidence: best.confidence || 0, verified };
  } catch (e) {
    console.error("[Hunter] Domain search error:", e);
    return { email: null, confidence: 0, verified: false };
  }
}

async function resolveJobEmail(
  apiKey: string,
  jobUrl: string,
  company: string,
  jobTitle: string,
  description: string,
): Promise<EmailResult> {
  const empty: EmailResult = { email: null, emailVerified: false, emailSource: "none", emailConfidence: "low", employerDomain: null };

  // ── Step 0: Try Hunter.io first (fastest + highest quality) ──
  const guessedDomain = guessEmployerDomain(company);
  if (guessedDomain && !isDomainPlatform(guessedDomain)) {
    console.log(`[PerJob] Step 0 — Hunter.io lookup for ${guessedDomain}`);
    const hunterResult = await hunterDomainSearch(guessedDomain);
    if (hunterResult.email && hunterResult.confidence >= 50) {
      return {
        email: hunterResult.email,
        emailVerified: hunterResult.verified,
        emailSource: "employer_site",
        emailConfidence: hunterResult.confidence >= 80 ? "high" : "medium",
        employerDomain: guessedDomain,
      };
    }
  }

  // ── Step A: Scrape the job listing page itself ──
  console.log(`[PerJob] Step A — scraping job URL: ${jobUrl}`);
  const { markdown: jobPageContent, links: jobPageLinks } = await firecrawlScrapeWithLinks(apiKey, jobUrl);

  // Check for emails directly on job page
  const jobPageEmails = extractEmails(jobPageContent);
  const employerDomain = resolveEmployerDomain(jobPageLinks, jobUrl);

  if (jobPageEmails.length > 0) {
    // If we resolved an employer domain, prefer emails matching it
    if (employerDomain) {
      const domainMatch = jobPageEmails
        .filter(e => e.split("@")[1]?.toLowerCase() === employerDomain)
        .sort((a, b) => scoreEmail(b) - scoreEmail(a));
      if (domainMatch.length > 0) {
        console.log(`[PerJob] Found domain-matched email on job page: ${domainMatch[0]}`);
        return { email: domainMatch[0], emailVerified: true, emailSource: "job_page", emailConfidence: "high", employerDomain };
      }
    }
    // Otherwise take best-scored non-platform email from the page
    const best = jobPageEmails.sort((a, b) => scoreEmail(b) - scoreEmail(a))[0];
    console.log(`[PerJob] Found email on job page: ${best}`);
    return {
      email: best,
      emailVerified: Boolean(employerDomain && best.split("@")[1]?.toLowerCase() === employerDomain),
      emailSource: "job_page",
      emailConfidence: employerDomain ? "medium" : "medium",
      employerDomain,
    };
  }

  // ── Step B: Scrape employer website contact pages ──
  const resolvedDomain = employerDomain || guessEmployerDomain(company);
  if (resolvedDomain && !isDomainPlatform(resolvedDomain)) {
    console.log(`[PerJob] Step B — scraping employer site: ${resolvedDomain}`);
    const baseUrl = `https://${resolvedDomain}`;

    // Map the employer site for contact pages
    const siteUrls = await firecrawlMap(apiKey, baseUrl);
    const contactPatterns = [/contact/i, /about/i, /career/i, /team/i, /jobs/i, /hiring/i, /join/i];
    const pagesToScrape: string[] = [];

    for (const url of siteUrls) {
      if (contactPatterns.some(p => p.test(url))) {
        pagesToScrape.push(url);
        if (pagesToScrape.length >= 3) break;
      }
    }
    if (pagesToScrape.length === 0) pagesToScrape.push(baseUrl);

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
      // Prefer emails matching the employer domain
      const domainEmails = allEmails.filter(e => e.split("@")[1]?.toLowerCase() === resolvedDomain);
      const pool = domainEmails.length > 0 ? domainEmails : allEmails;
      const best = [...new Set(pool)].sort((a, b) => scoreEmail(b) - scoreEmail(a))[0];
      console.log(`[PerJob] Scraped email from employer site: ${best}`);
      return {
        email: best,
        emailVerified: best.split("@")[1]?.toLowerCase() === resolvedDomain,
        emailSource: "employer_site",
        emailConfidence: best.split("@")[1]?.toLowerCase() === resolvedDomain ? "high" : "medium",
        employerDomain: resolvedDomain,
      };
    }
  }

  // ── Step C: Targeted web search fallback ──
  console.log(`[PerJob] Step C — web search for "${company}" email`);
  const fallbackResults = await firecrawlSearch(apiKey, `"${company}" HR email contact hiring`, 5);
  const searchEmails: string[] = [];
  for (const r of fallbackResults) {
    searchEmails.push(...extractEmails((r.markdown || "") + " " + (r.description || "") + " " + (r.title || "")));
  }

  if (searchEmails.length > 0) {
    const best = [...new Set(searchEmails)].sort((a, b) => scoreEmail(b) - scoreEmail(a))[0];
    console.log(`[PerJob] Search fallback email: ${best}`);
    return {
      email: best,
      emailVerified: false,
      emailSource: "search_snippet",
      emailConfidence: "low",
      employerDomain: resolvedDomain || null,
    };
  }

  // ── No pattern fallback — return null so user can manually find or edit ──
  console.log(`[PerJob] No email found for "${company}"`);
  return empty;
}

function guessEmployerDomain(company: string): string | null {
  if (!company || company === "Company") return null;
  const base = company.toLowerCase()
    .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Co\.?|Group|Holdings|Limited)\s*$/gi, "")
    .trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "");
  if (!base) return null;
  return `${base}.com`;
}

// ============================================================
// Anti-contamination: detect same email across different domains
// ============================================================
function decontaminate(jobs: any[]): void {
  const emailDomainMap = new Map<string, Set<string>>();
  for (const job of jobs) {
    if (!job.email) continue;
    if (!emailDomainMap.has(job.email)) emailDomainMap.set(job.email, new Set());
    emailDomainMap.get(job.email)!.add(job.employerDomain || job.company);
  }
  for (const [email, domains] of emailDomainMap) {
    if (domains.size > 3) {
      console.warn(`[Decontaminate] Email ${email} appeared across ${domains.size} different entities — clearing`);
      for (const job of jobs) {
        if (job.email === email) {
          job.email = null;
          job.emailVerified = false;
          job.emailSource = "none";
          job.emailConfidence = "low";
        }
      }
    }
  }
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

    const body = await req.json();

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Search service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Single-job email lookup mode (manual "Find Email" button) ===
    if (body.findEmailFor) {
      const company = body.findEmailFor as string;
      const jobUrl = body.jobUrl as string | undefined;
      const jobTitle = body.jobTitle as string | undefined;
      const jobDescription = body.jobDescription as string | undefined;

      console.log(`[FindEmail] Deep search for "${company}" (URL: ${jobUrl || "none"})`);

      // Try Hunter.io first for manual lookups
      const domain = guessEmployerDomain(company);
      if (domain && !isDomainPlatform(domain)) {
        const hunterResult = await hunterDomainSearch(domain);
        if (hunterResult.email && hunterResult.confidence >= 50) {
          console.log(`[FindEmail] Hunter found: ${hunterResult.email} (confidence: ${hunterResult.confidence})`);
          return new Response(
            JSON.stringify({
              email: hunterResult.email,
              emailVerified: hunterResult.verified,
              emailSource: "employer_site",
              emailConfidence: hunterResult.confidence >= 80 ? "high" : "medium",
              employerDomain: domain,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fallback to Firecrawl-based resolution
      let result: EmailResult;
      if (jobUrl) {
        result = await resolveJobEmail(FIRECRAWL_API_KEY, jobUrl, company, jobTitle || "", jobDescription || "");
      } else {
        const searchResults = await firecrawlSearch(FIRECRAWL_API_KEY, `"${company}" HR email contact hiring`, 5);
        const emails: string[] = [];
        for (const r of searchResults) {
          emails.push(...extractEmails((r.markdown || "") + " " + (r.description || "") + " " + (r.title || "")));
        }
        if (emails.length > 0) {
          const best = [...new Set(emails)].sort((a, b) => scoreEmail(b) - scoreEmail(a))[0];
          result = { email: best, emailVerified: false, emailSource: "search_snippet", emailConfidence: "low", employerDomain: null };
        } else {
          result = { email: null, emailVerified: false, emailSource: "none", emailConfidence: "low", employerDomain: null };
        }
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Bulk job search mode ===
    const { expertise, location, limit = 50 } = body;

    if (!expertise || expertise.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Expertise/skill is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationFilter = location ? ` ${location}` : "";
    const searchQueries = [
      `${expertise} jobs hiring${locationFilter} site:linkedin.com/jobs OR site:indeed.com OR site:glassdoor.com`,
      `${expertise} job openings${locationFilter} site:wellfound.com OR site:remote.co OR site:weworkremotely.com OR site:dice.com`,
    ];

    const allJobs: any[] = [];
    const seenUrls = new Set<string>();

    // Phase 1: Collect job listings (no email discovery yet)
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
              emailVerified: false,
              emailSource: "none",
              emailConfidence: "low",
              employerDomain: null,
            });
          }
        }
      } catch (searchErr) {
        console.error("Search query failed:", searchErr);
      }
    }

    // Phase 2: Per-job email discovery — parallel batches of 5
    console.log(`[EmailAgent] Resolving emails for ${allJobs.length} jobs individually`);

    const BATCH_SIZE = 5;
    for (let i = 0; i < allJobs.length; i += BATCH_SIZE) {
      const batch = allJobs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (job) => {
          try {
            const result = await resolveJobEmail(
              FIRECRAWL_API_KEY,
              job.url,
              job.company,
              job.jobTitle,
              job.description,
            );
            return { jobId: job.id, ...result };
          } catch (e) {
            console.error(`[EmailAgent] Error for "${job.company}":`, e);
            return { jobId: job.id, email: null, emailVerified: false, emailSource: "none" as const, emailConfidence: "low" as const, employerDomain: null };
          }
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          const job = allJobs.find(j => j.id === r.value.jobId);
          if (job) {
            job.email = r.value.email;
            job.emailVerified = r.value.emailVerified;
            job.emailSource = r.value.emailSource;
            job.emailConfidence = r.value.emailConfidence;
            job.employerDomain = r.value.employerDomain;
          }
        }
      }
    }

    // Phase 3: Anti-contamination — clear emails that appear across many different employers
    decontaminate(allJobs);

    // Deduct 1 credit
    if (sub && sub.plan !== "lifetime") {
      await serviceClient
        .from("subscriptions")
        .update({ credits: Math.max(0, (sub.credits || 0) - 1) })
        .eq("user_id", user.id);
    }

    const withEmail = allJobs.filter(j => j.email).length;
    const high = allJobs.filter(j => j.emailConfidence === "high").length;
    const medium = allJobs.filter(j => j.emailConfidence === "medium").length;
    const low = allJobs.filter(j => j.emailConfidence === "low" && j.email).length;
    console.log(`Found ${allJobs.length} jobs: ${high} high, ${medium} medium, ${low} low confidence, ${allJobs.length - withEmail} no email`);

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
