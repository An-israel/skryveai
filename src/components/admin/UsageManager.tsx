import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Save } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const TOOL_LABELS: Record<string, string> = {
  cv_builder: "CV Builder",
  ats_checker: "ATS Checker",
  proposals: "Proposals",
  applications: "Applications",
  learning_coach: "Learning Coach",
  linkedin: "LinkedIn Analyzer",
  copilot: "Apply Copilot",
};

const PLANS = ["free", "pro", "business"];
const TOOLS = Object.keys(TOOL_LABELS);

const RANGES = [
  { id: "month", label: "This month", days: null as number | null },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "all", label: "All time", days: 0 },
];

interface UsageRow {
  id: string;
  user_id: string;
  tool: string;
  plan: string;
  blocked: boolean;
  created_at: string;
}

interface LimitRow {
  id?: string;
  plan: string;
  tool: string;
  monthly_limit: number | null;
}

function rangeStartISO(range: string): string | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }
  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 86400000).toISOString();
}

export function UsageManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month");
  const [events, setEvents] = useState<UsageRow[]>([]);
  const [limits, setLimits] = useState<Record<string, number | null>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const start = rangeStartISO(range);

    let q = (supabase as any)
      .from("tool_usage_events")
      .select("id, user_id, tool, plan, blocked, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (start) q = q.gte("created_at", start);

    const [{ data: evs }, { data: lims }] = await Promise.all([
      q,
      (supabase as any).from("tool_plan_limits").select("id, plan, tool, monthly_limit"),
    ]);

    setEvents(evs || []);

    const lmap: Record<string, number | null> = {};
    (lims || []).forEach((l: LimitRow) => {
      lmap[`${l.plan}:${l.tool}`] = l.monthly_limit;
    });
    setLimits(lmap);

    // Resolve display names for the top users in view.
    const ids = Array.from(new Set((evs || []).map((e: UsageRow) => e.user_id))).slice(0, 200);
    if (ids.length) {
      const { data: talents } = await (supabase as any)
        .from("talent_profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (talents || []).forEach((t: any) => {
        if (t.full_name) map[t.user_id] = t.full_name;
      });
      setNameCache(map);
    }

    setLoading(false);
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Aggregates ───────────────────────────────────────────────────────────
  const perTool = TOOLS.map((tool) => {
    const used = events.filter((e) => e.tool === tool && !e.blocked).length;
    const blocked = events.filter((e) => e.tool === tool && e.blocked).length;
    return { tool, label: TOOL_LABELS[tool], used, blocked };
  });

  const totalUses = events.filter((e) => !e.blocked).length;
  const totalBlocked = events.filter((e) => e.blocked).length;

  // Per-user breakdown.
  const perUserMap = new Map<string, { used: number; blocked: number; plan: string }>();
  events.forEach((e) => {
    const cur = perUserMap.get(e.user_id) || { used: 0, blocked: 0, plan: e.plan };
    if (e.blocked) cur.blocked++;
    else cur.used++;
    cur.plan = e.plan;
    perUserMap.set(e.user_id, cur);
  });
  let perUser = Array.from(perUserMap.entries()).map(([user_id, v]) => ({
    user_id,
    name: nameCache[user_id] || user_id.slice(0, 8),
    ...v,
  }));
  if (userSearch.trim()) {
    const s = userSearch.toLowerCase();
    perUser = perUser.filter(
      (u) => u.name.toLowerCase().includes(s) || u.user_id.includes(s)
    );
  }
  perUser.sort((a, b) => b.used + b.blocked - (a.used + a.blocked));
  perUser = perUser.slice(0, 100);

  const saveLimit = async (plan: string, tool: string, raw: string) => {
    const key = `${plan}:${tool}`;
    setSavingKey(key);
    const value = raw.trim() === "" ? null : Math.max(0, parseInt(raw, 10) || 0);
    const { error } = await (supabase as any)
      .from("tool_plan_limits")
      .upsert({ plan, tool, monthly_limit: value, updated_at: new Date().toISOString() }, {
        onConflict: "plan,tool",
      });
    if (error) {
      toast({ title: "Failed to save limit", description: error.message, variant: "destructive" });
    } else {
      setLimits((prev) => ({ ...prev, [key]: value }));
      toast({ title: "Limit saved", description: `${TOOL_LABELS[tool]} · ${plan}: ${value ?? "unlimited"}` });
    }
    setSavingKey(null);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <div className="ml-auto flex gap-4 text-sm">
          <span className="text-muted-foreground">
            Total uses: <span className="font-semibold text-foreground">{totalUses.toLocaleString()}</span>
          </span>
          <span className="text-muted-foreground">
            Blocked: <span className="font-semibold text-amber-600">{totalBlocked.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Per-tool chart */}
          <Card>
            <CardHeader>
              <CardTitle>Tool usage</CardTitle>
              <CardDescription>Successful actions vs. blocked (rate-limited) attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perTool}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="used" name="Used" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="blocked" name="Blocked" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Per-plan limit config */}
          <Card>
            <CardHeader>
              <CardTitle>Rate limits</CardTitle>
              <CardDescription>
                Monthly cap per plan per tool. Leave blank for unlimited. Changes apply immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool</TableHead>
                    {PLANS.map((p) => (
                      <TableHead key={p} className="capitalize">{p}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TOOLS.map((tool) => (
                    <TableRow key={tool}>
                      <TableCell className="font-medium">{TOOL_LABELS[tool]}</TableCell>
                      {PLANS.map((plan) => {
                        const key = `${plan}:${tool}`;
                        const val = limits[key];
                        return (
                          <TableCell key={plan}>
                            <LimitInput
                              defaultValue={val == null ? "" : String(val)}
                              saving={savingKey === key}
                              onSave={(raw) => saveLimit(plan, tool, raw)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Per-user breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Per-user usage</CardTitle>
              <CardDescription>Top users by activity in the selected range.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 max-w-xs">
                <Input
                  placeholder="Search by name or user id…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Uses</TableHead>
                      <TableHead className="text-right">Blocked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perUser.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No usage in this range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      perUser.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{u.plan}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{u.used}</TableCell>
                          <TableCell className="text-right">
                            {u.blocked > 0 ? (
                              <span className="text-amber-600 font-medium">{u.blocked}</span>
                            ) : (
                              "0"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function LimitInput({
  defaultValue,
  saving,
  onSave,
}: {
  defaultValue: string;
  saving: boolean;
  onSave: (raw: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const dirty = value !== defaultValue;
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        placeholder="∞"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 h-8"
      />
      {dirty && (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onSave(value)} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        </Button>
      )}
    </div>
  );
}
