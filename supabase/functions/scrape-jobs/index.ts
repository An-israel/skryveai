import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Two kinds of source:
//  • "fresh"  — high-churn remote boards that reflow constantly. Only listings
//               posted within MAX_AGE_DAYS are kept; older ones are pruned.
//  • "ats"    — company applicant-tracking boards (Greenhouse / Lever / Ashby /
//               Adzuna). A company role can stay open for weeks, so these are
//               evergreen: we don't age them out by posted date. Instead each
//               scrape refreshes `scraped_at` (last-seen), and a role that drops
//               off its board simply stops being refreshed and is pruned after
//               ATS_STALE_DAYS. This lets us mirror jobs from companies all over
//               the world so users apply on Skryve instead of hopping sites.
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const ATS_STALE_DAYS = 4;
const ATS_STALE_MS = ATS_STALE_DAYS * 24 * 60 * 60 * 1000;
const UA = "Skryve Job Aggregator/1.0 (+https://skryveai.com)";
const MAX_TRANSLATIONS = 60; // per run, to bound cost/latency

type SourceType = "fresh" | "ats";

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
  scraped_at?: string; // set for ats sources (last-seen)
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

function isFresh(posted: string | null): boolean {
  if (!posted) return false;
  const t = new Date(posted).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= MAX_AGE_MS;
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

// Heuristic language check: is this text likely NOT English? We flag text that
// carries non-English diacritics/characters or common non-English function
// words, and lacks the density of English stop-words we'd expect. Cheap and
// good enough to decide what to send for translation.
const EN_STOP = /\b(the|and|for|with|you|are|our|will|your|work|team|experience|responsibilities|requirements|about|role)\b/gi;
const FOREIGN_HINT = /[àâäçéèêëîïôöûüùñãõ]|\b(und|oder|für|mit|der|die|das|wir|deine|erfahrung|aufgaben|nous|vous|votre|et|le|la|les|des|para|con|una|trabajo|equipo|voor|een|het|werk)\b/i;
function looksNonEnglish(title: string, desc: string): boolean {
  const text = `${title} ${desc}`.trim();
  if (text.length < 12) return false;
  const enMatches = (text.match(EN_STOP) || []).length;
  const words = text.split(/\s+/).length;
  const enDensity = enMatches / Math.max(words, 1);
  if (FOREIGN_HINT.test(text) && enDensity < 0.06) return true;
  return false;
}

// Batch-translate non-English jobs to English with Claude. Returns a map from
// the job's index to its translated { title, description }. Best-effort: any
// failure leaves the original text in place.
async function translateBatch(
  key: string,
  items: { i: number; title: string; description: string }[],
): Promise<Map<number, { title: string; description: string }>> {
  const out = new Map<number, { title: string; description: string }>();
  for (let b = 0; b < items.length; b += 10) {
    const chunk = items.slice(b, b + 10);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-8",
          max_tokens: 2000,
          system:
            "You translate job listings into natural English. Return ONLY a JSON array of " +
            '{"i":<index>,"title":"...","description":"..."} objects — one per input item, ' +
            "preserving the given index. If an item is already English, return it unchanged. No prose.",
          messages: [{ role: "user", content: JSON.stringify(chunk.map((c) => ({ i: c.i, title: c.title, description: c.description.slice(0, 700) }))) }],
        }),
      });
      if (!res.ok) continue;
      const d = await res.json();
      const raw = d.content?.[0]?.text || "";
      const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
      const arr = JSON.parse(json);
      for (const r of arr) {
        if (typeof r?.i === "number" && r.title) out.set(r.i, { title: String(r.title), description: String(r.description || "") });
      }
    } catch (_e) { /* keep originals */ }
  }
  return out;
}

// ── fresh remote-board adapters ──────────────────────────────────────────────

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
  })).filter((j: AggJob) => j.url);
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

// ── company ATS adapters ─────────────────────────────────────────────────────
// Curated public board tokens for well-known companies hiring globally. These
// are the systems Amazon, xAI, Stripe, Paystack & co. post through, so mirroring
// them brings real company jobs into Skryve. Tokens are easy to extend.

