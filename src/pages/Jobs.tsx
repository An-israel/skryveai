import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase, Heart, ExternalLink, Search, SlidersHorizontal,
  Loader2, Copy, Check, ChevronRight, Settings2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { ALL_SKILLS as EXPERTISE_OPTIONS } from "@/lib/skills";

// Open-apply remote job boards aggregated by the scrape-jobs function. Closed
// bidding/enrolment platforms (Upwork, Fiverr, Freelancer, Toptal) are excluded
// since talents can't apply to those directly from here.
const PLATFORMS = [
  { value: "remoteok", label: "Remote OK" },
  { value: "weworkremotely", label: "We Work Remotely" },
  { value: "remotive", label: "Remotive" },
  { value: "arbeitnow", label: "Arbeitnow" },
  { value: "jobicy", label: "Jobicy" },
  { value: "himalayas", label: "Himalayas" },
];

const JOB_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "remote", label: "Remote" },
  { value: "full-time", label: "Full-time" },
];

// Listings are capped at 7 days old at the source, so the feed only offers the
// two meaningful windows. Defaults to the last 24 hours.
const DATE_OPTIONS = [
  { value: "today", label: "Last 24 hours" },
  { value: "week", label: "This week" },
] as const;

interface Filters {
  search: string;
  skill: string;
  platformFilter: string[];
  dateFilter: "today" | "week";
  jobTypes: string[];
  locationPref: string;
}

interface AggJob {
  id: string;
  external_id: string;
  platform: string;
  title: string;
  description: string | null;
  budget: string | null;
  job_type: string | null;
  location: string | null;
  posted_at: string | null;
  external_url: string;
  skill_tags: string[];
  is_active: boolean;
  matchScore: number;
}

function platformBadgeClass(platform: string): string {
  const map: Record<string, string> = {
    upwork: "bg-green-500 text-white",
    remoteok: "bg-emerald-600 text-white",
    weworkremotely: "bg-gray-800 text-white",
    linkedin: "bg-blue-600 text-white",
    indeed: "bg-blue-500 text-white",
    jobberman: "bg-red-500 text-white",
  };
  return map[platform] || "bg-muted text-muted-foreground";
}

function matchPillClass(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  if (score >= 60) return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function scoreJob(job: AggJob, skills: string[]): number {
  if (!skills.length) return 0;
  const tags = (job.skill_tags || []).map(t => t.toLowerCase());
  const title = (job.title || "").toLowerCase();
  let score = 0;
  for (const skill of skills) {
    const s = skill.toLowerCase();
    if (tags.includes(s) || title.includes(s)) score += 35;
    else if (tags.some(t => t.includes(s) || s.includes(t))) score += 15;
  }
  return Math.min(score, 95);
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded bg-muted" />
        <div className="h-5 w-20 rounded bg-muted" />
      </div>
      <div className="h-5 w-3/4 rounded bg-muted mb-2" />
      <div className="h-4 w-1/3 rounded bg-muted mb-4" />
      <div className="h-4 w-full rounded bg-muted mb-2" />
      <div className="h-4 w-5/6 rounded bg-muted" />
    </div>
  );
}

interface FilterSidebarProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onApply: () => void;
}

