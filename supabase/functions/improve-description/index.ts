import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { description } = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Improve this freelance job description to be clearer, more professional, and more attractive to top talent. Keep the same meaning and requirements but improve clarity and structure. Return only the improved description text, no preamble.\n\nOriginal:\n${description}`,
        },
      ],
    }),
  });

  const data = await response.json();
  const improved = data.content?.[0]?.text || description;

  return new Response(JSON.stringify({ improved }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
