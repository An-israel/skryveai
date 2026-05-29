import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, CalendarDays, ChevronRight, User, MessageSquare } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ActiveJobsWidget({ jobs }: { jobs: any[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-bold">Active Job Posts</CardTitle>
          <Badge variant="secondary">{jobs.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <Briefcase className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No active jobs yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const daysLeft = job.deadline
                ? differenceInDays(new Date(job.deadline), new Date())
                : null;
              return (
                <div key={job.id} className="p-2.5 rounded-lg border bg-card">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {job.applicant_count || 0} applicants
                    </span>
                    {daysLeft !== null && (
                      <span className={`text-xs ${daysLeft <= 3 ? "text-red-500" : "text-muted-foreground"}`}>
                        {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to="/marketplace/my-jobs">View All My Jobs</Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to="/marketplace/post">Post New Job</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewApplicationsWidget({ count }: { count: number }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-bold">Applications</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-4 space-y-2">
        <span className="text-5xl font-bold text-primary">{count}</span>
        <p className="text-sm font-medium">New Applications</p>
        <p className="text-xs text-muted-foreground">Waiting for your review</p>
        <Button asChild size="sm" className="mt-2">
          <Link to="/applications">Review Applications</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ActiveProjectsWidget({ projects }: { projects: any[] }) {
  const STATUS_CLASSES: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-600",
    pending_acceptance: "bg-amber-500/10 text-amber-600",
    completed: "bg-green-500/10 text-green-600",
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-bold">Active Projects</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active projects</p>
        ) : (
          projects.map((proj) => {
            const talentName = proj.talent_profiles?.full_name;
            const daysLeft = proj.deadline
              ? differenceInDays(new Date(proj.deadline), new Date())
              : null;
            return (
              <div key={proj.id} className="p-2 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate flex-1 mr-2">{proj.title || "Untitled"}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${STATUS_CLASSES[proj.status] || ""}`}
                  >
                    {proj.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  {talentName && (
                    <span className="text-xs text-muted-foreground truncate">{talentName}</span>
                  )}
                  {daysLeft !== null && (
                    <span className={`text-xs ${daysLeft <= 3 ? "text-red-500" : "text-muted-foreground"}`}>
                      {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <Button asChild variant="ghost" size="sm" className="w-full">
          <Link to="/projects">View All Projects <ChevronRight className="w-4 h-4 ml-1" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MessagesWidget({ conversations, userId }: { conversations: any[]; userId: string }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-bold">Messages</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/messages"><ChevronRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => {
              const msgs: any[] = c.marketplace_messages || [];
              const last = msgs.sort((a: any, b: any) =>
                new Date(b.created_at || b.sent_at).getTime() - new Date(a.created_at || a.sent_at).getTime()
              )[0];
              const unread = msgs.filter((m: any) => !m.is_read && m.sender_id !== userId).length;
              return (
                <Link
                  key={c.id}
                  to={`/messages/${c.id}`}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{last?.content || "No messages"}</p>
                    {(last?.created_at || last?.sent_at) && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(last.created_at || last.sent_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  {unread > 0 && (
                    <Badge className="shrink-0 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                      {unread}
                    </Badge>
                  )}
                </Link>
              );
            })}
            <Button asChild variant="ghost" size="sm" className="w-full mt-1">
              <Link to="/messages">Open Messages</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsWidget() {
  const navigate = useNavigate();
  const actions = [
    { label: "Post a Job", icon: Briefcase, to: "/marketplace/post" },
    { label: "Browse Talent", icon: Users, to: "/talent" },
    { label: "Explore Events", icon: CalendarDays, to: "/events" },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-bold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map(({ label, icon: Icon, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function ClientDashboard({ user }: { user: any }) {
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [newAppsCount, setNewAppsCount] = useState(0);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: clientProfile } = await (supabase as any)
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!clientProfile) { setLoading(false); return; }

      const { data: jobs } = await (supabase as any)
        .from("job_posts")
        .select("id, title, applicant_count, deadline, created_at")
        .eq("client_id", clientProfile.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      setActiveJobs(jobs || []);

      if (jobs && jobs.length > 0) {
        const jobIds = jobs.map((j: any) => j.id);
        const { count } = await (supabase as any)
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .in("marketplace_job_id", jobIds)
          .eq("status", "pending");
        setNewAppsCount(count || 0);
      }

      const { data: projects } = await (supabase as any)
        .from("projects")
        .select("id, title, status, deadline, talent_profiles(full_name)")
        .eq("client_id", clientProfile.id)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(3);
      setActiveProjects(projects || []);

      const { data: convos } = await (supabase as any)
        .from("marketplace_conversations")
        .select("id, last_message_at, marketplace_messages(content, sender_id, created_at, is_read)")
        .eq("client_id", clientProfile.id)
        .order("last_message_at", { ascending: false })
        .limit(3);
      setConversations(convos || []);

      setLoading(false);
    })();
  }, [user]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">
          Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your jobs, projects, and talent.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActiveJobsWidget jobs={activeJobs} />
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <NewApplicationsWidget count={newAppsCount} />
          <ActiveProjectsWidget projects={activeProjects} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MessagesWidget conversations={conversations} userId={user.id} />
        </div>
        <QuickActionsWidget />
      </div>
    </div>
  );
}
