import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Format Proxycurl response into readable profile text ────────────────────
function formatProfileText(p: Record<string, any>): string {
  const lines: string[] = [];

  if (p.full_name) lines.push(`NAME: ${p.full_name}`);
  if (p.headline) lines.push(`HEADLINE: ${p.headline}`);
  if (p.country_full_name || p.city) lines.push(`LOCATION: ${[p.city, p.country_full_name].filter(Boolean).join(", ")}`);
  if (p.connections) lines.push(`CONNECTIONS: ${p.connections}`);
  if (p.follower_count) lines.push(`FOLLOWERS: ${p.follower_count}`);

  if (p.summary) {
    lines.push("\nABOUT:");
    lines.push(p.summary);
  }

  if (Array.isArray(p.experiences) && p.experiences.length > 0) {
    lines.push("\nEXPERIENCE:");
    for (const exp of p.experiences.slice(0, 6)) {
      const title = [exp.title, exp.company].filter(Boolean).join(" at ");
      const dates = [exp.starts_at?.year, exp.ends_at?.year ?? "Present"].join(" – ");
      lines.push(`• ${title} (${dates})`);
      if (exp.description) lines.push(`  ${exp.description.slice(0, 300)}`);
    }
  }

  if (Array.isArray(p.education) && p.education.length > 0) {
    lines.push("\nEDUCATION:");
    for (const edu of p.education.slice(0, 4)) {
      const degree = [edu.degree_name, edu.field_of_study].filter(Boolean).join(", ");
      const school = edu.school ?? "";
      lines.push(`• ${school}${degree ? ` — ${degree}` : ""}`);
    }
  }

  if (Array.isArray(p.skills) && p.skills.length > 0) {
    lines.push("\nSKILLS:");
    lines.push(p.skills.map((s: any) => s.name ?? s).slice(0, 30).join(", "));
  }

  if (Array.isArray(p.certifications) && p.certifications.length > 0) {
    lines.push("\nCERTIFICATIONS:");
    for (const cert of p.certifications.slice(0, 5)) {
      lines.push(`• ${cert.name}${cert.authority ? ` — ${cert.authority}` : ""}`);
    }
  }

  if (Array.isArray(p.recommendations) && p.recommendations.length > 0) {
    lines.push(`\nRECOMMENDATIONS: ${p.recommendations.length} received`);
  }

  if (p.profile_pic_url) lines.push("\nPROFILE PHOTO: Present");
  else lines.push("\nPROFILE PHOTO: Missing");

  if (p.background_cover_image_url) lines.push("BANNER IMAGE: Present");
  else lines.push("BANNER IMAGE: Missing");

  if (p.public_identifier) lines.push(`CUSTOM URL: linkedin.com/in/${p.public_identifier}`);

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
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

    // ── Keys ──────────────────────────────────────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PROXYCURL_API_KEY = Deno.env.get("PROXYCURL_API_KEY");
    if (!PROXYCURL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LinkedIn data service not configured. Please add PROXYCURL_API_KEY to Supabase secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse request ─────────────────────────────────────────────────────────
    const { linkedinUrl, targetRole } = await req.json();

    if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid LinkedIn profile URL (e.g. https://linkedin.com/in/yourname)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`LinkedIn analysis for user ${user.id}, profile: ${linkedinUrl}`);

    // ── Step 1: Fetch profile data via Proxycurl ──────────────────────────────
    const proxycurlRes = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}&skills=include&recommendations=include&certifications=include`,
      {
        headers: {
          Authorization: `Bearer ${PROXYCURL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!proxycurlRes.ok) {
      if (proxycurlRes.status === 404) {
        return new Response(
          JSON.stringify({ error: "LinkedIn profile not found. Make sure the profile is public and the URL is correct." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (proxycurlRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "LinkedIn data service rate limit reached. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await proxycurlRes.text();
      console.error("Proxycurl error:", proxycurlRes.status, errText);
      throw new Error("Failed to fetch LinkedIn profile data");
    }

    const profileData = await proxycurlRes.json();
    const profileText = formatProfileText(profileData);

    console.log(`Profile fetched: ${profileData.full_name}, ${profileText.length} chars`);

    // ── Step 2: AI analysis ───────────────────────────────────────────────────
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

Analyze the profile data provided and give honest, specific, actionable feedback. Reference actual content from the profile — not generic advice.

Scoring scale:
- 90-100: Outstanding
- 70-89: Good, minor gaps
- 50-69: Average, needs work
- 30-49: Weak, significant gaps
- 0-29: Missing or very poor

If the profile is missing a photo, banner, summary/about section, or has very few connections, that should significantly impact the relevant scores.`,
          },
          {
            role: "user",
            content: `Analyze this LinkedIn profile${targetRole ? ` for someone targeting "${targetRole}" roles` : ""}:\n\n${profileText}`,
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
                    description: "3-5 improvements that take under 10 minutes",
                  },
                  biggerImprovements: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 deeper improvements with high impact",
                  },
                  missingElements: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key elements completely missing from the profile",
                  },
                  headlineSuggestion: {
                    type: "string",
                    description: "A specific rewritten headline based on actual profile content",
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to analyze profile");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No analysis returned");

    const result = JSON.parse(toolCall.function.arguments);
    // Attach the fetched name so the frontend can display it
    result.profileName = profileData.full_name ?? null;
    result.profileHeadline = profileData.headline ?? null;
    result.profilePicUrl = profileData.profile_pic_url ?? null;

    console.log(`Analysis done: ${result.profileName} — ${result.overallScore}/100 (${result.grade})`);

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
