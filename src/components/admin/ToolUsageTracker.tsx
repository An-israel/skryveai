import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, RefreshCw, FileText, Target, TrendingUp, Linkedin, Bot, Send, Users, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UsageRecord {
  id: string;
  user_id: string;
  tool_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const TOOL_LABELS: Record<string, string> = {
  cv_builder: "CV Builder",
  ats_checker: "ATS Checker",
  linkedin_analyzer: "LinkedIn Analyzer",
  autopilot: "AutoPilot",
  campaign_email: "Campaign Emails",
  skill_learning: "Skill Learning",
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  cv_builder: <FileText className="w-4 h-4" />,
  ats_checker: <Target className="w-4 h-4" />,
  linkedin_analyzer: <Linkedin className="w-4 h-4" />,
  autopilot: <Bot className="w-4 h-4" />,
  campaign_email: <Send className="w-4 h-4" />,
  skill_learning: <GraduationCap className="w-4 h-4" />,
};

const TOOL_COLORS: Record<string, string> = {
  cv_builder: "bg-blue-500/10 text-blue-600",
  ats_checker: "bg-green-500/10 text-green-600",
  linkedin_analyzer: "bg-sky-500/10 text-sky-600",
  autopilot: "bg-purple-500/10 text-purple-600",
  campaign_email: "bg-orange-500/10 text-orange-600",
  skill_learning: "bg-indigo-500/10 text-indigo-600",
};

function getToolDetail(r: UsageRecord): string {
  switch (r.tool_name) {
    case "ats_checker":
      return r.metadata?.score ? `Score: ${r.metadata.score}% (${r.metadata.grade})` : "—";
    case "cv_builder":
      return r.metadata?.mode
        ? `Mode: ${r.metadata.mode}${r.metadata.ats_score ? `, ATS: ${r.metadata.ats_score}%` : ""}`
        : "—";
    case "linkedin_analyzer":
      return r.metadata?.score
        ? `Score: ${r.metadata.score}% (${r.metadata.grade}) · ${r.metadata.profile_strength || ""}`
        : "—";
    case "autopilot":
      return r.metadata?.name
        ? `"${r.metadata.name}" · ${r.metadata.daily_quota ?? "?"} emails/day`
        : "—";
    case "campaign_email":
      return r.metadata?.emails_queued
        ? `${r.metadata.emails_queued} emails · ${r.metadata.campaign_type || "freelancer"}`
        : "—";
    case "skill_learning":
      return r.metadata?.module_title
        ? `${r.metadata.skill_display || r.metadata.skill || "Skill"} · ${r.metadata.module_title} (${r.metadata.lessons_completed ?? "?"} lessons)`
        : "—";
    default:
      return JSON.stringify(r.metadata || {}).slice(0, 60);
  }
}

export function ToolUsageTracker() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [stats, setStats] = useState<{ tool_name: string; count: number }[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      // Filtered records for table
      let query = (supabase as any).from("tool_usage").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") query = query.eq("tool_name", filter);
      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const enriched = (data || []).map((r: any) => {
        const profile = profileMap.get(r.user_id);
        return { ...r, user_email: profile?.email || "Unknown", user_name: profile?.full_name || "Unknown" };
      });
      setRecords(enriched);

      // Chart: counts from filtered data
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.tool_name] = (counts[r.tool_name] || 0) + 1; });
      const chartData = Object.entries(counts).map(([tool_name, count]) => ({
        tool_name: TOOL_LABELS[tool_name] || tool_name,
        count,
      }));
      setStats(chartData);

      // All-time totals per tool (for summary cards)
      const allToolNames = Object.keys(TOOL_LABELS);
      const allTimeCounts: Record<string, number> = {};
      await Promise.all(
        allToolNames.map(async (tool) => {
          const { count } = await (supabase as any)
            .from("tool_usage")
            .select("id", { count: "exact", head: true })
            .eq("tool_name", tool);
          allTimeCounts[tool] = count ?? 0;
        })
      );
      setTotals(allTimeCounts);
    } catch (err) {
      console.error("Failed to fetch tool usage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const totalUsage = Object.values(totals).reduce((a, b) => a + b, 0);
  const uniqueUsers = new Set(records.map(r => r.user_id)).size;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" /> Tool Usage Analytics
              </CardTitle>
              <CardDescription>Track usage across all product features — CV Builder, ATS Checker, LinkedIn Analyzer, AutoPilot, and Campaign Emails.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tools</SelectItem>
                  {Object.entries(TOOL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary cards — all tools */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {/* Total */}
            <Card className="col-span-2 sm:col-span-1">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalUsage}</p>
                    <p className="text-xs text-muted-foreground">Total Uses</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unique users */}
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{uniqueUsers}</p>
                    <p className="text-xs text-muted-foreground">Unique Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Per-tool cards */}
            {Object.entries(TOOL_LABELS).map(([key, label]) => (
              <Card key={key}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${TOOL_COLORS[key] || "bg-primary/10"}`}>
                      {TOOL_ICONS[key]}
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totals[key] ?? 0}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          {stats.length > 0 && (
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="tool_name" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tool usage recorded yet.</p>
          ) : (
            <div className="rounded-md border overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Tool</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{r.user_name}</p>
                          <p className="text-xs text-muted-foreground">{r.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${TOOL_COLORS[r.tool_name] || ""}`}>
                          {TOOL_ICONS[r.tool_name]}
                          {TOOL_LABELS[r.tool_name] || r.tool_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-52 truncate">
                        {getToolDetail(r)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            Showing {records.length} records · {uniqueUsers} unique user{uniqueUsers !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
