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

// ─── Hunter.io helpers ────────────────────────────────────────────────────────

async function findEmailViaHunter(
  apiKey: string,
  domain: string,
): Promise<{ email: string | null; confidence: number }> {
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=5`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await resp.json();

    if (data.errors) {
      console.error("[Hunter] Error:", data.errors);
      return { email: null, confidence: 0 };
    }

    const emails: any[] = data.data?.emails || [];
    if (emails.length === 0) {
      // Use generic pattern fallback if available
      if (data.data?.pattern && data.data?.domain) {
        return { email: `info@${data.data.domain}`, confidence: 25 };
      }
      return { email: null, confidence: 0 };
    }

    // Score each email
    const scored = emails.map((e: any) => {
      const localPart = (e.value || "").split("@")[0]?.toLowerCase() ?? "";
      const isDept = DEPT_PREFIXES.some((p) => localPart === p || localPart.startsWith(p + "."));
      return {
        ...e,
        sortScore: (isDept ? 1000 : 0) + (e.confidence || 0) + (e.sources || 0) * 5,
      };
    });
    scored.sort((a: any, b: any) => b.sortScore - a.sortScore);
    const best = scored[0];

    return { email: best.value, confidence: best.confidence || 0 };
  } catch (e) {
    console.error("[Hunter] Exception:", e);
    return { email: null, confidence: 0 };
  }
}

async function verifyEmailViaHunter(
  apiKey: string,
  email: string,
): Promise<{ valid: boolean; score: number }> {
  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await resp.json();
    if (data.errors) return { valid: false, score: 0 };
    const result = data.data;
    return {
      valid: result?.result === "deliverable" || result?.result === "risky",
      score: result?.score || 0,
    };
  } catch {
    return { valid: false, score: 0 };
  }
}

// ─── Try to scrape contact email directly from website ────────────────────────

async function scrapeEmailFromWebsite(websiteUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SkryveBot/1.0)" },
    });
    if (!resp.ok) return null;

    const html = await resp.text();
    // Extract email addresses from HTML
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const found = (html.match(emailRegex) || [])
      .map((e) => e.toLowerCase().trim())
      .filter(isValidEmail);

    if (found.length === 0) return null;

    const websiteDomain = (() => {
      try { return new URL(websiteUrl).hostname.replace(/^www\./, ""); } catch { return null; }
    })();

    // Score and pick best
    found.sort((a, b) => scoreEmailCandidate(b, websiteDomain) - scoreEmailCandidate(a, websiteDomain));
    return found[0];
  } catch {
    return null;
  }
}

// ─── Also try /contact page ───────────────────────────────────────────────────

async function scrapeContactPage(websiteUrl: string): Promise<string | null> {
  try {
    const base = websiteUrl.replace(/\/$/, "");
    const contactUrls = [`${base}/contact`, `${base}/contact-us`, `${base}/about`];
    for (const url of contactUrls) {
      const email = await scrapeEmailFromWebsite(url);
      if (email) return email;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Master email finder ──────────────────────────────────────────────────────

async function findBestEmailForBusiness(
  hunterApiKey: string | null,
  bizName: string,
  website: string | null,
): Promise<{ email: string | null; confidence: "high" | "medium" | "low" | "none"; source: string }> {

  const websiteDomain = website ? (() => {
    try { return new URL(website).hostname.replace(/^www\./, ""); } catch { return null; }
  })() : null;

  // ── Step 1: Hunter.io (most reliable) ──────────────────────────────────────
  if (hunterApiKey && websiteDomain) {
    console.log(`[Email] Trying Hunter for domain: ${websiteDomain}`);
    const { email: hunterEmail, confidence } = await findEmailViaHunter(hunterApiKey, websiteDomain);

    if (hunterEmail && isValidEmail(hunterEmail) && confidence >= 30) {
      // Verify email deliverability
      const mxOk = await verifyMXRecord(hunterEmail);
      if (mxOk) {
        // Optionally also verify with Hunter verifier for high confidence
        let finalConfidence: "high" | "medium" | "low" = "low";
        if (confidence >= 80) {
          finalConfidence = "high";
        } else if (confidence >= 50) {
          // Run Hunter verifier for medium-confidence emails
          const verify = await verifyEmailViaHunter(hunterApiKey, hunterEmail);
          finalConfidence = verify.valid ? "medium" : "low";
        }
        console.log(`[Email] Hunter found & MX-verified: ${hunterEmail} (${finalConfidence}, confidence: ${confidence})`);
        return { email: hunterEmail, confidence: finalConfidence, source: "hunter" };
      } else {
        console.log(`[Email] Hunter email rejected (no MX): ${hunterEmail}`);
      }
    } else if (hunterEmail) {
      console.log(`[Email] Hunter email rejected (invalid/low confidence): ${hunterEmail} confidence=${confidence}`);
    }
  }

  // ── Step 2: Scrape homepage for mailto links ───────────────────────────────
  if (website) {
    console.log(`[Email] Scraping homepage: ${website}`);
    const scraped = await scrapeEmailFromWebsite(website);
    if (scraped && isValidEmail(scraped)) {
      const mxOk = await verifyMXRecord(scraped);
      if (mxOk) {
        console.log(`[Email] Scraped & MX-verified from homepage: ${scraped}`);
        return { email: scraped, confidence: "medium", source: "website_homepage" };
      }
      console.log(`[Email] Scraped email rejected (no MX): ${scraped}`);
    }

    // ── Step 3: Try /contact and /about pages ────────────────────────────────
    console.log(`[Email] Scraping contact/about pages for: ${bizName}`);
    const contactEmail = await scrapeContactPage(website);
    if (contactEmail && isValidEmail(contactEmail)) {
      const mxOk = await verifyMXRecord(contactEmail);
      if (mxOk) {
        console.log(`[Email] Found & MX-verified from contact page: ${contactEmail}`);
        return { email: contactEmail, confidence: "medium", source: "website_contact" };
      }
    }
  }

  // ── Step 4: Guess common patterns and verify ──────────────────────────────
  if (websiteDomain) {
    const guesses = [
      `info@${websiteDomain}`,
      `contact@${websiteDomain}`,
      `hello@${websiteDomain}`,
    ];
    for (const guess of guesses) {
      if (!isValidEmail(guess)) continue;
      const mxOk = await verifyMXRecord(guess);
      if (mxOk) {
        // Verify with Hunter if available
        if (hunterApiKey) {
          const verify = await verifyEmailViaHunter(hunterApiKey, guess);
          if (verify.valid) {
            console.log(`[Email] Pattern guess verified: ${guess}`);
            return { email: guess, confidence: "low", source: "pattern_verified" };
          }
        } else {
          // No Hunter available — return MX-verified guess with low confidence
          console.log(`[Email] Pattern guess MX-OK (unverified): ${guess}`);
          return { email: guess, confidence: "low", source: "pattern_mx" };
        }
      }
    }
  }

  console.log(`[Email] No valid email found for ${bizName}`);
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit check
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

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY is not configured");

    const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY") || null;

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
          const result = await findBestEmailForBusiness(HUNTER_API_KEY, biz.name, biz.website);
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
