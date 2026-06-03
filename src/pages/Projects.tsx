import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderOpen, Building2, Star, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  active:          { color: "bg-blue-500",   label: "Active" },
  awaiting_review: { color: "bg-amber-500",  label: "Awaiting Review" },
  completed:       { color: "bg-green-500",  label: "Complete" },
};

const PAYMENT_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  released: { bg: "bg-green-500/10", text: "text-green-600", label: "Released" },
  in_escrow: { bg: "bg-blue-500/10", text: "text-blue-600",  label: "In Escrow" },
  pending:   { bg: "bg-muted",       text: "text-muted-foreground", label: "Pending" },
};

function formatCurrency(amount: number | null, currency = "NGN") {
  if (!amount) return "—";
  const sym: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return `${sym[currency] || "₦"}${amount.toLocaleString()}`;
}

function isOverdue(deadline: string | null) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function EmptyProjectsState() {
  const navigate = useNavigate();
  return (
    <div className="text-center py-20">
      <FolderOpen className="w-10 h-10 opacity-20 mx-auto mb-3" />
      <p className="text-[14px] font-medium text-foreground mb-1">No active projects yet</p>
      <p className="text-[13px] text-muted-foreground mb-4">Browse the marketplace to find your first project</p>
      <button
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
        onClick={() => navigate("/marketplace")}
      >
        Browse Marketplace
      </button>
    </div>
  );
}

function ProjectRow({ project }: { project: any }) {
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

  const statusInfo = STATUS_DOT[project.status] || { color: "bg-muted-foreground", label: project.status };
  const paymentKey = project.payment_status || "pending";
  const paymentInfo = PAYMENT_CHIP[paymentKey] || PAYMENT_CHIP.pending;

  return (
    <div
      className="px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 mt-0.5 border border-border">
          {logoUrl ? (
            <img src={logoUrl} className="w-full h-full object-cover" alt={companyName} />
          ) : (
            <span className="text-[11px] font-bold text-muted-foreground">{(companyName || "C")[0]}</span>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1.5">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-foreground truncate">{jobTitle}</p>
              {companyName && (
                <p className="text-[12px] text-muted-foreground">{companyName}</p>
              )}
            </div>
            {/* Status dot + text */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.color}`} />
              <span className="text-[12px] text-muted-foreground">{statusInfo.label}</span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground mb-2">
            <span>{formatCurrency(project.total_amount, project.currency)}</span>
            <span className="opacity-40">·</span>
            <span>Started {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
            {daysUntilDeadline !== null && (
              <>
                <span className="opacity-40">·</span>
                <span className={isOverdue(project.deadline) ? "text-red-500" : ""}>
                  {isOverdue(project.deadline)
                    ? `${Math.abs(daysUntilDeadline)}d overdue`
                    : `${daysUntilDeadline}d left`}
                </span>
              </>
            )}
            <span className="opacity-40">·</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-md ${paymentInfo.bg} ${paymentInfo.text}`}>
              {paymentInfo.label}
            </span>
          </div>

          {/* Milestone progress bar */}
          {total > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {completedCount}/{total}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompletedProjectRow({ project }: { project: any }) {
  const [expanded, setExpanded] = useState(false);
  const jobTitle = project.marketplace_jobs?.title || project.title || "Untitled Project";
  const companyName = project.client_profiles?.company_name;

  return (
    <div>
      <div
        className="px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-between gap-4"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-foreground truncate">{jobTitle}</p>
            {companyName && (
              <p className="text-[12px] text-muted-foreground">
                {companyName}
                {project.completed_at && (
                  <span className="ml-2 opacity-60">
                    · Completed {formatDistanceToNow(new Date(project.completed_at), { addSuffix: true })}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[13px] font-medium text-foreground">
            {formatCurrency(project.total_amount, project.currency)}
          </span>
          <span className="text-[11px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded-md">Complete</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-border">
          <div className="pt-4 space-y-3">
            {project.project_deliverables?.length > 0 && (
              <div>
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Deliverables ({project.project_deliverables.length})
                </p>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {project.project_deliverables.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 text-[12px]">
                      <span className="truncate text-muted-foreground">{d.file_name || d.external_url || "Deliverable"}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md ml-2 shrink-0">{d.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {project.talent_review_submitted && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Review submitted</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
        <div className="border border-border rounded-xl overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="px-5 py-3.5 border-b border-border last:border-b-0">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">My Projects</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Track active and completed client work</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "completed")}>
        <TabsList>
          <TabsTrigger value="active">
            Active
            <span className="ml-1.5 text-[11px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md leading-none">
              {activeProjects.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <span className="ml-1.5 text-[11px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md leading-none">
              {completedProjects.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeProjects.length === 0 ? (
            <EmptyProjectsState />
          ) : (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Active Projects</span>
              </div>
              <div className="divide-y divide-border">
                {activeProjects.map(project => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedProjects.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="w-10 h-10 opacity-20 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-foreground mb-1">No completed projects yet</p>
              <p className="text-[13px] text-muted-foreground">Finished projects will appear here.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Completed Projects</span>
              </div>
              <div className="divide-y divide-border">
                {completedProjects.map(project => (
                  <CompletedProjectRow key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
