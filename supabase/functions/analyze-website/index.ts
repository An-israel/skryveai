import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnalyzeRequest {
  url?: string;
  businessName: string;
  expertise?: string;
  cta?: string;
  socialOnly?: boolean;
  socialHandles?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    twitter?: string;
  };
}

interface AnalysisIssue {
  category: 'website_copy' | 'linkedin' | 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'branding' | 'cta' | 'seo' | 'design' | 'social' | 'copywriting' | 'performance' | 'video';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

// Validate URL and prevent SSRF
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') || hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') || hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') || hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') || hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') || hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') || hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') || hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') || hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') || hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') ||
      hostname.endsWith('.local') || hostname.endsWith('.internal')
    ) return false;
    return true;
  } catch { return false; }
}

// File/image extensions that are NOT valid email TLDs
const INVALID_EMAIL_TLDS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'avif',
  'mp4', 'mp3', 'wav', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ogg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt',
  'zip', 'rar', 'tar', 'gz', '7z',
  'js', 'css', 'html', 'htm', 'xml', 'json', 'ts', 'tsx', 'jsx',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'exe', 'dll', 'dmg', 'apk', 'msi',
]);

// Known-bad domains that should never be used as company emails
const BLOCKED_EMAIL_DOMAINS = new Set([
  'booksrus.com', 'example.com', 'test.com', 'sample.com',
  'indeed.com', 'linkedin.com', 'glassdoor.com', 'wellfound.com',
  'dice.com', 'ziprecruiter.com', 'weworkremotely.com', 'remote.co',
  'monster.com', 'careerbuilder.com', 'simplyhired.com',
  'lever.co', 'greenhouse.io', 'workday.com', 'icims.com',
  'taleo.net', 'smartrecruiters.com',
]);

const INVALID_LOCAL_PATTERNS = [
  /^\d+x\d*$/i, /^image/i, /^img/i, /^photo/i, /^icon/i, /^logo/i,
  /^banner/i, /^bg/i, /^thumb/i, /^screen/i, /^avatar/i, /^placeholder/i,
  /^sprite/i, /^asset/i, /^file/i, /^\d+$/, /^[a-f0-9]{8,}$/i,
  /^data$/i, /^no-?reply$/i, /^mailer-?daemon$/i,
];

const TRUSTED_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'live.com', 'msn.com', 'me.com', 'mac.com',
]);

function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  const parts = lower.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (!localPart || localPart.length < 1 || localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return false;
  if (!domain || domain.length < 3) return false;
  // Reject blocked domains (platforms, known-bad)
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return false;
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return false;
  if (INVALID_EMAIL_TLDS.has(tld)) return false;
  for (const pattern of INVALID_LOCAL_PATTERNS) {
    if (pattern.test(localPart)) return false;
  }
  if (domain.includes('/') || domain.includes('\\')) return false;
  if (domainParts[0].length < 2) return false;
  return true;
}

// ─── MX Record Validation ───
async function verifyMXRecord(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Trusted domains don't need MX check
    if (TRUSTED_EMAIL_DOMAINS.has(domain)) return true;

    // Use Google's DNS-over-HTTPS to check MX records
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`DNS lookup failed for ${domain}: ${response.status}`);
      return false;
    }

    const data = await response.json();

    // Status 0 = NOERROR, check if Answer has MX records
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      const mxRecords = data.Answer.filter((a: { type: number }) => a.type === 15); // MX = type 15
      if (mxRecords.length > 0) {
        console.log(`✓ MX records found for ${domain}: ${mxRecords.length} records`);
        return true;
      }
    }

    // Also check A record as fallback (some domains accept mail without MX)
    const aResponse = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (aResponse.ok) {
      const aData = await aResponse.json();
      if (aData.Status === 0 && aData.Answer && aData.Answer.length > 0) {
        console.log(`⚠ No MX but A record found for ${domain} - accepting with lower confidence`);
        return true;
      }
    }

    console.log(`✗ No MX/A records for ${domain} - email likely undeliverable`);
    return false;
  } catch (error) {
    console.log(`MX check error for ${email}:`, error instanceof Error ? error.message : "unknown");
    // On timeout/error, accept the email (don't block on DNS issues)
    return true;
  }
}

