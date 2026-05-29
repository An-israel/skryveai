import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, jobTitle, skills, experience, bullets } = await req.json();

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompt = "";

    if (action === "generate_summary") {
      const skillsStr = Array.isArray(skills) ? skills.join(", ") : (skills || "various skills");
      prompt = `Write a professional CV summary for a ${jobTitle || "Professional"} with skills in ${skillsStr} and ${experience || 0} years of experience. Max 3 sentences, 80 words. First person. Action-oriented. Return only the summary text, no quotes or labels.`;
    } else if (action === "improve_bullets") {
      prompt = `Improve these work experience bullet points for a CV. Return 3-5 strong action-verb bullet points. Each starts with a past tense action verb. Quantify achievements where possible. Return only the bullets, one per line, without numbering or dashes:\n\n${bullets}`;
    } else if (action === "regenerate_summary") {
      const skillsStr = Array.isArray(skills) ? skills.join(", ") : (skills || "various skills");
      prompt = `Write a different professional CV summary for a ${jobTitle || "Professional"}. Skills: ${skillsStr}. Max 3 sentences. First person. Different style from before. Return only the summary text, no quotes or labels.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text || "";

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-cv-summary error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
