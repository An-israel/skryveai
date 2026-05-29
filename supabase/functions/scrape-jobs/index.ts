import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results = { scraped: 0, inserted: 0, errors: [] as string[] };

  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "Skryve Job Aggregator/1.0" }
    });
    const data = await res.json();
    const jobs = Array.isArray(data) ? data.filter((j: any) => j.id) : [];

    for (const job of jobs.slice(0, 50)) {
      results.scraped++;
      const { error } = await supabase
        .from("aggregated_jobs")
        .upsert({
          external_id: String(job.id),
          platform: "remoteok",
          title: job.position || job.title || "Untitled",
          description: (job.description || "").slice(0, 500),
          budget: null,
          job_type: "remote",
          location: "Remote",
          posted_at: job.date || new Date().toISOString(),
          external_url: job.url || `https://remoteok.com/l/${job.slug}`,
          skill_tags: Array.isArray(job.tags) ? job.tags.slice(0, 10) : [],
          is_active: true,
        }, { onConflict: "external_id,platform" });
      if (!error) results.inserted++;
      else results.errors.push(`remoteok ${job.id}: ${error.message}`);
    }
  } catch (e: any) {
    results.errors.push(`remoteok: ${e.message}`);
  }

  try {
    const res = await fetch("https://weworkremotely.com/remote-jobs.rss", {
      headers: { "User-Agent": "Skryve Job Aggregator/1.0" }
    });
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const item of items.slice(0, 30)) {
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || [])[1] || "";
      const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || "";
      const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || [])[1] || "";
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || "";
      const guid = (item.match(/<guid>(.*?)<\/guid>/) || [])[1] || link;

      if (!title || !link) continue;
      results.scraped++;

      const { error } = await supabase
        .from("aggregated_jobs")
        .upsert({
          external_id: guid,
          platform: "weworkremotely",
          title: title.replace(/^.*?:\s*/, ""),
          description: desc.replace(/<[^>]+>/g, "").slice(0, 500),
          budget: null,
          job_type: "remote",
          location: "Remote",
          posted_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          external_url: link,
          skill_tags: [],
          is_active: true,
        }, { onConflict: "external_id,platform" });
      if (!error) results.inserted++;
      else results.errors.push(`wwr ${guid}: ${error.message}`);
    }
  } catch (e: any) {
    results.errors.push(`weworkremotely: ${e.message}`);
  }

  const upworkSkills = ["react", "nodejs", "python", "design", "copywriting", "marketing", "data-analysis"];
  for (const skill of upworkSkills.slice(0, 3)) {
    try {
      const res = await fetch(`https://www.upwork.com/ab/feed/jobs/rss?q=${skill}&sort=recency`, {
        headers: { "User-Agent": "Skryve Job Aggregator/1.0" }
      });
      const xml = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const item of items.slice(0, 10)) {
        const title = (item.match(/<title>(.*?)<\/title>/) || [])[1] || "";
        const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || "";
        const desc = (item.match(/<description>(.*?)<\/description>/s) || [])[1] || "";
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || "";
        const guid = (item.match(/<guid>(.*?)<\/guid>/) || [])[1] || link;

        if (!title || !link) continue;
        results.scraped++;

        const budgetMatch = desc.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?/);
        const budget = budgetMatch ? budgetMatch[0] : null;

        const { error } = await supabase
          .from("aggregated_jobs")
          .upsert({
            external_id: guid,
            platform: "upwork",
            title: title,
            description: desc.replace(/<[^>]+>/g, "").slice(0, 500),
            budget: budget,
            job_type: "contract",
            location: "Remote",
            posted_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            external_url: link,
            skill_tags: [skill],
            is_active: true,
          }, { onConflict: "external_id,platform" });
        if (!error) results.inserted++;
        else results.errors.push(`upwork ${guid}: ${error.message}`);
      }
    } catch (e: any) {
      results.errors.push(`upwork-${skill}: ${e.message}`);
    }
  }

  await supabase
    .from("aggregated_jobs")
    .update({ is_active: false })
    .lt("posted_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
