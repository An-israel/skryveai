import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_DOMAINS = [
  "indeed.com", "linkedin.com", "glassdoor.com", "wellfound.com", "dice.com",
  "ziprecruiter.com", "weworkremotely.com", "remote.co", "monster.com",
  "careerbuilder.com", "simplyhired.com", "lever.co", "greenhouse.io",
  "workday.com", "icims.com", "taleo.net", "smartrecruiters.com",
];

const GENERIC_PREFIXES = [
  "noreply", "no-reply", "donotreply", "support", "privacy", "feedback",
  "terms", "legal", "info@indeed", "careerguide", "mailer-daemon", "postmaster",
  "webmaster", "notifications",
];

function isValidCompanyEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return false;
  for (const d of PLATFORM_DOMAINS) { if (lower.includes(`@${d}`)) return false; }
  for (const p of GENERIC_PREFIXES) { if (lower.startsWith(p) || lower.includes(p)) return false; }
  return true;
}

function extractBestEmail(content: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = (content.match(emailRegex) || []).filter(isValidCompanyEmail);
  if (emails.length === 0) return null;
  const priority = emails.find((e) => {
    const l = e.toLowerCase();
    return l.startsWith("hr@") || l.startsWith("hiring@") || l.startsWith("careers@") ||
      l.startsWith("jobs@") || l.startsWith("recruit") || l.startsWith("talent") ||
      l.startsWith("people@") || l.startsWith("humanresources@");
  });
  return priority || emails[0];
}

function guessCompanyDomain(company: string): string {
  return company
    .toLowerCase()
    .replace(/\s*(inc|llc|ltd|corp|corporation|co|group|holdings|limited|pvt|pty|gmbh|ag|sa|plc)\s*\.?\s*$/gi, "")
    .replace(/[^a-z0-9]/g, "")
    + ".com";
}

async function discoverCompanyEmail(company: string, jobUrl: string | null, firecrawlKey: string): Promise<string | null> {
  // Tier 1: Scrape the job posting URL itself
  if (jobUrl) {
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl, formats: ["markdown"], onlyMainContent: true, timeout: 10000 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const email = extractBestEmail(data?.data?.markdown || data?.markdown || "");
        if (email) { console.log(`[Tier1] Found ${email} from job URL`); return email; }
      }
    } catch { /* continue */ }
  }

  if (!company || company === "Company") return null;

  // Tier 2: Scrape company's actual website (contact, about, careers pages)
  const domain = guessCompanyDomain(company);
  console.log(`[Tier2] Scraping ${domain} for "${company}"`);

  const pagesToTry = [
    `https://${domain}/contact`,
    `https://${domain}/contact-us`,
    `https://${domain}/about`,
    `https://${domain}/careers`,
    `https://${domain}`,
  ];

  // Try first 3 pages in parallel for speed
  const firstBatch = pagesToTry.slice(0, 3);
  const results = await Promise.allSettled(
    firstBatch.map(async (pageUrl) => {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: pageUrl, formats: ["markdown"], onlyMainContent: false, timeout: 10000 }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return extractBestEmail(data?.data?.markdown || data?.markdown || "");
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      console.log(`[Tier2] Found ${r.value} from company website`);
      return r.value;
    }
  }

  // Try remaining pages
  for (const pageUrl of pagesToTry.slice(3)) {
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: pageUrl, formats: ["markdown"], onlyMainContent: false, timeout: 10000 }),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const email = extractBestEmail(data?.data?.markdown || data?.markdown || "");
      if (email) { console.log(`[Tier2] Found ${email} from ${pageUrl}`); return email; }
    } catch { /* continue */ }
  }

  // Tier 3: Web search for company HR email
  try {
    console.log(`[Tier3] Searching web for "${company}" HR email`);
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `"${company}" HR email OR careers email OR hiring email`,
        limit: 3,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    const searchData = await searchResp.json();
    if (searchData.success !== false && searchData.data) {
      for (const result of searchData.data) {
        const email = extractBestEmail(result.markdown || result.description || "");
        if (email) { console.log(`[Tier3] Found ${email} from web search`); return email; }
      }
    }
  } catch { /* continue */ }

  // Tier 4: Fallback to common HR email pattern
  console.log(`[Tier4] Generating hr@${domain} as fallback`);
  return `hr@${domain}`;
}

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

    const { jobTitle, company, jobDescription, cvContent, userProfile, jobUrl, email: existingEmail } = await req.json();

    if (!jobTitle || !company) {
      return new Response(JSON.stringify({ error: "Job title and company are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Discover email (skip if already provided and valid)
    let extractedEmail = existingEmail || null;
    if ((!extractedEmail || !isValidCompanyEmail(extractedEmail)) && FIRECRAWL_API_KEY) {
      extractedEmail = await discoverCompanyEmail(company, jobUrl, FIRECRAWL_API_KEY);
    }

    // Generate cover letter with AI (in parallel with email discovery if needed)
    const systemPrompt = `You are an expert career consultant and professional cover letter writer. Your job is to:
1. Analyze the job posting details carefully
2. Review the applicant's CV/profile
3. Write a compelling, personalized cover letter that:
   - Highlights relevant experience matching the job requirements
   - Shows genuine interest in the specific company and role
   - Includes quantifiable achievements from their CV
   - Is concise (3-4 paragraphs max)
   - Sounds natural and professional, NOT generic
   - Ends with a clear call to action
4. Generate a tailored email subject line

IMPORTANT: 
- Do NOT use filler language or generic phrases like "I am writing to express my interest"
- Start with something compelling that grabs attention
- Reference specific job requirements and match them to the candidate's experience
- Make each application unique and tailored to the specific role`;

    const userPrompt = `Generate a tailored job application for this position:

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription || "Not available - tailor based on the job title and company"}

APPLICANT'S PROFILE INFO:
Name: ${userProfile?.full_name || "Applicant"}
Bio: ${userProfile?.bio || "Not provided"}
Expertise: ${userProfile?.expertise?.join(", ") || "Not provided"}
Portfolio: ${userProfile?.portfolio_url || "Not provided"}

Return the response using the generate_application function.`;

    console.log(`Generating application for ${jobTitle} at ${company}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_application",
            description: "Generate a tailored job application with subject line and cover letter",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Email subject line (compelling, under 80 chars)" },
                coverLetter: { type: "string", description: "The full cover letter body" },
                keyMatchingSkills: { type: "array", items: { type: "string" }, description: "3-5 matching skills" },
              },
              required: ["subject", "coverLetter", "keyMatchingSkills"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_application" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to generate application");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let application = { subject: "", coverLetter: "", keyMatchingSkills: [] as string[] };

    if (toolCall?.function?.arguments) {
      try {
        application = JSON.parse(toolCall.function.arguments);
      } catch {
        application = {
          subject: `Application for ${jobTitle} at ${company}`,
          coverLetter: aiData.choices?.[0]?.message?.content || "",
          keyMatchingSkills: [],
        };
      }
    }

    console.log(`Generated application for ${jobTitle} at ${company}, email: ${extractedEmail || "none"}`);

    return new Response(
      JSON.stringify({
        subject: application.subject,
        body: application.coverLetter,
        keyMatchingSkills: application.keyMatchingSkills,
        extractedEmail,
        edited: false,
        approved: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-job-application:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate application" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
