import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://skryveai.com";

const STATIC_ROUTES: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/pricing", changefreq: "monthly", priority: "0.9" },
  { loc: "/about", changefreq: "monthly", priority: "0.7" },
  { loc: "/contact", changefreq: "monthly", priority: "0.6" },
  { loc: "/careers", changefreq: "monthly", priority: "0.5" },
  { loc: "/cv-builder", changefreq: "weekly", priority: "0.9" },
  { loc: "/ats-checker", changefreq: "weekly", priority: "0.9" },
  { loc: "/linkedin-analyzer", changefreq: "weekly", priority: "0.9" },
  { loc: "/auto-pilot", changefreq: "weekly", priority: "0.8" },
  { loc: "/blog", changefreq: "daily", priority: "0.9" },
  { loc: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  { loc: "/login", changefreq: "monthly", priority: "0.4" },
  { loc: "/signup", changefreq: "monthly", priority: "0.8" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("published", true)
      .order("published_at", { ascending: false });

    const urls: string[] = [];

    for (const r of STATIC_ROUTES) {
      urls.push(`  <url>\n    <loc>${SITE}${r.loc}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`);
    }

    for (const p of posts ?? []) {
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : "";
      urls.push(`  <url>\n    <loc>${SITE}/blog/${p.slug}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ""}<changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
