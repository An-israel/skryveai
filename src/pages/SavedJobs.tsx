import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, ExternalLink, Briefcase, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface SavedJobRow {
  id: string;
  agg_job_id: string;
  aggregated_jobs: AggJob;
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

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded bg-muted" />
      </div>
      <div className="h-5 w-3/4 rounded bg-muted mb-2" />
      <div className="h-4 w-1/3 rounded bg-muted mb-4" />
      <div className="h-4 w-full rounded bg-muted mb-2" />
    </div>
  );
}

export default function SavedJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [savedRows, setSavedRows] = useState<SavedJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [talentId, setTalentId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: talent } = await (supabase as any)
        .from("talent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!talent) { setLoading(false); return; }
      setTalentId(talent.id);

      const { data, error } = await (supabase as any)
        .from("saved_jobs")
        .select("id, agg_job_id, aggregated_jobs(*)")
        .eq("talent_id", talent.id)
        .eq("source", "aggregated")
        .order("saved_at", { ascending: false });

      if (!error && data) {
        setSavedRows(data.filter((r: any) => r.aggregated_jobs));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleRemove = async (savedId: string, jobId: string) => {
    if (!talentId) return;
    const { error } = await (supabase as any)
      .from("saved_jobs")
      .delete()
      .eq("id", savedId);

    if (!error) {
      setSavedRows(prev => prev.filter(r => r.id !== savedId));
      toast({ title: "Job removed from saved" });
    } else {
      toast({ title: "Error removing job", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            Saved Jobs
          </h1>
          <p className="text-sm text-muted-foreground">{savedRows.length} saved job{savedRows.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : savedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No saved jobs yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Browse jobs to save ones you like. Saved jobs appear here for easy access.
          </p>
          <Link to="/jobs">
            <Button>Browse Jobs</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {savedRows.map(row => {
            const job = row.aggregated_jobs;
            const relativeDate = job.posted_at
              ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
              : "Recently";

            return (
              <div
                key={row.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-md ${platformBadgeClass(job.platform)}`}>
                      {job.platform}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleRemove(row.id, job.id); }}
                    className="shrink-0 text-red-500 hover:text-red-400 transition-colors"
                  >
                    <Heart className="w-4 h-4 fill-red-500" />
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
                  <Button size="sm" className="flex-1" onClick={() => navigate(`/jobs/${job.id}`)}>
                    View Job
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(job.external_url, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-400"
                    onClick={() => handleRemove(row.id, job.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
