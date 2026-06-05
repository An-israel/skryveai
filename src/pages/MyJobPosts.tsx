import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Pencil, Plus, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  active: { color: "bg-green-500", label: "Active" },
  paused: { color: "bg-amber-500", label: "Paused" },
  draft: { color: "bg-muted-foreground/40", label: "Draft" },
  closed: { color: "bg-red-500", label: "Closed" },
};

type TabKey = "active" | "paused" | "draft" | "closed";

function EmptyTab({ tab }: { tab: TabKey }) {
  const messages: Record<TabKey, string> = {
    active: "No active job posts. Publish one to start receiving applications.",
    paused: "No paused jobs.",
    draft: "No draft jobs saved.",
    closed: "No closed jobs.",
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Briefcase className="w-9 h-9 text-muted-foreground/40 mb-3" />
      <p className="text-[13px] text-muted-foreground">{messages[tab]}</p>
    </div>
  );
}

export default function MyJobPosts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeId, setCloseId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("active");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/login"); return; }

      const { data: clientProfile } = await (supabase as any)
        .from("client_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!clientProfile) { setLoading(false); return; }

      const { data } = await (supabase as any)
        .from("job_posts")
        .select("id, title, status, applicant_count, created_at, deadline, views")
        .eq("client_id", clientProfile.id)
        .order("created_at", { ascending: false });

      setJobs(data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const updateJobStatus = async (id: string, status: string) => {
    await (supabase as any).from("job_posts").update({ status }).eq("id", id);
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    toast({ title: `Job ${status === "active" ? "resumed" : status}.` });
  };

  const filteredJobs = jobs.filter((j) => j.status === tab);

  const countFor = (s: TabKey) => jobs.filter((j) => j.status === s).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-72" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Job Posts</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage all your job listings.</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 flex items-center gap-2 transition-colors"
          onClick={() => navigate("/marketplace/post")}
        >
          <Plus className="w-4 h-4" /> Post New Job
        </button>
      </div>

      {/* Tabs + panel */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="bg-transparent gap-1 p-0">
              {(["active", "paused", "draft", "closed"] as TabKey[]).map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="text-[13px] capitalize data-[state=active]:bg-muted/60 data-[state=active]:text-foreground"
                >
                  {t}
                  {countFor(t) > 0 && (
                    <span className="ml-1.5 text-[11px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md">
                      {countFor(t)}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {filteredJobs.length === 0 ? (
          <EmptyTab tab={tab} />
        ) : (
          <div className="divide-y divide-border">
            {filteredJobs.map((job) => {
              const statusInfo = STATUS_DOT[job.status] || STATUS_DOT.draft;
              return (
                <div key={job.id} className="px-5 py-4 hover:bg-muted/30 transition-colors flex items-center gap-4">
                  {/* Status dot */}
                  <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${statusInfo.color}`} />

                  {/* Job info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground truncate">{job.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[12px] text-muted-foreground">
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {job.applicant_count || 0} applicant{job.applicant_count !== 1 ? "s" : ""}
                      </span>
                      {(job.views || job.view_count) > 0 && (
                        <span className="text-[12px] text-muted-foreground">
                          {job.views || job.view_count} views
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      title="View"
                      onClick={() => navigate(`/marketplace/${job.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      title="Edit"
                      onClick={() => navigate(`/marketplace/post?edit=${job.id}`)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {job.status === "active" && (
                      <button
                        className="px-3 py-1 rounded-lg text-[12px] text-amber-600 hover:bg-amber-500/10 transition-colors"
                        onClick={() => updateJobStatus(job.id, "paused")}
                      >
                        Pause
                      </button>
                    )}
                    {job.status === "paused" && (
                      <button
                        className="px-3 py-1 rounded-lg text-[12px] text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => updateJobStatus(job.id, "active")}
                      >
                        Resume
                      </button>
                    )}
                    {job.status !== "closed" && (
                      <button
                        className="px-3 py-1 rounded-lg text-[12px] text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => setCloseId(job.id)}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!closeId} onOpenChange={(open) => !open && setCloseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Job Post</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the job and stop accepting new applications. You can reopen it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (closeId) updateJobStatus(closeId, "closed");
                setCloseId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Close Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
