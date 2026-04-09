import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { profileContent, targetRole } = await req.json();

    if (!profileContent || profileContent.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Please provide your LinkedIn profile content (at least 50 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`LinkedIn analysis for user ${user.id}, content length: ${profileContent.length}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a LinkedIn profile optimization expert. You know exactly how LinkedIn's algorithm ranks profiles, what recruiters and clients look for, and how professionals get discovered and hired through LinkedIn.

Analyze the profile content provided and give honest, specific, actionable feedback. Reference actual content from the profile — never give generic advice.

Scoring scale:
- 90-100: Outstanding, nothing to improve
- 70-89: Good, minor gaps
- 50-69: Average, needs work
- 30-49: Weak, significant gaps
- 0-29: Missing or very poor

If information about photo, banner, connections or recommendations is not present in the content, note that as missing and score accordingly.${targetRole ? `\n\nThe user is targeting: "${targetRole}" roles — tailor the analysis to this.` : ""}`,
          },
          {
            role: "user",
            content: `Analyze this LinkedIn profile:\n\n${profileContent}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "linkedin_analysis",
              description: "Return detailed LinkedIn profile analysis",
              parameters: {
                type: "object",
                properties: {
                  overallScore: { type: "number", description: "Overall score 0-100" },
                  grade: { type: "string", description: "Letter grade: A+, A, B+, B, C+, C, D, F" },
                  profileStrength: {
                    type: "string",
                    description: "LinkedIn-style label: All-Star, Expert, Advanced, Intermediate, Beginner",
                  },
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
                    required: ["headline", "about", "experience", "skills", "education", "profileCompleteness", "keywordsVisibility", "socialProof"],
                    additionalProperties: false,
                  },
                  sectionFeedback: {
                    type: "object",
                    description: "Specific feedback per section referencing actual profile content",
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
                    required: ["headline", "about", "experience", "skills", "education", "profileCompleteness", "keywordsVisibility", "socialProof"],
                    additionalProperties: false,
                  },
                  quickWins: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 improvements that take under 10 minutes each",
                  },
                  biggerImprovements: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 deeper improvements with high impact on visibility and leads",
                  },
                  missingElements: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key profile elements that are completely absent",
                  },
                  headlineSuggestion: {
                    type: "string",
                    description: "A specific rewritten headline based on the actual profile content",
                  },
                  aboutSuggestion: {
                    type: "string",
                    description: "Improved opening 2-3 sentences for the About section",
                  },
                },
                required: [
                  "overallScore", "grade", "profileStrength", "breakdown", "sectionFeedback",
                  "quickWins", "biggerImprovements", "missingElements", "headlineSuggestion", "aboutSuggestion",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "linkedin_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to analyze profile");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No analysis returned");

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`Analysis done: score=${result.overallScore} grade=${result.grade}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-linkedin:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to analyze LinkedIn profile" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
