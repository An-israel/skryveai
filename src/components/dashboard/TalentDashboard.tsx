import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase, FileText, BookOpen, User, CheckCircle2, Circle,
  ExternalLink, MessageSquare, CalendarDays, Zap, ChevronRight,
} from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  upwork:    "bg-green-500/10 text-green-500 border-green-500/30",
  linkedin:  "bg-blue-500/10 text-blue-500 border-blue-500/30",
  indeed:    "bg-orange-500/10 text-orange-500 border-orange-500/30",
  remote_ok: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  jobberman: "bg-pink-500/10 text-pink-500 border-pink-500/30",
  other:     "bg-muted text-muted-foreground border-border",
};

const STATUS_STYLES: Record<string, string> = {
  applied:   "bg-muted text-muted-foreground",
  replied:   "bg-blue-500/10 text-blue-500",
  interview: "bg-yellow-500/10 text-yellow-500",
  offer:     "bg-green-500/10 text-green-500",
  rejected:  "bg-red-500/10 text-red-500",
};

function DashboardSkeleton() {
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
      <div className="h-24 bg-muted rounded-xl animate-pulse" />
    </div>
  );
}

function ProfileCompletionCard({ userId }: { userId: string }) {
  const [items, setItems] = useState({
    photo: false,
    bio: false,
    skill: false,
    rate: false,
    cv: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profile } = await (supabase as any)
        .from("talent_profiles")
        .select("full_name, bio, profile_photo_url, primary_skill, hourly_rate")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: cv } = await (supabase as any)
        .from("skryve_cvs")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      setItems({
        photo: !!profile?.profile_photo_url,
        bio:   !!profile?.bio,
        skill: !!profile?.primary_skill,
        rate:  !!profile?.hourly_rate,
        cv:    !!cv,
      });
      setLoading(false);
    })();
  }, [userId]);

  const checks = [
    { key: "photo", label: "Profile photo",    href: "/profile" },
    { key: "bio",   label: "Bio written",       href: "/profile" },
    { key: "skill", label: "Primary skill set", href: "/profile" },
    { key: "rate",  label: "Hourly rate set",   href: "/profile" },
    { key: "cv",    label: "CV built",           href: "/cv-builder" },
  ] as const;

  const completed = Object.values(items).filter(Boolean).length;
  const pct = (completed / 5) * 100;
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  if (loading) return <div className="h-full bg-muted rounded-xl animate-pulse" />;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-bold">Profile Strength</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="44" cy="44" r={radius} fill="none"
              stroke="hsl(var(--primary))" strokeWidth="8"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
            <text x="44" y="48" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">
              {Math.round(pct)}%
            </text>
          </svg>
          <div className="flex-1 space-y-1.5">
            {checks.map(({ key, label, href }) => {
              const done = items[key];
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  {done ? (
                    <span className="text-muted-foreground line-through">{label}</span>
                  ) : (
                    <Link to={href} className="text-foreground hover:underline hover:text-primary">
                      {label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <Button asChild size="sm" className="w-full">
          <Link to="/profile">Complete your profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DailyJobsWidget() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("aggregated_jobs")
        .select("id, title, platform, budget, external_url, posted_at")
        .eq("is_active", true)
        .order("posted_at", { ascending: false })
        .limit(5);
      setJobs(data || []);
      setLoading(false);
    })();
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  if (loading) return <div className="h-full bg-muted rounded-xl animate-pulse" />;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-bold">
            Your Jobs Today — {today}
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/jobs">View All <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <Briefcase className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No jobs found today. Check back tomorrow!</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/jobs">Find Jobs</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const platformKey = (job.platform || "other").toLowerCase().replace(/[^a-z_]/g, "_");
              const colorClass = PLATFORM_COLORS[platformKey] || PLATFORM_COLORS.other;
              return (
                <div key={job.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${colorClass}`}>
                        {job.platform}
                      </Badge>
                      {job.budget && (
                        <span className="text-xs text-muted-foreground">{job.budget}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={job.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      Apply <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApplicationsWidget({ userId }: { userId: string }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("job_applications")
        .select("id, status, created_at, role_title, company_name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      setApps(data || []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="h-full bg-muted rounded-xl animate-pulse" />;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-bold">My Applications</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/applications"><ChevronRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {apps.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No applications yet</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/jobs">Browse Jobs</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {apps.map((app) => (
              <div key={app.id} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{app.role_title}</p>
                  <p className="text-xs text-muted-foreground">{app.company_name}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_STYLES[app.status] || STATUS_STYLES.applied}`}>
                    {app.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
            <Button asChild variant="ghost" size="sm" className="w-full mt-2">
              <Link to="/applications">View All Applications</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessagesWidget({ userId }: { userId: string }) {
  const [convos, setConvos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: talentProfile } = await (supabase as any)
        .from("talent_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!talentProfile) { setLoading(false); return; }

      const { data } = await (supabase as any)
        .from("marketplace_conversations")
        .select("id, last_message_at, marketplace_messages(content, sent_at, sender_id, is_read)")
        .eq("talent_id", talentProfile.id)
        .order("last_message_at", { ascending: false })
        .limit(3);

      setConvos(data || []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="h-full bg-muted rounded-xl animate-pulse" />;

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
        {convos.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {convos.map((c) => {
              const msgs: any[] = c.marketplace_messages || [];
              const last = msgs.sort((a: any, b: any) =>
                new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
              )[0];
              const unread = msgs.filter((m: any) => !m.is_read && m.sender_id !== userId).length;
              return (
                <Link key={c.id} to={`/messages/${c.id}`} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{last?.content || "No messages"}</p>
                    {last?.sent_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(last.sent_at), { addSuffix: true })}
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

function EventsWidget({ userId }: { userId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("events")
        .select("id, title, date_time, format, banner_url")
        .gte("date_time", new Date().toISOString())
        .order("date_time", { ascending: true })
        .limit(3);
      setEvents(data || []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="h-full bg-muted rounded-xl animate-pulse" />;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-bold">Upcoming Events</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/events"><ChevronRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No upcoming events</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/events">Browse Events</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => {
              const isOnline = ["webinar", "online", "virtual"].some(k => ev.format?.toLowerCase().includes(k));
              return (
                <Link key={ev.id} to={`/events/${ev.id}`} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.date_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${isOnline ? "border-blue-500/30 text-blue-500" : "border-green-500/30 text-green-500"}`}>
                        {isOnline ? "Online" : "In-Person"}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
            <Button asChild variant="ghost" size="sm" className="w-full mt-1">
              <Link to="/events">Browse Events</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsBar() {
  const actions = [
    { label: "Find Jobs",     icon: Briefcase,    to: "/jobs"        },
    { label: "Build CV",      icon: FileText,     to: "/cv-builder"  },
    { label: "Learn a Skill", icon: BookOpen,     to: "/learn"       },
    { label: "Edit Profile",  icon: User,         to: "/profile"     },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map(({ label, icon: Icon, to }) => (
        <Link key={label} to={to}>
          <Card className="cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all">
            <CardContent className="flex flex-col items-center justify-center py-4 gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-center">{label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function TalentDashboard({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
          Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your freelance dashboard — find work, grow your career.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProfileCompletionCard userId={user.id} />
        <div className="lg:col-span-2">
          <DailyJobsWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ApplicationsWidget userId={user.id} />
        <MessagesWidget userId={user.id} />
        <EventsWidget userId={user.id} />
      </div>

      <QuickActionsBar />
    </div>
  );
}

export { DashboardSkeleton };
