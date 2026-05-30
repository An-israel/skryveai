import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Briefcase, FileText, BookOpen, User, ArrowRight,
  ExternalLink, CheckCircle2, Circle, Zap, TrendingUp,
  MessageSquare, CalendarDays, ChevronRight,
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
        <div className="lg:col-span-3 h-80 bg-card rounded-xl border border-border" />
        <div className="lg:col-span-2 h-80 bg-card rounded-xl border border-border" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-card rounded-xl border border-border" />)}
      </div>
    </div>
  );
}

/* ─── Stat Bar ──────────────────────────────────────────── */
function StatBar({ userId }: { userId: string }) {
  const [stats, setStats] = useState({ jobs: 0, apps: 0, projects: 0, cvs: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: jobs }, { count: apps }, { count: projects }, { count: cvs }] = await Promise.all([
        (supabase as any).from("aggregated_jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("job_applications").select("id", { count: "exact", head: true }).eq("user_id", userId),
        (supabase as any).from("projects").select("id", { count: "exact", head: true }).eq("talent_id", userId).neq("status", "completed"),
        (supabase as any).from("skryve_cvs").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setStats({ jobs: jobs ?? 0, apps: apps ?? 0, projects: projects ?? 0, cvs: cvs ?? 0 });
    })();
  }, [userId]);

  const items = [
    { label: "Open Jobs",    value: stats.jobs,     to: "/jobs"         },
    { label: "Applications", value: stats.apps,     to: "/applications" },
    { label: "Projects",     value: stats.projects, to: "/projects"     },
    { label: "CVs Built",    value: stats.cvs,      to: "/cv-builder"   },
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
          <p className="font-mono text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
            {value.toLocaleString()}
          </p>
        </Link>
      ))}
    </div>
  );
}

/* ─── Jobs Feed ─────────────────────────────────────────── */
function JobsFeed() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("aggregated_jobs")
      .select("id, title, platform, budget, external_url, posted_at, location")
      .eq("is_active", true)
      .order("posted_at", { ascending: false })
      .limit(6)
      .then(({ data }: any) => setJobs(data || []));
  }, []);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Latest Jobs</span>
        <Link
          to="/jobs"
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
          <Briefcase className="w-8 h-8 opacity-30" />
          <p className="text-[13px]">No jobs yet — check back soon</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{job.title}</p>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="text-[11px] text-muted-foreground capitalize">{job.platform}</span>
                  {job.budget && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-[11px] text-muted-foreground">{job.budget}</span>
                    </>
                  )}
                  {job.location && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-[11px] text-muted-foreground">{job.location}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground hidden sm:block">
                  {job.posted_at ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true }) : ""}
                </span>
                <a
                  href={job.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 rounded-md border border-border bg-background text-[12px] font-medium text-foreground hover:border-primary/50 hover:text-primary transition-all"
                >
                  Apply <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Profile Completion ────────────────────────────────── */
function ProfileStrength({ userId }: { userId: string }) {
  const [items, setItems] = useState({ photo: false, bio: false, skill: false, rate: false, cv: false });

  useEffect(() => {
    (async () => {
      const { data: p } = await (supabase as any)
        .from("talent_profiles")
        .select("bio, profile_photo_url, primary_skill, hourly_rate")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: cv } = await (supabase as any)
        .from("skryve_cvs")
        .select("id").eq("user_id", userId).maybeSingle();
      setItems({
        photo: !!p?.profile_photo_url, bio: !!p?.bio,
        skill: !!p?.primary_skill, rate: !!p?.hourly_rate, cv: !!cv,
      });
    })();
  }, [userId]);

  const checks = [
    { key: "photo" as const, label: "Profile photo",   href: "/profile" },
    { key: "bio"   as const, label: "Write a bio",     href: "/profile" },
    { key: "skill" as const, label: "Set primary skill", href: "/profile" },
    { key: "rate"  as const, label: "Set hourly rate", href: "/profile" },
    { key: "cv"    as const, label: "Build a CV",      href: "/cv-builder" },
  ];

  const done = Object.values(items).filter(Boolean).length;
  const pct  = Math.round((done / 5) * 100);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground">Profile strength</span>
        <span className="font-mono text-[13px] text-primary">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-px bg-border mx-5">
        <div
          className="h-px bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="px-5 py-3 space-y-0.5">
        {checks.map(({ key, label, href }) => (
          <div key={key} className="flex items-center gap-2.5 py-1.5">
            {items[key]
              ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            }
            {items[key]
              ? <span className="text-[13px] text-muted-foreground line-through">{label}</span>
              : <Link to={href} className="text-[13px] text-foreground hover:text-primary transition-colors">{label}</Link>
            }
          </div>
        ))}
      </div>

      <div className="px-5 pb-4">
        <Link
          to="/profile"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-border text-[13px] font-medium text-foreground hover:border-primary/50 hover:text-primary transition-all"
        >
          Complete profile <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Recent Applications ───────────────────────────────── */
function RecentApplications({ userId }: { userId: string }) {
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("job_applications")
      .select("id, status, created_at, role_title, company_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }: any) => setApps(data || []));
  }, [userId]);

  const STATUS_DOT: Record<string, string> = {
    applied:   "bg-muted-foreground/40",
    replied:   "bg-blue-500",
    interview: "bg-yellow-500",
    offer:     "bg-primary",
    rejected:  "bg-destructive",
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Applications</span>
        <Link to="/applications" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <FileText className="w-7 h-7 opacity-30" />
          <p className="text-[13px]">No applications yet</p>
          <Link to="/jobs" className="text-[12px] text-primary hover:underline">Browse jobs →</Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {apps.map((app) => (
            <div key={app.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[app.status] || STATUS_DOT.applied}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{app.role_title || "Untitled Role"}</p>
                <p className="text-[11px] text-muted-foreground">{app.company_name}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 capitalize">{app.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Quick Actions ─────────────────────────────────────── */
function QuickActions() {
  const links = [
    { label: "Find Jobs",       sub: "Browse curated listings",  icon: Briefcase,   to: "/jobs"        },
    { label: "Build CV",        sub: "AI-powered templates",     icon: FileText,    to: "/cv-builder"  },
    { label: "Learn a Skill",   sub: "Grow your expertise",      icon: BookOpen,    to: "/learn"       },
    { label: "Edit Profile",    sub: "Increase visibility",      icon: User,        to: "/profile"     },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

/* ─── Upcoming Events ───────────────────────────────────── */
function UpcomingEvents() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("events")
      .select("id, title, date_time, format")
      .gte("date_time", new Date().toISOString())
      .order("date_time", { ascending: true })
      .limit(3)
      .then(({ data }: any) => setEvents(data || []));
  }, []);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Events</span>
        <Link to="/events" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <CalendarDays className="w-7 h-7 opacity-30" />
          <p className="text-[13px]">No upcoming events</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {events.map((ev) => (
            <Link key={ev.id} to={`/events/${ev.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="w-9 text-center shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase leading-none">{format(new Date(ev.date_time), "MMM")}</p>
                <p className="text-lg font-bold text-foreground leading-tight">{format(new Date(ev.date_time), "d")}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{ev.title}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{ev.format}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────── */
export function TalentDashboard({ user }: { user: any }) {
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const timeOfDay = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

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
      <StatBar userId={user.id} />

      {/* Main two-col */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <JobsFeed />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <ProfileStrength userId={user.id} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecentApplications userId={user.id} />
        <UpcomingEvents />
      </div>

      {/* Quick actions */}
      <QuickActions />

    </div>
  );
}
