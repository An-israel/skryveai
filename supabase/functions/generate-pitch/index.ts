import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PitchRequest {
  businessName: string;
  website: string;
  issues: Array<{
    category: string;
    severity: string;
    title: string;
    description: string;
  }>;
  freelancerService?: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const { businessName, website, issues, freelancerService, userId }: PitchRequest = await req.json();

    if (!businessName || !issues || issues.length === 0) {
      return new Response(
        JSON.stringify({ error: "businessName and issues are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for personalized pitches
    let profileData = {
      fullName: "Your Name",
      expertise: [] as string[],
      bio: "",
      portfolioUrl: "",
      serviceDescription: freelancerService || "web development and digital marketing"
    };

    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, expertise, bio, portfolio_url")
        .eq("user_id", userId)
        .single();

      const { data: settings } = await supabase
        .from("user_settings")
        .select("sender_name, service_description")
        .eq("user_id", userId)
        .single();

      if (profile) {
        profileData.fullName = profile.full_name || profileData.fullName;
        profileData.expertise = profile.expertise || [];
        profileData.bio = profile.bio || "";
        profileData.portfolioUrl = profile.portfolio_url || "";
      }

      if (settings) {
        profileData.fullName = settings.sender_name || profileData.fullName;
        profileData.serviceDescription = settings.service_description || profileData.serviceDescription;
      }
    }

    // Format issues for the prompt
    const issuesSummary = issues
      .slice(0, 4)
      .map(issue => `- ${issue.title}: ${issue.description}`)
      .join("\n");

    const topIssues = issues
      .filter(i => i.severity === 'high' || i.severity === 'medium')
      .slice(0, 2);

    const pitchPrompt = `You are a friendly freelancer writing a cold outreach email. Write a personalized pitch email for a potential client.

About the Freelancer:
- Name: ${profileData.fullName}
- Expertise: ${profileData.expertise.length > 0 ? profileData.expertise.join(", ") : profileData.serviceDescription}
- Bio: ${profileData.bio || "Professional freelancer with experience in digital services"}
- Portfolio: ${profileData.portfolioUrl || "Available upon request"}

Business Details:
- Name: ${businessName}
- Website: ${website || "No website found"}

Website Issues Found:
${issuesSummary}

Top priority issues to address:
${topIssues.map(i => `- ${i.title} (${i.severity} severity)`).join("\n")}

Write a cold email that:
1. Opens with a specific observation about their website (reference an actual issue found)
2. Briefly explains how this affects their business
3. Mentions your specific expertise that's relevant to their issues
4. Offers your help without being pushy
5. Includes a soft call-to-action (suggest a quick call or reply)
6. Is conversational and friendly, NOT salesy
7. Is between 150-200 words maximum
8. Uses short paragraphs for readability
9. Signs off with the freelancer's name

Do NOT use phrases like "I noticed" at the very start - be more creative.
Do NOT use exclamation marks excessively.
Do NOT promise specific results or use superlatives.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "You are a professional freelancer who writes excellent cold outreach emails. You are warm, specific, and helpful without being pushy. Always respond with valid JSON." 
          },
          { role: "user", content: pitchPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_pitch",
              description: "Create a cold email pitch",
              parameters: {
                type: "object",
                properties: {
                  subject: { 
                    type: "string",
                    description: "Email subject line - should be short, specific, and not spammy"
                  },
                  body: { 
                    type: "string",
                    description: "Email body text"
                  }
                },
                required: ["subject", "body"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_pitch" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI pitch generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let subject = `Quick question about ${businessName}'s website`;
    let body = "";

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        subject = parsed.subject || subject;
        body = parsed.body || "";
      } catch (e) {
        console.error("Error parsing AI response:", e);
      }
    }

    if (!body) {
      throw new Error("Failed to generate pitch content");
    }

    console.log(`Pitch generated for ${businessName}`);

    return new Response(
      JSON.stringify({
        subject,
        body,
        edited: false,
        approved: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-pitch:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
