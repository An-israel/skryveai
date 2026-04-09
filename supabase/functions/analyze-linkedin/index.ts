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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
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

    const { profileContent, linkedinUrl, targetRole } = await req.json();

    if (!profileContent || profileContent.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Please provide your LinkedIn profile content (at least 50 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`LinkedIn analysis for user ${user.id}`);

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
            content: `You are a LinkedIn profile optimization expert with deep knowledge of how LinkedIn's algorithm works, what recruiters look for, and how freelancers/professionals get discovered and hired through LinkedIn.

Your job is to analyze a LinkedIn profile and give honest, actionable feedback. Be specific — not generic. Reference actual content from the profile in your suggestions.

Score each section rigorously:
- 90-100: Outstanding, nothing to improve
- 70-89: Good but missing key elements
- 50-69: Average, needs work
- 30-49: Weak, significant gaps
- 0-29: Missing or very poor

Consider the target role/industry if provided.`,
          },
          {
            role: "user",
            content: `Analyze this LinkedIn profile${targetRole ? ` for someone targeting "${targetRole}" roles` : ""}${linkedinUrl ? ` (URL: ${linkedinUrl})` : ""}:

${profileContent}`,
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
                  overallScore: {
                    type: "number",
                    description: "Overall LinkedIn profile score 0-100",
                  },
                  grade: {
                    type: "string",
                    description: "Letter grade: A+, A, B+, B, C+, C, D, F",
                  },
                  profileStrength: {
                    type: "string",
                    description: "LinkedIn-style strength label: All-Star, Expert, Advanced, Intermediate, Beginner",
                  },
                  breakdown: {
                    type: "object",
                    properties: {
                      headline: { type: "number", description: "Score for headline/title (0-100)" },
                      about: { type: "number", description: "Score for About/Summary section (0-100)" },
                      experience: { type: "number", description: "Score for work experience entries (0-100)" },
                      skills: { type: "number", description: "Score for skills section (0-100)" },
                      education: { type: "number", description: "Score for education section (0-100)" },
                      profileCompleteness: { type: "number", description: "Score for overall profile completeness — photo, banner, contact info, URL (0-100)" },
                      keywordsVisibility: { type: "number", description: "Score for keyword optimization for search visibility (0-100)" },
                      socialProof: { type: "number", description: "Score for recommendations, endorsements, and achievements (0-100)" },
                    },
                    required: ["headline", "about", "experience", "skills", "education", "profileCompleteness", "keywordsVisibility", "socialProof"],
                    additionalProperties: false,
                  },
                  sectionFeedback: {
                    type: "object",
                    description: "Specific feedback for each section referencing actual profile content",
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
                    description: "3-5 quick improvements that take less than 10 minutes each",
                  },
                  biggerImprovements: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 deeper improvements that require more effort but significantly boost results",
                  },
                  missingElements: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key elements that are completely missing from the profile",
                  },
                  headlineSuggestion: {
                    type: "string",
                    description: "A rewritten headline suggestion based on the profile content",
                  },
                  aboutSuggestion: {
                    type: "string",
                    description: "Opening 2-3 sentences for an improved About section",
                  },
                },
                required: [
                  "overallScore",
                  "grade",
                  "profileStrength",
                  "breakdown",
                  "sectionFeedback",
                  "quickWins",
                  "biggerImprovements",
                  "missingElements",
                  "headlineSuggestion",
                  "aboutSuggestion",
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
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to analyze profile");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No analysis returned from AI");
    }

    let result;
    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Failed to parse analysis result");
    }

    console.log(`LinkedIn analysis complete: score=${result.overallScore} grade=${result.grade}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-linkedin:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to analyze LinkedIn profile",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
