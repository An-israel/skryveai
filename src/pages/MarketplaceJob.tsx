import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { ApplicationDrawer } from "@/components/marketplace/ApplicationDrawer";
import { TailorCVButton } from "@/components/cv/TailorCVButton";

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

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    </div>
  );
}

function AIMatchScore({ job, userSkills }: { job: any; userSkills: string[] }) {
  const score = scoreJob(job, userSkills);
  if (!userSkills.length) return null;

  const tags = (job.required_skills || []).map((t: string) => t.toLowerCase());
  const matchedSkill = userSkills.find((s) => tags.includes(s.toLowerCase()) || tags.some((t: string) => t.includes(s.toLowerCase())));

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : "#94a3b8";

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold mb-4">AI Match Score</h3>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 48 48" className="w-16 h-16 -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{score}%</span>
          </div>
          <div>
            <p className="text-sm font-medium">
              {score >= 80 ? "Excellent match!" : score >= 60 ? "Good match" : "Partial match"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {matchedSkill
                ? `This job requires ${matchedSkill} which matches your profile.`
                : "Some of your skills align with this job's requirements."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
              total_hires, rating_avg, total_reviews
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

  if (loading) return <PageSkeleton />;
  if (!job) return (
    <div className="text-center py-24">
      <p className="text-muted-foreground">Job not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/marketplace")}>
        Back to Marketplace
      </Button>
    </div>
  );

  const client = job.client_profiles;
  const clientRating = client?.total_reviews > 0 ? client.rating_avg : null;
  const companyName = client?.company_name || "Unknown Client";
  const initials = companyName.slice(0, 2).toUpperCase();
  const deadline = job.deadline ? new Date(job.deadline) : null;
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const requiredSkills: string[] = job.required_skills || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-display font-bold leading-tight">{job.title}</h1>
                <Badge
                  variant={job.status === "active" ? "default" : "secondary"}
                  className="capitalize shrink-0"
                >
                  {job.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                {deadline && (
                  <span className={isExpired ? "text-destructive" : ""}>
                    {isExpired ? "Deadline passed" : `Deadline: ${deadline.toLocaleDateString()}`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-sm font-medium">{formatBudget(job)}</Badge>
                {job.job_type && (
                  <Badge variant="outline" className="capitalize">
                    {job.job_type === "gig" ? "One-time Gig" : job.job_type === "contract" ? "Contract" : "Long-term"}
                  </Badge>
                )}
                {job.location_type && (
                  <Badge variant="outline" className="capitalize">{job.location_type}</Badge>
                )}
                {job.duration && (
                  <Badge variant="outline">{job.duration}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-3">Job Description</h2>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{job.description}</p>
              {Array.isArray(job.attachments) && job.attachments.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Attachments</h3>
                  <div className="space-y-1">
                    {job.attachments.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block"
                      >
                        Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {requiredSkills.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-3">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <AIMatchScore job={job} userSkills={userSkills} />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {client && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold">About the Client</h3>
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img src={client.logo_url} alt={companyName} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                        {initials}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{companyName}</span>
                        {client.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                      </div>
                      {client.industry && (
                        <span className="text-xs text-muted-foreground">{client.industry}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Member since</p>
                      <p className="font-medium">{new Date(client.created_at).getFullYear()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total hires</p>
                      <p className="font-medium">{client.total_hires || 0}</p>
                    </div>
                  </div>

                  {clientRating !== null && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{clientRating.toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        ({client.total_reviews || 0} reviews)
                      </span>
                    </div>
                  )}

                  {client.user_id && (
                    <Button variant="outline" className="w-full text-sm" asChild>
                      <Link to={`/profile/${client.user_id}`}>View Client Profile</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{job.applicant_count || 0} applicants</span>
                </div>

                {deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {isExpired ? (
                      <span className="text-destructive font-medium">Deadline expired</span>
                    ) : (
                      <span className="text-foreground">
                        <span className="font-medium">{daysLeft}</span> days left to apply
                      </span>
                    )}
                  </div>
                )}

                {existingApp ? (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">Application Submitted</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied {formatDistanceToNow(new Date(existingApp.created_at), { addSuffix: true })}
                    </p>
                    <div className="mt-2">
                      <Badge
                        className={
                          existingApp.status === "hired"
                            ? "bg-green-100 text-green-700"
                            : existingApp.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : existingApp.status === "interview"
                            ? "bg-indigo-100 text-indigo-700"
                            : existingApp.status === "shortlisted"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {existingApp.status}
                      </Badge>
                    </div>
                  </div>
                ) : isExpired ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span>This job is no longer accepting applications</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => setShowApplicationDrawer(true)}
                      disabled={job.status !== "active"}
                    >
                      Apply Now
                    </Button>
                    <TailorCVButton
                      jobTitle={job.title}
                      jobDescription={job.description || ""}
                      requiredSkills={requiredSkills}
                      variant="outline"
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleSaveJob}>
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 mr-2 text-primary" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4 mr-2" />
                        Save Job
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Share job">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
