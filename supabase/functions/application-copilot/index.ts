// Application Copilot — guides a talent through every phase of applying to a
// job, entirely in-app: step-specific tips and an ask-anything assistant.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { enforceToolLimit, limitResponse } from "../_shared/usage-limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEP_FOCUS: Record<string, string> = {
  proposal:
    "They are writing their proposal/cover note. Tell them exactly what to emphasize for THIS job: which of the required skills to lead with, what the client/employer most wants to hear, and one concrete thing to mention that would make them stand out. Warn against generic openers.",
  cv: "They are tailoring their CV to this job. Tell them which keywords from the job description must appear in the CV, which experience to move to the top, and what ATS filters will look for in this specific role.",
  apply:
    "They are about to submit. Give a final pre-submit checklist specific to this job: what to double-check in the proposal and CV, how to set the rate/timeline if asked, and one tip for following up professionally.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Logged for admin visibility; no plan cap unless one is configured.
    const gate = await enforceToolLimit(serviceClient, user.id, "copilot");
    if (!gate.allowed) return limitResponse(gate, corsHeaders);

    const { jobTitle, jobDescription, requiredSkills, step, question, proposal } = await req.json();

    const jobContext = `JOB: ${jobTitle}\n\nDESCRIPTION:\n${(jobDescription || "").slice(0, 1500)}\n\nREQUIRED SKILLS: ${(requiredSkills || []).join(", ") || "not listed"}`;

    let systemPrompt: string;
    let userContent: string;

    if (question) {
      systemPrompt =
        "You are Skryve's Application Copilot — a sharp, encouraging career coach helping a talent apply to a specific job. Answer their question concretely and concisely (under 120 words), always grounded in the job details provided. Never tell them to leave the platform; every step of preparation happens right here.";
      userContent = `${jobContext}\n\n${proposal ? `THEIR CURRENT PROPOSAL DRAFT:\n${String(proposal).slice(0, 1200)}\n\n` : ""}QUESTION: ${question}`;
    } else {
      systemPrompt =
        "You are Skryve's Application Copilot. Give exactly 3 short, specific, actionable tips as a markdown bullet list (each under 25 words). No preamble, no closing line — just the 3 bullets. Ground every tip in the actual job details.";
      userContent = `${jobContext}\n\nCONTEXT: ${STEP_FOCUS[step] || STEP_FOCUS.proposal}`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Copilot AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Copilot is unavailable right now" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("application-copilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Copilot failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
