import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only aggregate open-apply remote job boards where a talent can apply directly
// via the listing's URL. Closed bidding/enrolment platforms (Upwork, Fiverr,
// Freelancer, Toptal) are intentionally excluded.
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const UA = "Skryve Job Aggregator/1.0 (+https://skryveai.com)";

type AggJob = {
  external_id: string;
  platform: string;
  title: string;
  description: string | null;
  budget: string | null;
  job_type: string;
  location: string;
  posted_at: string;
  external_url: string;
  skill_tags: string[];
  is_active: boolean;
};

// ── helpers ──────────────────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t || "").toLowerCase().trim())
    .filter(Boolean)
    .slice(0, 12);
}

// Returns true when posted within the freshness window. Unknown/unparseable
// dates are treated as too old so we never surface stale-looking listings.
function isFresh(posted: string | null): boolean {
  if (!posted) return false;
  const t = new Date(posted).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= MAX_AGE_MS;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

// ── source adapters: each returns a normalised AggJob[] ──────────────────────

async function fromRemoteOK(): Promise<AggJob[]> {
  const data = await fetchJson("https://remoteok.com/api");
  const rows = Array.isArray(data) ? data.filter((j: any) => j && j.id) : [];
  return rows.map((j: any) => ({
    external_id: String(j.id),
    platform: "remoteok",
    title: j.position || j.title || "Untitled",
    description: stripHtml(j.description || "").slice(0, 800),
    budget: j.salary_min && j.salary_max ? `$${j.salary_min}–$${j.salary_max}` : null,
    job_type: "remote",
    location: j.location || "Remote",
    posted_at: j.date || new Date().toISOString(),
    external_url: j.url || `https://remoteok.com/l/${j.slug || j.id}`,
    skill_tags: normTags(j.tags),
    is_active: true,
  }));
}

async function fromWeWorkRemotely(): Promise<AggJob[]> {
  const xml = await fetchText("https://weworkremotely.com/remote-jobs.rss");
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  const jobs: AggJob[] = [];
  for (const item of items) {
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/) || [])[1] || "";
    const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || "";
    const desc = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "";
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || "";
    const guid = (item.match(/<guid[^>]*>(.*?)<\/guid>/) || [])[1] || link;
    if (!title || !link) continue;
    jobs.push({
      external_id: guid,
      platform: "weworkremotely",
      title: title.replace(/^.*?:\s*/, "").trim(),
      description: stripHtml(desc).slice(0, 800),
      budget: null,
      job_type: "remote",
      location: "Remote",
      posted_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      external_url: link,
      skill_tags: [],
      is_active: true,
    });
  }
  return jobs;
}

async function fromRemotive(): Promise<AggJob[]> {
  const data = await fetchJson("https://remotive.com/api/remote-jobs?limit=80");
  const rows = Array.isArray(data?.jobs) ? data.jobs : [];
  return rows.map((j: any) => ({
    external_id: String(j.id),
    platform: "remotive",
    title: j.title || "Untitled",
    description: stripHtml(j.description || "").slice(0, 800),
    budget: j.salary || null,
    job_type: (j.job_type || "remote").toLowerCase().includes("contract") ? "contract" : "remote",
    location: j.candidate_required_location || "Remote",
    posted_at: j.publication_date || new Date().toISOString(),
    external_url: j.url,
    skill_tags: normTags(j.tags),
    is_active: true,
  })).filter((j: AggJob) => j.external_url);
}

async function fromArbeitnow(): Promise<AggJob[]> {
  const data = await fetchJson("https://www.arbeitnow.com/api/job-board-api");
  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows.map((j: any) => {
    const created = j.created_at ? new Date(Number(j.created_at) * 1000).toISOString() : new Date().toISOString();
    return {
      external_id: String(j.slug || j.url),
      platform: "arbeitnow",
      title: j.title || "Untitled",
      description: stripHtml(j.description || "").slice(0, 800),
      budget: null,
      job_type: j.remote ? "remote" : (Array.isArray(j.job_types) && j.job_types[0]) || "full-time",
      location: j.location || (j.remote ? "Remote" : ""),
      posted_at: created,
      external_url: j.url,
      skill_tags: normTags(j.tags),
      is_active: true,
    };
  }).filter((j: AggJob) => j.external_url);
}

