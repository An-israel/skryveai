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

    const { cvData, userName } = await req.json();

    if (!cvData) {
      return new Response(JSON.stringify({ error: "CV data is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating LinkedIn guide for ${userName || "user"}`);

    const systemPrompt = `You are a world-class LinkedIn personal brand strategist. Generate a comprehensive, personalized LinkedIn Optimization Guide based on the user's CV data.

The guide must cover EVERY section of LinkedIn in sequence with specific, actionable guidance:

1. Profile Photo - What kind of photo to use, specific brief
2. Banner/Cover Photo - Design specs and content recommendations  
3. Headline - Exact headline text to use (max 220 chars)
4. About/Summary - Full pre-written "About" section (2000 char limit)
5. Featured Section - What to feature and why
6. Experience - How to mirror and enhance CV entries for LinkedIn
7. Skills & Endorsements - Top 10 skills to add
8. Education - How to present education
9. Certifications - How to display certifications
10. Recommendations - Script for requesting recommendations
11. Creator Mode & Settings - Whether to enable and how to configure

For each section:
- Explain WHAT it is and WHY it matters
- Give SPECIFIC guidance on what to put
- Provide a PRE-WRITTEN example they can copy-paste

Tone: Professional, specific, and actionable. Not generic advice — written as though a personal brand strategist reviewed their profile and produced a personalized playbook.`;

    const userPrompt = `Generate a LinkedIn Optimization Guide based on this CV data:

${JSON.stringify(cvData, null, 2)}

User Name: ${userName || cvData.fullName || "Professional"}

Make every section specific to this person's background, skills, and career trajectory. Include pre-written copy they can paste directly into LinkedIn.

Return using the generate_guide function.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_guide",
            description: "Generate a structured LinkedIn optimization guide",
            parameters: {
              type: "object",
              properties: {
                userName: { type: "string" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Section title (e.g., 'Profile Photo', 'Headline')" },
                      whatItIs: { type: "string", description: "What this LinkedIn section is and why it matters" },
                      whatToPut: { type: "string", description: "Specific guidance on what content to add" },
                      example: { type: "string", description: "Pre-written example text they can copy-paste" },
                      proTip: { type: "string", description: "Optional pro tip for this section" },
                    },
                    required: ["title", "whatItIs", "whatToPut", "example"],
                    additionalProperties: false,
                  },
                },
                headline: { type: "string", description: "The exact LinkedIn headline to use (max 220 chars)" },
                aboutSection: { type: "string", description: "Full pre-written About section (max 2000 chars)" },
              },
              required: ["userName", "sections", "headline", "aboutSection"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_guide" } },
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
      throw new Error("Failed to generate LinkedIn guide");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let guide: any = {};

    if (toolCall?.function?.arguments) {
      try { guide = JSON.parse(toolCall.function.arguments); } catch {
        throw new Error("Failed to parse LinkedIn guide");
      }
    }

    console.log(`LinkedIn guide generated with ${guide.sections?.length || 0} sections`);

    return new Response(
      JSON.stringify(guide),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-linkedin-guide:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate guide" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
