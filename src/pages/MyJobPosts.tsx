import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  paused: { label: "Paused", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  closed: { label: "Closed", className: "bg-red-500/10 text-red-600 border-red-500/20" },
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
      <Briefcase className="w-10 h-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">{messages[tab]}</p>
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

  const filteredJobs = jobs.filter((j) => {
    if (tab === "active") return j.status === "active";
    if (tab === "paused") return j.status === "paused";
    if (tab === "draft") return j.status === "draft";
    if (tab === "closed") return j.status === "closed";
    return true;
  });

  const countFor = (s: TabKey) => {
    const map: Record<TabKey, string> = {
      active: "active",
      paused: "paused",
      draft: "draft",
      closed: "closed",
    };
    return jobs.filter((j) => j.status === map[s]).length;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-72" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Job Posts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all your job listings.</p>
        </div>
        <Button onClick={() => navigate("/marketplace/post")} className="gap-1">
          <Plus className="w-4 h-4" /> Post New Job
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="active">Active <Badge variant="secondary" className="ml-1.5 py-0 px-1.5 text-xs">{countFor("active")}</Badge></TabsTrigger>
          <TabsTrigger value="paused">Paused <Badge variant="secondary" className="ml-1.5 py-0 px-1.5 text-xs">{countFor("paused")}</Badge></TabsTrigger>
          <TabsTrigger value="draft">Draft <Badge variant="secondary" className="ml-1.5 py-0 px-1.5 text-xs">{countFor("draft")}</Badge></TabsTrigger>
          <TabsTrigger value="closed">Closed <Badge variant="secondary" className="ml-1.5 py-0 px-1.5 text-xs">{countFor("closed")}</Badge></TabsTrigger>
        </TabsList>

        {(["active", "paused", "draft", "closed"] as TabKey[]).map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey}>
            {filteredJobs.length === 0 ? (
              <EmptyTab tab={tabKey} />
            ) : (
              <div className="rounded-xl border border-border overflow-hidden mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Applicants</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => {
                      const statusInfo = STATUS_BADGE[job.status] || STATUS_BADGE.draft;
                      return (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium max-w-[220px] truncate">
                            {job.title}
                          </TableCell>
                          <TableCell>{job.applicant_count || 0}</TableCell>
                          <TableCell>{job.views || job.view_count || 0}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="View"
                                onClick={() => navigate(`/marketplace/${job.id}`)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Edit"
                                onClick={() => navigate(`/marketplace/post?edit=${job.id}`)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {job.status === "active" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-amber-600 hover:text-amber-600"
                                  onClick={() => updateJobStatus(job.id, "paused")}
                                >
                                  Pause
                                </Button>
                              )}
                              {job.status === "paused" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-green-600 hover:text-green-600"
                                  onClick={() => updateJobStatus(job.id, "active")}
                                >
                                  Resume
                                </Button>
                              )}
                              {job.status !== "closed" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                  onClick={() => setCloseId(job.id)}
                                >
                                  Close
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

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
