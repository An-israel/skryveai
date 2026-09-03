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

function xmlToText(xml: string): string {
  const withBreaks = xml
    .replace(/<\/w:p>/g, "\n")     // paragraph end → newline
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n");
  const text = withBreaks.replace(/<[^>]+>/g, ""); // drop all remaining tags
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  // A .docx is a zip; the body text lives in word/document.xml. We unzip it and
  // strip the XML rather than pull in a Node-oriented DOCX lib (unreliable on Deno).
  //
  // Many resume templates put the name/contact block in a header, footer, or a
  // sidebar built from a header — none of that lives in document.xml, so a
  // template-styled two-column resume can extract as "empty" even though the
  // file has plenty of text. Pull in every header/footer part too.
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.file("word/document.xml");
  if (!doc) return "";

  const parts = [doc];
  for (const name of Object.keys(zip.files)) {
    if (/^word\/(header|footer)\d*\.xml$/.test(name)) parts.push(zip.file(name)!);
  }

  const texts = await Promise.all(parts.map(async (p) => xmlToText(await p.async("string"))));
  return texts.join("\n");
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

    // Plain-JSON prompt (same call shape as the working generate-* functions —
    // no tool-calling, which is what was failing). Ask for a strict JSON object
    // with two parallel shapes: the raw extraction ("original") and a lightly
    // polished rewrite of the summary/bullets ("improved"), so the client can
    // show a before/after and let the user pick per-section.
    const systemPrompt =
      "You extract structured data from a CV/résumé AND produce a polished rewrite of its " +
      "summary and role bullet points. Respond with ONLY a valid JSON object — no prose, no " +
      "markdown, no code fences. Use exactly this shape: " +
      '{"original":{"full_name":"","headline":"","bio":"","location":"","email":"","phone":"",' +
      '"years_experience":0,"links":[],"skills":[],' +
      '"work_experience":[{"company":"","role":"","start_date":"","end_date":"","description":""}],' +
      '"education":[{"institution":"","qualification":"","year":""}]},' +
      '"improved":{"headline":"","bio":"","work_experience":[{"description":""}]}}. ' +
      "For \"original\": use only information present in the text — never invent companies, " +
      "roles, skills, dates, or achievements. Omit or leave empty anything not present. Keep " +
      "skills concise. For \"improved\": rewrite original.headline and original.bio to read " +
      "more polished and professional — concise, active voice, no fluff or clichés — and " +
      "rewrite each work_experience entry's description into 2 to 4 punchy bullet points " +
      "(separate bullets with \\n) using strong action verbs. Only improve the WRITING — never " +
      "invent facts, numbers, companies, dates, or achievements not already present in " +
      "original. improved.work_experience must have exactly the same number of entries, in the " +
      "same order, as original.work_experience.";

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6144,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: `CV TEXT:\n\n${clipped}` }],
      }),
    });

    if (!aiResponse.ok) {
      const detail = await aiResponse.text();
      // Log the full provider response for diagnosis — never echo it to the
      // client, since it can contain internal account/billing details (e.g.
      // Anthropic's "organization has been disabled" for our own account).
      console.error("Anthropic error:", aiResponse.status, detail);
      return json({ error: "The CV parser is temporarily unavailable. Please try again shortly." }, 502);
    }

    const aiData = await aiResponse.json();
    const rawOut = (aiData.content || []).map((c: { type: string; text?: string }) => c.type === "text" ? (c.text || "") : "").join("").trim();
    // Strip any accidental markdown fences and grab the JSON object.
    const jsonText = (rawOut.match(/\{[\s\S]*\}/) || [rawOut])[0];
    let result: { original?: Record<string, unknown>; improved?: Record<string, unknown> };
    try {
      result = JSON.parse(jsonText);
    } catch {
      console.error("parse-cv: model did not return JSON:", rawOut.slice(0, 200));
      return json({ error: "Couldn't read that CV — please try a cleaner PDF/DOCX." }, 422);
    }
    const original = result.original ?? {};
    const improved = result.improved ?? {};

    // Tell the user honestly if nothing useful was extracted, instead of
    // silently "succeeding" with an empty CV (e.g. a template layout our
    // extractor couldn't read, or a scan with a little garbled OCR text).
    const workExp = original.work_experience;
    const hasContent =
      !!(original.full_name || original.email) ||
      (Array.isArray(workExp) && workExp.length > 0) ||
      (typeof original.bio === "string" && original.bio.trim().length > 20);
    if (!hasContent) {
      return json({ error: "We opened your file but couldn't find recognizable resume content. Try exporting it as a standard (non-scanned) PDF, or fill in the builder manually." }, 422);
    }

    // Persist the master CV (one row per user; re-upload replaces it).
    const { error: upsertError } = await serviceClient
      .from("master_cvs")
      .upsert({
        user_id: user.id,
        file_url: path,
        file_name: fileName ?? path.split("/").pop() ?? null,
        raw_text: rawText,
        parsed_json: original,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (upsertError) console.error("master_cvs upsert failed:", upsertError.message);

    return json({ parsed: original, improved });
  } catch (e) {
    console.error("parse-cv fatal:", e);
    return json({ error: "Something went wrong parsing your CV." }, 500);
  }
});
