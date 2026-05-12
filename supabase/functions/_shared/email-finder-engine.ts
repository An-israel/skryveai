// Native Email Finder Engine — replaces Hunter.io
// Strategy: Firecrawl scrape + DNS MX validation + pattern learning + heuristic confidence

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

export interface PersonInput {
  firstName?: string;
  lastName?: string;
  domain?: string;
  website?: string;
  company?: string;
}

export interface EmailSource {
  type: "scrape" | "pattern" | "generic" | "cache";
  url?: string;
  pattern?: string;
  found_at: string;
}

export interface EmailFinderResult {
  email: string | null;
  confidence: number; // 0-100
  status: "valid" | "risky" | "unknown" | "invalid";
  emailVerified: boolean;
  emailConfidence: "high" | "medium" | "low";
  emailSource: "scrape" | "pattern" | "generic" | "cache" | "none";
  employerDomain: string | null;
  sources: EmailSource[];
  jobTitle?: string;
  patternUsed?: string;
  allEmails?: { email: string; confidence: number; source: string }[];
}

export interface VerifyResult {
  email: string;
  status: "valid" | "risky" | "invalid" | "unknown";
  isDeliverable: boolean;
  isDisposable: boolean;
  domainExists: boolean;
  hasMx: boolean;
  isRoleBased: boolean;
  score: number;
}

const DEPT_PREFIXES = [
  "info", "contact", "hello", "hi", "team", "support", "sales",
  "hr", "hiring", "careers", "career", "jobs", "recruit", "recruiting",
  "recruitment", "talent", "people", "admin", "office", "apply", "marketing",
];

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
  "throwaway.email", "trashmail.com", "yopmail.com", "temp-mail.org",
]);

// ────────────────────────────────────────────────────────────
// Domain helpers
// ────────────────────────────────────────────────────────────
export function extractDomain(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  try {
    if (trimmed.includes("://") || trimmed.includes("/")) {
      const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      return new URL(url).hostname.replace(/^www\./, "");
    }
    if (trimmed.includes(".") && !trimmed.includes(" ")) {
      return trimmed.replace(/^www\./, "");
    }
  } catch { /* not a URL */ }
  return null;
}

export function guessDomainFromCompany(company: string | undefined): string | null {
  if (!company || company.toLowerCase() === "company") return null;
  const base = company
    .toLowerCase()
    .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Co\.?|Group|Holdings|Limited|GmbH|S\.A\.|S\.L\.)\s*$/gi, "")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "");
  if (!base || base.length < 2) return null;
  return `${base}.com`;
}

export function resolveDomain(input: PersonInput): string | null {
  return (
    (input.domain ? extractDomain(input.domain) : null) ||
    (input.website ? extractDomain(input.website) : null) ||
    (input.company ? guessDomainFromCompany(input.company) : null)
  );
}

// ────────────────────────────────────────────────────────────
// DNS MX check (replaces Hunter's domain validation)
// ────────────────────────────────────────────────────────────
export async function checkMx(domain: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────
// Email pattern detection from a list of known emails
// ────────────────────────────────────────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function extractEmailsFromText(text: string, domain: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  const lower = domain.toLowerCase();
  const seen = new Set<string>();
  return matches
    .map((e) => e.toLowerCase())
    .filter((e) => {
      if (seen.has(e)) return false;
      if (!e.endsWith(`@${lower}`)) return false;
      // Filter junk
      if (/^[0-9]+@/.test(e)) return false;
      if (e.includes("example") || e.includes("yourname") || e.includes("noreply") || e.includes("no-reply")) return false;
      seen.add(e);
      return true;
    });
}

export function detectPattern(email: string, firstName?: string, lastName?: string): string | null {
  if (!firstName && !lastName) return null;
  const local = email.split("@")[0].toLowerCase();
  const f = (firstName || "").toLowerCase();
  const l = (lastName || "").toLowerCase();
  const fi = f[0] || "";
  const li = l[0] || "";

  if (f && l && local === `${f}.${l}`) return "{first}.{last}";
  if (f && l && local === `${f}_${l}`) return "{first}_{last}";
  if (f && l && local === `${f}${l}`) return "{first}{last}";
  if (f && l && local === `${l}.${f}`) return "{last}.{first}";
  if (f && l && local === `${fi}${l}`) return "{f}{last}";
  if (f && l && local === `${fi}.${l}`) return "{f}.{last}";
  if (f && l && local === `${f}${li}`) return "{first}{l}";
  if (f && local === f) return "{first}";
  if (l && local === l) return "{last}";
  return null;
}

