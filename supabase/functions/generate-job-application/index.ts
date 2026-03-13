import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobTitle, company, jobDescription, cvContent, userProfile, jobUrl } = await req.json();

    if (!jobTitle || !company) {
      return new Response(JSON.stringify({ error: "Job title and company are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also try to extract email from job posting using Firecrawl if URL provided
    let extractedEmail: string | null = null;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (jobUrl && FIRECRAWL_API_KEY) {
      try {
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: jobUrl,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeResp.json();
        const content = scrapeData?.data?.markdown || scrapeData?.markdown || "";
        
        // Extract emails from content
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = content.match(emailRegex) || [];
        
        // Filter out common non-personal emails
        const filteredEmails = emails.filter((e: string) => {
          const lower = e.toLowerCase();
          return !lower.includes("noreply") && 
                 !lower.includes("no-reply") && 
                 !lower.includes("example.com") &&
                 !lower.includes("support@") &&
                 !lower.includes("privacy@") &&
                 !lower.includes("donotreply") &&
                 !lower.endsWith(".png") &&
                 !lower.endsWith(".jpg");
        });

        if (filteredEmails.length > 0) {
          // Prefer hr@, hiring@, careers@, jobs@, recruit@ emails
          const priorityEmail = filteredEmails.find((e: string) => {
            const lower = e.toLowerCase();
            return lower.startsWith("hr@") || lower.startsWith("hiring@") || 
                   lower.startsWith("careers@") || lower.startsWith("jobs@") ||
                   lower.startsWith("recruit") || lower.startsWith("talent");
          });
          extractedEmail = priorityEmail || filteredEmails[0];
        }
      } catch (scrapeErr) {
        console.error("Failed to scrape job URL for email:", scrapeErr);
      }
    }

    // Generate tailored cover letter using Lovable AI
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

APPLICANT'S CV/PROFILE:
${cvContent || "Not provided"}

APPLICANT'S PROFILE INFO:
Name: ${userProfile?.full_name || "Applicant"}
Bio: ${userProfile?.bio || "Not provided"}
Expertise: ${userProfile?.expertise?.join(", ") || "Not provided"}
Portfolio: ${userProfile?.portfolio_url || "Not provided"}

Return the response using the generate_application function.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_application",
              description: "Generate a tailored job application with subject line and cover letter",
              parameters: {
                type: "object",
                properties: {
                  subject: {
                    type: "string",
                    description: "Email subject line for the application (compelling, under 80 chars)",
                  },
                  coverLetter: {
                    type: "string",
                    description: "The full cover letter body, professionally formatted",
                  },
                  keyMatchingSkills: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 key skills from the CV that match the job requirements",
                  },
                },
                required: ["subject", "coverLetter", "keyMatchingSkills"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_application" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to generate application");
    }

    const aiData = await aiResponse.json();
    
    // Extract tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let application = { subject: "", coverLetter: "", keyMatchingSkills: [] as string[] };
    
    if (toolCall?.function?.arguments) {
      try {
        application = JSON.parse(toolCall.function.arguments);
      } catch {
        // Fallback: try to extract from message content
        const content = aiData.choices?.[0]?.message?.content || "";
        application = {
          subject: `Application for ${jobTitle} at ${company}`,
          coverLetter: content,
          keyMatchingSkills: [],
        };
      }
    }

    console.log(`Generated application for ${jobTitle} at ${company}`);

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