async function fromJobicy(): Promise<AggJob[]> {
  const data = await fetchJson("https://jobicy.com/api/v2/remote-jobs?count=50");
  const rows = Array.isArray(data?.jobs) ? data.jobs : [];
  return rows.map((j: any) => ({
    external_id: String(j.id),
    platform: "jobicy",
    title: j.jobTitle || "Untitled",
    description: stripHtml(j.jobExcerpt || j.jobDescription || "").slice(0, 800),
    budget: j.annualSalaryMin && j.annualSalaryMax ? `${j.salaryCurrency || "$"}${j.annualSalaryMin}–${j.annualSalaryMax}` : null,
    job_type: Array.isArray(j.jobType) && j.jobType[0] ? String(j.jobType[0]).toLowerCase() : "remote",
    location: j.jobGeo || "Remote",
    posted_at: j.pubDate ? new Date(j.pubDate).toISOString() : new Date().toISOString(),
    external_url: j.url,
    skill_tags: normTags(j.jobIndustry),
    is_active: true,
  })).filter((j: AggJob) => j.external_url);
}

async function fromHimalayas(): Promise<AggJob[]> {
  const data = await fetchJson("https://himalayas.app/jobs/api?limit=50");
  const rows = Array.isArray(data?.jobs) ? data.jobs : [];
  return rows.map((j: any) => ({
    external_id: String(j.guid || j.applicationLink || j.title),
    platform: "himalayas",
    title: j.title || "Untitled",
    description: stripHtml(j.description || j.excerpt || "").slice(0, 800),
    budget: j.minSalary && j.maxSalary ? `$${j.minSalary}–$${j.maxSalary}` : null,
    job_type: "remote",
    location: Array.isArray(j.locationRestrictions) && j.locationRestrictions.length ? j.locationRestrictions.join(", ") : "Remote",
    posted_at: j.pubDate ? new Date(typeof j.pubDate === "number" ? j.pubDate * 1000 : j.pubDate).toISOString() : new Date().toISOString(),
    external_url: j.applicationLink || j.url,
    skill_tags: normTags(j.categories),
    is_active: true,
  })).filter((j: AggJob) => j.external_url);
}

const SOURCES: { name: string; run: () => Promise<AggJob[]> }[] = [
  { name: "remoteok", run: fromRemoteOK },
  { name: "weworkremotely", run: fromWeWorkRemotely },
  { name: "remotive", run: fromRemotive },
  { name: "arbeitnow", run: fromArbeitnow },
  { name: "jobicy", run: fromJobicy },
  { name: "himalayas", run: fromHimalayas },
];

// ── handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results = {
    scraped: 0,
    fresh: 0,
    inserted: 0,
    per_source: {} as Record<string, number>,
    removed: 0,
    errors: [] as string[],
  };

  // Pull every source independently so one failing board never blocks the rest.
  const settled = await Promise.allSettled(SOURCES.map((s) => s.run()));

  for (let i = 0; i < settled.length; i++) {
    const source = SOURCES[i];
    const outcome = settled[i];
    if (outcome.status === "rejected") {
      results.errors.push(`${source.name}: ${outcome.reason?.message || outcome.reason}`);
      continue;
    }

    const fresh = outcome.value.filter((j) => isFresh(j.posted_at));
    results.scraped += outcome.value.length;
    results.fresh += fresh.length;
    results.per_source[source.name] = fresh.length;

    // Upsert in chunks to keep each request small.
    for (let c = 0; c < fresh.length; c += 50) {
      const chunk = fresh.slice(c, c + 50);
      const { error } = await supabase
        .from("aggregated_jobs")
        .upsert(chunk, { onConflict: "external_id,platform" });
      if (error) results.errors.push(`${source.name} upsert: ${error.message}`);
      else results.inserted += chunk.length;
    }
  }

  // Enforce the freshness cap: anything older than the window must not appear.
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const { count, error: delErr } = await supabase
    .from("aggregated_jobs")
    .delete({ count: "exact" })
    .lt("posted_at", cutoff);
  if (delErr) results.errors.push(`cleanup: ${delErr.message}`);
  else results.removed = count ?? 0;

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
