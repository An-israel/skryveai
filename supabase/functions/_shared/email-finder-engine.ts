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
// Main finder — orchestrates the whole pipeline
// ────────────────────────────────────────────────────────────
export async function findEmail(
  input: PersonInput,
  env: { firecrawlKey: string; supabaseUrl: string; serviceKey: string },
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

  // Step 2: Check cached pattern for this domain (global)
  const cachedPattern = await getCachedPattern(env.supabaseUrl, env.serviceKey, domain);

  if (hasName && cachedPattern && cachedPattern.confidence >= 70) {
    const guessed = applyPattern(cachedPattern.pattern, input.firstName!, input.lastName!, domain);
    const verification = await verifyEmail(guessed);
    if (verification.isDeliverable) {
      sources.push({ type: "cache", pattern: cachedPattern.pattern, found_at: new Date().toISOString() });
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

  // Step 3: Crawl the domain
  const discovered = await discoverEmailsOnDomain(domain, env.firecrawlKey);

  // If we have a name, try to find a matching email
  if (hasName) {
    const fLower = input.firstName!.toLowerCase();
    const lLower = input.lastName!.toLowerCase();
    for (const { email, url } of discovered) {
      const local = email.split("@")[0];
      if (local.includes(fLower) || local.includes(lLower)) {
        const verification = await verifyEmail(email);
        sources.push({ type: "scrape", url, found_at: new Date().toISOString() });
        // Learn the pattern
        const pattern = detectPattern(email, input.firstName, input.lastName);
        if (pattern) {
          await upsertPattern(env.supabaseUrl, env.serviceKey, domain, pattern, email);
        }
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

  // Step 4: Detect pattern from any discovered email and apply it
  if (hasName && discovered.length > 0) {
    // Look at any email and infer pattern using its local-part vs the person's name
    // (only useful if the discovered emails were from people whose names we infer)
    // Better: try common patterns and verify each
    const patternsToTry = cachedPattern
      ? [cachedPattern.pattern, ...COMMON_PATTERNS.filter((p) => p !== cachedPattern.pattern)]
      : COMMON_PATTERNS;

    for (const pattern of patternsToTry.slice(0, 4)) {
      const guessed = applyPattern(pattern, input.firstName!, input.lastName!, domain);
      const verification = await verifyEmail(guessed);
      if (verification.isDeliverable && verification.status !== "risky") {
        sources.push({ type: "pattern", pattern, found_at: new Date().toISOString() });
        await upsertPattern(env.supabaseUrl, env.serviceKey, domain, pattern, guessed);
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

  // Step 5: Fall back to a discovered generic email (info@, contact@, etc.)
  if (discovered.length > 0) {
    // Prefer department prefixes
    const sorted = [...discovered].sort((a, b) => {
      const localA = a.email.split("@")[0];
      const localB = b.email.split("@")[0];
      const aDept = DEPT_PREFIXES.includes(localA) ? 1 : 0;
      const bDept = DEPT_PREFIXES.includes(localB) ? 1 : 0;
      return bDept - aDept;
    });
    const best = sorted[0];
    const verification = await verifyEmail(best.email);
    sources.push({ type: "scrape", url: best.url, found_at: new Date().toISOString() });
    for (const { email, url } of discovered.slice(0, 5)) {
      allEmails.push({ email, confidence: 70, source: url });
    }
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

  // Step 6: Last resort — generic info@ guess
  const genericEmail = `info@${domain}`;
  const genericVerify = await verifyEmail(genericEmail);
  sources.push({ type: "generic", found_at: new Date().toISOString() });
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
