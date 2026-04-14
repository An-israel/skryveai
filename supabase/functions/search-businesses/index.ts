import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  businessType: string;
  location: string;
  limit?: number;
}

// ─── Email Validation (same rules as analyze-website) ────────────────────────

const INVALID_EMAIL_TLDS = new Set([
  "png","jpg","jpeg","gif","svg","webp","bmp","ico","tiff","avif",
  "mp4","mp3","wav","avi","mov","wmv","flv","webm","ogg",
  "pdf","doc","docx","xls","xlsx","ppt","pptx","csv","txt",
  "zip","rar","tar","gz","7z","js","css","html","htm","xml",
  "json","ts","tsx","jsx","woff","woff2","ttf","eot","otf",
  "exe","dll","dmg","apk","msi",
]);

const BLOCKED_EMAIL_DOMAINS = new Set([
  "example.com","test.com","sample.com","booksrus.com",
  "indeed.com","linkedin.com","glassdoor.com","wellfound.com",
  "dice.com","ziprecruiter.com","weworkremotely.com","remote.co",
  "monster.com","careerbuilder.com","simplyhired.com",
  "lever.co","greenhouse.io","workday.com","icims.com",
  "taleo.net","smartrecruiters.com",
]);

const INVALID_LOCAL_PATTERNS = [
  /^\d+x\d*$/i, /^image/i, /^img/i, /^photo/i, /^icon/i, /^logo/i,
  /^banner/i, /^bg/i, /^thumb/i, /^screen/i, /^avatar/i, /^placeholder/i,
  /^sprite/i, /^asset/i, /^file/i, /^\d+$/, /^[a-f0-9]{8,}$/i,
  /^data$/i, /^no-?reply$/i, /^mailer-?daemon$/i,
];

const TRUSTED_EMAIL_DOMAINS = new Set([
  "gmail.com","yahoo.com","outlook.com","hotmail.com","aol.com",
  "icloud.com","mail.com","protonmail.com","zoho.com","yandex.com",
  "live.com","msn.com","me.com","mac.com",
]);

// Generic/department prefixes — always preferred over personal emails
const DEPT_PREFIXES = [
  "info","contact","hello","support","sales","admin","office",
  "team","help","enquir","booking","enquiries","enquiry","hola",
  "hi","hey","reach","mail","email","business","general",
];

function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  const parts = lower.split("@");
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (!localPart || localPart.length < 1 || localPart.length > 64) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) return false;
  if (!domain || domain.length < 3) return false;
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return false;
  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return false;
  if (INVALID_EMAIL_TLDS.has(tld)) return false;
  for (const pattern of INVALID_LOCAL_PATTERNS) {
    if (pattern.test(localPart)) return false;
  }
  if (domain.includes("/") || domain.includes("\\")) return false;
  if (domainParts[0].length < 2) return false;
  return true;
}

async function verifyMXRecord(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1];
    if (!domain) return false;
    if (TRUSTED_EMAIL_DOMAINS.has(domain)) return true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!response.ok) return false;
    const data = await response.json();
    if (data.Status === 0 && data.Answer?.length > 0) {
      const mx = data.Answer.filter((a: { type: number }) => a.type === 15);
      if (mx.length > 0) return true;
    }
    // Fallback: check A record
    const aResp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (aResp.ok) {
      const aData = await aResp.json();
      if (aData.Status === 0 && aData.Answer?.length > 0) return true;
    }
    return false;
  } catch {
    return true; // On error, don't block — fail open
  }
}

function scoreEmailCandidate(email: string, websiteDomain: string | null): number {
  const lower = email.toLowerCase();
  const [localPart, domain] = lower.split("@");
  let score = 0;

  // Domain match with website
  if (websiteDomain && domain === websiteDomain) score += 50;
  if (websiteDomain && (domain.endsWith("." + websiteDomain) || websiteDomain.endsWith("." + domain))) score += 30;

  // Department prefix bonus
  const isDept = DEPT_PREFIXES.some((p) => localPart === p || localPart.startsWith(p + "."));
  if (isDept) score += 30;

  // Penalise very long local parts (likely personal/generated)
  if (localPart.length > 25) score -= 15;

  return score;
}

// ─── ZeroBounce email verification ───────────────────────────────────────────
// ZeroBounce is an industry-leading email verifier that checks SMTP deliverability,
// detects catch-all servers, spam traps, and disposable addresses.
// Sign up at https://zerobounce.net — free tier: 100/month. Add ZEROBOUNCE_API_KEY
// to your Supabase Edge Function secrets.