export function applyPattern(pattern: string, firstName: string, lastName: string, domain: string): string {
  const f = firstName.toLowerCase();
  const l = lastName.toLowerCase();
  const fi = f[0] || "";
  const li = l[0] || "";
  const local = pattern
    .replace("{first}", f)
    .replace("{last}", l)
    .replace("{f}", fi)
    .replace("{l}", li);
  return `${local}@${domain}`;
}

export const COMMON_PATTERNS = [
  "{first}.{last}",
  "{first}{last}",
  "{f}{last}",
  "{first}_{last}",
  "{first}",
  "{last}.{first}",
  "{first}{l}",
  "{f}.{last}",
];

// ────────────────────────────────────────────────────────────
// Firecrawl helpers
// ────────────────────────────────────────────────────────────
async function firecrawlScrape(url: string, apiKey: string): Promise<{ markdown?: string; html?: string } | null> {
  try {
    const resp = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: false,
        waitFor: 1000,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.success) return null;
    return {
      markdown: data.data?.markdown ?? data.markdown,
      html: data.data?.html ?? data.html,
    };
  } catch (e) {
    console.error(`[Firecrawl] scrape failed for ${url}:`, (e as Error).message);
    return null;
  }
}

async function firecrawlMap(domain: string, apiKey: string, search?: string): Promise<string[]> {
  try {
    const resp = await fetch(`${FIRECRAWL_V2}/map`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `https://${domain}`,
        search,
        limit: 30,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.links || data.data?.links || [];
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────
// Discover emails on a domain via crawling
// ────────────────────────────────────────────────────────────
export async function discoverEmailsOnDomain(
  domain: string,
  apiKey: string,
): Promise<{ email: string; url: string }[]> {
  const candidatePages = [
    `https://${domain}/contact`,
    `https://${domain}/about`,
    `https://${domain}/team`,
    `https://${domain}/about-us`,
    `https://${domain}/contact-us`,
  ];

  // Try the map endpoint to find more relevant pages
  const mapped = await firecrawlMap(domain, apiKey, "contact team about");
  for (const link of mapped.slice(0, 5)) {
    if (!candidatePages.includes(link)) candidatePages.push(link);
  }

  const found: { email: string; url: string }[] = [];
  const seen = new Set<string>();

  // Limit to 5 pages to control cost & latency
  for (const url of candidatePages.slice(0, 5)) {
    const page = await firecrawlScrape(url, apiKey);
    if (!page) continue;
    const text = `${page.markdown || ""}\n${page.html || ""}`;
    const emails = extractEmailsFromText(text, domain);
    for (const email of emails) {
      if (!seen.has(email)) {
        seen.add(email);
        found.push({ email, url });
      }
    }
    if (found.length >= 10) break;
  }

  return found;
}

// ────────────────────────────────────────────────────────────
// Pattern store (Supabase)
// ────────────────────────────────────────────────────────────
export async function getCachedPattern(
  supabaseUrl: string,
  serviceKey: string,
  domain: string,
): Promise<{ pattern: string; confidence: number } | null> {
  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/email_patterns?domain=eq.${encodeURIComponent(domain)}&select=pattern,confidence&limit=1`,
      {
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
        },
      },
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    if (Array.isArray(rows) && rows[0]) return rows[0];
    return null;
  } catch {
    return null;
  }
}

export async function upsertPattern(
  supabaseUrl: string,
  serviceKey: string,
  domain: string,
  pattern: string,
  sampleEmail: string,
): Promise<void> {
  try {
    // Read existing
    const existing = await getCachedPatternFull(supabaseUrl, serviceKey, domain);

    if (existing) {
      const samples = Array.isArray(existing.samples) ? existing.samples : [];
      const newSamples = [...new Set([...samples, sampleEmail])].slice(0, 10);
      const samePattern = existing.pattern === pattern;
      const newConfidence = samePattern
        ? Math.min(100, existing.confidence + 10)
        : Math.max(50, existing.confidence - 10);
      const newPattern = samePattern ? existing.pattern : (newConfidence > existing.confidence ? pattern : existing.pattern);

      await fetch(`${supabaseUrl}/rest/v1/email_patterns?domain=eq.${encodeURIComponent(domain)}`, {
        method: "PATCH",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pattern: newPattern,
          confidence: newConfidence,
          sample_count: existing.sample_count + 1,
          samples: newSamples,
        }),
      });
    } else {
      await fetch(`${supabaseUrl}/rest/v1/email_patterns`, {
        method: "POST",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=ignore-duplicates",
        },
        body: JSON.stringify({
          domain,
          pattern,
          confidence: 60,
          sample_count: 1,
          samples: [sampleEmail],
        }),
      });
    }
  } catch (e) {
    console.error("[upsertPattern] failed:", (e as Error).message);
  }
}

async function getCachedPatternFull(
  supabaseUrl: string,
  serviceKey: string,
  domain: string,
): Promise<{ pattern: string; confidence: number; sample_count: number; samples: string[] } | null> {
  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/email_patterns?domain=eq.${encodeURIComponent(domain)}&select=*&limit=1`,
      {
        headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
      },
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    return rows[0] || null;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// Email verification (DNS MX + heuristics; no SMTP probe)
// ────────────────────────────────────────────────────────────
export async function verifyEmail(email: string): Promise<VerifyResult> {
  const cleaned = email.trim().toLowerCase();
  const valid = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned);

  if (!valid) {
    return {
      email: cleaned,
      status: "invalid",
      isDeliverable: false,
      isDisposable: false,
      domainExists: false,
      hasMx: false,
      isRoleBased: false,
      score: 0,
    };
  }

  const [local, domain] = cleaned.split("@");
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  const isRoleBased = DEPT_PREFIXES.some((p) => local === p || local.startsWith(`${p}.`) || local.startsWith(`${p}-`));
  const hasMx = await checkMx(domain);

  let score = 0;
  let status: VerifyResult["status"] = "unknown";

  if (isDisposable) {
    status = "invalid";
    score = 10;
  } else if (!hasMx) {
    status = "invalid";
    score = 20;
  } else {
    score = 75;
    status = "valid";
    if (isRoleBased) {
      score = 65;
      status = "risky";
    }
  }

  return {
    email: cleaned,
    status,
    isDeliverable: status === "valid" || status === "risky",
    isDisposable,
    domainExists: hasMx,
    hasMx,
    isRoleBased,
    score,
  };
}

// ────────────────────────────────────────────────────────────
// Enterprise Layer: verified_emails DB cache
// ────────────────────────────────────────────────────────────
async function lookupVerifiedEmail(
  supabaseUrl: string,
  serviceKey: string,
  firstName: string,
  lastName: string,
  domain: string,
): Promise<{ email: string; status: string; confidence: number } | null> {
  try {
    const f = firstName.toLowerCase();
    const l = lastName.toLowerCase();
    const candidates = [
      `${f}.${l}@${domain}`, `${f}${l}@${domain}`, `${f[0]}.${l}@${domain}`,
      `${f[0]}${l}@${domain}`, `${f}_${l}@${domain}`,
    ].map(encodeURIComponent).join(",");

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/verified_emails?email=in.(${candidates})&status=neq.invalid&order=confidence_score.desc&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    if (!Array.isArray(rows) || !rows[0]) return null;
    const row = rows[0];
    // Re-verify if older than 30 days
    const daysOld = (Date.now() - new Date(row.last_verified_at).getTime()) / 86400000;
    if (daysOld > 30) return null;
    return { email: row.email, status: row.status, confidence: row.confidence_score };
  } catch {
    return null;
  }
}

async function storeVerifiedEmail(
  supabaseUrl: string,
  serviceKey: string,
  data: {
    email: string; domain: string; firstName?: string; lastName?: string;
    companyName?: string; companyDomain?: string; status: string; confidenceScore: number;
    foundVia: string; verificationMethod: string; isRoleBased?: boolean;
  },
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/verified_emails`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        email: data.email,
        domain: data.domain,
        first_name: data.firstName,
        last_name: data.lastName,
        company_name: data.companyName,
        company_domain: data.companyDomain || data.domain,
        status: data.status,
        confidence_score: data.confidenceScore,
        found_via: data.foundVia,
        verification_method: data.verificationMethod,
        is_role_based: data.isRoleBased ?? false,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  } catch { /* non-critical */ }
}

async function checkApiCache(
  supabaseUrl: string,
  serviceKey: string,
  cacheKey: string,
): Promise<unknown | null> {
  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/api_response_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    if (!Array.isArray(rows) || !rows[0]) return null;
    const row = rows[0];
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
    // Increment hit count async (fire & forget)
    fetch(`${supabaseUrl}/rest/v1/api_response_cache?cache_key=eq.${encodeURIComponent(cacheKey)}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hit_count: row.hit_count + 1 }),
    }).catch(() => {});
    return row.response_data;
  } catch {
    return null;
  }
}

