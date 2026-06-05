import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
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

const EXPERTISE_OPTIONS = [
  "3D Design", "Affiliate Marketing", "AI Development", "Amazon FBA", "Animation",
  "API Development", "Backend Development", "Blockchain", "Blog Writing", "Brand Identity",
  "Business Consulting", "Cloud Services", "Content Marketing", "Content Writing",
  "Copywriting", "Custom Software", "Customer Support", "Cybersecurity", "Data Entry",
  "Data Science", "DevOps", "Digital Strategy", "Dropshipping", "E-commerce", "Email Marketing",
  "Frontend Development", "Full Stack Development", "Game Development", "Ghostwriting",
  "Google Ads", "Graphic Design", "Growth Hacking", "GRC Consulting", "Illustration",
  "Influencer Marketing", "IT Support", "Lead Generation", "Logo Design", "Machine Learning",
  "Market Research", "Mobile App Development", "Motion Graphics", "Network Security",
  "No-Code Development", "Penetration Testing", "Photography", "Podcast Production",
  "PPC Advertising", "Product Design", "Product Listing", "Product Management",
  "Project Management", "Proofreading", "Public Relations", "Sales", "Scriptwriting",
  "SEO", "Shopify", "Social Media Management", "Social Media Marketing",
  "SaaS Development", "Supply Chain", "Technical Writing", "Translation", "UI/UX Design",
  "Video Editing", "Video Production", "Virtual Assistant", "Voice Over",
  "Web Design", "Web Development", "Webflow", "WordPress",
];

const PLATFORMS = [
  { value: "upwork", label: "Upwork" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "jobberman", label: "Jobberman" },
  { value: "remoteok", label: "Remote OK" },
  { value: "weworkremotely", label: "We Work Remotely" },
];

const JOB_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "remote", label: "Remote" },
  { value: "full-time", label: "Full-time" },
];

const DATE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

