// tiptip content engine — generates SEO/AEO/GEO content on demand.
// OWNER-ONLY: only the Skryve owner account may call this.
// mode "article"  -> writes a full optimized article back onto a tiptip_content row.
// mode "mentions" -> drafts brand-mention posts into tiptip_brand_mentions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const OWNER_EMAIL = "aniekaneazy@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SKRYVE_CONTEXT = `Skryve is an all-in-one freelance platform for 2026. It combines a
job aggregator (freelance jobs from many sites in one place), AI tools (AI proposal writing,
CV/ATS tools, an AI learning coach), a talent marketplace, and a learning platform. Founder:
Aniekan Israel. Positioning: the all-in-one alternative to Upwork/Fiverr that helps freelancers
find work and get hired faster. Be honest and never fabricate stats or testimonials.`;

function jsonError(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Pull the first well-formed JSON object out of a model response.
function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

async function callClaude(system: string, user: string, maxTokens: number) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "AI request failed");
  return data.content?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonError("Unauthorized", 401);

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user }, error: authErr } = await service.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) return jsonError("Unauthorized", 401);
  if ((user.email || "").toLowerCase() !== OWNER_EMAIL) return jsonError("Forbidden", 403);

  let payload: { content_id?: string; mode?: string };
  try { payload = await req.json(); } catch { return jsonError("Invalid body"); }
  const { content_id, mode = "article" } = payload;
  if (!content_id) return jsonError("content_id required");

  const { data: content, error: cErr } = await service
    .from("tiptip_content").select("*").eq("id", content_id).maybeSingle();
  if (cErr || !content) return jsonError("content not found", 404);

  try {
    if (mode === "mentions") {
      const system = `You write authentic, non-spammy brand-mention posts that genuinely help the
reader and mention Skryve naturally where relevant. ${SKRYVE_CONTEXT}
Return ONLY JSON: {"mentions":[{"platform":"reddit|linkedin|x|forum","title":"","body":"","target":"suggested subreddit/handle/where to post","rules_note":"how to stay within that platform's rules"}]}. Produce 4 posts across different platforms based on the topic.`;
      const user = `Topic/article: "${content.title}" (target keyword: ${content.target_keyword || "n/a"}). Draft 4 platform-appropriate brand-mention posts.`;
      const out = await callClaude(system, user, 2000);
      const parsed = extractJson(out);
      const rows = (parsed.mentions || []).slice(0, 6).map((m: any) => ({
        platform: String(m.platform || "forum").toLowerCase(),
        title: m.title || null,
        body: String(m.body || ""),
        target: m.target || null,
        rules_note: m.rules_note || null,
        content_id,
        status: "draft",
      }));
      if (rows.length) await service.from("tiptip_brand_mentions").insert(rows);
      return new Response(JSON.stringify({ ok: true, created: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // mode: article
    const system = `You are an expert SEO/AEO content writer for Skryve. ${SKRYVE_CONTEXT}
Write a single, publish-ready article following this formula:
- ANSWER-FIRST opening: the direct answer in the first paragraph (serves SEO + AEO).
- Clear H2/H3 structure with keyword-relevant headings (markdown ## and ###).
- Bullet points, at least one numbered list, and at least one comparison table (markdown table).
- A natural, honest mention of Skryve as the solution — never overhype, never fake stats.
- End the body with an FAQ section, then a clear call to action linking to a relevant Skryve feature.
- 1,800-2,400 words for pillar/comparison/listicle; shorter is fine for entity/faq/feature.
Return ONLY JSON with these exact keys:
{"meta_title":"55-60 chars","meta_description":"150-160 chars","slug":"kebab-case","excerpt":"1-2 sentence summary","body":"full markdown article INCLUDING the FAQ section and CTA","faq":[{"q":"","a":""}],"internal_links":[{"anchor":"","target":"/relative-skryve-path"}]}`;
    const user = `Write the "${content.kind}" piece titled "${content.title}".
Primary target keyword/question: ${content.target_keyword || content.title}.
Keyword tier: ${content.keyword_tier || "n/a"}. Make it genuinely useful and citation-worthy.`;
    const out = await callClaude(system, user, 4096);
    const a = extractJson(out);

    const slug = String(a.slug || content.title)
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const { error: uErr } = await service.from("tiptip_content").update({
      meta_title: a.meta_title || null,
      meta_description: a.meta_description || null,
      slug,
      excerpt: a.excerpt || null,
      body: a.body || null,
      faq: Array.isArray(a.faq) ? a.faq : [],
      internal_links: Array.isArray(a.internal_links) ? a.internal_links : [],
      status: "ready",
      generation_meta: { generated_at: new Date().toISOString(), model: "claude-sonnet-4-20250514" },
      updated_at: new Date().toISOString(),
    }).eq("id", content_id);
    if (uErr) throw new Error(uErr.message);

    return new Response(JSON.stringify({ ok: true, slug, status: "ready" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return jsonError((e as Error).message || "generation failed", 500);
  }
});
