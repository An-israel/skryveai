import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { notifyUser } from "@/lib/notify";
import { useToast } from "@/hooks/use-toast";
import { matchesSkillQuery } from "@/lib/skills";
import { ApplyWizard } from "@/components/jobs/ApplyWizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart, MessageCircle, Share2, Search, Loader2, Send,
  Briefcase, CalendarDays, GraduationCap, BadgeCheck, Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedSource = "marketplace" | "aggregated" | "event" | "course";

interface FeedItem {
  key: string;              // `${source}:${id}`
  source: FeedSource;
  id: string;
  sortKey: string;          // raw pagination timestamp for this source
  title: string;
  description: string;
  skills: string[];
  meta: string;             // budget / price / date line
  byline: string;           // company name or platform or organizer
  avatarUrl: string | null;
  verified: boolean;
  postedAt: string;
  jobType?: string | null;
  location?: string | null;
  matchScore: number;
  externalUrl?: string;
  platform?: string;
  clientUserId?: string;
  companyName?: string;
}

interface FeedComment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCY: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

function formatJobPostBudget(job: any): string {
  const sym = CURRENCY[job.budget_currency || "NGN"] || "₦";
  if (job.budget_type === "fixed") {
    if (job.budget_min && job.budget_max && job.budget_min !== job.budget_max)
      return `${sym}${Number(job.budget_min).toLocaleString()}–${sym}${Number(job.budget_max).toLocaleString()} Fixed`;
    return `${sym}${Number(job.budget_min || job.budget_max || 0).toLocaleString()} Fixed`;
  }
  return `${sym}${Number(job.hourly_rate_min || 0).toLocaleString()}–${sym}${Number(job.hourly_rate_max || 0).toLocaleString()}/hr`;
}

function scoreItem(title: string, skills: string[], userSkills: string[]): number {
  if (!userSkills.length) return 0;
  const tags = skills.map((t) => t.toLowerCase());
  const t = title.toLowerCase();
  let score = 0;
  for (const skill of userSkills) {
    const s = skill.toLowerCase();
    if (tags.includes(s) || t.includes(s)) score += 35;
    else if (tags.some((x) => x.includes(s) || s.includes(x))) score += 15;
  }
  return Math.min(score, 95);
}

const matchPillClass = (score: number) =>
  score >= 80
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : score >= 60
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "bg-muted text-muted-foreground";

const PLATFORM_BADGE: Record<string, string> = {
  upwork: "bg-green-500 text-white",
  remoteok: "bg-emerald-600 text-white",
  weworkremotely: "bg-gray-800 text-white",
  linkedin: "bg-blue-600 text-white",
  indeed: "bg-blue-500 text-white",
  jobberman: "bg-red-500 text-white",
};

const SOURCE_ICON: Record<FeedSource, React.ComponentType<{ className?: string }>> = {
  marketplace: Briefcase,
  aggregated: Briefcase,
  event: CalendarDays,
  course: GraduationCap,
};

