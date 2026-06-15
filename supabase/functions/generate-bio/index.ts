import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: "0-2 years of experience (entry level)",
  mid: "2-5 years of experience (mid level)",
  senior: "5+ years of experience (senior level)",
  expert: "8+ years of experience (expert/specialist level)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, primarySkill, skills, experienceLevel, location } = await req.json();

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const skillsStr = Array.isArray(skills) && skills.length > 0 ? skills.join(", ") : "";
    const experienceStr = EXPERIENCE_LABELS[experienceLevel] || "";

    const prompt = `Write a professional bio for a freelancer profile.
Name: ${name || "this professional"}
Primary skill: ${primarySkill || "various skills"}
${skillsStr ? `Other skills: ${skillsStr}` : ""}
${experienceStr ? `Experience: ${experienceStr}` : ""}
${location ? `Location: ${location}` : ""}

Write 2-3 sentences, max 80 words, first person, confident and friendly tone, highlighting their expertise and what clients can expect when working with them. Return only the bio text, no quotes or labels.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
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
    const text = data.content?.[0]?.text?.trim() || "";

    return new Response(
      JSON.stringify({ bio: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-bio error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