async function verifyEmailViaZeroBounce(
  apiKey: string,
  email: string,
): Promise<{ valid: boolean }> {
  try {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&ip_address=`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { valid: false };
    const data = await resp.json();
    // "valid"     → confirmed deliverable mailbox ✓
    // "catch-all" → server accepts all addresses (can't verify further) — accept it ✓
    // "invalid", "unknown", "spamtrap", "abuse", "do_not_mail" → reject ✗
    const status = (data.status || "").toLowerCase();
    return { valid: status === "valid" || status === "catch-all" };
  } catch {
    return { valid: false };
  }
}

// ─── Deep website email scraper ───────────────────────────────────────────────
// Scrapes multiple pages (homepage + common contact/about paths) and returns
// ALL valid email candidates ranked by quality — best (dept prefix + domain match)
// first. Caller is responsible for verification.

async function fetchPageEmails(pageUrl: string): Promise<string[]> {
  try {
    const resp = await fetch(pageUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!resp.ok) return [];

    const html = await resp.text();

    // Priority 1: mailto: links — highest signal
    const mailtoMatches = [...html.matchAll(/href=["']mailto:([^"'?\s]+)/gi)]
      .map(m => m[1].toLowerCase().trim());

    // Priority 2: plain email pattern anywhere in the HTML
    const plainMatches = (html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])
      .map(e => e.toLowerCase().trim());

    // Deduplicate preserving order (mailto first = higher score)
    const seen = new Set<string>();
    const all: string[] = [];
    for (const e of [...mailtoMatches, ...plainMatches]) {
      if (!seen.has(e) && isValidEmail(e)) { seen.add(e); all.push(e); }
    }
    return all;
  } catch {
    return [];
  }
}

async function scrapeAllEmailsFromSite(
  website: string,
  websiteDomain: string | null,
): Promise<string[]> {
  const base = website.replace(/\/$/, "");
  const pagesToTry = [
    website,
    `${base}/contact`,
    `${base}/contact-us`,
    `${base}/about`,
    `${base}/about-us`,
    `${base}/get-in-touch`,
    `${base}/reach-us`,
  ];

  // Fetch all pages in parallel
  const results = await Promise.allSettled(pagesToTry.map(fetchPageEmails));
  const seen = new Set<string>();
  const combined: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const e of r.value) {
        if (!seen.has(e)) { seen.add(e); combined.push(e); }
      }
    }
  }

  // Score and rank — dept prefix on matching domain wins
  combined.sort((a, b) => scoreEmailCandidate(b, websiteDomain) - scoreEmailCandidate(a, websiteDomain));
  return combined;
}

// ─── Master email finder ──────────────────────────────────────────────────────

async function findBestEmailForBusiness(
  zeroBounceKey: string | null,
  bizName: string,
  website: string | null,
): Promise<{ email: string | null; confidence: "high" | "medium" | "low" | "none"; source: string }> {

  const websiteDomain = website ? (() => {
    try { return new URL(website).hostname.replace(/^www\./, ""); } catch { return null; }
  })() : null;

  // Final gate: ZeroBounce verification required before returning any email.
  // Falls back to MX check only when no ZeroBounce key is configured.
  async function passesVerification(email: string): Promise<boolean> {
    if (!isValidEmail(email)) return false;
    if (zeroBounceKey) {
      const { valid } = await verifyEmailViaZeroBounce(zeroBounceKey, email);
      return valid;
    }
    // No key configured — MX record check as minimal fallback
    return verifyMXRecord(email);
  }

  // ── Step 1: Deep-scrape the website (homepage + contact/about pages) ───────
  if (website) {
    console.log(`[Email] Deep-scraping site for: ${bizName}`);
    const candidates = await scrapeAllEmailsFromSite(website, websiteDomain);
    console.log(`[Email] Scraped ${candidates.length} candidate(s) from site`);
    for (const candidate of candidates.slice(0, 5)) { // verify top 5 at most
      console.log(`[Email] Candidate: ${candidate} — verifying...`);
      const ok = await passesVerification(candidate);
      if (ok) {
        console.log(`[Email] Verified: ${candidate}`);
        return { email: candidate, confidence: "high", source: "website_scraped" };
      }
      console.log(`[Email] Failed verification: ${candidate}`);
    }
  }

  // ── Step 2: Guess common patterns (info@, contact@, hello@, team@) ─────────
  if (websiteDomain) {
    const guesses = [
      `info@${websiteDomain}`,
      `contact@${websiteDomain}`,
      `hello@${websiteDomain}`,
      `team@${websiteDomain}`,
      `support@${websiteDomain}`,
    ];
    for (const guess of guesses) {
      console.log(`[Email] Pattern guess: ${guess} — verifying...`);
      const ok = await passesVerification(guess);
      if (ok) {
        console.log(`[Email] Pattern guess verified: ${guess}`);
        return { email: guess, confidence: "low", source: "pattern_verified" };
      }
    }
  }

  console.log(`[Email] No verified email found for ${bizName}`);
  return { email: null, confidence: "none", source: "none" };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");

    // Allow service-role calls (e.g. from autopilot-run) to bypass user auth
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    let user: { id: string } | null = null;

    if (isServiceRole) {
      // Service-role call — skip user auth & credit check
      user = null;
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session. Please log in again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      user = authUser;
    }

    // Credit check — skip for service-role calls
    if (user) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("credits, plan, status")
        .eq("user_id", user.id)
        .single();

      if (!subscription) {
        return new Response(
          JSON.stringify({ error: "No active subscription found" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (subscription.plan !== "lifetime") {
        if (subscription.credits < 1) {
          return new Response(
            JSON.stringify({ error: "Insufficient credits. Please upgrade your plan." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await supabase
          .from("subscriptions")
          .update({ credits: subscription.credits - 1 })
          .eq("user_id", user.id);
      }
    }

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY is not configured");

    const ZEROBOUNCE_API_KEY = Deno.env.get("ZEROBOUNCE_API_KEY") || null;

    const { businessType, location, limit = 20 }: SearchRequest = await req.json();

    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ error: "businessType and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (businessType.length > 100 || location.length > 200) {
      return new Response(
        JSON.stringify({ error: "Input too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedLimit = Math.min(Math.max(1, Number(limit) || 20), 30);
    const query = `${businessType} in ${location}`;
    console.log(`Searching: "${query}"`);

    // ── Google Places: text search ────────────────────────────────────────────
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    const searchResp = await fetch(textSearchUrl);
    const searchData = await searchResp.json();

    if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places error: ${searchData.status}`);
    }

    const places = searchData.results?.slice(0, sanitizedLimit) || [];
    console.log(`Google returned ${places.length} places`);

    // ── Get place details ─────────────────────────────────────────────────────
    const businesses: any[] = await Promise.all(
      places.map(async (place: any) => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types&key=${GOOGLE_PLACES_API_KEY}`;
          const detailsResp = await fetch(detailsUrl);
          const detailsData = await detailsResp.json();
          const d = detailsData.result || {};
          return {
            id: crypto.randomUUID(),
            name: d.name || place.name,
            address: d.formatted_address || place.formatted_address,
            phone: d.formatted_phone_number || null,
            website: d.website || null,
            rating: d.rating || place.rating || null,
            reviewCount: d.user_ratings_total || place.user_ratings_total || null,
            category: (d.types || place.types || []).join(", "),
            placeId: place.place_id,
            selected: false,
            email: null,
            emailConfidence: "none",
            emailSource: "none",
          };
        } catch {
          return {
            id: crypto.randomUUID(),
            name: place.name,
            address: place.formatted_address,
            phone: null,
            website: null,
            rating: place.rating || null,
            reviewCount: place.user_ratings_total || null,
            category: (place.types || []).join(", "),
            placeId: place.place_id,
            selected: false,
            email: null,
            emailConfidence: "none",
            emailSource: "none",
          };
        }
      })
    );

    // ── Email discovery — process in batches of 3 to stay under time limits ──
    const BATCH_SIZE = 3;
    let totalEmailsFound = 0;

    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      const batch = businesses.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (biz) => {
          const result = await findBestEmailForBusiness(ZEROBOUNCE_API_KEY, biz.name, biz.website);
          biz.email = result.email;
          biz.emailConfidence = result.confidence;
          biz.emailSource = result.source;
          if (result.email) totalEmailsFound++;
        })
      );
    }

    console.log(`Done: ${businesses.length} businesses, ${totalEmailsFound} valid emails found`);

    return new Response(
      JSON.stringify({ businesses, total: businesses.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("search-businesses error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