const GREENHOUSE = [
  "stripe", "airbnb", "dropbox", "coinbase", "databricks", "gitlab", "reddit",
  "figma", "brex", "ramp", "plaid", "doordash", "instacart", "lyft", "pinterest",
  "asana", "datadog", "hashicorp", "elastic", "mongodb", "confluent", "gusto",
  "retool", "sourcegraph", "flutterwave", "andela", "chipper", "wave",
];
const LEVER = [
  "netlify", "voiceflow", "leadiq", "kpler", "attentive", "spotify", "yassir",
  "moniepoint", "paystack",
];
const ASHBY = [
  "openai", "ramp", "linear", "runway", "posthog", "replit", "hex", "cointracker",
  "vanta", "clipboardhealth", "mercury", "modernhealth",
];

async function ghCompany(token: string): Promise<AggJob[]> {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
  const rows = Array.isArray(data?.jobs) ? data.jobs.slice(0, 30) : [];
  return rows.map((j: any) => ({
    external_id: `gh_${token}_${j.id}`,
    platform: "greenhouse",
    title: j.title || "Untitled",
    description: stripHtml(j.content || "").slice(0, 800),
    budget: null,
    job_type: "full-time",
    location: j.location?.name || "",
    posted_at: j.updated_at || j.first_published || new Date().toISOString(),
    external_url: j.absolute_url,
    skill_tags: [],
    is_active: true,
  })).filter((j: AggJob) => j.external_url);
}

async function leverCompany(token: string): Promise<AggJob[]> {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${token}?mode=json`);
  const rows = Array.isArray(data) ? data.slice(0, 30) : [];
  return rows.map((j: any) => ({
    external_id: `lever_${token}_${j.id}`,
    platform: "lever",
    title: j.text || "Untitled",
    description: stripHtml(j.descriptionPlain || j.description || "").slice(0, 800),
    budget: null,
    job_type: (j.categories?.commitment || "full-time").toLowerCase(),
    location: j.categories?.location || "",
    posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
    external_url: j.hostedUrl || j.applyUrl,
    skill_tags: j.categories?.team ? [String(j.categories.team).toLowerCase()] : [],
    is_active: true,
  })).filter((j: AggJob) => j.external_url);
}

async function ashbyCompany(token: string): Promise<AggJob[]> {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`);
  const rows = Array.isArray(data?.jobs) ? data.jobs.slice(0, 30) : [];
  return rows.map((j: any) => ({
    external_id: `ashby_${token}_${j.id || j.jobUrl}`,
    platform: "ashby",
    title: j.title || "Untitled",
    description: stripHtml(j.descriptionPlain || j.descriptionHtml || "").slice(0, 800),
    budget: j.compensation?.summary || null,
    job_type: (j.employmentType || "full-time").toLowerCase(),
    location: j.location || (j.isRemote ? "Remote" : ""),
    posted_at: j.publishedAt || new Date().toISOString(),
    external_url: j.applyUrl || j.jobUrl,
    skill_tags: j.department ? [String(j.department).toLowerCase()] : [],
    is_active: true,
  })).filter((j: AggJob) => j.external_url);
}

// Fan out across every token in a provider, tolerating individual 404s.
async function fromProvider(tokens: string[], fn: (t: string) => Promise<AggJob[]>): Promise<AggJob[]> {
  const settled = await Promise.allSettled(tokens.map((t) => fn(t)));
  const jobs: AggJob[] = [];
  for (const s of settled) if (s.status === "fulfilled") jobs.push(...s.value);
  return jobs;
}

const fromGreenhouse = () => fromProvider(GREENHOUSE, ghCompany);
const fromLever = () => fromProvider(LEVER, leverCompany);
const fromAshby = () => fromProvider(ASHBY, ashbyCompany);

// Adzuna aggregates millions of listings across 20+ countries. Only runs when
// ADZUNA_APP_ID + ADZUNA_APP_KEY are configured.
async function fromAdzuna(): Promise<AggJob[]> {
  const id = Deno.env.get("ADZUNA_APP_ID");
  const key = Deno.env.get("ADZUNA_APP_KEY");
  if (!id || !key) return [];
  const countries = ["gb", "us", "de", "za", "ng", "ca", "in", "au"];
  const jobs: AggJob[] = [];
  const settled = await Promise.allSettled(countries.map(async (c) => {
    const data = await fetchJson(`https://api.adzuna.com/v1/api/jobs/${c}/search/1?app_id=${id}&app_key=${key}&results_per_page=25&max_days_old=14&content-type=application/json`);
    return (Array.isArray(data?.results) ? data.results : []).map((j: any) => ({
      external_id: `adzuna_${c}_${j.id}`,
      platform: "adzuna",
      title: j.title ? stripHtml(j.title) : "Untitled",
      description: stripHtml(j.description || "").slice(0, 800),
      budget: j.salary_min && j.salary_max ? `${Math.round(j.salary_min)}–${Math.round(j.salary_max)}` : null,
      job_type: j.contract_time || "full-time",
      location: j.location?.display_name || c.toUpperCase(),
      posted_at: j.created || new Date().toISOString(),
      external_url: j.redirect_url,
      skill_tags: j.category?.label ? [String(j.category.label).toLowerCase()] : [],
      is_active: true,
    })).filter((j: AggJob) => j.external_url);
  }));
  for (const s of settled) if (s.status === "fulfilled") jobs.push(...s.value);
  return jobs;
}

