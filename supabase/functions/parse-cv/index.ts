// parse-cv — extracts text from an uploaded CV (PDF or DOCX) and turns it into
// structured profile JSON via the Anthropic API. Runs server-side so the client
// never handles an API key and the frontend bundle stays free of parser deps.
//
// Flow: client uploads the file to the private cv-uploads bucket, then calls this
// with { path }. We download it (service role bypasses RLS), extract raw text,
// ask the model for a strict JSON shape, and persist both onto the user's
// master_cvs row. The parsed JSON is returned for the editable review screen.
//
// Cost note: uses Haiku — pulling fields out of plain text is easy work, and this
// keeps the per-upload cost minimal.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.11.0";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { enforceToolLimit, limitResponse } from "../_shared/usage-limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text) ?? "";
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  // A .docx is a zip; the body text lives in word/document.xml. We unzip it and
  // strip the XML rather than pull in a Node-oriented DOCX lib (unreliable on Deno).
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.file("word/document.xml");
  if (!doc) return "";
  const xml = await doc.async("string");
  const withBreaks = xml
    .replace(/<\/w:p>/g, "\n")     // paragraph end → newline
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n");
  const text = withBreaks.replace(/<[^>]+>/g, ""); // drop all remaining tags
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return json({ error: "AI service not configured" }, 500);

    // Per-plan + global anti-abuse rate limit (shared with the CV builder).
    const gate = await enforceToolLimit(serviceClient, user.id, "cv_builder");
    if (!gate.allowed) return limitResponse(gate, corsHeaders);

    const { path, fileName } = await req.json();
    if (!path || typeof path !== "string") return json({ error: "Missing file path" }, 400);

    // Guard: the path must live under the caller's own folder.
    if (!path.startsWith(`${user.id}/`)) return json({ error: "Forbidden" }, 403);

    // Download the uploaded file from the private bucket.
    const { data: fileData, error: dlError } = await serviceClient.storage
      .from("cv-uploads").download(path);
    if (dlError || !fileData) return json({ error: "Could not read the uploaded file" }, 400);

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const lowerName = (fileName || path).toLowerCase();

    let rawText = "";
    try {
      if (lowerName.endsWith(".pdf")) {
        rawText = await extractPdf(bytes);
      } else if (lowerName.endsWith(".docx")) {
        rawText = await extractDocx(bytes);
      } else {
        return json({ error: "Unsupported file type. Upload a PDF or DOCX." }, 400);
      }
    } catch (_e) {
      return json({ error: "We couldn't read that file. Try a different PDF or DOCX." }, 400);
    }

    rawText = rawText.replace(/\s{3,}/g, "  ").trim();
    if (rawText.length < 30) {
      return json({ error: "That file didn't contain readable text (it may be a scan)." }, 400);
    }
    // Keep the prompt bounded; a CV rarely needs more than this.
    const clipped = rawText.slice(0, 24000);

    const systemPrompt =
      "You extract structured data from a CV/résumé. Return ONLY the extract_profile " +
      "tool call — no prose. Use only information present in the text. Never invent " +
      "companies, roles, skills, dates, or achievements. If a field is absent, omit it " +
      "or use an empty value. Keep skills concise (single words or short phrases).";

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: `CV TEXT:\n\n${clipped}` }],
        tools: [{
          name: "extract_profile",
          description: "Return the structured profile extracted from the CV text.",
          input_schema: {
            type: "object",
            properties: {
              full_name: { type: "string" },
              headline: { type: "string", description: "Professional title/headline, e.g. 'Senior Frontend Engineer'" },
              bio: { type: "string", description: "A 2-4 sentence professional summary drawn from the CV" },
              location: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              years_experience: { type: "number", description: "Approx total years of professional experience" },
              links: { type: "array", items: { type: "string" }, description: "Portfolio/LinkedIn/GitHub URLs" },
              skills: { type: "array", items: { type: "string" } },
              work_experience: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    company: { type: "string" },
                    role: { type: "string" },
                    start_date: { type: "string" },
                    end_date: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["company", "role"],
                  additionalProperties: false,
                },
              },
              education: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    institution: { type: "string" },
                    qualification: { type: "string" },
                    year: { type: "string" },
                  },
                  required: ["institution"],
                  additionalProperties: false,
                },
              },
            },
            required: ["full_name"],
            additionalProperties: false,
          },
        }],
        tool_choice: { type: "tool", name: "extract_profile" },
      }),
    });

    if (!aiResponse.ok) {
      const detail = await aiResponse.text();
      console.error("Anthropic error:", aiResponse.status, detail);
      return json({ error: "The parser is busy right now. Please try again." }, 502);
    }

    const aiData = await aiResponse.json();
    const toolUse = (aiData.content || []).find((c: { type: string }) => c.type === "tool_use");
    if (!toolUse?.input) return json({ error: "Could not extract data from that CV." }, 422);

    const parsed = toolUse.input as Record<string, unknown>;

    // Persist the master CV (one row per user; re-upload replaces it).
    const { error: upsertError } = await serviceClient
      .from("master_cvs")
      .upsert({
        user_id: user.id,
        file_url: path,
        file_name: fileName ?? path.split("/").pop() ?? null,
        raw_text: rawText,
        parsed_json: parsed,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (upsertError) console.error("master_cvs upsert failed:", upsertError.message);

    return json({ parsed });
  } catch (e) {
    console.error("parse-cv fatal:", e);
    return json({ error: "Something went wrong parsing your CV." }, 500);
  }
});