function scoreEmail(email: string, websiteUrl: string): number {
  const lower = email.toLowerCase();
  const [localPart, domain] = lower.split('@');
  let score = 0;
  try {
    const siteDomain = new URL(websiteUrl).hostname.replace(/^www\./, '');
    if (domain === siteDomain) score += 50;
    if (domain.endsWith('.' + siteDomain) || siteDomain.endsWith('.' + domain)) score += 30;
  } catch { /* ignore */ }
  const businessPrefixes = ['info', 'contact', 'hello', 'support', 'sales', 'admin', 'office', 'team', 'help', 'enquir', 'booking'];
  for (const prefix of businessPrefixes) {
    if (localPart.startsWith(prefix)) { score += 20; break; }
  }
  if (TRUSTED_EMAIL_DOMAINS.has(domain)) score += 10;
  if (localPart.length > 30) score -= 10;
  return score;
}

async function findBestEmail(candidates: string[], websiteUrl: string): Promise<string | null> {
  const unique = [...new Set(candidates.map(e => e.toLowerCase().trim()))];
  const valid = unique.filter(isValidEmail);
  if (valid.length === 0) return null;
  
  // Sort by score
  valid.sort((a, b) => scoreEmail(b, websiteUrl) - scoreEmail(a, websiteUrl));
  
  // Verify MX records for top candidates (check top 3 max)
  for (const email of valid.slice(0, 3)) {
    const hasMX = await verifyMXRecord(email);
    if (hasMX) {
      console.log(`Email validated with MX: ${email}`);
      return email;
    }
    console.log(`Email rejected (no MX): ${email}`);
  }
  
  // If no MX-verified email found, return null instead of bad email
  console.log(`No MX-verified email found among ${valid.length} candidates`);
  return null;
}

