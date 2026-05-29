import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, BookmarkCheck, Star, BadgeCheck, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const SKILL_CATEGORIES = [
  "Development", "Design", "Writing", "Marketing", "Data & Analytics",
  "Video & Animation", "Music & Audio", "Business", "Consulting",
  "Finance", "Legal", "Engineering", "Architecture", "Customer Support", "Other",
];

function JobCardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const formatBudget = (job: any) => {
  const currency = job.budget_currency || "NGN";
  const sym = ({ NGN: "₦", USD: "$", GBP: "£", EUR: "€" } as Record<string, string>)[currency] || "₦";
  if (job.budget_type === "fixed") {
    if (job.budget_min && job.budget_max && job.budget_min !== job.budget_max)
      return `${sym}${Number(job.budget_min).toLocaleString()}–${sym}${Number(job.budget_max).toLocaleString()} Fixed`;
    return `${sym}${Number(job.budget_min || job.budget_max || 0).toLocaleString()} Fixed`;
  }
  return `${sym}${Number(job.hourly_rate_min || 0).toLocaleString()}–${sym}${Number(job.hourly_rate_max || 0).toLocaleString()}/hr`;
};

const matchPillClass = (score: number) => {
  if (score >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 60) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-muted text-muted-foreground";
};

const scoreJob = (job: any, skills: string[]) => {
  if (!skills.length) return 0;
  const tags = (job.required_skills || []).map((t: string) => t.toLowerCase());
  const title = (job.title || "").toLowerCase();
  let score = 0;
  for (const skill of skills) {
    const s = skill.toLowerCase();
    if (tags.includes(s) || title.includes(s)) score += 35;
    else if (tags.some((t: string) => t.includes(s) || s.includes(t))) score += 15;
  }
  return Math.min(score, 95);
};

const calcAvgRating = (reviews: any[] | undefined) => {
  if (!reviews?.length) return null;
  return reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length;
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <span className="flex items-center gap-0.5 text-xs text-amber-500">
      <Star className="w-3 h-3 fill-amber-500" />
      {rating.toFixed(1)}
    </span>
  );
}

interface FiltersState {
  search: string;
  skillCategory: string;
  budgetMin: string;
  budgetMax: string;
  jobType: string;
  locationType: string;
  datePosted: "today" | "week" | "month" | "all";
  clientRating: "4+" | "3+" | "any";
  duration: string;
}

interface FilterSidebarProps {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  onClear: () => void;
}

