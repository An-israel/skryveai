import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProposalModal } from "@/components/proposals/ProposalModal";
import {
  ArrowLeft, Heart, ExternalLink,
  MapPin, Briefcase, DollarSign, Calendar,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

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
}

function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    upwork: "Upwork",
    remoteok: "RemoteOK",
    weworkremotely: "WeWorkRemotely",
    linkedin: "LinkedIn",
    indeed: "Indeed",
    jobberman: "Jobberman",
  };
  return map[platform] || platform;
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

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-green-500" : score >= 60 ? "text-blue-500" : "text-muted-foreground";
  const ringColor =
    score >= 80 ? "stroke-green-500" : score >= 60 ? "stroke-blue-500" : "stroke-muted-foreground/50";
  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
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
        <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm ${color}`}>
          {score}%
        </div>
      </div>
      <div>
        <div className="text-[13px] font-semibold text-foreground">AI Match Score</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">
          {score >= 80
            ? "Excellent match for your skills"
            : score >= 60
            ? "Good match for your profile"
            : "Partial skill match"}
        </div>
      </div>
    </div>
  );
}

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [job, setJob] = useState<AggJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [primarySkill, setPrimarySkill] = useState("");
  const [talentId, setTalentId] = useState<string | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const load = async () => {
      setLoading(true);
      const { data: jobData } = await (supabase as any)
        .from("aggregated_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      setJob(jobData || null);

      if (user && jobData) {
        const { data: talent } = await (supabase as any)
          .from("talent_profiles")
          .select("id, primary_skill, secondary_skills, full_name, hourly_rate")
          .eq("user_id", user.id)
          .single();

        if (talent) {
          setTalentId(talent.id);
          setPrimarySkill(talent.primary_skill || "");
          const skills = [talent.primary_skill, ...(talent.secondary_skills || [])].filter(Boolean);
          setMatchScore(scoreJob(jobData, skills));

          const { data: savedData } = await (supabase as any)
            .from("saved_jobs")
            .select("id")
            .eq("talent_id", talent.id)
            .eq("agg_job_id", jobId)
            .eq("source", "aggregated")
            .maybeSingle();

          setSaved(!!savedData);
        }
      }
      setLoading(false);
    };
    load();
  }, [jobId, user]);

  const handleToggleSave = async () => {
    if (!user || !talentId || !jobId) return;
    if (saved) {
      await (supabase as any)
        .from("saved_jobs")
        .delete()
        .match({ talent_id: talentId, agg_job_id: jobId, source: "aggregated" });
      setSaved(false);
    } else {
      const { error } = await (supabase as any)
        .from("saved_jobs")
        .insert({ talent_id: talentId, agg_job_id: jobId, source: "aggregated" });
      if (!error) setSaved(true);
      else toast({ title: "Error saving job", variant: "destructive" });
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-1.5 mb-6">
          <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" />
          <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-3 animate-pulse mb-8">
          <div className="h-8 w-3/4 rounded-lg bg-muted" />
          <div className="h-3.5 w-1/2 rounded bg-muted" />
        </div>
        <div className="space-y-4 animate-pulse">
          <div className="h-48 rounded-xl bg-muted" />
          <div className="h-32 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Jobs
        </button>
        <div className="text-center py-20">
          <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-[14px] font-semibold text-foreground mb-1.5">Job not found</h3>
          <p className="text-[13px] text-muted-foreground">
            This job may have been removed or is no longer active.
          </p>
          <button
            onClick={() => navigate("/jobs")}
            className="mt-6 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  const relativeDate = job.posted_at
    ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
    : null;
  const fullDate = job.posted_at
    ? format(new Date(job.posted_at), "MMM d, yyyy")
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate("/jobs")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Jobs
      </button>

      {/* Hero */}
      <div className="mb-6">
        {/* Top chip row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md font-medium uppercase tracking-wide">
            {platformLabel(job.platform)}
          </span>
          {job.is_active && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Active
            </span>
          )}
          {matchScore > 0 && (
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
              matchScore >= 80
                ? "bg-green-500/10 text-green-500"
                : matchScore >= 60
                ? "bg-blue-500/10 text-blue-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {matchScore}% match
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-3 leading-snug">
          {job.title}
        </h1>

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
          {job.budget && (
            <>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-lg font-semibold text-foreground leading-none">{job.budget}</span>
              </span>
              <span className="text-muted-foreground/40">·</span>
            </>
          )}
          {job.job_type && (
            <>
              <span className="flex items-center gap-1 capitalize">
                <Briefcase className="w-3 h-3" />
                {job.job_type}
              </span>
              <span className="text-muted-foreground/40">·</span>
            </>
          )}
          {job.location && (
            <>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
              <span className="text-muted-foreground/40">·</span>
            </>
          )}
          {relativeDate && (
            <span className="flex items-center gap-1" title={fullDate || ""}>
              <Calendar className="w-3 h-3" />
              {relativeDate}
            </span>
          )}
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {job.description && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Job Description</span>
              </div>
              <div className="px-5 py-5">
                <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
            </div>
          )}

          {/* Skills */}
          {job.skill_tags.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Required Skills</span>
              </div>
              <div className="px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Skills &amp; Technologies
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.skill_tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md capitalize"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Match score */}
          {matchScore > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Profile Match</span>
              </div>
              <div className="px-5 py-5">
                <ScoreCircle score={matchScore} />
                {primarySkill && (
                  <p className="text-[13px] text-muted-foreground mt-4">
                    This job matches your{" "}
                    <span className="font-medium text-foreground">{primarySkill}</span> skill
                    and your profile.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* CTA panel */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Apply</span>
              </div>
              <div className="px-5 py-5 space-y-3">
                <button
                  onClick={() => setProposalOpen(true)}
                  className="w-full px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  Generate Proposal
                </button>
                <button
                  onClick={() => window.open(job.external_url, "_blank")}
                  className="w-full px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Apply on {platformLabel(job.platform)}
                </button>
                <button
                  onClick={handleToggleSave}
                  className={`w-full px-5 py-2.5 rounded-lg border text-[13px] transition-colors flex items-center justify-center gap-1.5 ${
                    saved
                      ? "border-red-500/30 text-red-400 hover:border-red-500/50"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${saved ? "fill-red-500 text-red-500" : ""}`} />
                  {saved ? "Saved" : "Save Job"}
                </button>
              </div>
            </div>

            {/* Details panel */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Details</span>
              </div>
              <div className="px-5 py-5 space-y-3.5">
                {job.budget && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Budget
                    </p>
                    <p className="text-[14px] font-semibold text-foreground">{job.budget}</p>
                  </div>
                )}
                {job.job_type && (
                  <>
                    <div className="border-t border-border" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        Job Type
                      </p>
                      <p className="text-[13px] text-foreground capitalize">{job.job_type}</p>
                    </div>
                  </>
                )}
                {job.location && (
                  <>
                    <div className="border-t border-border" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        Location
                      </p>
                      <p className="text-[13px] text-foreground">{job.location}</p>
                    </div>
                  </>
                )}
                {relativeDate && (
                  <>
                    <div className="border-t border-border" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        Posted
                      </p>
                      <p className="text-[13px] text-foreground" title={fullDate || ""}>
                        {relativeDate}
                      </p>
                    </div>
                  </>
                )}
                <div className="border-t border-border" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Source
                  </p>
                  <p className="text-[13px] text-foreground">{platformLabel(job.platform)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        job={job ? {
          id: job.id,
          title: job.title,
          platform: job.platform,
          description: job.description || "",
          skill_tags: job.skill_tags,
          external_url: job.external_url,
        } : null}
      />
    </div>
  );
}
