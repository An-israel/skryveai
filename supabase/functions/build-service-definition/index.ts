import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_SIGNALS = [
  "no_trust_badges",
  "slow_load",
  "not_mobile_responsive",
  "outdated_design",
  "no_clear_cta",
  "no_email_capture",
  "weak_copy",
  "no_blog_or_content",
  "no_social_links",
  "broken_links",
  "thin_content",
  "no_seo_meta",
  "no_https",
  "weak_brand",
  "generic_design",
  "no_video_content",
  "poor_navigation",
  "no_testimonials",
  "outdated_copyright",
  "no_about_page",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    if (!isServiceRole) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { rawDescription, expertise } = await req.json();
    if (!rawDescription) {
      return new Response(JSON.stringify({ error: "rawDescription required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      "You analyze a freelancer's service description and produce structured criteria for finding businesses that show signals of needing that service. Output ONLY via the structured tool call.";

    const userPrompt = `The freelancer is a ${expertise || "general digital service provider"}.

They described their service:
"${rawDescription}"

Identify the optimal target market (industry vertical), an ideal target profile, and the most relevant pain signals (from the allowed list) that indicate a business needs this service.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "build_service_criteria",
              description: "Return structured criteria for smart business discovery",
              parameters: {
                type: "object",
                properties: {
                  industryVertical: { type: "string" },
                  targetProfile: { type: "string" },
                  signalsToDetect: {
                    type: "array",
                    items: { type: "string", enum: ALLOWED_SIGNALS },
                  },
                },
                required: ["industryVertical", "targetProfile", "signalsToDetect"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_service_criteria" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResp.text();
      console.error("AI error:", errText);
      throw new Error(`AI failed: ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No structured response from AI");
    const parsed = JSON.parse(args);

    return new Response(
      JSON.stringify({
        rawDescription,
        industryVertical: parsed.industryVertical,
        targetProfile: parsed.targetProfile,
        signalsToDetect: parsed.signalsToDetect,
        availableSignals: ALLOWED_SIGNALS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("build-service-definition error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
