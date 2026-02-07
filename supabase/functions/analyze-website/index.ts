import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnalyzeRequest {
  url: string;
  businessName: string;
}

interface AnalysisIssue {
  category: 'seo' | 'copywriting' | 'design' | 'social' | 'cta' | 'performance';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

// Validate URL and prevent SSRF
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    
    // Block localhost and private IPs
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') || // AWS metadata
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
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

// Common non-email local parts (image naming patterns, CSS, code artifacts)
const INVALID_LOCAL_PATTERNS = [
  /^\d+x\d*$/i,          // "2x", "300x200" - image dimensions
  /^image/i,             // "image", "image1"
  /^img/i,               // "img", "img_hero"
  /^photo/i,             // "photo", "photo1"
  /^icon/i,              // "icon", "icon-set"
  /^logo/i,              // "logo", "logo-dark"
  /^banner/i,            // "banner", "banner-bg"
  /^bg/i,                // "bg", "bg-hero"
  /^thumb/i,             // "thumb", "thumbnail"
  /^screen/i,            // "screen", "screenshot"
  /^avatar/i,            // "avatar"
  /^placeholder/i,       // "placeholder"
  /^sprite/i,            // "sprite"
  /^asset/i,             // "asset"
  /^file/i,              // "file", "file1"
  /^\d+$/,               // pure numbers like "123"
  /^[a-f0-9]{8,}$/i,     // hex hashes like "a1b2c3d4e5f6"
  /^data$/i,             // "data"
  /^no-?reply$/i,        // "noreply", "no-reply"
  /^mailer-?daemon$/i,   // "mailer-daemon"
];

// Known valid email domains (weighted higher)
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
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return false;

  // Reject file extensions masquerading as TLDs
  if (INVALID_EMAIL_TLDS.has(tld)) return false;

  // Reject invalid local part patterns (image filenames, hashes, etc.)
  for (const pattern of INVALID_LOCAL_PATTERNS) {
    if (pattern.test(localPart)) return false;
  }

  // Reject if domain looks like a path
  if (domain.includes('/') || domain.includes('\\')) return false;
  if (domainParts[0].length < 2) return false;

  return true;
}

function scoreEmail(email: string, websiteUrl: string): number {
  const lower = email.toLowerCase();
  const [localPart, domain] = lower.split('@');
  let score = 0;

  // Prefer emails matching the website domain
  try {
    const siteDomain = new URL(websiteUrl).hostname.replace(/^www\./, '');
    if (domain === siteDomain) score += 50;
    if (domain.endsWith('.' + siteDomain) || siteDomain.endsWith('.' + domain)) score += 30;
  } catch { /* ignore */ }

  // Prefer common business-facing local parts
  const businessPrefixes = ['info', 'contact', 'hello', 'support', 'sales', 'admin', 'office', 'team', 'help', 'enquir', 'booking'];
  for (const prefix of businessPrefixes) {
    if (localPart.startsWith(prefix)) { score += 20; break; }
  }

  if (TRUSTED_EMAIL_DOMAINS.has(domain)) score += 10;
  if (localPart.length > 30) score -= 10;

  return score;
}

function findBestEmail(candidates: string[], websiteUrl: string): string | null {
  const unique = [...new Set(candidates.map(e => e.toLowerCase().trim()))];
  const valid = unique.filter(isValidEmail);
  if (valid.length === 0) return null;

  valid.sort((a, b) => scoreEmail(b, websiteUrl) - scoreEmail(a, websiteUrl));
  console.log(`Email candidates: ${valid.length} valid out of ${candidates.length} raw. Best: ${valid[0]}`);
  return valid[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      throw new Error("Supabase environment variables not configured");
    }

    // Use service role to validate the user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate the user's JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("JWT validation failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY not configured");
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { url, businessName }: AnalyzeRequest = await req.json();

    // Input validation
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL length
    if (url.length > 500) {
      return new Response(
        JSON.stringify({ error: "URL too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate business name length
    if (businessName && businessName.length > 200) {
      return new Response(
        JSON.stringify({ error: "Business name too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Validate URL to prevent SSRF
    if (!isValidUrl(formattedUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid or disallowed URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraping website: ${formattedUrl}`);

    // Step 1: Scrape the website with Firecrawl
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

    const websiteContent = scrapeData.data?.markdown || scrapeData.markdown || "";
    const htmlContent = scrapeData.data?.html || scrapeData.html || "";
    const links = scrapeData.data?.links || scrapeData.links || [];
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    console.log(`Scraped ${websiteContent.length} characters of content`);

    // Sanitize business name for AI prompt (remove special characters that could be injection vectors)
    const sanitizedBusinessName = (businessName || "Unknown Business").replace(/[<>{}[\]\\]/g, '').substring(0, 100);

    // Step 2: Use AI to analyze the website
    const analysisPrompt = `You are a website auditor analyzing a business website. Analyze the following website content and identify specific issues that a freelance web developer or marketer could help fix.

Business Name: ${sanitizedBusinessName}
Website URL: ${formattedUrl}
Page Title: ${(metadata.title || "Unknown").substring(0, 200)}
Meta Description: ${(metadata.description || "None found").substring(0, 300)}

Website Content:
${websiteContent.substring(0, 8000)}

HTML Snippet (for technical analysis):
${htmlContent.substring(0, 3000)}

Links found: ${links.length}
Social media links: ${links.filter((l: string) => l.includes('facebook') || l.includes('twitter') || l.includes('instagram') || l.includes('linkedin')).slice(0, 10).join(', ') || 'None detected'}

Analyze this website and identify 3-6 specific issues across these categories:
- SEO: Missing meta tags, poor headings structure, no alt text, missing sitemap
- Copywriting: Unclear value proposition, weak headlines, grammar issues, too much jargon
- Design: Outdated appearance, poor mobile hints, cluttered layout, inconsistent branding
- Social: Missing social links, no testimonials, no trust signals
- CTA: Weak or missing calls-to-action, unclear next steps for visitors
- Performance: Heavy images mentioned, complex structure indicators

For each issue, provide:
1. Category (seo, copywriting, design, social, cta, or performance)
2. Severity (low, medium, or high)
3. A short title (5-10 words)
4. A brief description (15-30 words) explaining the specific problem found

Be specific and reference actual content from the website when possible.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional website auditor. Respond only with valid JSON." },
          { role: "user", content: analysisPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_issues",
              description: "Report the website issues found during analysis",
              parameters: {
                type: "object",
                properties: {
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["seo", "copywriting", "design", "social", "cta", "performance"] },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        title: { type: "string" },
                        description: { type: "string" }
                      },
                      required: ["category", "severity", "title", "description"]
                    }
                  },
                  overallScore: {
                    type: "number",
                    description: "Overall website quality score from 0-100"
                  }
                },
                required: ["issues", "overallScore"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_issues" } }
      }),
    });

    if (!aiResponse.ok) {
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

    // Extract and validate email from website
    const rawEmailMatches = (htmlContent + " " + websiteContent).match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    );
    
    const email = findBestEmail(rawEmailMatches || [], formattedUrl);

    console.log(`Analysis complete: ${issues.length} issues found, score: ${overallScore}`);

    return new Response(
      JSON.stringify({
        issues,
        overallScore,
        email,
        analyzed: true,
        analyzedAt: new Date().toISOString()
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
