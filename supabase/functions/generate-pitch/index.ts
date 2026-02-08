import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      throw new Error("Supabase environment variables not configured");
    }

    // Use service role to validate the user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate the user's JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("JWT validation failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Get authenticated user ID
    const userId = user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { businessName, website, issues, freelancerService }: PitchRequest = await req.json();

    // Input validation
    if (!businessName || !issues || issues.length === 0) {
      return new Response(
        JSON.stringify({ error: "businessName and issues are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input lengths
    if (businessName.length > 200) {
      return new Response(
        JSON.stringify({ error: "Business name too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (website && website.length > 500) {
      return new Response(
        JSON.stringify({ error: "Website URL too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit issues array size
    if (issues.length > 20) {
      return new Response(
        JSON.stringify({ error: "Too many issues provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (freelancerService && freelancerService.length > 500) {
      return new Response(
        JSON.stringify({ error: "Service description too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for personalized pitches using service role (to bypass RLS)
    let profileData = {
      fullName: "Your Name",
      expertise: [] as string[],
      bio: "",
      portfolioUrl: "",
      cvUrl: "",
      calendlyUrl: "",
      serviceDescription: freelancerService || "web development and digital marketing"
    };

    if (userId) {
      // Use the already-created service role client
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, expertise, bio, portfolio_url, cv_url")
        .eq("user_id", userId)
        .single();

      const { data: settings } = await supabase
        .from("user_settings")
        .select("sender_name, service_description, calendly_url")
        .eq("user_id", userId)
        .single();

      if (profile) {
        profileData.fullName = profile.full_name || profileData.fullName;
        profileData.expertise = profile.expertise || [];
        profileData.bio = profile.bio || "";
        profileData.portfolioUrl = profile.portfolio_url || "";
        profileData.cvUrl = profile.cv_url || "";
      }

      if (settings) {
        profileData.fullName = settings.sender_name || profileData.fullName;
        profileData.serviceDescription = settings.service_description || profileData.serviceDescription;
        profileData.calendlyUrl = settings.calendly_url || "";
      }
    }

    // Sanitize inputs for AI prompt
    const sanitizedBusinessName = businessName.replace(/[<>{}[\]\\]/g, '').substring(0, 100);
    const sanitizedWebsite = (website || "No website found").replace(/[<>{}[\]\\]/g, '').substring(0, 200);

    // Format issues for the prompt (limit and sanitize)
    const sanitizedIssues = issues.slice(0, 8).map(issue => ({
      ...issue,
      title: (issue.title || "").replace(/[<>{}[\]\\]/g, '').substring(0, 100),
      description: (issue.description || "").replace(/[<>{}[\]\\]/g, '').substring(0, 200),
      category: (issue.category || "").replace(/[<>{}[\]\\]/g, '').substring(0, 30),
    }));

    // Group issues by type for better pitch context
    const websiteIssues = sanitizedIssues.filter(i => ['website_copy', 'cta', 'seo', 'design', 'copywriting'].includes(i.category));
    const socialIssues = sanitizedIssues.filter(i => ['linkedin', 'instagram', 'facebook', 'social'].includes(i.category));
    const brandingIssues = sanitizedIssues.filter(i => ['branding', 'performance'].includes(i.category));

    const topIssues = sanitizedIssues
      .filter(i => i.severity === 'high' || i.severity === 'medium')
      .slice(0, 3);

    const websiteIssuesSummary = websiteIssues.length > 0 
      ? `Website Issues:\n${websiteIssues.map(i => `- ${i.title}: ${i.description}`).join("\n")}`
      : "No major website issues found.";

    const socialIssuesSummary = socialIssues.length > 0
      ? `Social Media Issues:\n${socialIssues.map(i => `- [${i.category.toUpperCase()}] ${i.title}: ${i.description}`).join("\n")}`
      : "No social media issues found.";

    const brandingIssuesSummary = brandingIssues.length > 0
      ? `Branding Issues:\n${brandingIssues.map(i => `- ${i.title}: ${i.description}`).join("\n")}`
      : "";

    const pitchPrompt = `You are a friendly freelancer writing a cold outreach email. Write a personalized pitch email for a potential client based on a full audit of their online presence (website + social media).

About the Freelancer:
- Name: ${profileData.fullName.substring(0, 100)}
- Expertise: ${profileData.expertise.length > 0 ? profileData.expertise.slice(0, 5).join(", ") : profileData.serviceDescription.substring(0, 200)}
- Bio/Experience: ${(profileData.bio || "Professional freelancer with experience in digital services").substring(0, 500)}
- Portfolio: ${profileData.portfolioUrl ? profileData.portfolioUrl.substring(0, 200) : "Available upon request"}
${profileData.calendlyUrl ? `- Booking Link: ${profileData.calendlyUrl.substring(0, 200)}` : ""}

Business Details:
- Name: ${sanitizedBusinessName}
- Website: ${sanitizedWebsite}

${websiteIssuesSummary}

${socialIssuesSummary}

${brandingIssuesSummary}

Top priority pain points:
${topIssues.map(i => `- [${i.category.toUpperCase()}] ${i.title} (${i.severity} severity): ${i.description}`).join("\n")}

Write a cold email that:
1. Opens with a SPECIFIC observation about their online presence — pick the most painful issue (could be their website copy, their LinkedIn, their Instagram, or their Facebook)
2. Briefly explains how this specific problem is costing them clients or money
3. If there are social media issues, mention 1-2 specific things you noticed about their social profiles (e.g., "Your Instagram hasn't been updated in weeks" or "Your LinkedIn about section doesn't clearly explain what you do")
4. Connect the issues to YOUR specific expertise and how you can help
5. If you can help with social media design, content strategy, bio optimization, follower growth — mention it naturally
6. Include a soft call-to-action - ${profileData.calendlyUrl ? "suggest they book a call using your Calendly link" : "suggest a quick call or reply"}
7. Is conversational and friendly, NOT salesy
8. Is between 150-250 words maximum
9. Uses short paragraphs for readability
10. Signs off with the freelancer's name

IMPORTANT: Focus on PAIN POINTS that make them think "I need to fix this." Don't list generic suggestions.
Do NOT use phrases like "I noticed" at the very start - be more creative.
Do NOT use exclamation marks excessively.
Do NOT promise specific results or use superlatives.
Make the pitch feel personal and based on their ACTUAL online presence issues.`;

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
    
    let subject = `Quick question about ${sanitizedBusinessName}'s website`;
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

    console.log(`Pitch generated for ${sanitizedBusinessName}`);

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
