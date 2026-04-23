// Validates every lesson/module video URL server-side and caches the verdict
// in `lesson_video_status`. Uses YouTube oEmbed (which returns 401/404 for
// deleted/private/region-blocked videos) and a HEAD probe for Vimeo/Loom.
// Idempotent — safe to call from a cron or admin button.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Verdict = { status: "ok" | "broken" | "unknown"; provider: string; reason?: string };

function detectProvider(url: string): "youtube" | "vimeo" | "loom" | "other" {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h === "youtu.be" || h.endsWith("youtube.com") || h.endsWith("youtube-nocookie.com")) return "youtube";
    if (h === "vimeo.com" || h === "player.vimeo.com") return "vimeo";
    if (h.endsWith("loom.com")) return "loom";
    return "other";
  } catch {
    return "other";
  }
}

async function checkYouTube(url: string): Promise<Verdict> {
  // oEmbed returns 200 with metadata for live videos; 401/404 for dead/private.
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  try {
    const res = await fetch(oembed, { method: "GET" });
    if (res.ok) return { status: "ok", provider: "youtube" };
    if (res.status === 401 || res.status === 404 || res.status === 403) {
      return { status: "broken", provider: "youtube", reason: `oembed ${res.status}` };
    }
    return { status: "unknown", provider: "youtube", reason: `oembed ${res.status}` };
  } catch (err) {
    return { status: "unknown", provider: "youtube", reason: String(err).slice(0, 200) };
  }
}

async function checkGenericHead(url: string, provider: string): Promise<Verdict> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    clearTimeout(t);
    if (res.status === 404 || res.status === 410) return { status: "broken", provider, reason: `head ${res.status}` };
    if (res.ok || res.status === 405) return { status: "ok", provider };
    return { status: "unknown", provider, reason: `head ${res.status}` };
  } catch (err) {
    return { status: "unknown", provider, reason: String(err).slice(0, 200) };
  }
}

async function validateOne(url: string): Promise<Verdict> {
  const provider = detectProvider(url);
  if (provider === "youtube") return checkYouTube(url);
  if (provider === "vimeo" || provider === "loom") return checkGenericHead(url, provider);
  return checkGenericHead(url, "other");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const onlyStale: boolean = body?.onlyStale ?? true;
    const maxAgeHours: number = body?.maxAgeHours ?? 24;
    const limit: number = Math.min(body?.limit ?? 500, 1000);

    // Gather all lesson + module URLs.
    const [lessonRes, modRes] = await Promise.all([
      supabase.from("learning_lessons").select("content_url").not("content_url", "is", null),
      supabase.from("learning_modules").select("content_url").not("content_url", "is", null),
    ]);

    const urls = new Set<string>();
    (lessonRes.data || []).forEach((r: any) => r.content_url && urls.add(r.content_url));
    (modRes.data || []).forEach((r: any) => r.content_url && urls.add(r.content_url));

    let urlList = Array.from(urls);

    // Skip URLs that were checked recently and still ok.
    if (onlyStale) {
      const cutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000).toISOString();
      const { data: cached } = await supabase
        .from("lesson_video_status")
        .select("url, status, checked_at")
        .in("url", urlList);
      const fresh = new Set(
        (cached || [])
          .filter((c: any) => c.checked_at > cutoff && c.status === "ok")
          .map((c: any) => c.url),
      );
      urlList = urlList.filter((u) => !fresh.has(u));
    }

    urlList = urlList.slice(0, limit);

    const results: { url: string; status: string; reason?: string }[] = [];
    // Sequential with a tiny delay to avoid rate-limiting YouTube oEmbed.
    for (const url of urlList) {
      const verdict = await validateOne(url);
      results.push({ url, status: verdict.status, reason: verdict.reason });
      await supabase.from("lesson_video_status").upsert({
        url,
        status: verdict.status,
        provider: verdict.provider,
        reason: verdict.reason ?? null,
        checked_at: new Date().toISOString(),
      });
      await new Promise((r) => setTimeout(r, 120));
    }

    const broken = results.filter((r) => r.status === "broken").length;
    const ok = results.filter((r) => r.status === "ok").length;
    const unknown = results.filter((r) => r.status === "unknown").length;

    return new Response(
      JSON.stringify({ checked: results.length, ok, broken, unknown, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("validate-lesson-videos error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
