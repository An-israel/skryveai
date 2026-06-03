import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BadgeCheck,
  Star,
  Share2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { ApplicationDrawer } from "@/components/marketplace/ApplicationDrawer";

/* ── helpers ──────────────────────────────────────────────── */

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

/* ── loading skeleton ─────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-1.5 mb-6">
        <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" />
        <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-3 animate-pulse mb-8">
        <div className="h-8 w-3/4 rounded-lg bg-muted" />
        <div className="h-3.5 w-1/2 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-48 rounded-xl bg-muted" />
          <div className="h-32 rounded-xl bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-48 rounded-xl bg-muted" />
          <div className="h-36 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

/* ── match score widget ───────────────────────────────────── */

function AIMatchScore({ job, userSkills }: { job: any; userSkills: string[] }) {
  const score = scoreJob(job, userSkills);
  if (!userSkills.length) return null;

  const tags = (job.required_skills || []).map((t: string) => t.toLowerCase());
  const matchedSkill = userSkills.find(
    (s) => tags.includes(s.toLowerCase()) || tags.some((t: string) => t.includes(s.toLowerCase()))
  );

  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (score / 100) * circumference;
  const ringColor =
    score >= 80 ? "stroke-green-500" : score >= 60 ? "stroke-blue-500" : "stroke-muted-foreground/50";
  const textColor =
    score >= 80 ? "text-green-500" : score >= 60 ? "text-blue-500" : "text-muted-foreground";

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Profile Match</span>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor"
                strokeWidth="6" className="text-muted/20" />
              <circle
                cx="40" cy="40" r="30" fill="none" strokeWidth="6"
                className={ringColor}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm ${textColor}`}>
              {score}%
            </div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-foreground">
              {score >= 80 ? "Excellent match!" : score >= 60 ? "Good match" : "Partial match"}
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {matchedSkill
                ? `This job requires ${matchedSkill} which matches your profile.`
                : "Some of your skills align with this job's requirements."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── main component ───────────────────────────────────────── */

export default function MarketplaceJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existingApp, setExistingApp] = useState<any>(null);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [talentProfileId, setTalentProfileId] = useState<string | null>(null);
  const [showApplicationDrawer, setShowApplicationDrawer] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUser(session.user);

      const [jobRes, profileRes] = await Promise.all([
        (supabase as any)
          .from("job_posts")
          .select(`
            *,
            client_profiles(
              id, company_name, industry, logo_url, is_verified, created_at, user_id,
              total_hires,
              client_reviews:reviews(rating)
            )
          `)
          .eq("id", jobId)
          .single(),
        (supabase as any)
          .from("talent_profiles")
          .select("id, primary_skill, secondary_skills")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);

      if (jobRes.data) setJob(jobRes.data);
      if (profileRes.data) {
        setTalentProfileId(profileRes.data.id);
        const skills = [profileRes.data.primary_skill, ...(profileRes.data.secondary_skills || [])].filter(Boolean);
        setUserSkills(skills);

        const [appRes, savedRes] = await Promise.all([
          (supabase as any)
            .from("job_applications")
            .select("id, status, created_at")
            .eq("user_id", session.user.id)
            .eq("marketplace_job_id", jobId)
            .maybeSingle(),
          (supabase as any)
            .from("saved_jobs")
            .select("id")
            .eq("talent_id", profileRes.data.id)
            .eq("job_id", jobId)
            .eq("source", "marketplace")
            .maybeSingle(),
        ]);
        if (appRes.data) setExistingApp(appRes.data);
        if (savedRes.data) setIsSaved(true);
      }

      setLoading(false);
    };
    load();
  }, [jobId]);

  const handleSaveJob = async () => {
    if (!user || !talentProfileId) return;
    if (isSaved) {
      await (supabase as any)
        .from("saved_jobs")
        .delete()
        .match({ talent_id: talentProfileId, job_id: jobId, source: "marketplace" });
      setIsSaved(false);
    } else {
      await (supabase as any)
        .from("saved_jobs")
        .insert({ talent_id: talentProfileId, job_id: jobId, source: "marketplace" });
      setIsSaved(true);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard!" });
  };

  /* ── render states ── */

  if (loading) return <PageSkeleton />;

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/marketplace")}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Marketplace
        </button>
        <div className="text-center py-20">
          <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-[14px] font-semibold text-foreground mb-1.5">Job not found</h3>
          <p className="text-[13px] text-muted-foreground">
            This job may have been removed or is no longer active.
          </p>
          <button
            onClick={() => navigate("/marketplace")}
            className="mt-6 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse Marketplace
          </button>
        </div>
      </div>
    );
  }

  /* ── derived values ── */

  const client = job.client_profiles;
  const clientRating = calcAvgRating(client?.client_reviews);
  const companyName = client?.company_name || "Unknown Client";
  const initials = companyName.slice(0, 2).toUpperCase();
  const deadline = job.deadline ? new Date(job.deadline) : null;
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const requiredSkills: string[] = job.required_skills || [];

  const jobTypeLabel =
    job.job_type === "gig" ? "One-time Gig"
    : job.job_type === "contract" ? "Contract"
    : job.job_type === "long_term" ? "Long-term"
    : job.job_type ?? null;

  const appStatusColors: Record<string, string> = {
    hired:       "bg-green-500/10 text-green-500",
    rejected:    "bg-red-500/10 text-red-400",
    interview:   "bg-indigo-500/10 text-indigo-400",
    shortlisted: "bg-purple-500/10 text-purple-400",
    applied:     "bg-muted text-muted-foreground",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate("/marketplace")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Marketplace
      </button>

      {/* Hero */}
      <div className="mb-6">
        {/* Status chip row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {job.status === "active" ? (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Active
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md capitalize">
              {job.status}
            </span>
          )}
          {jobTypeLabel && (
            <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
              {jobTypeLabel}
            </span>
          )}
          {job.location_type && (
            <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md capitalize">
              {job.location_type}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-3 leading-snug">
          {job.title}
        </h1>

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span className="text-lg font-semibold text-foreground leading-none">{formatBudget(job)}</span>
          </span>
          {jobTypeLabel && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {jobTypeLabel}
              </span>
            </>
          )}
          {job.location_type && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="capitalize">{job.location_type}</span>
              </span>
            </>
          )}
          {job.duration && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {job.duration}
              </span>
            </>
          )}
          <span className="text-muted-foreground/40">·</span>
          <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="text-[13px] font-semibold text-foreground">Job Description</span>
            </div>
            <div className="px-5 py-5">
              <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
              {Array.isArray(job.attachments) && job.attachments.length > 0 && (
                <>
                  <div className="border-t border-border my-5" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Attachments
                  </p>
                  <div className="space-y-1.5">
                    {job.attachments.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-primary hover:underline block"
                      >
                        Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Required Skills */}
          {requiredSkills.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Required Skills</span>
              </div>
              <div className="px-5 py-5">
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI match score */}
          <AIMatchScore job={job} userSkills={userSkills} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Client info */}
            {client && (
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <span className="text-[13px] font-semibold text-foreground">About the Client</span>
                </div>
                <div className="px-5 py-5 space-y-4">
                  {/* Initials avatar + name + verified */}
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt={companyName}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[13px] font-bold text-primary shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-semibold text-foreground truncate">
                          {companyName}
                        </span>
                        {client.is_verified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                      </div>
                      {client.industry && (
                        <span className="text-[12px] text-muted-foreground">{client.industry}</span>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  {clientRating !== null && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-[13px] font-semibold text-foreground">
                        {clientRating.toFixed(1)}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        ({client.client_reviews?.length || 0} reviews)
                      </span>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        Member since
                      </p>
                      <p className="text-[13px] text-foreground">
                        {new Date(client.created_at).getFullYear()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        Total hires
                      </p>
                      <p className="text-[13px] text-foreground">{client.total_hires || 0}</p>
                    </div>
                  </div>

                  {client.user_id && (
                    <Link
                      to={`/profile/${client.user_id}`}
                      className="block w-full px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-center"
                    >
                      View Client Profile
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Apply / save panel */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Apply</span>
              </div>
              <div className="px-5 py-5 space-y-4">
                {/* Applicant count + deadline */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {job.applicant_count || 0} applicants
                  </span>
                  {deadline && (
                    <span className={`flex items-center gap-1.5 ${isExpired ? "text-destructive" : ""}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {isExpired
                        ? "Deadline passed"
                        : `${daysLeft} days left`}
                    </span>
                  )}
                </div>

                {/* Application state */}
                {existingApp ? (
                  <div className="p-3.5 rounded-lg border border-green-500/20 bg-green-500/5">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-[13px] font-semibold text-green-500">
                        Application Submitted
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      Applied {formatDistanceToNow(new Date(existingApp.created_at), { addSuffix: true })}
                    </p>
                    <div className="mt-2.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium capitalize ${
                        appStatusColors[existingApp.status] || appStatusColors.applied
                      }`}>
                        {existingApp.status}
                      </span>
                    </div>
                  </div>
                ) : isExpired ? (
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>No longer accepting applications</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowApplicationDrawer(true)}
                    disabled={job.status !== "active"}
                    className="w-full px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Now
                  </button>
                )}

                {/* Save + share row */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveJob}
                    className={`flex-1 px-4 py-2.5 rounded-lg border text-[13px] transition-colors flex items-center justify-center gap-1.5 ${
                      isSaved
                        ? "border-primary/30 text-primary hover:border-primary/50"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                    {isSaved ? "Saved" : "Save Job"}
                  </button>
                  <button
                    onClick={handleShare}
                    aria-label="Share job"
                    className="px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user && job && (
        <ApplicationDrawer
          job={job}
          user={user}
          open={showApplicationDrawer}
          onClose={() => setShowApplicationDrawer(false)}
          onSuccess={() => {
            setExistingApp({ status: "applied", created_at: new Date().toISOString() });
          }}
        />
      )}
    </div>
  );
}
