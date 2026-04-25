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
  expertise?: string;
  cta?: string;
  // Smart Find context — when present, the pitch should reference the SPECIFIC signal/evidence
  detectedSignals?: Record<string, boolean>;
  evidence?: Record<string, string>;
  needScore?: number;
  investorPitch?: {
    industry: string;
    businessName: string;
    businessDescription: string;
    fundingAmount: string;
    traction: string;
    useOfFunds: string;
  };
}

const SIGNAL_HUMAN_LABELS: Record<string, string> = {
  no_trust_badges: "no trust badges (SSL/payment logos/guarantees) on the site",
  slow_load: "slow page load time",
  not_mobile_responsive: "not mobile-responsive",
  outdated_design: "outdated visual design",
  no_clear_cta: "no clear call-to-action above the fold",
  no_email_capture: "no email capture or lead form",
  weak_copy: "weak/generic homepage copy",
  no_blog_or_content: "no blog or content marketing",
  no_social_links: "missing social media links",
  broken_links: "broken or dead links",
  thin_content: "thin homepage content",
  no_seo_meta: "missing SEO meta tags",
  no_https: "site not using HTTPS",
  weak_brand: "weak brand identity",
  generic_design: "generic template-style design",
  no_video_content: "no video content",
  poor_navigation: "confusing navigation",
  no_testimonials: "no testimonials or social proof",
  outdated_copyright: "outdated copyright year",
  no_about_page: "no About page",
};

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

    // Allow service-role calls (from autopilot-run) to bypass user auth & credits
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    let userId: string | null = null;

    if (isServiceRole) {
      userId = null;
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = user.id;

      // Credit check - 1 credit per pitch
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("credits, plan, status")
        .eq("user_id", userId)
        .single();

      if (subError || !subscription) {
        return new Response(
          JSON.stringify({ error: "No active subscription found" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (subscription.plan !== "lifetime") {
        if (subscription.credits < 1) {
          return new Response(
            JSON.stringify({ error: "Insufficient credits. Please upgrade your plan." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: deductError } = await supabase
          .from("subscriptions")
          .update({ credits: subscription.credits - 1 })
          .eq("user_id", userId);

        if (deductError) {
          console.error("Failed to deduct credits:", deductError);
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { businessName, website, issues, freelancerService, expertise, cta, investorPitch, detectedSignals, evidence, needScore }: PitchRequest = await req.json();

    // Input validation
    if (!businessName) {
      return new Response(
        JSON.stringify({ error: "businessName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For non-investor pitches, if no issues provided, use a generic set
    const effectiveIssues = (!issues || issues.length === 0)
      ? [{ category: "general", description: "General business improvement opportunity", severity: "medium" }]
      : issues;

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

    if (effectiveIssues.length > 20) {
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

      const sanitizedIssues = effectiveIssues.slice(0, 8).map(issue => ({
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

      // Determine the freelancer's expertise for this campaign
      const freelancerExpertise = expertise || (profileData.expertise.length > 0 ? profileData.expertise.join(", ") : profileData.serviceDescription);

      // Build CTA instruction based on what the user selected
      let ctaInstruction: string;
      const ctaLower = (cta || "").toLowerCase();
      if (ctaLower.includes("book") || ctaLower.includes("call") || ctaLower.includes("schedule")) {
        ctaInstruction = profileData.calendlyUrl
          ? `End with a call-booking CTA. Include this link: ${profileData.calendlyUrl.substring(0, 200)}`
          : `End by asking them to hop on a quick 15-minute call. Suggest they reply with their availability.`;
      } else if (ctaLower.includes("reply") || ctaLower.includes("message") || ctaLower.includes("yes")) {
        ctaInstruction = `End with a yes/no question they can easily reply to. Make it low-friction. Example: "Would it help if I put together a quick example showing what I'd change? Just reply 'yes' and I'll send it over."`;
      } else if (ctaLower.includes("portfolio") || ctaLower.includes("work") || ctaLower.includes("sample")) {
        ctaInstruction = profileData.portfolioUrl
          ? `End by inviting them to see your portfolio: ${profileData.portfolioUrl.substring(0, 200)}`
          : `End by inviting them to see examples of your work or ask if you can send samples.`;
      } else if (ctaLower.includes("audit") || ctaLower.includes("mockup") || ctaLower.includes("free")) {
        ctaInstruction = `End by offering a free audit, quick mockup, or sample relevant to your ${freelancerExpertise} work. Make it irresistible and zero-risk.`;
      } else if (cta && cta.trim().length > 0) {
        // Custom CTA
        ctaInstruction = `End with this specific call-to-action: "${cta.trim()}"`;
      } else {
        ctaInstruction = profileData.calendlyUrl
          ? `End with this booking link: ${profileData.calendlyUrl.substring(0, 200)}`
          : `End with a simple yes/no question they can reply to easily.`;
      }

      systemMessage = `You write cold emails that get replies. You are a ${freelancerExpertise} writing to a potential client. You are direct, specific, and never sound like a template. Every email reads like it was written by a real expert who spent time researching the recipient. Always respond with valid JSON via tool calls.`;

      // ─── Smart Find context: include detected signals + evidence so the AI references the SPECIFIC problem ───
      let smartFindContext = "";
      if (detectedSignals && Object.keys(detectedSignals).length > 0) {
        const triggered = Object.entries(detectedSignals)
          .filter(([, v]) => v === true)
          .map(([k]) => k);
        if (triggered.length > 0) {
          const lines = triggered.slice(0, 5).map((sig) => {
            const human = SIGNAL_HUMAN_LABELS[sig] || sig.replace(/_/g, " ");
            const ev = evidence?.[sig] ? ` — Evidence: "${String(evidence[sig]).substring(0, 150)}"` : "";
            return `• ${human}${ev}`;
          });
          smartFindContext = `\n\n== AI-DETECTED PAIN SIGNALS (Need Score: ${needScore ?? "N/A"}/100) ==\nThese are SPECIFIC, concrete problems we found by scanning ${sanitizedBusinessName}'s site. Reference at least ONE of these by name in the opener — quote the evidence if useful.\n${lines.join("\n")}`;
        }
      }

      pitchPrompt = `You are a ${freelancerExpertise} writing a cold outreach email to a potential client. This email MUST get a reply.

YOUR ROLE: ${freelancerExpertise}
Your Name: ${profileData.fullName.substring(0, 100)}
Your Background: ${(profileData.bio || "Experienced professional").substring(0, 300)}
${profileData.portfolioUrl ? `Your Portfolio: ${profileData.portfolioUrl.substring(0, 200)}` : ""}

TARGET BUSINESS:
- Name: ${sanitizedBusinessName}
- Website: ${sanitizedWebsite}

PROBLEMS YOU FOUND (as a ${freelancerExpertise}):

MOST URGENT ISSUE — Lead with this:
[${topIssue.category.toUpperCase()}] ${topIssue.title}: ${topIssue.description}

${websiteIssuesSummary}
${socialIssuesSummary}
${brandingIssuesSummary}${smartFindContext}

EXAMPLE OPENER STYLES (vary — never start with "I noticed"):
- "Quick question about [company]'s [specific ${freelancerExpertise.split(" ")[0].toLowerCase()} thing]..."
- "Been looking at [company]'s [relevant channel] and had a thought..."
- "[Company name]'s [specific element] caught my eye — and I think there's a gap..."
- "Your [website/Instagram/LinkedIn] says [specific thing]. Here's what [their audience] probably thinks..."

RULES:
1. SUBJECT LINE: Max 6 words. Specific to their business. No emojis. Curious, not salesy.
2. OPENER: Lead with their #1 pain point — if AI-detected signals are provided above, reference ONE of them BY NAME with the evidence. This proves you actually looked at their site.
3. BODY:
   - Max 1-2 issues (the most painful for their business)
   - Explain the cost of NOT fixing it (lost clients, lost revenue, lost credibility)
   - ONE line showing you understand their specific situation
   - ONE line of social proof connecting YOUR ${freelancerExpertise} expertise to their problem (not a resume dump)
4. CTA: ${ctaInstruction}
5. LENGTH: 100-150 words MAXIMUM. Short paragraphs.
6. TONE: Peer-to-peer, helpful, zero corporate jargon
7. Sign off with just your first name

ABSOLUTELY DO NOT:
- Start with "I noticed" or "I came across" or "I hope this finds you"
- Promise specific percentages or guarantees
- Mention more than 2 problems
- Write more than 150 words
- Sound like AI wrote it
- Use "leverage", "synergy", or "game-changing"
- End with "Best regards"`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
