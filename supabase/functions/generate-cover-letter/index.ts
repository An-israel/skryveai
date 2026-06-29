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
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cvText, jobDescription } = await req.json();

    if (!cvText || cvText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "CV content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert cover letter writer. Write professional, compelling cover letters that:
- Open with a strong hook referencing the specific role and company (if mentioned)
- Highlight 2-3 key achievements from the CV that are most relevant to the job
- Show genuine enthusiasm and fit without being generic
- Close with a confident, action-oriented call to action
- Are concise (3-4 paragraphs, max 350 words)
- Sound human and natural — never robotic or templated

CRITICAL: Use only facts from the CV provided. Do not invent experience, skills, or achievements.`;

    const userPrompt = jobDescription
      ? `Write a cover letter for this candidate applying for the following role.\n\nCANDIDATE CV:\n${cvText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nTailor the cover letter specifically to this job description using keywords and requirements from it.`
      : `Write a general cover letter for this candidate that showcases their strongest skills and achievements and can be customised per application.\n\nCANDIDATE CV:\n${cvText}`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 1500,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI service failed");
    }

    const aiData = await aiResponse.json();
    const coverLetter = aiData.content?.[0]?.text?.trim();

    if (!coverLetter) throw new Error("No cover letter returned from AI");

    console.log(`Cover letter generated for user ${user.id}, length: ${coverLetter.length}`);

    return new Response(JSON.stringify({ coverLetter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-cover-letter error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate cover letter" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