function detailPath(item: FeedItem): string {
  switch (item.source) {
    case "marketplace": return `/marketplace/${item.id}`;
    case "aggregated": return `/jobs/${item.id}`;
    case "event": return `/events/${item.id}`;
    case "course": return `/learn/${item.id}`;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "foryou", label: "For You" },
  { id: "latest", label: "Latest" },
  { id: "clients", label: "Skryve Clients" },
  { id: "external", label: "External" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Feed() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState<TabId>("foryou");
  const [search, setSearch] = useState("");

  // social state
  const [likes, setLikes] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentInput, setCommentInput] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // apply wizard
  const [applyItem, setApplyItem] = useState<FeedItem | null>(null);

  // Per-source pagination cursors (marketplace pages on created_at,
  // aggregated on scraped_at — different columns, so separate cursors).
  const mCursorRef = useRef<string | null>(null);
  const aCursorRef = useRef<string | null>(null);
  const skillsRef = useRef<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ── Load user + first page ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      const { data: tp } = await (supabase as any)
        .from("talent_profiles")
        .select("primary_skill, secondary_skills")
        .eq("user_id", user.id)
        .maybeSingle();
      const skills = tp ? [tp.primary_skill, ...(tp.secondary_skills || [])].filter(Boolean) : [];
      skillsRef.current = skills;
      setUserSkills(skills);

      await loadPage(true, user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildJobItems = (marketplace: any[], aggregated: any[]): FeedItem[] => {
    const skills = skillsRef.current;
    const m: FeedItem[] = (marketplace || []).map((j: any) => ({
      key: `marketplace:${j.id}`,
      source: "marketplace" as const,
      id: j.id,
      sortKey: j.created_at,
      title: j.title,
      description: j.description || "",
      skills: j.required_skills || [],
      meta: formatJobPostBudget(j),
      byline: j.client_profiles?.company_name || "Skryve Client",
      avatarUrl: j.client_profiles?.logo_url || null,
      verified: !!j.client_profiles?.is_verified,
      postedAt: j.created_at,
      jobType: j.job_type,
      location: j.location_type,
      matchScore: scoreItem(j.title, j.required_skills || [], skills),
      clientUserId: j.client_profiles?.user_id,
      companyName: j.client_profiles?.company_name || "",
    }));
    const a: FeedItem[] = (aggregated || []).map((j: any) => ({
      key: `aggregated:${j.id}`,
      source: "aggregated" as const,
      id: j.id,
      sortKey: j.scraped_at,
      title: j.title,
      description: j.description || "",
      skills: j.skill_tags || [],
      meta: j.budget || "",
      byline: j.platform,
      avatarUrl: null,
      verified: false,
      postedAt: j.posted_at || j.scraped_at,
      jobType: j.job_type,
      location: j.location,
      matchScore: scoreItem(j.title, j.skill_tags || [], skills),
      externalUrl: j.external_url,
      platform: j.platform,
    }));
    return [...m, ...a].sort(
      (x, y) => new Date(y.sortKey).getTime() - new Date(x.sortKey).getTime()
    );
  };

  const loadPage = useCallback(async (first: boolean, uid?: string) => {
    if (first) { mCursorRef.current = null; aCursorRef.current = null; }

    let mq = (supabase as any)
      .from("job_posts")
      .select("id, title, description, required_skills, budget_type, budget_min, budget_max, hourly_rate_min, hourly_rate_max, budget_currency, job_type, location_type, created_at, client_profiles(company_name, logo_url, user_id, is_verified)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20);
    if (mCursorRef.current) mq = mq.lt("created_at", mCursorRef.current);

    // NB: aggregated_jobs has scraped_at (not created_at); posted_at can be
    // null, so page on scraped_at which is always set.
    let aq = (supabase as any)
      .from("aggregated_jobs")
      .select("id, title, description, budget, job_type, location, posted_at, scraped_at, platform, external_url, skill_tags")
      .eq("is_active", true)
      .order("scraped_at", { ascending: false })
      .limit(20);
    if (aCursorRef.current) aq = aq.lt("scraped_at", aCursorRef.current);

    const [{ data: mData, error: mErr }, { data: aData, error: aErr }] = await Promise.all([mq, aq]);
    if (mErr) console.error("feed job_posts error:", mErr);
    if (aErr) console.error("feed aggregated_jobs error:", aErr);
    const jobs = buildJobItems(mData || [], aData || []).slice(0, 20);

    // Advance each source's cursor past the items actually shown; anything
    // fetched but trimmed off the page tail will be re-fetched next page.
    const mShown = jobs.filter((j) => j.source === "marketplace");
    if (mShown.length) mCursorRef.current = mShown[mShown.length - 1].sortKey;
    const aShown = jobs.filter((j) => j.source === "aggregated");
    if (aShown.length) aCursorRef.current = aShown[aShown.length - 1].sortKey;

    if (jobs.length < 5) setHasMore(false);

    let page: FeedItem[] = jobs;

    // Sprinkle events + courses into the first page, Facebook-style.
    if (first) {
      const [{ data: events }, { data: courses }] = await Promise.all([
        (supabase as any)
          .from("events")
          .select("id, title, description, banner_url, format, date_time, price_type, ticket_price, niche_category, created_at")
          .eq("status", "published")
          .gte("date_time", new Date().toISOString())
          .order("date_time", { ascending: true })
          .limit(2),
        (supabase as any)
          .from("courses")
          .select("id, title, description, skill_category, level, lesson_count, thumbnail_url, enrolled_count, created_at")
          .eq("is_published", true)
          .order("enrolled_count", { ascending: false })
          .limit(2),
      ]);

      const extras: FeedItem[] = [
        ...((events || []) as any[]).map((e) => ({
          key: `event:${e.id}`,
          source: "event" as const,
          id: e.id,
          sortKey: e.created_at,
          title: e.title,
          description: e.description || "",
          skills: e.niche_category ? [e.niche_category] : [],
          meta: `${new Date(e.date_time).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${e.price_type === "free" ? "Free" : `₦${Number(e.ticket_price || 0).toLocaleString()}`}`,
          byline: `Upcoming ${e.format || "event"}`,
          avatarUrl: e.banner_url || null,
          verified: false,
          postedAt: e.created_at,
          matchScore: 0,
        })),
        ...((courses || []) as any[]).map((c) => ({
          key: `course:${c.id}`,
          source: "course" as const,
          id: c.id,
          sortKey: c.created_at,
          title: c.title,
          description: c.description || "",
          skills: c.skill_category ? [c.skill_category] : [],
          meta: `${c.lesson_count || 0} lessons · ${c.enrolled_count || 0} enrolled`,
          byline: "Recommended course",
          avatarUrl: c.thumbnail_url || null,
          verified: false,
          postedAt: c.created_at,
          matchScore: 0,
        })),
      ];

      // Interleave: an extra after every 3rd job.
      const merged: FeedItem[] = [];
      let ei = 0;
      jobs.forEach((j, i) => {
        merged.push(j);
        if ((i + 1) % 3 === 0 && ei < extras.length) merged.push(extras[ei++]);
      });
      while (ei < extras.length) merged.push(extras[ei++]);
      page = merged;
    }

    setItems((prev) => (first ? page : [...prev, ...page]));
    await loadSocial(page, uid);
  }, []);

  // ── Social counts (bulk) ────────────────────────────────────────────────────
  const loadSocial = async (page: FeedItem[], uid?: string) => {
    const me = uid || userId;
    const ids = page.map((i) => i.id);
    if (!ids.length) return;

    const [{ data: reactions }, { data: cmts }] = await Promise.all([
      (supabase as any).from("feed_reactions").select("item_source, item_id, user_id").in("item_id", ids),
      (supabase as any).from("feed_comments").select("item_source, item_id").in("item_id", ids),
    ]);

    setLikes((prev) => {
      const next = { ...prev };
      page.forEach((it) => {
        const rows = (reactions || []).filter(
          (r: any) => r.item_id === it.id && r.item_source === it.source
        );
        next[it.key] = { count: rows.length, mine: rows.some((r: any) => r.user_id === me) };
      });
      return next;
    });
    setCommentCounts((prev) => {
      const next = { ...prev };
      page.forEach((it) => {
        next[it.key] = (cmts || []).filter(
          (c: any) => c.item_id === it.id && c.item_source === it.source
        ).length;
      });
      return next;
    });
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const toggleLike = async (item: FeedItem) => {
    if (!userId) return;
    const cur = likes[item.key] || { count: 0, mine: false };
    setLikes((p) => ({
      ...p,
      [item.key]: { count: cur.count + (cur.mine ? -1 : 1), mine: !cur.mine },
    }));
    if (cur.mine) {
      await (supabase as any)
        .from("feed_reactions")
        .delete()
        .match({ user_id: userId, item_source: item.source, item_id: item.id });
    } else {
      await (supabase as any)
        .from("feed_reactions")
        .insert({ user_id: userId, item_source: item.source, item_id: item.id });
    }
  };

  const openCommentsFor = async (item: FeedItem) => {
    if (openComments === item.key) { setOpenComments(null); return; }
    setOpenComments(item.key);
    if (!comments[item.key]) {
      const { data } = await (supabase as any)
        .from("feed_comments")
        .select("id, user_id, body, created_at")
        .eq("item_source", item.source)
        .eq("item_id", item.id)
        .order("created_at", { ascending: true })
        .limit(50);

      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const nameMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: tps } = await (supabase as any)
          .from("talent_profiles").select("user_id, full_name").in("user_id", userIds);
        (tps || []).forEach((t: any) => { if (t.full_name) nameMap[t.user_id] = t.full_name; });
        const missing = userIds.filter((u) => !nameMap[u as string]);
        if (missing.length) {
          const { data: cps } = await (supabase as any)
            .from("client_profiles").select("user_id, company_name").in("user_id", missing);
          (cps || []).forEach((c: any) => { if (c.company_name) nameMap[c.user_id] = c.company_name; });
        }
      }
      setComments((p) => ({
        ...p,
        [item.key]: (data || []).map((c: any) => ({ ...c, name: nameMap[c.user_id] || "User" })),
      }));
    }
  };

  const postComment = async (item: FeedItem) => {
    const body = commentInput.trim();
    if (!body || !userId) return;
    setPostingComment(true);
    const { data, error } = await (supabase as any)
      .from("feed_comments")
      .insert({ user_id: userId, item_source: item.source, item_id: item.id, body })
      .select("id, user_id, body, created_at")
      .single();
    if (!error && data) {
      const { data: tp } = await (supabase as any)
        .from("talent_profiles").select("full_name").eq("user_id", userId).maybeSingle();
      setComments((p) => ({
        ...p,
        [item.key]: [...(p[item.key] || []), { ...data, name: tp?.full_name || "You" }],
      }));
      setCommentCounts((p) => ({ ...p, [item.key]: (p[item.key] || 0) + 1 }));
      setCommentInput("");
      // Let the client know someone engaged with their job post.
      if (item.source === "marketplace" && item.clientUserId && item.clientUserId !== userId) {
        notifyUser({
          userId: item.clientUserId,
          type: "comment",
          title: "New comment on your job",
          message: `Someone commented on "${item.title}".`,
          link: `/marketplace/${item.id}`,
          emailCategory: "jobs",
        });
      }
    } else if (error) {
      toast({ title: "Couldn't post comment", description: error.message, variant: "destructive" });
    }
    setPostingComment(false);
  };

  const shareItem = async (item: FeedItem) => {
    const url = `${window.location.origin}${detailPath(item)}`;
    if (navigator.share) {
      try { await navigator.share({ title: item.title, url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share it anywhere." });
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const visible = items
    .filter((it) => {
      if (tab === "clients" && it.source !== "marketplace") return false;
      if (tab === "external" && it.source !== "aggregated") return false;
      if (search.trim()) {
        const hay = [it.title, it.description, it.byline, ...it.skills].join(" ");
        if (!matchesSkillQuery(hay, search)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (tab === "foryou") {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        // Jobs rank above events/courses at equal score.
        const aJob = a.source === "marketplace" || a.source === "aggregated" ? 1 : 0;
        const bJob = b.source === "marketplace" || b.source === "aggregated" ? 1 : 0;
        if (bJob !== aJob) return bJob - aJob;
      }
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });

  const jobCount = items.filter(
    (i) => i.source === "marketplace" || i.source === "aggregated"
  ).length;

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    await loadPage(false);
    setLoadingMore(false);
  }, [loadPage]);

  // Infinite scroll: auto-load when the sentinel enters the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadMore();
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, hasMore, loadingMore, loadMore]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Search + tabs */}
      <div className="sticky top-12 z-20 bg-background/95 backdrop-blur pt-1 pb-2 space-y-2 -mx-1 px-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter your feed — try 'graphic designer', 'react', 'video'…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.id === "foryou" && <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold mb-1">Nothing here yet</h3>
          <p className="text-sm text-muted-foreground">Try a different tab or clear your search.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobCount === 0 && !loading && (
            <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              <Briefcase className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
              No jobs in the feed yet — client-posted jobs and listings from external
              platforms land here automatically as they come in.
            </div>
          )}
          {visible.map((item) => {
            const Icon = SOURCE_ICON[item.source];
            const like = likes[item.key] || { count: 0, mine: false };
            const cCount = commentCounts[item.key] || 0;
            const isJob = item.source === "marketplace" || item.source === "aggregated";

            return (
              <article key={item.key} className="bg-card border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 pt-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.byline} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-[18px] h-[18px] text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate">{item.byline}</span>
                      {item.verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                      {item.source === "aggregated" && item.platform && (
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${PLATFORM_BADGE[item.platform] || "bg-muted text-muted-foreground"}`}>
                          {item.platform}
                        </span>
                      )}
                      {item.source === "marketplace" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">Skryve</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.postedAt), { addSuffix: true })}
                    </p>
                  </div>
                  {item.matchScore > 0 && (
                    <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${matchPillClass(item.matchScore)}`}>
                      {item.matchScore}% match
                    </span>
                  )}
                </div>

                {/* Body */}
                <div
                  className="px-4 pt-3 pb-1 cursor-pointer"
                  onClick={() => navigate(detailPath(item))}
                >
                  <h3 className="font-semibold text-[15px] leading-snug hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{item.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                    {item.meta && <span className="font-medium text-green-600 dark:text-green-400">{item.meta}</span>}
                    {item.jobType && <span className="text-muted-foreground capitalize">{item.jobType}</span>}
                    {item.location && <span className="text-muted-foreground capitalize">{item.location}</span>}
                  </div>
                  {item.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.skills.slice(0, 4).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{s}</Badge>
                      ))}
                      {item.skills.length > 4 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{item.skills.length - 4}</Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Action bar */}
                <div className="flex items-center px-2 py-1.5 mt-2 border-t">
                  <button
                    onClick={() => toggleLike(item)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      like.mine ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${like.mine ? "fill-red-500" : ""}`} />
                    {like.count > 0 && like.count}
                  </button>
                  <button
                    onClick={() => openCommentsFor(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {cCount > 0 && cCount}
                  </button>
                  <button
                    onClick={() => shareItem(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1" />
                  {isJob ? (
                    <Button size="sm" className="h-8" onClick={() => setApplyItem(item)}>
                      Apply for Job
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => navigate(detailPath(item))}>
                      {item.source === "event" ? "View event" : "Start learning"}
                    </Button>
                  )}
                </div>

                {/* Comments */}
                {openComments === item.key && (
                  <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
                    {(comments[item.key] || []).map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {c.name[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="bg-background rounded-lg px-3 py-2 text-sm flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-xs">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
                        </div>
                      </div>
                    ))}
                    {(comments[item.key] || []).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-1">Be the first to comment.</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a comment…"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(item); }
                        }}
                        className="h-9 text-sm"
                      />
                      <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => postComment(item)} disabled={postingComment || !commentInput.trim()}>
                        {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {hasMore && (
            <>
              <div ref={sentinelRef} className="h-1" />
              <Button variant="outline" className="w-full" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Load more
              </Button>
            </>
          )}
        </div>
      )}

      {/* In-feed apply */}
      {applyItem && (
        <ApplyWizard
          open={!!applyItem}
          onClose={() => setApplyItem(null)}
          mode={applyItem.source === "marketplace" ? "marketplace" : "external"}
          job={{
            id: applyItem.id,
            title: applyItem.title,
            description: applyItem.description,
            requiredSkills: applyItem.skills,
            platform: applyItem.platform,
            externalUrl: applyItem.externalUrl,
            clientUserId: applyItem.clientUserId,
            companyName: applyItem.companyName,
          }}
        />
      )}
    </div>
  );
}
