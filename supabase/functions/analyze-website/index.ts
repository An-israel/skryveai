import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { url, businessName }: AnalyzeRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
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

    // Step 2: Use AI to analyze the website
    const analysisPrompt = `You are a website auditor analyzing a business website. Analyze the following website content and identify specific issues that a freelance web developer or marketer could help fix.

Business Name: ${businessName}
Website URL: ${formattedUrl}
Page Title: ${metadata.title || "Unknown"}
Meta Description: ${metadata.description || "None found"}

Website Content:
${websiteContent.substring(0, 8000)}

HTML Snippet (for technical analysis):
${htmlContent.substring(0, 3000)}

Links found: ${links.length}
Social media links: ${links.filter((l: string) => l.includes('facebook') || l.includes('twitter') || l.includes('instagram') || l.includes('linkedin')).join(', ') || 'None detected'}

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