async function storeApiCache(
  supabaseUrl: string,
  serviceKey: string,
  cacheKey: string,
  provider: string,
  data: unknown,
  ttlDays = 30,
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlDays * 86400000).toISOString();
    await fetch(`${supabaseUrl}/rest/v1/api_response_cache`, {
      method: "POST",
      headers: {
        apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ cache_key: cacheKey, api_provider: provider, response_data: data, expires_at: expiresAt }),
    });
  } catch { /* non-critical */ }
}

async function trackApiUsage(
  supabaseUrl: string,
  serviceKey: string,
  provider: string,
  endpoint: string,
  success: boolean,
  creditsUsed = 1,
  costUsd = 0,
  responseTimeMs = 0,
  userId?: string,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/api_usage_tracking`, {
      method: "POST",
      headers: {
        apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_provider: provider, endpoint, success,
        credits_used: creditsUsed, cost_usd: costUsd,
        response_time_ms: responseTimeMs, user_id: userId,
      }),
    });
  } catch { /* non-critical */ }
}

// ────────────────────────────────────────────────────────────
// Enterprise Layer: Hunter.io Email Finder API
// ────────────────────────────────────────────────────────────
async function hunterEmailFinder(
  supabaseUrl: string,
  serviceKey: string,
  firstName: string,
  lastName: string,
  domain: string,
  apiKey: string,
  userId?: string,
): Promise<{ email: string; confidence: number; sources: string[] } | null> {
  const cacheKey = `hunter:${firstName.toLowerCase()}-${lastName.toLowerCase()}-${domain}`;
  const cached = await checkApiCache(supabaseUrl, serviceKey, cacheKey);
  if (cached && typeof cached === "object" && (cached as Record<string, unknown>).email) {
    return cached as { email: string; confidence: number; sources: string[] };
  }

  const t0 = Date.now();
  try {
    const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const ms = Date.now() - t0;

    if (!resp.ok) {
      await trackApiUsage(supabaseUrl, serviceKey, "hunter", "email-finder", false, 0, 0, ms, userId);
      return null;
    }

    const data = await resp.json();
    await trackApiUsage(supabaseUrl, serviceKey, "hunter", "email-finder", true, 1, 0.01, ms, userId);

    if (!data?.data?.email) return null;
    const result = {
      email: data.data.email as string,
      confidence: (data.data.confidence as number) ?? 70,
      sources: ((data.data.sources as { uri: string }[]) || []).map((s) => s.uri),
    };
    await storeApiCache(supabaseUrl, serviceKey, cacheKey, "hunter", result);
    return result;
  } catch (e) {
    console.error("[Hunter] API error:", (e as Error).message);
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// Enterprise Layer: Apollo.io Email Finder API
// ────────────────────────────────────────────────────────────
async function apolloEmailFinder(
  supabaseUrl: string,
  serviceKey: string,
  firstName: string,
  lastName: string,
  domain: string,
  apiKey: string,
  userId?: string,
): Promise<{ email: string; status: string; title?: string } | null> {
  const cacheKey = `apollo:${firstName.toLowerCase()}-${lastName.toLowerCase()}-${domain}`;
  const cached = await checkApiCache(supabaseUrl, serviceKey, cacheKey);
  if (cached && typeof cached === "object" && (cached as Record<string, unknown>).email) {
    return cached as { email: string; status: string; title?: string };
  }

  const t0 = Date.now();
  try {
    const resp = await fetch("https://api.apollo.io/v1/people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({
        first_name: firstName, last_name: lastName,
        organization_domains: [domain], page: 1, per_page: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const ms = Date.now() - t0;

    if (!resp.ok) {
      await trackApiUsage(supabaseUrl, serviceKey, "apollo", "people-search", false, 0, 0, ms, userId);
      return null;
    }

    const data = await resp.json();
    await trackApiUsage(supabaseUrl, serviceKey, "apollo", "people-search", true, 1, 0.02, ms, userId);

    const person = data?.people?.[0];
    if (!person?.email || person.email_status === "unavailable") return null;

    const result = { email: person.email as string, status: person.email_status as string, title: person.title as string | undefined };
    await storeApiCache(supabaseUrl, serviceKey, cacheKey, "apollo", result);
    return result;
  } catch (e) {
    console.error("[Apollo] API error:", (e as Error).message);
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// Main finder — orchestrates the whole pipeline
// ────────────────────────────────────────────────────────────
export async function findEmail(
  input: PersonInput,
  env: {
    firecrawlKey: string;
    supabaseUrl: string;
    serviceKey: string;
    hunterApiKey?: string;
    apolloApiKey?: string;
    userId?: string;
  },
): Promise<EmailFinderResult> {
  const domain = resolveDomain(input);

  if (!domain) {
    return {
      email: null,
      confidence: 0,
      status: "unknown",
      emailVerified: false,
      emailConfidence: "low",
      emailSource: "none",
      employerDomain: null,
      sources: [],
    };
  }

  const sources: EmailSource[] = [];
  const allEmails: { email: string; confidence: number; source: string }[] = [];

  // Step 1: MX check — if domain has no mail server, skip everything
  const hasMx = await checkMx(domain);
  if (!hasMx) {
    return {
      email: null,
      confidence: 0,
      status: "invalid",
      emailVerified: false,
      emailConfidence: "low",
      emailSource: "none",
      employerDomain: domain,
      sources: [],
    };
  }

  const hasName = !!(input.firstName && input.lastName);

  // Step 2: Check verified_emails DB cache (enterprise layer)
  if (hasName) {
    const dbHit = await lookupVerifiedEmail(
      env.supabaseUrl, env.serviceKey,
      input.firstName!, input.lastName!, domain,
    );
    if (dbHit) {
      sources.push({ type: "cache", found_at: new Date().toISOString() });
      return {
        email: dbHit.email,
        confidence: dbHit.confidence,
        status: dbHit.status as EmailFinderResult["status"],
        emailVerified: dbHit.status !== "invalid" && dbHit.status !== "unknown",
        emailConfidence: dbHit.confidence >= 80 ? "high" : dbHit.confidence >= 60 ? "medium" : "low",
        emailSource: "cache",
        employerDomain: domain,
        sources,
      };
    }
  }

  // Step 3: Check cached email pattern for this domain
  const cachedPattern = await getCachedPattern(env.supabaseUrl, env.serviceKey, domain);

  if (hasName && cachedPattern && cachedPattern.confidence >= 70) {
    const guessed = applyPattern(cachedPattern.pattern, input.firstName!, input.lastName!, domain);
    const verification = await verifyEmail(guessed);
    if (verification.isDeliverable) {
      sources.push({ type: "cache", pattern: cachedPattern.pattern, found_at: new Date().toISOString() });
      await storeVerifiedEmail(env.supabaseUrl, env.serviceKey, {
        email: guessed, domain, firstName: input.firstName, lastName: input.lastName,
        companyName: input.company, companyDomain: domain,
        status: verification.status, confidenceScore: Math.min(95, cachedPattern.confidence + 10),
        foundVia: "internal_db", verificationMethod: "pattern", isRoleBased: verification.isRoleBased,
      });
      return {
        email: guessed,
        confidence: Math.min(95, cachedPattern.confidence + 10),
        status: verification.status,
        emailVerified: true,
        emailConfidence: cachedPattern.confidence >= 85 ? "high" : "medium",
        emailSource: "cache",
        employerDomain: domain,
        patternUsed: cachedPattern.pattern,
        sources,
      };
    }
  }

  // Step 4: Hunter.io API (enterprise layer — name required)
  if (hasName && env.hunterApiKey) {
    const hunterResult = await hunterEmailFinder(
      env.supabaseUrl, env.serviceKey,
      input.firstName!, input.lastName!, domain,
      env.hunterApiKey, env.userId,
    );
    if (hunterResult) {
      const verification = await verifyEmail(hunterResult.email);
      sources.push({ type: "scrape", url: "hunter.io", found_at: new Date().toISOString() });
      await storeVerifiedEmail(env.supabaseUrl, env.serviceKey, {
        email: hunterResult.email, domain, firstName: input.firstName, lastName: input.lastName,
        companyName: input.company, companyDomain: domain,
        status: verification.status,
        confidenceScore: Math.min(hunterResult.confidence, verification.isDeliverable ? 90 : 40),
        foundVia: "hunter_api", verificationMethod: "api_hunter",
        isRoleBased: verification.isRoleBased,
      });
      const pattern = detectPattern(hunterResult.email, input.firstName, input.lastName);
      if (pattern) await upsertPattern(env.supabaseUrl, env.serviceKey, domain, pattern, hunterResult.email);
      return {
        email: hunterResult.email,
        confidence: Math.min(hunterResult.confidence, verification.isDeliverable ? 90 : 40),
        status: verification.status,
        emailVerified: verification.isDeliverable,
        emailConfidence: hunterResult.confidence >= 80 ? "high" : "medium",
        emailSource: "scrape",
        employerDomain: domain,
        sources,
      };
    }
  }

  // Step 5: Apollo.io API (enterprise layer — name required, fallback)
  if (hasName && env.apolloApiKey) {
    const apolloResult = await apolloEmailFinder(
      env.supabaseUrl, env.serviceKey,
      input.firstName!, input.lastName!, domain,
      env.apolloApiKey, env.userId,
    );
    if (apolloResult) {
      const verification = await verifyEmail(apolloResult.email);
      sources.push({ type: "scrape", url: "apollo.io", found_at: new Date().toISOString() });
      await storeVerifiedEmail(env.supabaseUrl, env.serviceKey, {
        email: apolloResult.email, domain, firstName: input.firstName, lastName: input.lastName,
        companyName: input.company, companyDomain: domain,
        status: verification.status,
        confidenceScore: verification.isDeliverable ? 85 : 35,
        foundVia: "apollo_api", verificationMethod: "api_apollo",
        isRoleBased: verification.isRoleBased,
      });
      const pattern = detectPattern(apolloResult.email, input.firstName, input.lastName);
      if (pattern) await upsertPattern(env.supabaseUrl, env.serviceKey, domain, pattern, apolloResult.email);
      return {
        email: apolloResult.email,
        confidence: verification.isDeliverable ? 85 : 35,
        status: verification.status,
        emailVerified: verification.isDeliverable,
        emailConfidence: verification.isDeliverable ? "high" : "low",
        emailSource: "scrape",
        employerDomain: domain,
        sources,
      };
    }
  }

  // Step 6: Crawl the domain (Firecrawl)
  const discovered = await discoverEmailsOnDomain(domain, env.firecrawlKey);

  // If we have a name, look for a name-matching email on the site
  if (hasName) {
    const fLower = input.firstName!.toLowerCase();
    const lLower = input.lastName!.toLowerCase();
    for (const { email, url } of discovered) {
      const local = email.split("@")[0];
      if (local.includes(fLower) || local.includes(lLower)) {
        const verification = await verifyEmail(email);
        sources.push({ type: "scrape", url, found_at: new Date().toISOString() });
        const pattern = detectPattern(email, input.firstName, input.lastName);
        if (pattern) await upsertPattern(env.supabaseUrl, env.serviceKey, domain, pattern, email);
        await storeVerifiedEmail(env.supabaseUrl, env.serviceKey, {
          email, domain, firstName: input.firstName, lastName: input.lastName,
          companyName: input.company, companyDomain: domain,
          status: verification.status, confidenceScore: 92,
          foundVia: "scrape", verificationMethod: "scrape", isRoleBased: verification.isRoleBased,
        });
        return {
          email,
          confidence: 92,
          status: verification.status,
          emailVerified: true,
          emailConfidence: "high",
          emailSource: "scrape",
          employerDomain: domain,
          patternUsed: pattern || undefined,
          sources,
        };
      }
    }
  }

  // Step 7: Generate from common patterns and verify each
  if (hasName && discovered.length > 0) {
    const patternsToTry = cachedPattern
      ? [cachedPattern.pattern, ...COMMON_PATTERNS.filter((p) => p !== cachedPattern.pattern)]
      : COMMON_PATTERNS;

    for (const pattern of patternsToTry.slice(0, 4)) {
      const guessed = applyPattern(pattern, input.firstName!, input.lastName!, domain);
      const verification = await verifyEmail(guessed);
      if (verification.isDeliverable && verification.status !== "risky") {
        sources.push({ type: "pattern", pattern, found_at: new Date().toISOString() });
        await upsertPattern(env.supabaseUrl, env.serviceKey, domain, pattern, guessed);
        await storeVerifiedEmail(env.supabaseUrl, env.serviceKey, {
          email: guessed, domain, firstName: input.firstName, lastName: input.lastName,
          companyName: input.company, companyDomain: domain,
          status: verification.status, confidenceScore: 65,
          foundVia: "pattern_gen", verificationMethod: "pattern",
        });
        return {
          email: guessed,
          confidence: 65,
          status: verification.status,
          emailVerified: true,
          emailConfidence: "medium",
          emailSource: "pattern",
          employerDomain: domain,
          patternUsed: pattern,
          sources,
        };
      }
    }
  }

  // Step 8: Use generic/department email discovered on site
  if (discovered.length > 0) {
    const sorted = [...discovered].sort((a, b) => {
      const aDept = DEPT_PREFIXES.includes(a.email.split("@")[0]) ? 1 : 0;
      const bDept = DEPT_PREFIXES.includes(b.email.split("@")[0]) ? 1 : 0;
      return bDept - aDept;
    });
    const best = sorted[0];
    const verification = await verifyEmail(best.email);
    sources.push({ type: "scrape", url: best.url, found_at: new Date().toISOString() });
    for (const { email, url } of discovered.slice(0, 5)) {
      allEmails.push({ email, confidence: 70, source: url });
    }
    await storeVerifiedEmail(env.supabaseUrl, env.serviceKey, {
      email: best.email, domain, companyName: input.company, companyDomain: domain,
      status: verification.status, confidenceScore: verification.isRoleBased ? 60 : 75,
      foundVia: "scrape", verificationMethod: "scrape", isRoleBased: verification.isRoleBased,
    });
    return {
      email: best.email,
      confidence: verification.isRoleBased ? 60 : 75,
      status: verification.status,
      emailVerified: verification.isDeliverable,
      emailConfidence: verification.isRoleBased ? "medium" : "high",
      emailSource: "scrape",
      employerDomain: domain,
      sources,
      allEmails,
    };
  }

  // Step 9: Last resort — guess info@domain
  const genericEmail = `info@${domain}`;
  const genericVerify = await verifyEmail(genericEmail);
  sources.push({ type: "generic", found_at: new Date().toISOString() });
  if (genericVerify.isDeliverable) {
    await storeVerifiedEmail(env.supabaseUrl, env.serviceKey, {
      email: genericEmail, domain, companyName: input.company, companyDomain: domain,
      status: genericVerify.status, confidenceScore: 40,
      foundVia: "pattern_gen", verificationMethod: "pattern", isRoleBased: true,
    });
  }
  return {
    email: genericVerify.isDeliverable ? genericEmail : null,
    confidence: genericVerify.isDeliverable ? 40 : 0,
    status: genericVerify.status,
    emailVerified: genericVerify.isDeliverable,
    emailConfidence: "low",
    emailSource: genericVerify.isDeliverable ? "generic" : "none",
    employerDomain: domain,
    sources,
  };
}