function FilterSidebar({ filters, setFilters, onClear }: FilterSidebarProps) {
  const hasActive =
    filters.search || filters.skillCategory || filters.budgetMin || filters.budgetMax ||
    filters.jobType || filters.locationType || filters.datePosted !== "all" ||
    filters.clientRating !== "any" || filters.duration;

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search</Label>
        <Input
          className="mt-2"
          placeholder="Keywords..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skill Category</Label>
        <Select value={filters.skillCategory || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, skillCategory: v === "all" ? "" : v }))}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Category</SelectItem>
            {SKILL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget Range (₦)</Label>
        <div className="flex gap-2 mt-2">
          <Input type="number" placeholder="Min" value={filters.budgetMin} onChange={(e) => setFilters((f) => ({ ...f, budgetMin: e.target.value }))} />
          <Input type="number" placeholder="Max" value={filters.budgetMax} onChange={(e) => setFilters((f) => ({ ...f, budgetMax: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Type</Label>
        <RadioGroup
          className="mt-2 space-y-1"
          value={filters.jobType || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, jobType: v === "all" ? "" : v }))}
        >
          {[["all", "All Types"], ["gig", "One-time Gig"], ["contract", "Short Contract"], ["long_term", "Long-term"]].map(([val, label]) => (
            <div key={val} className="flex items-center gap-2">
              <RadioGroupItem value={val} id={`jt-${val}`} />
              <Label htmlFor={`jt-${val}`} className="text-sm font-normal cursor-pointer">{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</Label>
        <RadioGroup
          className="mt-2 space-y-1"
          value={filters.locationType || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, locationType: v === "all" ? "" : v }))}
        >
          {[["all", "All"], ["remote", "Remote"], ["onsite", "On-site"], ["hybrid", "Hybrid"]].map(([val, label]) => (
            <div key={val} className="flex items-center gap-2">
              <RadioGroupItem value={val} id={`lt-${val}`} />
              <Label htmlFor={`lt-${val}`} className="text-sm font-normal cursor-pointer">{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date Posted</Label>
        <RadioGroup
          className="mt-2 space-y-1"
          value={filters.datePosted}
          onValueChange={(v) => setFilters((f) => ({ ...f, datePosted: v as FiltersState["datePosted"] }))}
        >
          {[["all", "All Time"], ["today", "Today"], ["week", "This Week"], ["month", "This Month"]].map(([val, label]) => (
            <div key={val} className="flex items-center gap-2">
              <RadioGroupItem value={val} id={`dp-${val}`} />
              <Label htmlFor={`dp-${val}`} className="text-sm font-normal cursor-pointer">{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</Label>
        <Select value={filters.duration || "any"} onValueChange={(v) => setFilters((f) => ({ ...f, duration: v === "any" ? "" : v }))}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Any duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="less_week">Less than 1 week</SelectItem>
            <SelectItem value="1_4_weeks">1–4 weeks</SelectItem>
            <SelectItem value="1_3_months">1–3 months</SelectItem>
            <SelectItem value="3_plus_months">3+ months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActive && (
        <Button variant="outline" className="w-full" onClick={onClear}>Clear Filters</Button>
      )}
    </div>
  );
}

interface MarketplaceJobCardProps {
  job: any;
  saved: boolean;
  onSave: () => void;
}

function MarketplaceJobCard({ job, saved, onSave }: MarketplaceJobCardProps) {
  const client = job.client_profiles;
  const companyName = client?.company_name || "Unknown Client";
  const initials = companyName.slice(0, 2).toUpperCase();
  const requiredSkills: string[] = job.required_skills || [];
  const visibleSkills = requiredSkills.slice(0, 3);
  const extraSkills = requiredSkills.length - 3;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/marketplace/${job.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 flex-1"
          >
            {job.title}
          </Link>
          {job.matchScore > 0 && (
            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${matchPillClass(job.matchScore)}`}>
              {job.matchScore}% match
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{formatBudget(job)}</span>
          {job.job_type && (
            <Badge variant="secondary" className="text-xs">
              {job.job_type === "gig" ? "One-time Gig" : job.job_type === "contract" ? "Contract" : "Long-term"}
            </Badge>
          )}
          {job.location_type && (
            <Badge variant="outline" className="text-xs capitalize">{job.location_type}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {initials}
          </div>
          <span className="font-medium text-foreground">{companyName}</span>
          <StarRating rating={job.clientRating} />
          {client?.is_verified && (
            <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
          )}
        </div>

        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
        )}

        {visibleSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleSkills.map((skill: string) => (
              <span key={skill} className="text-xs px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">
                {skill}
              </span>
            ))}
            {extraSkills > 0 && (
              <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">
                +{extraSkills} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{job.applicant_count || 0} applicants · {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
          <button
            onClick={(e) => { e.preventDefault(); onSave(); }}
            className="p-1 rounded hover:text-primary transition-colors"
            aria-label={saved ? "Unsave job" : "Save job"}
          >
            {saved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

const DEFAULT_FILTERS: FiltersState = {
  search: "",
  skillCategory: "",
  budgetMin: "",
  budgetMax: "",
  jobType: "",
  locationType: "",
  datePosted: "all",
  clientRating: "any",
  duration: "",
};

export default function Marketplace() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"match" | "newest" | "budget" | "fewest">("match");
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const clearFilters = () => { setFilters(DEFAULT_FILTERS); setPage(0); };

  const fetchJobs = useCallback(async (append = false) => {
    setLoading(true);
    const offset = append ? page * 20 : 0;

    let query = (supabase as any)
      .from("job_posts")
      .select(`
        *,
        client_profiles(company_name, logo_url, industry, is_verified, user_id, total_hires,
          client_reviews:reviews(rating)
        )
      `, { count: "exact" })
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (filters.search)
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    if (filters.jobType) query = query.eq("job_type", filters.jobType);
    if (filters.locationType) query = query.eq("location_type", filters.locationType);
    if (filters.budgetMin) query = query.gte("budget_min", parseFloat(filters.budgetMin));
    if (filters.budgetMax) query = query.lte("budget_max", parseFloat(filters.budgetMax));
    if (filters.skillCategory) query = query.eq("skill_category", filters.skillCategory);
    if (filters.duration) query = query.eq("duration", filters.duration);
    if (filters.datePosted === "today")
      query = query.gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if (filters.datePosted === "week")
      query = query.gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
    if (filters.datePosted === "month")
      query = query.gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

    query = query.range(offset, offset + 19);
    const { data, error } = await query;

    if (error) { setLoading(false); return; }

    const scored = (data || []).map((job: any) => ({
      ...job,
      matchScore: scoreJob(job, userSkills),
      clientRating: calcAvgRating(job.client_profiles?.client_reviews),
    }));

    if (sortBy === "match") scored.sort((a: any, b: any) => b.matchScore - a.matchScore);
    else if (sortBy === "newest") scored.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === "budget") scored.sort((a: any, b: any) => (b.budget_max || b.budget_min || 0) - (a.budget_max || a.budget_min || 0));
    else if (sortBy === "fewest") scored.sort((a: any, b: any) => (a.applicant_count || 0) - (b.applicant_count || 0));

    setJobs((prev) => (append ? [...prev, ...scored] : scored));
    setLoading(false);
  }, [filters, sortBy, userSkills, page]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      const { data: profile } = await (supabase as any)
        .from("talent_profiles")
        .select("primary_skill, secondary_skills, id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile) {
        const skills = [profile.primary_skill, ...(profile.secondary_skills || [])].filter(Boolean);
        setUserSkills(skills);

        const { data: saved } = await (supabase as any)
          .from("saved_jobs")
          .select("job_id")
          .eq("talent_id", profile.id)
          .eq("source", "marketplace");

        if (saved) setSavedJobIds(new Set((saved as any[]).map((s: any) => s.job_id).filter(Boolean)));
      }
    };
    init();
  }, []);

  useEffect(() => {
    setPage(0);
    fetchJobs(false);
  }, [filters, sortBy, userSkills]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchJobs(true);
  };

  const handleSaveJob = async (jobId: string) => {
    if (!user) {
      toast({ title: "Sign in to save jobs", variant: "destructive" });
      return;
    }
    const { data: profile } = await (supabase as any)
      .from("talent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return;

    if (savedJobIds.has(jobId)) {
      await (supabase as any)
        .from("saved_jobs")
        .delete()
        .match({ talent_id: profile.id, job_id: jobId, source: "marketplace" });
      setSavedJobIds((prev) => { const n = new Set(prev); n.delete(jobId); return n; });
    } else {
      await (supabase as any)
        .from("saved_jobs")
        .insert({ talent_id: profile.id, job_id: jobId, source: "marketplace" });
      setSavedJobIds((prev) => new Set([...prev, jobId]));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Jobs posted directly by clients on Skryve</p>
        </div>
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterSidebar filters={filters} setFilters={setFilters} onClear={clearFilters} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <FilterSidebar filters={filters} setFilters={setFilters} onClear={clearFilters} />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{jobs.length} jobs found</p>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Best Match</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="budget">Highest Budget</SelectItem>
                <SelectItem value="fewest">Fewest Applicants</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading && jobs.length === 0 ? (
            <JobCardSkeleton />
          ) : (
            <>
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <MarketplaceJobCard
                    key={job.id}
                    job={job}
                    saved={savedJobIds.has(job.id)}
                    onSave={() => handleSaveJob(job.id)}
                  />
                ))}
              </div>
              {jobs.length > 0 && jobs.length % 20 === 0 && (
                <Button variant="outline" className="w-full mt-4" onClick={loadMore} disabled={loading}>
                  Load More
                </Button>
              )}
              {!loading && jobs.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-2">No jobs found matching your filters.</p>
                  <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