interface Filters {
  search: string;
  skill: string;
  platformFilter: string[];
  dateFilter: "today" | "week" | "month" | "all";
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
    <div className="border border-border rounded-xl bg-card p-5 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-4 w-14 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
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
    setFilters({ search: "", skill: "", platformFilter: [], dateFilter: "all", jobTypes: [], locationPref: "" });
    setTimeout(onApply, 0);
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{children}</p>
  );

  return (
    <div className="border border-border rounded-xl bg-card p-5 space-y-5 sticky top-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground">Filters</span>
        <button
          onClick={clearAll}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear All
        </button>
      </div>

      <div>
        <SectionLabel>Search</SectionLabel>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Job title..."
            value={filters.search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-8 h-8 text-[13px]"
          />
        </div>
      </div>

      <div>
        <SectionLabel>Skill</SectionLabel>
        <Select value={filters.skill} onValueChange={val => setFilters(prev => ({ ...prev, skill: val }))}>
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue placeholder="All skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Skills</SelectItem>
            {EXPERTISE_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <SectionLabel>Platforms</SectionLabel>
        <div className="space-y-2">
          {PLATFORMS.map(p => (
            <label key={p.value} className="flex items-center gap-2 cursor-pointer text-[13px] text-foreground">
              <Checkbox
                checked={filters.platformFilter.includes(p.value)}
                onCheckedChange={() => togglePlatform(p.value)}
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Date Posted</SectionLabel>
        <RadioGroup
          value={filters.dateFilter}
          onValueChange={val => setFilters(prev => ({ ...prev, dateFilter: val as Filters["dateFilter"] }))}
          className="space-y-2"
        >
          {DATE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-[13px] text-foreground">
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <SectionLabel>Job Type</SectionLabel>
        <div className="space-y-2">
          {JOB_TYPES.map(t => (
            <label key={t.value} className="flex items-center gap-2 cursor-pointer text-[13px] text-foreground">
              <Checkbox
                checked={filters.jobTypes.includes(t.value)}
                onCheckedChange={() => toggleJobType(t.value)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onApply}
        className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
      >
        Apply Filters
      </button>

      <Link
        to="/jobs/preferences"
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
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
          <DialogTitle className="text-[15px] font-semibold">Generate Proposal</DialogTitle>
        </DialogHeader>
        {job && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {job.platform}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[13px] font-medium text-foreground truncate">{job.title}</span>
            </div>
            <Textarea
              value={proposal}
              onChange={e => setProposal(e.target.value)}
              rows={10}
              className="font-mono text-[13px] resize-none bg-card border-border"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 h-8 rounded-lg border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Proposal"}
              </button>
              <button
                onClick={() => window.open(job.external_url, "_blank")}
                className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Apply on {job.platform}
              </button>
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
      className="border border-border bg-card rounded-xl overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group"
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {job.platform}
            </span>
            {job.matchScore > 0 && (
              <span className="text-[11px] font-semibold text-primary">{job.matchScore}% match</span>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onSave(job.id); }}
            className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Heart className={`w-4 h-4 ${saved ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </div>

        <h3 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5 line-clamp-2">
          {job.title}
        </h3>

        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-3">
          {job.budget && (
            <span className="text-foreground font-medium">{job.budget}</span>
          )}
          {job.budget && job.job_type && (
            <span className="text-muted-foreground/40">·</span>
          )}
          {job.job_type && (
            <span className="capitalize">{job.job_type}</span>
          )}
          {job.location && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span>{job.location}</span>
            </>
          )}
          <span className="text-muted-foreground/40">·</span>
          <span>{relativeDate}</span>
        </div>

        {job.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2 mb-3">
            {job.description}
          </p>
        )}

        {job.skill_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.skill_tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md"
              >
                {tag}
              </span>
            ))}
            {job.skill_tags.length > 3 && (
              <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                +{job.skill_tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onProposal(job)}
            className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
          >
            Generate Proposal
          </button>
          <a
            href={job.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

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
    dateFilter: "all",
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
    if (currentFilters.dateFilter === "month") query = query.gte("posted_at", new Date(Date.now() - 30 * 86400000).toISOString());

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
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Find Jobs</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Jobs from Upwork, LinkedIn, Indeed, Jobberman, Remote OK and more
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="md:hidden h-8 px-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-1.5"
            onClick={() => setShowMobileFilters(v => !v)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>
          <Link
            to="/jobs/saved"
            className="h-8 px-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5" />
            Saved
          </Link>
          <Link
            to="/jobs/preferences"
            className="h-8 px-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-1.5"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Preferences
          </Link>
        </div>
      </div>

      {/* Mobile Filters */}
      {showMobileFilters && (
        <div className="md:hidden mb-4">
          <FilterSidebar filters={filters} setFilters={setFilters} onApply={applyFilters} />
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <FilterSidebar filters={filters} setFilters={setFilters} onApply={applyFilters} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "high" | "good" | "all")}>
            <TabsList className="mb-4">
              <TabsTrigger value="high">
                High Match
                {highCount > 0 && (
                  <span className="text-[11px] text-muted-foreground ml-1">{highCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="good">
                Good Match
                {goodCount > 0 && (
                  <span className="text-[11px] text-muted-foreground ml-1">{goodCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                All Jobs
                <span className="text-[11px] text-muted-foreground ml-1">{jobs.length}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Job List */}
          {loading && jobs.length === 0 ? (
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Briefcase className="w-10 h-10 opacity-20 mx-auto mb-3" />
              <h3 className="text-[14px] font-medium text-foreground mb-1">No jobs found</h3>
              <p className="text-[13px] text-muted-foreground max-w-sm">
                {activeTab !== "all"
                  ? "No jobs match this filter. Try viewing All Jobs."
                  : "Jobs will appear here once scraped. Check back soon or adjust your filters."}
              </p>
              {activeTab !== "all" && (
                <button
                  onClick={() => setActiveTab("all")}
                  className="mt-4 h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  View All Jobs
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
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

          {/* Load More */}
          {!loading && hasMore && filteredJobs.length > 0 && (
            <button
              onClick={loadMore}
              className="w-full h-9 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors mt-4"
            >
              Load More Jobs
            </button>
          )}

          {/* Loading Spinner (pagination) */}
          {loading && jobs.length > 0 && (
            <div className="flex justify-center mt-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
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
