import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { enforceToolLimit, limitResponse } from "../_shared/usage-limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── Auth + per-plan rate limit (#8) ──────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { jobTitle, jobDescription, requiredSkills, talentName, talentBio, talentSkills, experienceLevel, action } = await req.json();

  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  const gate = await enforceToolLimit(serviceClient, user.id, "proposals");
  if (!gate.allowed) return limitResponse(gate, corsHeaders);

  let userContent = `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription?.slice(0, 800) || "Not provided"}\n\nRequired Skills: ${(requiredSkills || []).join(", ")}\n\nTalent Name: ${talentName}\nTalent Bio: ${talentBio?.slice(0, 400) || "Not provided"}\nTalent Skills: ${(talentSkills || []).join(", ")}\nExperience Level: ${experienceLevel || "Intermediate"}`;

  let systemPrompt = "You are an expert freelance proposal writer. Write a concise, personalized proposal for this job. Address the client's specific needs, reference relevant experience from the talent's bio and skills, and end with a clear call to action. Maximum 250 words. No generic openers like 'I am writing to apply'. Be direct and professional.";

  if (action === "shorter") {
    systemPrompt = "Condense the following proposal to approximately 100 words while keeping the key points. Output only the condensed proposal.";
    userContent = `Original proposal to condense:\n\n${jobDescription}`;
  } else if (action === "formal") {
    systemPrompt = "Rewrite the following proposal in a more formal, professional tone. Keep the same length and key points. Output only the rewritten proposal.";
    userContent = `Proposal to make more formal:\n\n${jobDescription}`;
  } else if (action === "regenerate") {
    systemPrompt = "You are an expert freelance proposal writer. Write a DIFFERENT version of a proposal for this job. Use a different opening and structure than typical proposals. Maximum 250 words. No generic openers.";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const data = await response.json();
  const proposal = data.content?.[0]?.text || "";

  return new Response(JSON.stringify({ proposal }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
