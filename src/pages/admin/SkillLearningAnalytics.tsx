import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, GraduationCap, RefreshCw, Search, Users, BookOpen, Trophy, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

interface UsageRecord {
  id: string;
  user_id: string;
  tool_name: string;
  metadata: Record<string, any>;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

type Range = "7d" | "30d" | "90d" | "all";

const RANGE_DAYS: Record<Range, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

export default function SkillLearningAnalytics() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("30d");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("tool_usage")
        .select("*")
        .eq("tool_name", "skill_learning")
        .order("created_at", { ascending: false })
        .limit(1000);

      const days = RANGE_DAYS[range];
      if (days) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", since);
      }
      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((r: any) => r.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const enriched = (data || []).map((r: any) => {
        const p = profileMap.get(r.user_id);
        return { ...r, user_email: p?.email || "Unknown", user_name: p?.full_name || "Unknown" };
      });
      setRecords(enriched);
    } catch (err) {
      console.error("Failed to load skill learning analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [range]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.user_name?.toLowerCase().includes(q) ||
        r.user_email?.toLowerCase().includes(q) ||
        String(r.metadata?.skill_display || r.metadata?.skill || "").toLowerCase().includes(q) ||
        String(r.metadata?.module_title || "").toLowerCase().includes(q),
    );
  }, [records, search]);

  // Top skills
  const topSkills = useMemo(() => {
    const map = new Map<string, { skill: string; modules: number; lessons: number; users: Set<string> }>();
    filtered.forEach((r) => {
      const skill = String(r.metadata?.skill_display || r.metadata?.skill || "Unknown");
      const lessons = Number(r.metadata?.lessons_completed || 0);
      const cur = map.get(skill) || { skill, modules: 0, lessons: 0, users: new Set() };
      cur.modules += 1;
      cur.lessons += lessons;
      cur.users.add(r.user_id);
      map.set(skill, cur);
    });
    return Array.from(map.values())
      .map((s) => ({ skill: s.skill, modules: s.modules, lessons: s.lessons, learners: s.users.size }))
      .sort((a, b) => b.modules - a.modules)
      .slice(0, 15);
  }, [filtered]);

  // Top modules
  const topModules = useMemo(() => {
    const map = new Map<string, { module: string; skill: string; completions: number; users: Set<string> }>();
    filtered.forEach((r) => {
      const mod = String(r.metadata?.module_title || "Untitled");
      const skill = String(r.metadata?.skill_display || r.metadata?.skill || "—");
      const key = `${skill}::${mod}`;
      const cur = map.get(key) || { module: mod, skill, completions: 0, users: new Set() };
      cur.completions += 1;
      cur.users.add(r.user_id);
      map.set(key, cur);
    });
    return Array.from(map.values())
      .map((m) => ({ module: m.module, skill: m.skill, completions: m.completions, learners: m.users.size }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 20);
  }, [filtered]);

  // Per-user usage
  const perUser = useMemo(() => {
    const map = new Map<string, { user_id: string; name: string; email: string; modules: number; lessons: number; skills: Set<string>; last: string }>();
    filtered.forEach((r) => {
      const cur = map.get(r.user_id) || {
        user_id: r.user_id,
        name: r.user_name || "Unknown",
        email: r.user_email || "—",
        modules: 0,
        lessons: 0,
        skills: new Set<string>(),
        last: r.created_at,
      };
      cur.modules += 1;
      cur.lessons += Number(r.metadata?.lessons_completed || 0);
      cur.skills.add(String(r.metadata?.skill_display || r.metadata?.skill || "Unknown"));
      if (new Date(r.created_at) > new Date(cur.last)) cur.last = r.created_at;
      map.set(r.user_id, cur);
    });
    return Array.from(map.values())
      .map((u) => ({ ...u, skills: Array.from(u.skills) }))
      .sort((a, b) => b.modules - a.modules);
  }, [filtered]);

  // Trend over time
  const trend = useMemo(() => {
    const map = new Map<string, { date: string; modules: number; lessons: number }>();
    filtered.forEach((r) => {
      const date = new Date(r.created_at).toISOString().slice(0, 10);
      const cur = map.get(date) || { date, modules: 0, lessons: 0 };
      cur.modules += 1;
      cur.lessons += Number(r.metadata?.lessons_completed || 0);
      map.set(date, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const totalModules = filtered.length;
  const totalLessons = filtered.reduce((acc, r) => acc + Number(r.metadata?.lessons_completed || 0), 0);
  const uniqueLearners = new Set(filtered.map((r) => r.user_id)).size;
  const uniqueSkills = new Set(filtered.map((r) => r.metadata?.skill_display || r.metadata?.skill)).size;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-indigo-500" />
                Skill Learning Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                Drill into top skills, modules, and per-user learning activity over time.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Modules Completed", value: totalModules, icon: <Trophy className="w-5 h-5" />, color: "bg-indigo-500/10 text-indigo-600" },
            { label: "Lessons Completed", value: totalLessons, icon: <BookOpen className="w-5 h-5" />, color: "bg-emerald-500/10 text-emerald-600" },
            { label: "Active Learners", value: uniqueLearners, icon: <Users className="w-5 h-5" />, color: "bg-blue-500/10 text-blue-600" },
            { label: "Unique Skills", value: uniqueSkills, icon: <TrendingUp className="w-5 h-5" />, color: "bg-amber-500/10 text-amber-600" },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${c.color}`}>{c.icon}</div>
                  <div>
                    <p className="text-2xl font-bold">{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trend chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Over Time</CardTitle>
            <CardDescription>Modules and lessons completed per day</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No activity in this period.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="modules" stroke="hsl(var(--primary))" strokeWidth={2} name="Modules" />
                    <Line type="monotone" dataKey="lessons" stroke="hsl(142 76% 36%)" strokeWidth={2} name="Lessons" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="skills">
          <TabsList>
            <TabsTrigger value="skills">Top Skills</TabsTrigger>
            <TabsTrigger value="modules">Top Modules</TabsTrigger>
            <TabsTrigger value="users">Per-User</TabsTrigger>
            <TabsTrigger value="raw">Raw Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Skills</CardTitle>
                <CardDescription>Ranked by module completions</CardDescription>
              </CardHeader>
              <CardContent>
                {topSkills.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No data.</p>
                ) : (
                  <>
                    <div className="h-64 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topSkills.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" />
                          <YAxis type="category" dataKey="skill" className="text-xs" tick={{ fontSize: 11 }} width={120} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                          <Bar dataKey="modules" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-md border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Skill</TableHead>
                            <TableHead className="text-right">Modules</TableHead>
                            <TableHead className="text-right">Lessons</TableHead>
                            <TableHead className="text-right">Learners</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topSkills.map((s) => (
                            <TableRow key={s.skill}>
                              <TableCell className="font-medium">{s.skill}</TableCell>
                              <TableCell className="text-right">{s.modules}</TableCell>
                              <TableCell className="text-right">{s.lessons}</TableCell>
                              <TableCell className="text-right">{s.learners}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Modules</CardTitle>
                <CardDescription>Most-completed modules across all skills</CardDescription>
              </CardHeader>
              <CardContent>
                {topModules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No data.</p>
                ) : (
                  <div className="rounded-md border overflow-auto max-h-[28rem]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Module</TableHead>
                          <TableHead>Skill</TableHead>
                          <TableHead className="text-right">Completions</TableHead>
                          <TableHead className="text-right">Learners</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topModules.map((m, i) => (
                          <TableRow key={`${m.module}-${i}`}>
                            <TableCell className="font-medium">{m.module}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{m.skill}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{m.completions}</TableCell>
                            <TableCell className="text-right">{m.learners}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Per-User Usage</CardTitle>
                    <CardDescription>Each learner's completed modules, lessons, and skills</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search user, skill, module…"
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {perUser.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No learners in this period.</p>
                ) : (
                  <div className="rounded-md border overflow-auto max-h-[32rem]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Skills</TableHead>
                          <TableHead className="text-right">Modules</TableHead>
                          <TableHead className="text-right">Lessons</TableHead>
                          <TableHead>Last Activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perUser.map((u) => (
                          <TableRow key={u.user_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{u.name}</p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(u.skills as string[]).slice(0, 3).map((s) => (
                                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                                ))}
                                {(u.skills as string[]).length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{(u.skills as string[]).length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{u.modules}</TableCell>
                            <TableCell className="text-right">{u.lessons}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(u.last).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Raw Activity</CardTitle>
                <CardDescription>Latest skill_learning events</CardDescription>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No events.</p>
                ) : (
                  <div className="rounded-md border overflow-auto max-h-[32rem]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Skill</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead className="text-right">Lessons</TableHead>
                          <TableHead>When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.slice(0, 200).map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{r.user_name}</p>
                                <p className="text-xs text-muted-foreground">{r.user_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {String(r.metadata?.skill_display || r.metadata?.skill || "—")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{String(r.metadata?.module_title || "—")}</TableCell>
                            <TableCell className="text-right">{Number(r.metadata?.lessons_completed || 0)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