function FilterSidebar({ filters, setFilters, onApply }: FilterSidebarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (val: string) => {
    setFilters(prev => ({ ...prev, search: val }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(onApply, 200);
  };

  const togglePlatform = (val: string) => {
    setFilters(prev => ({
      ...prev,
      platformFilter: prev.platformFilter.includes(val)
        ? prev.platformFilter.filter(p => p !== val)
        : [...prev.platformFilter, val],
    }));
  };

  const toggleJobType = (val: string) => {
    setFilters(prev => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(val)
        ? prev.jobTypes.filter(t => t !== val)
        : [...prev.jobTypes, val],
    }));
  };

  const clearAll = () => {
    setFilters({ search: "", skill: "", platformFilter: [], dateFilter: "today", jobTypes: [], locationPref: "" });
    setTimeout(onApply, 0);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6 sticky top-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-foreground">Filters</span>
        <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Clear All
        </button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Job title..."
            value={filters.search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Skill</Label>
        <Select
          value={filters.skill || "all"}
          onValueChange={val => setFilters(prev => ({ ...prev, skill: val === "all" ? "" : val }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="All skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            {EXPERTISE_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Platforms</Label>
        <div className="space-y-2">
          {PLATFORMS.map(p => (
            <label key={p.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={filters.platformFilter.includes(p.value)}
                onCheckedChange={() => togglePlatform(p.value)}
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date Posted</Label>
        <RadioGroup
          value={filters.dateFilter}
          onValueChange={val => setFilters(prev => ({ ...prev, dateFilter: val as Filters["dateFilter"] }))}
        >
          {DATE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Job Type</Label>
        <div className="space-y-2">
          {JOB_TYPES.map(t => (
            <label key={t.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={filters.jobTypes.includes(t.value)}
                onCheckedChange={() => toggleJobType(t.value)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <Button onClick={onApply} className="w-full" size="sm">
        Apply Filters
      </Button>

      <Link to="/jobs/preferences" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Settings2 className="w-3 h-3" />
        Set Preferences
        <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

interface ProposalModalProps {
  job: AggJob | null;
  open: boolean;
  onClose: () => void;
  userName: string;
  hourlyRate: string;
}

function ProposalModal({ job, open, onClose, userName, hourlyRate }: ProposalModalProps) {
  const [copied, setCopied] = useState(false);
  const [proposal, setProposal] = useState("");

  useEffect(() => {
    if (!job) return;
    setProposal(
      `Dear Hiring Manager,\n\nI'm applying for the "${job.title}" position. I bring strong expertise in ${(job.skill_tags || []).slice(0, 3).join(", ") || "the required skills"} and have delivered similar projects with measurable results. I'm confident I can add immediate value to your team.\n\nMy rate is ${hourlyRate || "competitive"}. I'd love to discuss how I can help.\n\nBest regards,\n${userName || "Applicant"}`
    );
  }, [job, userName, hourlyRate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Proposal</DialogTitle>
        </DialogHeader>
        {job && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge className={`text-xs font-semibold uppercase ${platformBadgeClass(job.platform)}`}>{job.platform}</Badge>
              <span className="text-sm font-medium text-foreground truncate">{job.title}</span>
            </div>
            <Textarea
              value={proposal}
              onChange={e => setProposal(e.target.value)}
              rows={10}
              className="font-mono text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy Proposal"}
              </Button>
              <Button
                onClick={() => window.open(job.external_url, "_blank")}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Apply on {job.platform}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface JobCardProps {
  job: AggJob;
  saved: boolean;
  onSave: (jobId: string) => void;
  onProposal: (job: AggJob) => void;
}

function JobCard({ job, saved, onSave, onProposal }: JobCardProps) {
  const navigate = useNavigate();

  const relativeDate = job.posted_at
    ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
    : "Recently";

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all cursor-pointer group"
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2 mb-2">
          <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-md ${platformBadgeClass(job.platform)}`}>
            {job.platform}
          </span>
          {job.matchScore > 0 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${matchPillClass(job.matchScore)}`}>
              {job.matchScore}% match
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onSave(job.id); }}
          className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
        >
          <Heart className={`w-4 h-4 ${saved ? "fill-red-500 text-red-500" : ""}`} />
        </button>
      </div>

      <h3 className="font-semibold text-foreground text-base mb-1 group-hover:text-primary transition-colors line-clamp-2">
        {job.title}
      </h3>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
        {job.budget && <span className="text-green-600 dark:text-green-400 font-medium">{job.budget}</span>}
        {job.job_type && <span className="capitalize">{job.job_type}</span>}
        {job.location && <span>{job.location}</span>}
        <span>{relativeDate}</span>
      </div>

      {job.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {job.description}
        </p>
      )}

      {job.skill_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {job.skill_tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs capitalize">{tag}</Badge>
          ))}
          {job.skill_tags.length > 3 && (
            <Badge variant="outline" className="text-xs">+{job.skill_tags.length - 3}</Badge>
          )}
        </div>
      )}

      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onProposal(job)}
        >
          Generate Proposal
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(job.external_url, "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium ${className}`}>{children}</label>
);

export default function Jobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<AggJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"high" | "good" | "all">("all");
  const [filters, setFilters] = useState<Filters>({
    search: "",
    skill: "",
    platformFilter: [],
    dateFilter: "today",
    jobTypes: [],
    locationPref: "",
  });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [proposalJob, setProposalJob] = useState<AggJob | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const pageRef = useRef(page);
  pageRef.current = page;

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: talent } = await (supabase as any)
        .from("talent_profiles")
        .select("id, primary_skill, secondary_skills, full_name, hourly_rate")
        .eq("user_id", user.id)
        .single();

      if (talent) {
        setTalentId(talent.id);
        setUserName(talent.full_name || "");
        setHourlyRate(talent.hourly_rate ? `$${talent.hourly_rate}/hr` : "");
        const skills = [talent.primary_skill, ...(talent.secondary_skills || [])].filter(Boolean);
        setUserSkills(skills);

        const { data: saved } = await (supabase as any)
          .from("saved_jobs")
          .select("agg_job_id")
          .eq("talent_id", talent.id)
          .eq("source", "aggregated");

        if (saved) {
          setSavedJobIds(new Set(saved.map((s: any) => s.agg_job_id).filter(Boolean)));
        }
      }
    };
    init();
  }, [user]);

  const fetchJobs = useCallback(async (reset = false) => {
    setLoading(true);
    const currentFilters = filtersRef.current;
    const currentPage = reset ? 0 : pageRef.current;
    const pageSize = 20;

    let query = (supabase as any)
      .from("aggregated_jobs")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("posted_at", { ascending: false });

    if (currentFilters.search) query = query.ilike("title", `%${currentFilters.search}%`);
    if (currentFilters.skill) query = query.contains("skill_tags", [currentFilters.skill.toLowerCase()]);
    if (currentFilters.platformFilter.length) query = query.in("platform", currentFilters.platformFilter);
    if (currentFilters.jobTypes.length) query = query.in("job_type", currentFilters.jobTypes);
    if (currentFilters.dateFilter === "today") query = query.gte("posted_at", new Date(Date.now() - 86400000).toISOString());
    if (currentFilters.dateFilter === "week") query = query.gte("posted_at", new Date(Date.now() - 7 * 86400000).toISOString());

    query = query.range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

    const { data, count, error } = await query;

    if (error) { setLoading(false); return; }

    const currentSkills = userSkills;
    const scored: AggJob[] = (data || []).map((job: any) => ({
      ...job,
      matchScore: scoreJob(job, currentSkills),
    }));

    setJobs(reset ? scored : [...jobsRef.current, ...scored]);
    setHasMore((data || []).length === pageSize && (currentPage + 1) * pageSize < (count || 0));
    if (reset) setPage(0);
    setLoading(false);
  }, [userSkills]);

  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  const applyFilters = useCallback(() => {
    setPage(0);
    fetchJobs(true);
  }, [fetchJobs]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setTimeout(() => fetchJobs(false), 0);
  };

  const handleSaveJob = async (jobId: string) => {
    if (!user || !talentId) return;
    if (savedJobIds.has(jobId)) {
      await (supabase as any)
        .from("saved_jobs")
        .delete()
        .match({ talent_id: talentId, agg_job_id: jobId, source: "aggregated" });
      setSavedJobIds(prev => { const n = new Set(prev); n.delete(jobId); return n; });
    } else {
      const { error } = await (supabase as any)
        .from("saved_jobs")
        .insert({ talent_id: talentId, agg_job_id: jobId, source: "aggregated" });
      if (!error) setSavedJobIds(prev => new Set([...prev, jobId]));
      else toast({ title: "Error saving job", variant: "destructive" });
    }
  };

  const openProposal = (job: AggJob) => {
    setProposalJob(job);
    setProposalOpen(true);
  };

  const filteredJobs = jobs.filter(job => {
    if (activeTab === "high") return job.matchScore >= 80;
    if (activeTab === "good") return job.matchScore >= 60 && job.matchScore < 80;
    return true;
  });

  const highCount = jobs.filter(j => j.matchScore >= 80).length;
  const goodCount = jobs.filter(j => j.matchScore >= 60 && j.matchScore < 80).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Find Jobs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jobs from Upwork, LinkedIn, Indeed, Jobberman, Remote OK and more
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setShowMobileFilters(v => !v)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            Filters
          </Button>
          <Link to="/jobs/saved">
            <Button variant="outline" size="sm">
              <Heart className="w-4 h-4 mr-1" />
              Saved
            </Button>
          </Link>
          <Link to="/jobs/preferences">
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-1" />
              Preferences
            </Button>
          </Link>
        </div>
      </div>

      {showMobileFilters && (
        <div className="md:hidden mb-4">
          <FilterSidebar filters={filters} setFilters={setFilters} onApply={applyFilters} />
        </div>
      )}

      <div className="flex gap-6">
        <aside className="hidden md:block w-64 shrink-0">
          <FilterSidebar filters={filters} setFilters={setFilters} onApply={applyFilters} />
        </aside>

        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "high" | "good" | "all")}>
            <TabsList className="mb-4">
              <TabsTrigger value="high" className="gap-1.5">
                High Match
                {highCount > 0 && (
                  <Badge className="ml-1 bg-green-500 text-white text-xs px-1.5 py-0">{highCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="good" className="gap-1.5">
                Good Match
                {goodCount > 0 && (
                  <Badge className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0">{goodCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                All Jobs
                <Badge className="ml-1 text-xs px-1.5 py-0" variant="secondary">{jobs.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading && jobs.length === 0 ? (
            <div className="grid gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No jobs found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {activeTab !== "all"
                  ? "No jobs match this filter. Try viewing All Jobs."
                  : "Jobs will appear here once scraped. Check back soon or adjust your filters."}
              </p>
              {activeTab !== "all" && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab("all")}>
                  View All Jobs
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={savedJobIds.has(job.id)}
                  onSave={handleSaveJob}
                  onProposal={openProposal}
                />
              ))}
            </div>
          )}

          {!loading && hasMore && filteredJobs.length > 0 && (
            <Button variant="outline" onClick={loadMore} className="w-full mt-4">
              Load More Jobs
            </Button>
          )}

          {loading && jobs.length > 0 && (
            <div className="flex justify-center mt-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <ProposalModal
        job={proposalJob}
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        userName={userName}
        hourlyRate={hourlyRate}
      />
    </div>
  );
}
