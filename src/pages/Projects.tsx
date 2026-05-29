import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Building2, Star } from "lucide-react";

function EmptyProjectsState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No active projects yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Browse the marketplace to find your first project
      </p>
      <Button onClick={() => navigate("/marketplace")}>Browse Marketplace</Button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    awaiting_review: { label: "Awaiting Review", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    completed: { label: "Complete", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  };
  const s = map[status] || { label: status, className: "" };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

function PaymentBadge({ status }: { status: string }) {
  if (status === "released") return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Released</Badge>;
  if (status === "in_escrow") return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Escrow</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
}

function formatCurrency(amount: number | null, currency = "NGN") {
  if (!amount) return "—";
  const sym: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return `${sym[currency] || "₦"}${amount.toLocaleString()}`;
}

function isOverdue(deadline: string | null) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function ProjectCard({ project }: { project: any }) {
  const navigate = useNavigate();
  const total = project.project_milestones?.length || 0;
  const completedCount = project.project_milestones?.filter((m: any) => m.status === "completed").length || 0;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const jobTitle = project.marketplace_jobs?.title || project.title || "Untitled Project";
  const companyName = project.client_profiles?.company_name;
  const logoUrl = project.client_profiles?.logo_url;

  const daysUntilDeadline = project.deadline
    ? differenceInDays(new Date(project.deadline), new Date())
    : null;

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} className="w-full h-full object-cover" alt={companyName} />
              ) : (
                <span className="text-sm font-bold">{(companyName || "C")[0]}</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{jobTitle}</p>
              {companyName && <p className="text-xs text-muted-foreground">{companyName}</p>}
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div>
            <span className="text-muted-foreground">Rate: </span>
            <span className="font-medium">{formatCurrency(project.total_amount, project.currency)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Started: </span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Deadline: </span>
            {daysUntilDeadline !== null ? (
              <span className={`font-medium ${isOverdue(project.deadline) ? "text-red-500" : ""}`}>
                {isOverdue(project.deadline)
                  ? `${Math.abs(daysUntilDeadline)}d overdue`
                  : `${daysUntilDeadline}d remaining`}
              </span>
            ) : (
              <span className="font-medium text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Payment: </span>
            <PaymentBadge status={project.payment_status || "pending"} />
          </div>
        </div>

        {total > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Milestones</span>
              <span className="font-medium">{completedCount}/{total} complete</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompletedProjectCard({ project }: { project: any }) {
  const [expanded, setExpanded] = useState(false);
  const jobTitle = project.marketplace_jobs?.title || project.title || "Untitled Project";
  const companyName = project.client_profiles?.company_name;

  return (
    <Card className="cursor-pointer" onClick={() => setExpanded(v => !v)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">{jobTitle}</p>
              {companyName && <p className="text-xs text-muted-foreground">{companyName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{formatCurrency(project.total_amount, project.currency)}</span>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
              Complete
            </Badge>
          </div>
        </div>

        {project.completed_at && (
          <p className="text-xs text-muted-foreground mt-2">
            Completed {formatDistanceToNow(new Date(project.completed_at), { addSuffix: true })}
          </p>
        )}

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {project.project_deliverables?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                  Deliverables ({project.project_deliverables.length})
                </p>
                <div className="space-y-1">
                  {project.project_deliverables.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground">{d.file_name || d.external_url || "Deliverable"}</span>
                      <Badge variant="secondary" className="text-xs ml-2 shrink-0">{d.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {project.talent_review_submitted && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>Review submitted</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Projects() {
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: tp } = await (supabase as any)
        .from("talent_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!tp?.id) { setLoading(false); return; }

      await fetchProjects(tp.id);
    };
    init();
  }, []);

  const fetchProjects = async (talentId: string) => {
    const { data } = await (supabase as any)
      .from("projects")
      .select(`
        *,
        client_profiles(company_name, logo_url),
        project_milestones(id, title, status),
        marketplace_jobs:job_posts(title)
      `)
      .eq("talent_id", talentId)
      .order("created_at", { ascending: false });

    const active = (data || []).filter((p: any) => p.status !== "completed");
    const completed = (data || []).filter((p: any) => p.status === "completed");
    setActiveProjects(active);
    setCompletedProjects(completed);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">My Projects</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "completed")}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">
            Active
            <Badge className="ml-1.5 py-0 px-1.5 text-xs">{activeProjects.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <Badge variant="secondary" className="ml-1.5 py-0 px-1.5 text-xs">{completedProjects.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeProjects.length === 0 ? (
            <EmptyProjectsState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedProjects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No completed projects yet.</div>
          ) : (
            <div className="space-y-4">
              {completedProjects.map(project => (
                <CompletedProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
