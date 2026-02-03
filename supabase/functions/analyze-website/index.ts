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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
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

    // Extract email from website if possible
    const emailMatches = htmlContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    const email = emailMatches?.[0] || null;

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
