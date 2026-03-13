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
  "booksrus.com", "example.com", "test.com", "sample.com",
];

const GENERIC_PREFIXES = [
  "noreply", "no-reply", "donotreply", "support", "privacy", "feedback",
  "terms", "legal", "careerguide", "mailer-daemon", "postmaster",
  "webmaster", "notifications", "admin@indeed", "info@indeed",
];

function isValidCompanyEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  // Reject file extensions mistakenly captured
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(lower)) return false;
  // Reject platform domains
  for (const d of PLATFORM_DOMAINS) { if (lower.includes(`@${d}`)) return false; }
  // Reject generic prefixes
  for (const p of GENERIC_PREFIXES) { if (lower.startsWith(p)) return false; }
  // Must have valid TLD
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(lower)) return false;
  return true;
}

// Verify domain has MX records using Google DNS-over-HTTPS
async function verifyDomainMX(domain: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.Status === 0 && data.Answer && data.Answer.length > 0;
  } catch {
    return false;
  }
}

// Extract the actual company name from job title/description
function extractRealCompany(jobTitle: string, company: string, jobDescription: string): string {
  // If company is a known platform name or generic, try to extract from job title
  const platformNames = ["indeed", "linkedin", "glassdoor", "wellfound", "remote.co", 
    "company", "weworkremotely", "dice", "monster", "ziprecruiter"];
  
  const companyLower = company.toLowerCase().trim();
  const isGeneric = platformNames.some(p => companyLower === p || companyLower.includes(p));
  
  if (!isGeneric && company !== "Company") return company;

  // Try to extract from job title pattern: "Role at Company" or "Role - Company"
  const atMatch = jobTitle.match(/\bat\s+([A-Z][A-Za-z\s&.,'-]+?)(?:\s+in\s|\s*$)/);
  if (atMatch) return atMatch[1].trim();

  // Try "Job Title job at CompanyName"
  const jobAtMatch = jobTitle.match(/job\s+at\s+([A-Z][A-Za-z\s&.,'-]+?)(?:\s+in\s|\s*$)/i);
  if (jobAtMatch) return jobAtMatch[1].trim();

  // Try extracting from description - look for "Company:" or "About [Company]"
  const aboutMatch = jobDescription.match(/(?:About|Company[:\s])\s*\n?\s*(?:\*\*)?([A-Z][A-Za-z\s&.,'-]+?)(?:\*\*)?(?:\n|\.|\s-\s)/);
  if (aboutMatch) return aboutMatch[1].trim();

  return company;
}

// Build candidate domain from company name - tries multiple variations
function buildCandidateDomains(company: string): string[] {
  const cleaned = company
    .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Co\.?|Group|Holdings|Limited|Pvt\.?|Pty\.?|GmbH|AG|SA|PLC|Company)\s*$/gi, "")
    .trim();
  
  const base = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "");
  const hyphenated = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
  
  const domains = new Set<string>();
  domains.add(`${base}.com`);
  if (base !== hyphenated) domains.add(`${hyphenated}.com`);
  domains.add(`${base}.io`);
  domains.add(`${base}.co`);
  
  return [...domains];
}

// Smart email discovery: MX-verified domain + common HR patterns
async function discoverCompanyEmail(company: string, jobUrl: string | null): Promise<{ email: string | null; verified: boolean }> {
  if (!company || company === "Company") return { email: null, verified: false };

  const candidateDomains = buildCandidateDomains(company);
  console.log(`[EmailDiscovery] Checking MX for domains: ${candidateDomains.join(", ")}`);

  // Check MX records for each candidate domain in parallel
  const mxResults = await Promise.allSettled(
    candidateDomains.map(async (domain) => {
      const hasMX = await verifyDomainMX(domain);
      return { domain, hasMX };
    })
  );

  let verifiedDomain: string | null = null;
  for (const r of mxResults) {
    if (r.status === "fulfilled" && r.value.hasMX) {
      verifiedDomain = r.value.domain;
      console.log(`[EmailDiscovery] MX verified: ${verifiedDomain}`);
      break;
    }
  }

  if (!verifiedDomain) {
    console.log(`[EmailDiscovery] No MX-verified domain found for "${company}"`);
    // Last resort: use first candidate with .com
    const fallbackDomain = candidateDomains[0];
    return { email: `careers@${fallbackDomain}`, verified: false };
  }

  // Generate prioritized HR email addresses for the verified domain
  const hrPatterns = [
    `careers@${verifiedDomain}`,
    `hr@${verifiedDomain}`,
    `hiring@${verifiedDomain}`,
    `jobs@${verifiedDomain}`,
    `recruiting@${verifiedDomain}`,
    `talent@${verifiedDomain}`,
    `people@${verifiedDomain}`,
    `info@${verifiedDomain}`,
  ];

  // Return the top HR pattern since MX is verified (domain accepts mail)
  return { email: hrPatterns[0], verified: true };
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract real company name (not platform name)
    const realCompany = extractRealCompany(jobTitle, company, jobDescription || "");
    console.log(`[EmailDiscovery] Real company: "${realCompany}" (original: "${company}")`);

    // Discover email via MX verification (skip if valid email already provided)
    let extractedEmail = existingEmail || null;
    let emailVerified = false;
    if (!extractedEmail || !isValidCompanyEmail(extractedEmail)) {
      const result = await discoverCompanyEmail(realCompany, jobUrl);
      extractedEmail = result.email;
      emailVerified = result.verified;
    }

    // Generate cover letter with AI
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
- Make each application unique and tailored to the specific role
- Do NOT invent or guess any email addresses - the email will be handled separately`;

    const userPrompt = `Generate a tailored job application for this position:

JOB TITLE: ${jobTitle}
COMPANY: ${realCompany}
JOB DESCRIPTION: ${jobDescription || "Not available - tailor based on the job title and company"}

APPLICANT'S PROFILE INFO:
Name: ${userProfile?.full_name || "Applicant"}
Bio: ${userProfile?.bio || "Not provided"}
Expertise: ${userProfile?.expertise?.join(", ") || "Not provided"}
Portfolio: ${userProfile?.portfolio_url || "Not provided"}

Return the response using the generate_application function.`;

    console.log(`Generating application for ${jobTitle} at ${realCompany}`);

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
          subject: `Application for ${jobTitle} at ${realCompany}`,
          coverLetter: aiData.choices?.[0]?.message?.content || "",
          keyMatchingSkills: [],
        };
      }
    }

    console.log(`Generated application for ${jobTitle} at ${realCompany}, email: ${extractedEmail || "none"} (verified: ${emailVerified})`);

    return new Response(
      JSON.stringify({
        subject: application.subject,
        body: application.coverLetter,
        keyMatchingSkills: application.keyMatchingSkills,
        extractedEmail,
        emailVerified,
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
