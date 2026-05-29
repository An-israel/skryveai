import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const { messages, lessonTitle, lessonSummary } = await req.json();

  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  const systemPrompt = `You are a supportive learning coach for a skill course on the Skryve platform.
The student is currently on a lesson titled: "${lessonTitle}".
The lesson covers: "${lessonSummary || lessonTitle}".
Answer questions, give examples, and encourage the learner.
Be concise and practical. Max 150 words per response.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemPrompt,
      messages: messages,
    }),
  });

  const data = await response.json();
  const reply = data.content?.[0]?.text || "I couldn't process that. Please try again.";

  return new Response(JSON.stringify({ reply }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
