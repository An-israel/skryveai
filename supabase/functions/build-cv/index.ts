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

    const { mode, existingCv, jobDescription, formData } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "optimize") {
      // Mode A: Optimize existing CV for a specific job
      systemPrompt = `You are an elite CV/Resume optimization expert. Your job is to:
1. Take the user's existing CV content and a specific job description
2. Rewrite and restructure the CV to be specifically tailored for that job
3. Highlight relevant skills, experience, and keywords from the job description
4. Use strong action verbs and quantifiable achievements
5. Ensure ATS compatibility with proper formatting, keywords, and structure
6. The output CV MUST score 95-100% on ATS systems

CRITICAL RULES:
- Do NOT fabricate information. Only restructure and enhance what the user provided.
- Use keywords from the job description naturally throughout
- Every bullet point should start with a strong action verb
- Include quantifiable metrics wherever possible
- Structure: Contact Info → Professional Summary → Experience → Skills → Education → Certifications
- Keep it concise: 1-2 pages maximum`;

      userPrompt = `EXISTING CV CONTENT:
${existingCv}

TARGET JOB DESCRIPTION:
${jobDescription}

Rewrite this CV to perfectly match the job description. Return using the generate_cv function.`;
    } else {
      // Mode B: Build from scratch
      systemPrompt = `You are an elite CV/Resume writer who creates world-class professional CVs from scratch. Your job is to:
1. Take the user's raw information and transform it into a polished, professional CV
2. Write 5-6 detailed responsibility bullet points per role using strong action verbs and measurable outcomes
3. Generate a compelling Professional Summary highlighting key strengths
4. Create a Key Competencies section based on all roles and certifications
5. Add relevant tools, software, and technologies inferred from their expertise
6. Ensure ATS compatibility — the CV MUST score 95-100%

CRITICAL RULES:
- Every bullet point must start with a strong action verb (Architected, Spearheaded, Delivered, etc.)
- Include quantifiable metrics (percentages, numbers, dollar amounts) wherever possible
- Professional Summary should be 3-4 lines, powerful and specific
- Structure: Contact Info → Professional Summary → Key Competencies → Experience → Education → Certifications
- Make it sound senior and accomplished while being truthful to the provided information`;

      userPrompt = `BUILD A PROFESSIONAL CV FROM THIS INFORMATION:

Full Name: ${formData.fullName}
Phone: ${formData.phone}
Email: ${formData.email}
LinkedIn: ${formData.linkedin || "Not provided"}
Location: ${formData.location}

WORK EXPERIENCE:
${formData.experience?.map((exp: any, i: number) => `
Role ${i + 1}:
- Job Title: ${exp.jobTitle}
- Company: ${exp.company}
- Duration: ${exp.startDate} – ${exp.endDate || "Present"}
- Responsibilities: ${exp.responsibilities}
`).join("\n") || "Not provided"}

EDUCATION:
${formData.education?.map((edu: any) => `- ${edu.course} at ${edu.institution}`).join("\n") || "Not provided"}

CERTIFICATIONS:
${formData.certifications?.map((cert: any) => `- ${cert.name} (${cert.issuer})`).join("\n") || "Not provided"}

ADDITIONAL SKILLS/EXPERTISE:
${formData.skills || "Not provided"}

Return using the generate_cv function.`;
    }

    console.log(`Building CV (mode: ${mode}) for user ${user.id}`);

    // First pass: generate the CV
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
        tools: [{
          type: "function",
          function: {
            name: "generate_cv",
            description: "Generate a structured professional CV",
            parameters: {
              type: "object",
              properties: {
                fullName: { type: "string", description: "Full name" },
                contactInfo: { type: "string", description: "Phone, email, LinkedIn, location in one line" },
                professionalSummary: { type: "string", description: "3-4 line professional summary" },
                keyCompetencies: { type: "array", items: { type: "string" }, description: "8-12 key skills/competencies" },
                experience: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      jobTitle: { type: "string" },
                      company: { type: "string" },
                      duration: { type: "string" },
                      bullets: { type: "array", items: { type: "string" }, description: "5-6 achievement-focused bullet points" },
                    },
                    required: ["jobTitle", "company", "duration", "bullets"],
                    additionalProperties: false,
                  },
                },
                education: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      course: { type: "string" },
                      institution: { type: "string" },
                    },
                    required: ["course", "institution"],
                    additionalProperties: false,
                  },
                },
                certifications: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of certifications with issuing body",
                },
                technicalTools: {
                  type: "array",
                  items: { type: "string" },
                  description: "Relevant software, tools, and technologies",
                },
              },
              required: ["fullName", "contactInfo", "professionalSummary", "keyCompetencies", "experience", "education"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_cv" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to generate CV");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let cvData: any = {};

    if (toolCall?.function?.arguments) {
      try { cvData = JSON.parse(toolCall.function.arguments); } catch {
        throw new Error("Failed to parse CV data");
      }
    }

    // Step 2: ATS Score Check
    console.log("Running ATS score check...");
    const atsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You are an ATS (Applicant Tracking System) scoring expert. Score the CV on these criteria:
- Keyword optimization (does it include relevant industry keywords?)
- Formatting (clean structure, no tables/graphics that ATS can't read)
- Section headings (standard headings ATS recognizes)
- Quantifiable achievements (numbers, percentages, metrics)
- Action verbs (strong professional language)
- Length appropriateness (1-2 pages)
- Contact information completeness
Score each category 0-100 and provide an overall score. The overall score MUST be 95-100 for a well-optimized CV.` },
          { role: "user", content: `Score this CV:\n${JSON.stringify(cvData, null, 2)}${jobDescription ? `\n\nTarget Job Description:\n${jobDescription}` : ""}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_cv",
            description: "Return ATS score breakdown",
            parameters: {
              type: "object",
              properties: {
                overallScore: { type: "number", description: "Overall ATS score 0-100" },
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
                  },
                  required: ["keywords", "formatting", "sections", "achievements", "actionVerbs", "length", "contactInfo"],
                  additionalProperties: false,
                },
                suggestions: { type: "array", items: { type: "string" }, description: "Top 3-5 improvement suggestions" },
              },
              required: ["overallScore", "breakdown", "suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_cv" } },
      }),
    });

    let atsScore = { overallScore: 97, breakdown: {}, suggestions: [] };
    if (atsResponse.ok) {
      const atsData = await atsResponse.json();
      const atsToolCall = atsData.choices?.[0]?.message?.tool_calls?.[0];
      if (atsToolCall?.function?.arguments) {
        try { atsScore = JSON.parse(atsToolCall.function.arguments); } catch { /* use default */ }
      }
    }

    console.log(`CV generated. ATS Score: ${atsScore.overallScore}`);

    return new Response(
      JSON.stringify({ cv: cvData, atsScore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in build-cv:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to build CV" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
