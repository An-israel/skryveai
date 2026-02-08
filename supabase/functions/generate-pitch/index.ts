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
  investorPitch?: {
    industry: string;
    businessName: string;
    businessDescription: string;
    fundingAmount: string;
    traction: string;
    useOfFunds: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { businessName, website, issues, freelancerService, investorPitch }: PitchRequest = await req.json();

    // Input validation
    if (!businessName) {
      return new Response(
        JSON.stringify({ error: "businessName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For non-investor pitches, issues are required
    if (!investorPitch && (!issues || issues.length === 0)) {
      return new Response(
        JSON.stringify({ error: "issues are required for non-investor pitches" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (issues.length > 20) {
      return new Response(
        JSON.stringify({ error: "Too many issues provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for personalized pitches
    let profileData = {
      fullName: "Your Name",
      expertise: [] as string[],
      bio: "",
      portfolioUrl: "",
      cvUrl: "",
      calendlyUrl: "",
      serviceDescription: freelancerService || "web development and digital marketing"
    };

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

    // Sanitize inputs
    const sanitizedBusinessName = businessName.replace(/[<>{}[\]\\]/g, '').substring(0, 100);

    let pitchPrompt: string;
    let systemMessage: string;

    if (investorPitch) {
      // ─── Investor pitch mode (no website analysis needed) ───
      const sanitizedInvestorData = {
        industry: (investorPitch.industry || "").replace(/[<>{}[\]\\]/g, '').substring(0, 100),
        businessName: (investorPitch.businessName || "").replace(/[<>{}[\]\\]/g, '').substring(0, 200),
        businessDescription: (investorPitch.businessDescription || "").replace(/[<>{}[\]\\]/g, '').substring(0, 2000),
        fundingAmount: (investorPitch.fundingAmount || "").replace(/[<>{}[\]\\]/g, '').substring(0, 50),
        traction: (investorPitch.traction || "").replace(/[<>{}[\]\\]/g, '').substring(0, 2000),
        useOfFunds: (investorPitch.useOfFunds || "").replace(/[<>{}[\]\\]/g, '').substring(0, 200),
      };

      systemMessage = "You write compelling investor pitch emails that get meetings. You are direct, specific, and every email reads like it was written by a founder who understands investors' priorities. Always respond with valid JSON via tool calls.";

      pitchPrompt = `You are writing a cold email to an investor/VC firm to pitch a startup for funding. This email MUST get a reply and ideally a meeting.

TARGET INVESTOR:
- Firm/Name: ${sanitizedBusinessName}

YOUR STARTUP:
- Name: ${sanitizedInvestorData.businessName}
- Industry: ${sanitizedInvestorData.industry}
- What it does: ${sanitizedInvestorData.businessDescription}
${sanitizedInvestorData.fundingAmount ? `- Raising: ${sanitizedInvestorData.fundingAmount}` : ""}
${sanitizedInvestorData.useOfFunds ? `- Use of funds: ${sanitizedInvestorData.useOfFunds}` : ""}
${sanitizedInvestorData.traction ? `- Traction & proof: ${sanitizedInvestorData.traction}` : ""}

FOUNDER INFO:
- Name: ${profileData.fullName.substring(0, 100)}
${profileData.bio ? `- Background: ${profileData.bio.substring(0, 300)}` : ""}

RULES FOR THE EMAIL:
1. SUBJECT LINE: Max 8 words. Intriguing, specific to the investor's focus area. Examples: "${sanitizedInvestorData.businessName} — ${sanitizedInvestorData.industry} disruption", "Quick intro: ${sanitizedInvestorData.businessName}"
2. OPENER: Lead with the market opportunity or traction — NOT "I hope this email finds you well"
3. BODY:
   - State the problem you solve in 1 sentence
   - Your unique solution in 1-2 sentences
   - Traction/proof points (numbers matter — revenue, users, growth rate)
   - Why THIS investor is the right fit (reference their portfolio or focus area if possible)
4. ASK: Clear ask for a 15-20 minute call. Keep it low-pressure.
5. LENGTH: 120-180 words MAXIMUM. Investors are busy.
6. TONE: Confident but not arrogant. Data-driven. Founder-to-investor.
7. Sign off with founder name.

ABSOLUTELY DO NOT:
- Start with "I hope this finds you well" or "My name is..."
- Use buzzwords like "disruptive", "revolutionary", "game-changing"
- Make unsupported claims without data
- Write more than 180 words
- Sound desperate or overly formal
- Use exclamation marks more than once`;

    } else {
      // ─── Freelancer / Direct client pitch mode ───
      const sanitizedWebsite = (website || "No website found").replace(/[<>{}[\]\\]/g, '').substring(0, 200);

      const sanitizedIssues = issues.slice(0, 8).map(issue => ({
        ...issue,
        title: (issue.title || "").replace(/[<>{}[\]\\]/g, '').substring(0, 100),
        description: (issue.description || "").replace(/[<>{}[\]\\]/g, '').substring(0, 200),
        category: (issue.category || "").replace(/[<>{}[\]\\]/g, '').substring(0, 30),
      }));

      const topIssue = sanitizedIssues
        .filter(i => i.severity === 'high')
        .slice(0, 1)[0] || sanitizedIssues[0];

      const websiteIssues = sanitizedIssues.filter(i => ['website_copy', 'cta', 'seo', 'design', 'copywriting'].includes(i.category));
      const socialIssues = sanitizedIssues.filter(i => ['linkedin', 'instagram', 'facebook', 'social'].includes(i.category));
      const brandingIssues = sanitizedIssues.filter(i => ['branding', 'performance'].includes(i.category));

      const websiteIssuesSummary = websiteIssues.length > 0 
        ? `Website Issues:\n${websiteIssues.map(i => `- ${i.title}: ${i.description}`).join("\n")}`
        : "";

      const socialIssuesSummary = socialIssues.length > 0
        ? `Social Media Issues:\n${socialIssues.map(i => `- [${i.category.toUpperCase()}] ${i.title}: ${i.description}`).join("\n")}`
        : "";

      const brandingIssuesSummary = brandingIssues.length > 0
        ? `Branding Issues:\n${brandingIssues.map(i => `- ${i.title}: ${i.description}`).join("\n")}`
        : "";

      const ctaInstruction = profileData.calendlyUrl 
        ? `End with: "Would it help if I showed you exactly what I'd change? Here's my calendar if 15 minutes works: ${profileData.calendlyUrl.substring(0, 200)}"`
        : `End with a simple question they can reply "yes" to. Example: "Would it help if I put together a quick mockup showing what I'd change? Just reply 'yes' and I'll send it over."`;

      systemMessage = "You write cold emails that get replies. You are direct, specific, and never sound like a template. Every email reads like it was written by a real person who spent 5 minutes researching the recipient. Always respond with valid JSON via tool calls.";

      pitchPrompt = `You are writing a cold outreach email that MUST get a reply. Study these real examples of high-converting cold emails and match their style:

EXAMPLE OPENER STYLES (vary these — never start with "I noticed"):
- "Quick question about [their company]'s [specific thing]..."  
- "Been looking at [company]'s LinkedIn and had a thought..."
- "[Company name] keeps coming up in my feed — and I think there's a gap in how you're..."
- "Your website says [specific quote from their site]. Here's what visitors probably think..."
- "3 things I'd change about [company]'s Instagram tomorrow..."

About You (the Freelancer):
- Name: ${profileData.fullName.substring(0, 100)}
- Skills: ${profileData.expertise.length > 0 ? profileData.expertise.slice(0, 5).join(", ") : profileData.serviceDescription.substring(0, 200)}
- Experience: ${(profileData.bio || "Experienced freelancer").substring(0, 300)}
${profileData.portfolioUrl ? `- Portfolio: ${profileData.portfolioUrl.substring(0, 200)}` : ""}

Target Business:
- Name: ${sanitizedBusinessName}
- Website: ${sanitizedWebsite}

MOST PAINFUL ISSUE (lead with this):
[${topIssue.category.toUpperCase()}] ${topIssue.title}: ${topIssue.description}

${websiteIssuesSummary}
${socialIssuesSummary}
${brandingIssuesSummary}

RULES FOR THE EMAIL:
1. SUBJECT LINE: Max 6 words. Curious, specific, NOT salesy. No emojis. Example: "Quick thought about [company]'s [thing]"
2. OPENER (first sentence): Jump straight into their #1 pain point. Be specific about THEIR business.
3. BODY: 
   - Pick 1-2 issues maximum (the most painful ones)
   - Explain the COST of not fixing it (lost clients, lost revenue, looking unprofessional)
   - Show you understand their business specifically
   - If social media issues exist, mention ONE specific thing (e.g., "Your LinkedIn hasn't posted in 3 weeks" or "Your Instagram bio doesn't tell visitors what to do next")
4. PROOF: One brief line connecting your expertise to their problem (not a resume dump)
5. CTA: ${ctaInstruction}
6. LENGTH: 100-150 words MAXIMUM. Short paragraphs. No walls of text.
7. TONE: Like a helpful peer, not a vendor. Conversational. Zero corporate jargon.
8. Sign off with just your first name.

ABSOLUTELY DO NOT:
- Start with "I noticed" or "I came across" or "I hope this finds you"
- Use exclamation marks more than once
- Promise specific numbers ("increase by 200%")  
- List more than 2 problems
- Write more than 150 words
- Sound like AI wrote it
- Use the word "leverage" or "synergy" or "game-changer"
- Include "Best regards" — just use your first name`;
    }

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
            content: systemMessage 
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
                    description: "Email subject line - max 6 words, curious, specific, not spammy"
                  },
                  body: { 
                    type: "string",
                    description: "Email body - 100-150 words max, conversational, specific pain point opener"
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
    
    let subject = `Quick thought about ${sanitizedBusinessName}`;
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
