import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Heart, ExternalLink, Loader2, Copy, Check,
  MapPin, Briefcase, DollarSign, Calendar
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
  if (score >= 80) return "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800";
  if (score >= 60) return "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800";
  return "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
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
  const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-blue-600" : "text-gray-500";
  const ringColor = score >= 80 ? "stroke-green-500" : score >= 60 ? "stroke-blue-500" : "stroke-gray-400";
  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle
            cx="40" cy="40" r="30" fill="none" strokeWidth="6"
            className={ringColor}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-bold text-base ${color}`}>
          {score}%
        </div>
      </div>
      <div>
        <div className="font-semibold text-foreground">AI Match Score</div>
        <div className="text-sm text-muted-foreground mt-0.5">
          {score >= 80 ? "Excellent match for your skills" : score >= 60 ? "Good match for your profile" : "Partial skill match"}
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
  const [userName, setUserName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposal, setProposal] = useState("");
  const [copied, setCopied] = useState(false);

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
          setUserName(talent.full_name || "");
          setHourlyRate(talent.hourly_rate ? `$${talent.hourly_rate}/hr` : "");
          setPrimarySkill(talent.primary_skill || "");
          const skills = [talent.primary_skill, ...(talent.secondary_skills || [])].filter(Boolean);
          setMatchScore(scoreJob(jobData, skills));

          const { data: saved } = await (supabase as any)
            .from("saved_jobs")
            .select("id")
            .eq("talent_id", talent.id)
            .eq("agg_job_id", jobId)
            .eq("source", "aggregated")
            .maybeSingle();

          setSaved(!!saved);
        }
      }
      setLoading(false);
    };
    load();
  }, [jobId, user]);

  useEffect(() => {
    if (!job) return;
    setProposal(
      `Dear Hiring Manager,\n\nI'm applying for the "${job.title}" position. I bring strong expertise in ${(job.skill_tags || []).slice(0, 3).join(", ") || "the required skills"} and have delivered similar projects with measurable results. I'm confident I can add immediate value to your team.\n\nMy rate is ${hourlyRate || "competitive"}. I'd love to discuss how I can help.\n\nBest regards,\n${userName || "Applicant"}`
    );
  }, [job, userName, hourlyRate]);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="h-40 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="text-center py-20">
          <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Job not found</h3>
          <p className="text-sm text-muted-foreground">This job may have been removed or is no longer active.</p>
          <Button className="mt-6" onClick={() => navigate("/jobs")}>Browse Jobs</Button>
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-md ${platformBadgeClass(job.platform)}`}>
            {job.platform}
          </span>
          {matchScore > 0 && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${matchPillClass(matchScore)}`}>
              {matchScore}% match
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-foreground mb-3 leading-snug">{job.title}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
          {job.budget && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
              <DollarSign className="w-4 h-4" />
              {job.budget}
            </div>
          )}
          {job.job_type && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span className="capitalize">{job.job_type}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {job.location}
            </div>
          )}
          {relativeDate && (
            <div className="flex items-center gap-1.5" title={fullDate || ""}>
              <Calendar className="w-4 h-4" />
              {relativeDate}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setProposalOpen(true)} className="flex-1 sm:flex-none">
            Generate Proposal
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleSave}
            className={saved ? "text-red-500 border-red-200 hover:text-red-400" : ""}
          >
            <Heart className={`w-4 h-4 mr-1.5 ${saved ? "fill-red-500 text-red-500" : ""}`} />
            {saved ? "Saved" : "Save Job"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.open(job.external_url, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Apply on {job.platform}
          </Button>
        </div>
      </div>

      {job.description && (
        <div className="bg-card border border-border rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-foreground mb-3">Job Description</h2>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {job.description}
          </p>
        </div>
      )}

      {job.skill_tags.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-foreground mb-3">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {job.skill_tags.map(tag => (
              <Badge key={tag} variant="secondary" className="capitalize">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {matchScore > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-4">
          <ScoreCircle score={matchScore} />
          {primarySkill && (
            <p className="text-sm text-muted-foreground mt-3">
              This job matches your <span className="font-medium text-foreground">{primarySkill}</span> skill and your profile.
            </p>
          )}
        </div>
      )}

      <Dialog open={proposalOpen} onOpenChange={v => !v && setProposalOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Proposal</DialogTitle>
          </DialogHeader>
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
              <Button onClick={() => window.open(job.external_url, "_blank")} className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                Apply on {job.platform}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