// ZeroBounce email verifier — final gate before accepting any email
// "valid" = confirmed deliverable; "catch-all" = server accepts all (best effort)
async function verifyEmailViaZeroBounce(
  apiKey: string,
  email: string,
): Promise<{ valid: boolean }> {
  try {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&ip_address=`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { valid: false };
    const data = await resp.json();
    const status = (data.status || "").toLowerCase();
    return { valid: status === "valid" || status === "catch-all" };
  } catch {
    return { valid: false };
  }
}

// Extract social media URLs from links
function extractSocialLinks(links: string[]): Record<string, string | null> {
  const social: Record<string, string | null> = {
    linkedin: null,
    instagram: null,
    facebook: null,
    twitter: null,
    tiktok: null,
  };

  for (const link of links) {
    const lower = link.toLowerCase();
    if (!social.linkedin && (lower.includes('linkedin.com/company/') || lower.includes('linkedin.com/in/'))) {
      social.linkedin = link;
    }
    if (!social.instagram && lower.includes('instagram.com/') && !lower.includes('/p/') && !lower.includes('/reel/')) {
      social.instagram = link;
    }
    if (!social.facebook && lower.includes('facebook.com/') && !lower.includes('/posts/') && !lower.includes('/photos/')) {
      social.facebook = link;
    }
    if (!social.twitter && (lower.includes('twitter.com/') || lower.includes('x.com/'))) {
      social.twitter = link;
    }
    if (!social.tiktok && lower.includes('tiktok.com/')) {
      social.tiktok = link;
    }
  }

  return social;
}

// Scrape a social media profile with Firecrawl (with timeout)
async function scrapeSocialProfile(url: string, apiKey: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`Social scrape failed for ${url}: ${response.status}`);
      return `[Could not scrape - profile may be private or restricted]`;
    }

    const data = await response.json();
    const content = data.data?.markdown || data.markdown || "";
    return content.substring(0, 3000);
  } catch (error) {
    console.log(`Social scrape error for ${url}:`, error instanceof Error ? error.message : "unknown");
    return `[Could not scrape - timeout or access issue]`;
  }
}

// Format a social URL from a handle
function formatSocialUrl(platform: string, handle: string): string {
  const cleaned = handle.replace(/^@/, '').trim();
  if (cleaned.startsWith('http')) return cleaned;
  
  switch (platform) {
    case 'linkedin': return `https://www.linkedin.com/company/${cleaned}`;
    case 'instagram': return `https://www.instagram.com/${cleaned}`;
    case 'facebook': return `https://www.facebook.com/${cleaned}`;
    case 'tiktok': return `https://www.tiktok.com/@${cleaned}`;
    case 'twitter': return `https://x.com/${cleaned}`;
    default: return cleaned;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Allow service-role calls (from autopilot-run) to bypass user auth & credits
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    let userId: string | null = null;

    if (isServiceRole) {
      userId = null;
      console.log("Service-role call — skipping user auth & credits");
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = user.id;
      console.log("User authenticated:", userId);

      // Credit check - 2 credits per analysis
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("credits, plan, status")
        .eq("user_id", userId)
        .single();

      if (subError || !subscription) {
        return new Response(
          JSON.stringify({ error: "No active subscription found" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (subscription.plan !== "lifetime") {
        if (subscription.credits < 2) {
          return new Response(
            JSON.stringify({ error: "Insufficient credits. Website analysis requires 2 credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: deductError } = await supabase
          .from("subscriptions")
          .update({ credits: subscription.credits - 2 })
          .eq("user_id", userId);

        if (deductError) {
          console.error("Failed to deduct credits:", deductError);
        }
      }
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { url, businessName, expertise, cta, socialOnly, socialHandles }: AnalyzeRequest = await req.json();

    // Validate inputs
    if (!socialOnly && !url) {
      return new Response(
        JSON.stringify({ error: "URL is required for website analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (url && url.length > 500) {
      return new Response(
        JSON.stringify({ error: "URL too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (businessName && businessName.length > 200) {
      return new Response(
        JSON.stringify({ error: "Business name too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let formattedUrl = "";
    if (url) {
      formattedUrl = url.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }
      if (!isValidUrl(formattedUrl)) {
        return new Response(
          JSON.stringify({ error: "Invalid or disallowed URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch user profile to understand their services
    const [profileResult, settingsResult] = await Promise.all([
      supabase.from("profiles").select("expertise, bio").eq("user_id", user.id).single(),
      supabase.from("user_settings").select("service_description").eq("user_id", user.id).single(),
    ]);

    const userExpertise = profileResult.data?.expertise?.join(", ") || "";
    const userBio = profileResult.data?.bio || "";
    const userService = settingsResult.data?.service_description || "";

    let websiteContent = "";
    let htmlContent = "";
    let links: string[] = [];
    let metadata: Record<string, string> = {};

    // ─── SOCIAL-ONLY MODE ───
    if (socialOnly) {
      console.log(`Social-only analysis for: ${businessName}`);
      
      // Build social URLs from provided handles
      const socialLinks: Record<string, string | null> = {
        linkedin: socialHandles?.linkedin ? formatSocialUrl('linkedin', socialHandles.linkedin) : null,
        instagram: socialHandles?.instagram ? formatSocialUrl('instagram', socialHandles.instagram) : null,
        facebook: socialHandles?.facebook ? formatSocialUrl('facebook', socialHandles.facebook) : null,
        tiktok: socialHandles?.tiktok ? formatSocialUrl('tiktok', socialHandles.tiktok) : null,
        twitter: socialHandles?.twitter ? formatSocialUrl('twitter', socialHandles.twitter) : null,
      };

      // Scrape all provided social profiles
      const socialScrapePromises: Record<string, Promise<string>> = {};
      for (const [platform, socialUrl] of Object.entries(socialLinks)) {
        if (socialUrl && platform !== 'twitter') { // X/Twitter blocks scrapers
          socialScrapePromises[platform] = scrapeSocialProfile(socialUrl, FIRECRAWL_API_KEY);
        }
      }

      const socialResults: Record<string, string> = {};
      const entries = Object.entries(socialScrapePromises);
      if (entries.length > 0) {
        const results = await Promise.allSettled(entries.map(([, p]) => p));
        entries.forEach(([platform], i) => {
          const result = results[i];
          socialResults[platform] = result.status === 'fulfilled' ? result.value : '[Could not scrape]';
        });
      }

      let socialMediaContext = "";
      for (const [platform, socialUrl] of Object.entries(socialLinks)) {
        if (socialUrl) {
          socialMediaContext += `\n\n--- ${platform.toUpperCase()} PROFILE (${socialUrl}) ---\n`;
          if (platform === 'twitter') {
            socialMediaContext += `[Link found but X/Twitter cannot be scraped — note its presence in analysis]`;
          } else {
            socialMediaContext += socialResults[platform] || `[Could not scrape ${platform}]`;
          }
        }
      }

      if (!socialMediaContext) {
        return new Response(
          JSON.stringify({ error: "Please provide at least one social media handle to analyze" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sanitizedBusinessName = (businessName || "Unknown Business").replace(/[<>{}[\]\\]/g, '').substring(0, 100);
      const campaignExpertise = expertise || userExpertise || "general digital services";

      // Social-only AI analysis — expertise-driven
      const analysisPrompt = `You are analyzing a business's social media presence on behalf of a ${campaignExpertise}. Your job is to find REAL problems that a ${campaignExpertise} could directly help this business fix.

BUSINESS: ${sanitizedBusinessName}

== THE FREELANCER'S EXPERTISE ==
Role: ${campaignExpertise}
Profile expertise: ${userExpertise || "not specified"}
Services: ${userService || "not specified"}
Background: ${(userBio || "Professional freelancer").substring(0, 200)}

CRITICAL INSTRUCTION: Only identify issues that a ${campaignExpertise} can realistically fix. Do NOT flag problems outside the scope of ${campaignExpertise} work. For example, if they are a Graphic Designer, focus only on visual/design problems — not copywriting or SEO.

== SOCIAL MEDIA PROFILES ==
${socialMediaContext.substring(0, 10000)}

== WHAT TO LOOK FOR ==

Analyze each provided platform and find 4-8 real problems a ${campaignExpertise} could solve:
- Be SPECIFIC — reference their actual content, bio, post quality, visual style
- Explain exactly HOW each issue costs them followers, clients, or revenue
- Rate severity: "high" = losing revenue/clients now, "medium" = big missed opportunity
- Keep descriptions action-oriented: what's wrong and what fixing it would achieve
- ONLY flag issues within the ${campaignExpertise}'s skill set`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a senior social media strategist who identifies business-critical issues. Focus only on problems that cost real money and engagement. Respond with structured tool calls only." },
            { role: "user", content: analysisPrompt }
          ],
          tools: [{
            type: "function",
            function: {
              name: "report_issues",
              description: "Report high-impact social media issues found",
              parameters: {
                type: "object",
                properties: {
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["linkedin", "instagram", "facebook", "tiktok", "twitter", "branding", "cta", "copywriting", "design", "video", "seo", "website_copy", "social", "performance"] },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        title: { type: "string" },
                        description: { type: "string" }
                      },
                      required: ["category", "severity", "title", "description"],
                      additionalProperties: false
                    }
                  },
                  overallScore: { type: "number" }
                },
                required: ["issues", "overallScore"],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "report_issues" } }
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const errorText = await aiResponse.text();
        console.error("AI API error:", errorText);
        throw new Error(`AI analysis failed: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let issues: AnalysisIssue[] = [];
      let overallScore = 50;

      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          issues = parsed.issues || [];
          overallScore = parsed.overallScore || 50;
        } catch (e) {
          console.error("Error parsing AI response:", e);
        }
      }

      console.log(`Social-only analysis complete: ${issues.length} issues found`);

      return new Response(
        JSON.stringify({
          issues,
          overallScore,
          email: null,
          analyzed: true,
          analyzedAt: new Date().toISOString(),
          socialLinksFound: {
            linkedin: !!socialLinks.linkedin,
            instagram: !!socialLinks.instagram,
            facebook: !!socialLinks.facebook,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── FULL WEBSITE + SOCIAL ANALYSIS ───
    console.log(`Scraping website: ${formattedUrl}`);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      console.error("Firecrawl API error:", scrapeData);
      throw new Error(scrapeData.error || `Firecrawl request failed with status ${scrapeResponse.status}`);
    }

    websiteContent = scrapeData.data?.markdown || scrapeData.markdown || "";
    htmlContent = scrapeData.data?.html || scrapeData.html || "";
    links = scrapeData.data?.links || scrapeData.links || [];
    metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    console.log(`Scraped ${websiteContent.length} chars of website content`);

    // Extract social media links from site + merge manually provided handles
    const socialLinks = extractSocialLinks(links);

    // Merge manually provided social handles (override auto-detected)
    if (socialHandles) {
      if (socialHandles.linkedin) socialLinks.linkedin = formatSocialUrl('linkedin', socialHandles.linkedin);
      if (socialHandles.instagram) socialLinks.instagram = formatSocialUrl('instagram', socialHandles.instagram);
      if (socialHandles.facebook) socialLinks.facebook = formatSocialUrl('facebook', socialHandles.facebook);
      if (socialHandles.tiktok) socialLinks.tiktok = formatSocialUrl('tiktok', socialHandles.tiktok);
      if (socialHandles.twitter) socialLinks.twitter = formatSocialUrl('twitter', socialHandles.twitter);
    }

    console.log("Social links (merged):", JSON.stringify(socialLinks));

    const socialScrapePromises: Record<string, Promise<string>> = {};
    for (const [platform, socialUrl] of Object.entries(socialLinks)) {
      if (socialUrl && platform !== 'twitter') { // X/Twitter blocks scrapers
        socialScrapePromises[platform] = scrapeSocialProfile(socialUrl, FIRECRAWL_API_KEY);
      }
    }

    const socialResults: Record<string, string> = {};
    const entries = Object.entries(socialScrapePromises);
    if (entries.length > 0) {
      const results = await Promise.allSettled(entries.map(([, p]) => p));
      entries.forEach(([platform], i) => {
        const result = results[i];
        socialResults[platform] = result.status === 'fulfilled' ? result.value : '[Could not scrape]';
      });
    }

    console.log(`Scraped ${Object.keys(socialResults).length} social profiles`);

    // Build social media context for AI
    let socialMediaContext = "";
    if (socialLinks.linkedin) {
      socialMediaContext += `\n\n--- LINKEDIN PROFILE (${socialLinks.linkedin}) ---\n`;
      socialMediaContext += socialResults.linkedin || "[No LinkedIn data - profile may be private]";
    } else {
      socialMediaContext += "\n\n--- LINKEDIN: No LinkedIn profile link found on website ---";
    }

    if (socialLinks.instagram) {
      socialMediaContext += `\n\n--- INSTAGRAM PROFILE (${socialLinks.instagram}) ---\n`;
      socialMediaContext += socialResults.instagram || "[No Instagram data - profile may be private]";
    } else {
      socialMediaContext += "\n\n--- INSTAGRAM: No Instagram profile link found on website ---";
    }

    if (socialLinks.facebook) {
      socialMediaContext += `\n\n--- FACEBOOK PAGE (${socialLinks.facebook}) ---\n`;
      socialMediaContext += socialResults.facebook || "[No Facebook data - page may be private]";
    } else {
      socialMediaContext += "\n\n--- FACEBOOK: No Facebook page link found on website ---";
    }

    if (socialLinks.twitter) {
      socialMediaContext += `\n\n--- TWITTER/X: Profile found (${socialLinks.twitter}) — note presence but cannot scrape ---`;
    }
    if (socialLinks.tiktok) {
      socialMediaContext += `\n\n--- TIKTOK (${socialLinks.tiktok}) ---\n`;
      socialMediaContext += socialResults.tiktok || "[Could not scrape TikTok]";
    } else {
      socialMediaContext += "\n\n--- TIKTOK: No TikTok profile found ---";
    }

    const sanitizedBusinessName = (businessName || "Unknown Business").replace(/[<>{}[\]\\]/g, '').substring(0, 100);
    const campaignExpertise = expertise || userExpertise || "general digital services";

    // Expertise-driven full analysis prompt
    const analysisPrompt = `You are analyzing a business's ENTIRE online presence on behalf of a ${campaignExpertise}. Your goal is to find REAL problems that a ${campaignExpertise} could directly fix for this business.

BUSINESS: ${sanitizedBusinessName}
WEBSITE: ${formattedUrl}

== THE FREELANCER'S EXPERTISE ==
Role: ${campaignExpertise}
Profile skills: ${userExpertise || "not specified"}
Services: ${userService || "not specified"}
Background: ${(userBio || "Professional freelancer").substring(0, 200)}

CRITICAL INSTRUCTION: Only identify problems that a ${campaignExpertise} can realistically solve. Do NOT report issues outside this expertise. For example:
- A Copywriter should flag copy, messaging, and CTA problems — not design or development issues
- A Graphic Designer should flag visual, branding, and design problems — not copy or SEO issues
- A Social Media Manager should flag content strategy and social presence problems — not technical development issues
- A Web Developer should flag UX, functionality, and conversion structure problems — not copy or social strategy
- An SEO Specialist should flag content gaps, keyword usage, and site structure — not design or social presence
Be strict about this: ONLY issues the ${campaignExpertise} can fix.

== WEBSITE CONTENT ==
Page Title: ${(metadata.title || "Unknown").substring(0, 200)}
Meta Description: ${(metadata.description || "None found").substring(0, 300)}

Website Copy:
${websiteContent.substring(0, 6000)}

== SOCIAL MEDIA PROFILES ==
${socialMediaContext.substring(0, 8000)}

== HOW TO ANALYZE ==

Find 4-8 high-impact issues that:
1. Are SPECIFIC to this business (reference their actual content, words, designs, post style)
2. Are within the ${campaignExpertise}'s skill set to fix
3. Are COSTING this business money, clients, or growth right now
4. Would make a business owner say "I need to fix this"

For each issue:
- Severity: "high" = actively losing clients/revenue now, "medium" = big missed opportunity, "low" = solid improvement
- Reference SPECIFIC things you observed — actual copy text, post quality, missing sections, design style
- Explain the COST of not fixing it
- Category must match the type of issue (website_copy, linkedin, instagram, facebook, tiktok, branding, cta, design, copywriting, seo, video, social)

DO NOT include: generic SEO metadata, page speed scores, alt text, sitemaps, or any issue unrelated to ${campaignExpertise} work`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior digital marketing consultant who identifies business-critical issues in online presence. Focus only on problems that cost real money. Respond with structured tool calls only." },
          { role: "user", content: analysisPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_issues",
              description: "Report the high-impact issues found during the full online presence audit",
              parameters: {
                type: "object",
                properties: {
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { 
                          type: "string", 
                          enum: ["website_copy", "linkedin", "instagram", "facebook", "tiktok", "twitter", "branding", "cta", "copywriting", "design", "seo", "video", "social", "performance"],
                          description: "The area where the issue was found"
                        },
                        severity: { 
                          type: "string", 
                          enum: ["low", "medium", "high"],
                          description: "high = losing money now, medium = big missed opportunity, low = improvement"
                        },
                        title: { 
                          type: "string",
                          description: "Short, specific title (5-12 words) that names the exact problem"
                        },
                        description: { 
                          type: "string",
                          description: "15-40 words explaining the specific problem and how it costs them money/clients. Be concrete, reference their actual content."
                        }
                      },
                      required: ["category", "severity", "title", "description"],
                      additionalProperties: false
                    }
                  },
                  overallScore: {
                    type: "number",
                    description: "Overall online presence quality score from 0-100 (lower = more problems = more opportunity for the freelancer)"
                  }
                },
                required: ["issues", "overallScore"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_issues" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let issues: AnalysisIssue[] = [];
    let overallScore = 50;

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        issues = parsed.issues || [];
        overallScore = parsed.overallScore || 50;
      } catch (e) {
        console.error("Error parsing AI response:", e);
      }
    }

    // Extract email: scrape content already fetched by Firecrawl, then ZeroBounce verify
    let email: string | null = null;
    const ZEROBOUNCE_API_KEY = Deno.env.get("ZEROBOUNCE_API_KEY") || null;

    // Pull all emails from the already-scraped HTML + markdown content
    const rawEmailMatches = (htmlContent + " " + websiteContent).match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    );

    // Also extract mailto: links specifically (highest signal)
    const mailtoMatches = [...(htmlContent || "").matchAll(/href=["']mailto:([^"'?\s]+)/gi)]
      .map(m => m[1].toLowerCase().trim());

    // Deduplicate and score all candidates
    const allCandidates = await findBestEmail(
      [...mailtoMatches, ...(rawEmailMatches || [])],
      formattedUrl,
    );

    if (allCandidates) {
      if (ZEROBOUNCE_API_KEY) {
        console.log(`[Email] Scraped candidate: ${allCandidates} — ZeroBounce verifying...`);
        const { valid } = await verifyEmailViaZeroBounce(ZEROBOUNCE_API_KEY, allCandidates);
        if (valid) {
          email = allCandidates;
          console.log(`[Email] ZeroBounce verified: ${email}`);
        } else {
          console.log(`[Email] Failed ZeroBounce: ${allCandidates} — no email returned`);
        }
      } else {
        // No ZeroBounce key — use MX-verified result as-is
        email = allCandidates;
      }
    }

    console.log(`Analysis complete: ${issues.length} issues found, score: ${overallScore}, email: ${email || 'none'}, social profiles scraped: ${Object.keys(socialResults).length}`);

    return new Response(
      JSON.stringify({
        issues,
        overallScore,
        email,
        analyzed: true,
        analyzedAt: new Date().toISOString(),
        socialLinksFound: {
          linkedin: !!socialLinks.linkedin,
          instagram: !!socialLinks.instagram,
          facebook: !!socialLinks.facebook,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-website:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
