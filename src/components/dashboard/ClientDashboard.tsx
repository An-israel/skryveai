import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Briefcase, Users, CalendarDays, ArrowRight,
  MessageSquare, FolderOpen, User, ChevronRight, Plus,
} from "lucide-react";

/* ─── Skeleton ─────────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-72 bg-card rounded-xl border border-border" />
        <div className="lg:col-span-2 h-72 bg-card rounded-xl border border-border" />
      </div>
    </div>
  );
}

/* ─── Stat Bar ──────────────────────────────────────────── */
function StatBar({ clientId }: { clientId: string }) {
  const [stats, setStats] = useState({ jobs: 0, apps: 0, projects: 0, talent: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: jobs }, { count: apps }, { count: projects }] = await Promise.all([
        (supabase as any).from("job_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "active"),
        (supabase as any).from("job_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("projects").select("id", { count: "exact", head: true }).eq("client_id", clientId).neq("status", "completed"),
      ]);
      setStats({ jobs: jobs ?? 0, apps: apps ?? 0, projects: projects ?? 0, talent: 0 });
    })();
  }, [clientId]);

  const items = [
    { label: "Active Jobs",     value: stats.jobs,     to: "/marketplace/my-jobs" },
    { label: "New Applications",value: stats.apps,     to: "/applications"        },
    { label: "Active Projects", value: stats.projects, to: "/projects"            },
    { label: "Browse Talent",   value: null,           to: "/talent"              },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
      {items.map(({ label, value, to }) => (
        <Link
          key={label}
          to={to}
          className="bg-card px-5 py-4 hover:bg-muted/40 transition-colors group"
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
          {value !== null
            ? <p className="font-mono text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">{value.toLocaleString()}</p>
            : <p className="text-[13px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1 mt-1">Explore <ArrowRight className="w-3 h-3" /></p>
          }
        </Link>
      ))}
    </div>
  );
}

/* ─── Active Job Posts ──────────────────────────────────── */
function JobPosts({ clientId }: { clientId: string }) {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("job_posts")
      .select("id, title, applicant_count, deadline, created_at, status")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }: any) => setJobs(data || []));
  }, [clientId]);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Job Posts</span>
        <div className="flex items-center gap-3">
          <Link to="/marketplace/my-jobs" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            to="/marketplace/post"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" /> Post
          </Link>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
          <Briefcase className="w-8 h-8 opacity-30" />
          <p className="text-[13px]">No job posts yet</p>
          <Link to="/marketplace/post" className="text-[12px] text-primary hover:underline">Post your first job →</Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {jobs.map((job) => {
            const daysLeft = job.deadline
              ? differenceInDays(new Date(job.deadline), new Date())
              : null;
            return (
              <div key={job.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{job.title}</p>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{job.applicant_count || 0} applicants</span>
                    {daysLeft !== null && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className={`text-[11px] ${daysLeft <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
                          {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                  job.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {job.status}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Active Projects ───────────────────────────────────── */
function ActiveProjects({ clientId }: { clientId: string }) {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("projects")
      .select("id, title, status, deadline, talent_profiles(full_name)")
      .eq("client_id", clientId)
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }: any) => setProjects(data || []));
  }, [clientId]);

  const STATUS_COLOR: Record<string, string> = {
    active:             "text-primary",
    pending_acceptance: "text-yellow-500",
    in_review:          "text-blue-500",
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Projects</span>
        <Link to="/projects" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <FolderOpen className="w-7 h-7 opacity-30" />
          <p className="text-[13px]">No active projects</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {projects.map((p) => {
            const daysLeft = p.deadline
              ? differenceInDays(new Date(p.deadline), new Date())
              : null;
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{p.title || "Untitled"}</p>
                  <p className="text-[11px] text-muted-foreground">{p.talent_profiles?.full_name || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[11px] font-medium capitalize ${STATUS_COLOR[p.status] || "text-muted-foreground"}`}>{p.status?.replace(/_/g, " ")}</p>
                  {daysLeft !== null && (
                    <p className={`text-[10px] ${daysLeft <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
                      {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Recent Messages ───────────────────────────────────── */
function RecentMessages({ clientId, userId }: { clientId: string; userId: string }) {
  const [convos, setConvos] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("marketplace_conversations")
      .select("id, last_message_at, marketplace_messages(content, sender_id, created_at, is_read)")
      .eq("client_id", clientId)
      .order("last_message_at", { ascending: false })
      .limit(3)
      .then(({ data }: any) => setConvos(data || []));
  }, [clientId]);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Messages</span>
        <Link to="/messages" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {convos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <MessageSquare className="w-7 h-7 opacity-30" />
          <p className="text-[13px]">No messages yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {convos.map((c) => {
            const msgs: any[] = c.marketplace_messages || [];
            const last = [...msgs].sort((a, b) =>
              new Date(b.created_at || b.sent_at).getTime() - new Date(a.created_at || a.sent_at).getTime()
            )[0];
            const unread = msgs.filter((m) => !m.is_read && m.sender_id !== userId).length;
            return (
              <Link key={c.id} to={`/messages/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-foreground truncate">{last?.content || "No messages"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {last?.created_at ? formatDistanceToNow(new Date(last.created_at), { addSuffix: true }) : ""}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 shrink-0">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Quick Actions ─────────────────────────────────────── */
function QuickActions() {
  const links = [
    { label: "Post a Job",    sub: "Find the right talent",    icon: Briefcase,   to: "/marketplace/post" },
    { label: "Browse Talent", sub: "Explore verified profiles", icon: Users,       to: "/talent"           },
    { label: "Explore Events",sub: "Network & learn",           icon: CalendarDays,to: "/events"           },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {links.map(({ label, sub, icon: Icon, to }) => (
        <Link
          key={label}
          to={to}
          className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-muted/30 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────── */
export function ClientDashboard({ user }: { user: any }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("client_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setClientId(data?.id ?? null);
        setLoading(false);
      });
  }, [user]);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const timeOfDay = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) return <DashboardSkeleton />;

  if (!clientId) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
      <p className="text-[13px]">Profile not found. Please complete onboarding.</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          {timeOfDay}, {firstName}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat row */}
      <StatBar clientId={clientId} />

      {/* Main two-col */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <JobPosts clientId={clientId} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <ActiveProjects clientId={clientId} />
        </div>
      </div>

      {/* Messages */}
      <RecentMessages clientId={clientId} userId={user.id} />

      {/* Quick actions */}
      <QuickActions />

    </div>
  );
}
