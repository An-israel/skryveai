import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const mode = body.mode ?? "ats"; // "ats" | "linkedin"

    // ── LINKEDIN ANALYSIS MODE ────────────────────────────────────────────────
    if (mode === "linkedin") {
      const { profileContent, targetRole } = body;

      if (!profileContent || profileContent.trim().length < 50) {
        return new Response(
          JSON.stringify({ error: "Please provide your LinkedIn profile content (at least 50 characters)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`LinkedIn analysis for user ${user.id}, content: ${profileContent.length} chars`);

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a LinkedIn profile optimization expert. You know exactly how LinkedIn's algorithm ranks profiles, what recruiters and clients look for, and how professionals get discovered and hired through LinkedIn.

Analyze the profile content provided and give honest, specific, actionable feedback. Reference actual content from the profile — never give generic advice.

Scoring scale: 90-100 Outstanding | 70-89 Good minor gaps | 50-69 Average needs work | 30-49 Weak significant gaps | 0-29 Missing or very poor${targetRole ? `\n\nTarget role: "${targetRole}"` : ""}

IMPORTANT PARSING RULES for LinkedIn PDF exports:
- The "About" section may appear labeled as "About", "Summary", "Professional Summary", "Profile", or as introductory text at the top of the document with no heading at all. If ANY introductory paragraph or career overview text is present, treat it as the About section — do NOT add "About section" or "Summary" to missingElements.
- Section headers in LinkedIn PDFs may be missing or inconsistently formatted. Judge sections based on whether that type of content EXISTS in the document, not whether the exact header label appears.
- Only add an element to missingElements if there is genuinely zero content of that type anywhere in the profile text.`,
            },
            {
              role: "user",
              content: `Analyze this LinkedIn profile:\n\n${profileContent}`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "linkedin_analysis",
              description: "Return detailed LinkedIn profile analysis",
              parameters: {
                type: "object",
                properties: {
                  overallScore: { type: "number" },
                  grade: { type: "string", description: "A+, A, B+, B, C+, C, D, F" },
                  profileStrength: { type: "string", description: "All-Star, Expert, Advanced, Intermediate, or Beginner" },
                  breakdown: {
                    type: "object",
                    properties: {
                      headline: { type: "number" },
                      about: { type: "number" },
                      experience: { type: "number" },
                      skills: { type: "number" },
                      education: { type: "number" },
                      profileCompleteness: { type: "number" },
                      keywordsVisibility: { type: "number" },
                      socialProof: { type: "number" },
                    },
                    required: ["headline","about","experience","skills","education","profileCompleteness","keywordsVisibility","socialProof"],
                    additionalProperties: false,
                  },
                  sectionFeedback: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      about: { type: "string" },
                      experience: { type: "string" },
                      skills: { type: "string" },
                      education: { type: "string" },
                      profileCompleteness: { type: "string" },
                      keywordsVisibility: { type: "string" },
                      socialProof: { type: "string" },
                    },
                    required: ["headline","about","experience","skills","education","profileCompleteness","keywordsVisibility","socialProof"],
                    additionalProperties: false,
                  },
                  quickWins: { type: "array", items: { type: "string" }, description: "3-5 improvements under 10 minutes each" },
                  biggerImprovements: { type: "array", items: { type: "string" }, description: "3-5 high-impact improvements requiring more effort" },
                  missingElements: { type: "array", items: { type: "string" }, description: "Key elements completely absent from the profile" },
                  headlineSuggestion: { type: "string", description: "Rewritten headline based on actual profile content" },
                  aboutSuggestion: { type: "string", description: "Improved opening 2-3 sentences for the About section" },
                },
                required: ["overallScore","grade","profileStrength","breakdown","sectionFeedback","quickWins","biggerImprovements","missingElements","headlineSuggestion","aboutSuggestion"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "linkedin_analysis" } },
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Failed to analyze LinkedIn profile");
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) throw new Error("No analysis returned from AI");

      const result = JSON.parse(toolCall.function.arguments);
      console.log(`LinkedIn analysis done: score=${result.overallScore} grade=${result.grade}`);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ATS MODE (original) ───────────────────────────────────────────────────
    const { cvContent, jobDescription } = body;

    if (!cvContent || cvContent.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Please provide CV content (at least 50 characters)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`ATS score check for user ${user.id}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an expert ATS (Applicant Tracking System) analyzer. Score the CV rigorously and honestly on these criteria:

1. **Keyword Optimization** (0-100): Does the CV include relevant industry keywords? If a job description is provided, are the keywords from the JD present?
2. **Formatting** (0-100): Clean structure, no complex tables/graphics, proper headings, consistent formatting
3. **Section Headings** (0-100): Uses standard ATS-recognized headings (Professional Summary, Experience, Education, Skills, Certifications)
4. **Achievements** (0-100): Quantifiable results with numbers, percentages, dollar amounts
5. **Action Verbs** (0-100): Strong professional action verbs (Spearheaded, Architected, Delivered, etc.)
6. **Length** (0-100): Appropriate length (1-2 pages for most roles)
7. **Contact Info** (0-100): Complete contact details (name, email, phone, location, LinkedIn)
8. **Readability** (0-100): Clear, scannable, well-organized content

Be honest and critical. A genuinely average CV should score 50-70. Only exceptional CVs score 90+.
Provide specific, actionable improvement suggestions.`,
          },
          {
            role: "user",
            content: `Score this CV for ATS compatibility:\n\n${cvContent}${jobDescription ? `\n\nTarget Job Description:\n${jobDescription}` : ""}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "ats_score",
            description: "Return detailed ATS score breakdown",
            parameters: {
              type: "object",
              properties: {
                overallScore: { type: "number", description: "Overall ATS score 0-100 (weighted average)" },
                breakdown: {
                  type: "object",
                  properties: {
                    keywords: { type: "number" },
                    formatting: { type: "number" },
                    sections: { type: "number" },
                    achievements: { type: "number" },
                    actionVerbs: { type: "number" },
                    length: { type: "number" },
                    contactInfo: { type: "number" },
                    readability: { type: "number" },
                  },
                  required: ["keywords", "formatting", "sections", "achievements", "actionVerbs", "length", "contactInfo", "readability"],
                  additionalProperties: false,
                },
                strengths: { type: "array", items: { type: "string" }, description: "Top 3 strengths of the CV" },
                improvements: { type: "array", items: { type: "string" }, description: "Top 5 specific, actionable improvements" },
                missingKeywords: { type: "array", items: { type: "string" }, description: "Important keywords missing from the CV (if job description provided)" },
                grade: { type: "string", description: "Letter grade: A+, A, B+, B, C+, C, D, F" },
              },
              required: ["overallScore", "breakdown", "strengths", "improvements", "grade"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "ats_score" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to analyze CV");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result: Record<string, unknown> = { overallScore: 0, breakdown: {}, strengths: [], improvements: [], grade: "C" };

    if (toolCall?.function?.arguments) {
      try { result = JSON.parse(toolCall.function.arguments); } catch {
        throw new Error("Failed to parse ATS score");
      }
    }

    console.log(`ATS Score: ${result.overallScore} (${result.grade})`);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in check-ats-score:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