const SOURCES: { name: string; type: SourceType; run: () => Promise<AggJob[]> }[] = [
  { name: "remoteok", type: "fresh", run: fromRemoteOK },
  { name: "weworkremotely", type: "fresh", run: fromWeWorkRemotely },
  { name: "remotive", type: "fresh", run: fromRemotive },
  { name: "arbeitnow", type: "fresh", run: fromArbeitnow },
  { name: "jobicy", type: "fresh", run: fromJobicy },
  { name: "himalayas", type: "fresh", run: fromHimalayas },
  { name: "greenhouse", type: "ats", run: fromGreenhouse },
  { name: "lever", type: "ats", run: fromLever },
  { name: "ashby", type: "ats", run: fromAshby },
  { name: "adzuna", type: "ats", run: fromAdzuna },
];

const FAST_PLATFORMS = ["remoteok", "weworkremotely", "remotive", "arbeitnow", "jobicy", "himalayas"];
const ATS_PLATFORMS = ["greenhouse", "lever", "ashby", "adzuna"];

// ── handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  const results = {
    scraped: 0,
    kept: 0,
    inserted: 0,
    dropped_non_english: 0,
    per_source: {} as Record<string, number>,
    removed: 0,
    errors: [] as string[],
  };

  // Pull every source independently so one failing board never blocks the rest.
  const settled = await Promise.allSettled(SOURCES.map((s) => s.run()));

  // Collect the jobs we intend to keep from every source first, so translation
  // can run once across the whole batch.
  const nowIso = new Date().toISOString();
  let toUpsert: AggJob[] = [];
  for (let i = 0; i < settled.length; i++) {
    const source = SOURCES[i];
    const outcome = settled[i];
    if (outcome.status === "rejected") {
      results.errors.push(`${source.name}: ${outcome.reason?.message || outcome.reason}`);
      continue;
    }
    results.scraped += outcome.value.length;
    // fresh boards keep only recent listings; ats boards are evergreen and get
    // a refreshed last-seen timestamp.
    const kept = source.type === "fresh"
      ? outcome.value.filter((j) => isFresh(j.posted_at))
      : outcome.value.map((j) => ({ ...j, scraped_at: nowIso }));
    results.per_source[source.name] = kept.length;
    results.kept += kept.length;
    toUpsert.push(...kept);
  }

  // English-only: drop anything that looks non-English rather than paying to
  // translate it. Cheap heuristic, no AI cost.
  {
    const before = toUpsert.length;
    toUpsert = toUpsert.filter((j) => !looksNonEnglish(j.title, j.description || ""));
    results.dropped_non_english = before - toUpsert.length;
  }

  // Upsert in chunks to keep each request small.
  for (let c = 0; c < toUpsert.length; c += 50) {
    const chunk = toUpsert.slice(c, c + 50);
    const { error } = await supabase
      .from("aggregated_jobs")
      .upsert(chunk, { onConflict: "external_id,platform" });
    if (error) results.errors.push(`upsert: ${error.message}`);
    else results.inserted += chunk.length;
  }

  // Prune fast boards past the freshness window (by posted date)…
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  {
    const { count, error } = await supabase
      .from("aggregated_jobs")
      .delete({ count: "exact" })
      .lt("posted_at", cutoff)
      .in("platform", FAST_PLATFORMS);
    if (error) results.errors.push(`cleanup fresh: ${error.message}`);
    else results.removed += count ?? 0;
  }
  // …and prune company jobs that dropped off their board (stale last-seen).
  {
    const staleCutoff = new Date(Date.now() - ATS_STALE_MS).toISOString();
    const { count, error } = await supabase
      .from("aggregated_jobs")
      .delete({ count: "exact" })
      .lt("scraped_at", staleCutoff)
      .in("platform", ATS_PLATFORMS);
    if (error) results.errors.push(`cleanup ats: ${error.message}`);
    else results.removed += count ?? 0;
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
