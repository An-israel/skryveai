import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, RefreshCw, FileText, Target, TrendingUp } from "lucide-react";
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
  ats_checker: "ATS Score Checker",
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  cv_builder: <FileText className="w-4 h-4" />,
  ats_checker: <Target className="w-4 h-4" />,
};

export function ToolUsageTracker() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [stats, setStats] = useState<{ tool_name: string; count: number }[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = (supabase as any).from("tool_usage").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") query = query.eq("tool_name", filter);
      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for display
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const enriched = (data || []).map((r: any) => {
        const profile = profileMap.get(r.user_id);
        return {
          ...r,
          user_email: profile?.email || "Unknown",
          user_name: profile?.full_name || "Unknown",
        };
      });

      setRecords(enriched);

      // Calculate stats
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.tool_name] = (counts[r.tool_name] || 0) + 1;
      });

      // Also get all-time counts
      const { data: allCv } = await (supabase as any).from("tool_usage").select("id", { count: "exact", head: true }).eq("tool_name", "cv_builder");
      const { data: allAts } = await (supabase as any).from("tool_usage").select("id", { count: "exact", head: true }).eq("tool_name", "ats_checker");

      // Use the filtered data counts for chart, but show totals in cards
      const chartData = Object.entries(counts).map(([tool_name, count]) => ({
        tool_name: TOOL_LABELS[tool_name] || tool_name,
        count,
      }));
      setStats(chartData);
    } catch (err) {
      console.error("Failed to fetch tool usage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const totalUsage = records.length;
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
              <CardDescription>Track how many users have used CV Builder, ATS Score Checker, and other tools.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tools</SelectItem>
                  <SelectItem value="cv_builder">CV Builder</SelectItem>
                  <SelectItem value="ats_checker">ATS Checker</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
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
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{records.filter(r => r.tool_name === "cv_builder").length}</p>
                    <p className="text-xs text-muted-foreground">CV Builds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{records.filter(r => r.tool_name === "ats_checker").length}</p>
                    <p className="text-xs text-muted-foreground">ATS Checks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {stats.length > 0 && (
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="tool_name" className="text-xs" />
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
                        <Badge variant="outline" className="gap-1">
                          {TOOL_ICONS[r.tool_name]}
                          {TOOL_LABELS[r.tool_name] || r.tool_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                        {r.tool_name === "ats_checker" && r.metadata?.score
                          ? `Score: ${r.metadata.score}% (${r.metadata.grade})`
                          : r.tool_name === "cv_builder" && r.metadata?.mode
                          ? `Mode: ${r.metadata.mode}${r.metadata.ats_score ? `, ATS: ${r.metadata.ats_score}%` : ""}`
                          : "—"}
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
            Showing {records.length} records • {uniqueUsers} unique user{uniqueUsers !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
