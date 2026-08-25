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

const LOG_PAGE_SIZE = 30;

export function UsageManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month");
  const [events, setEvents] = useState<UsageRow[]>([]);
  const [limits, setLimits] = useState<Record<string, number | null>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [toolFilter, setToolFilter] = useState("all");
  const [logPage, setLogPage] = useState(0);
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

    // Resolve display names for every user in view — profiles covers both
    // talents and clients (talent_profiles alone missed client-side usage).
    const ids = Array.from(new Set((evs || []).map((e: UsageRow) => e.user_id)));
    if (ids.length) {
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => {
        if (p.full_name || p.email) map[p.user_id] = p.full_name || p.email;
      });
      setNameCache(map);
    }

    setLogPage(0);
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

  const nameFor = (userId: string) => nameCache[userId] || userId.slice(0, 8);
  const matchesSearch = (userId: string) => {
    if (!userSearch.trim()) return true;
    const s = userSearch.toLowerCase();
    return nameFor(userId).toLowerCase().includes(s) || userId.includes(s);
  };
  const filteredEvents = events.filter(
    (e) => (toolFilter === "all" || e.tool === toolFilter) && matchesSearch(e.user_id)
  );

  // Who used what, how many times, and when they last did it — grouped by
  // (user, tool) rather than collapsed across every tool into one count.
  const perUserToolMap = new Map<
    string,
    { user_id: string; tool: string; used: number; blocked: number; plan: string; lastUsed: string }
  >();
  filteredEvents.forEach((e) => {
    const key = `${e.user_id}:${e.tool}`;
    const cur = perUserToolMap.get(key) || {
      user_id: e.user_id, tool: e.tool, used: 0, blocked: 0, plan: e.plan, lastUsed: e.created_at,
    };
    if (e.blocked) cur.blocked++;
    else cur.used++;
    if (e.created_at > cur.lastUsed) cur.lastUsed = e.created_at;
    cur.plan = e.plan;
    perUserToolMap.set(key, cur);
  });
  const perUserTool = Array.from(perUserToolMap.values())
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
    .slice(0, 300);

  // Raw, timestamped activity log — the individual events, paginated.
  const logTotalPages = Math.max(1, Math.ceil(filteredEvents.length / LOG_PAGE_SIZE));
  const logPageRows = filteredEvents.slice(logPage * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE + LOG_PAGE_SIZE);

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
        <Select value={toolFilter} onValueChange={(v) => { setToolFilter(v); setLogPage(0); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tools</SelectItem>
            {TOOLS.map((t) => (
              <SelectItem key={t} value={t}>{TOOL_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search by name or user id…"
          value={userSearch}
          onChange={(e) => { setUserSearch(e.target.value); setLogPage(0); }}
          className="w-56"
        />
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

          {/* Who used what, how many times */}
          <Card>
            <CardHeader>
              <CardTitle>Who used what</CardTitle>
              <CardDescription>
                Every user × tool pair active in the selected range, with a use count and when they last used it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Tool</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Times used</TableHead>
                      <TableHead className="text-right">Blocked</TableHead>
                      <TableHead>Last used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perUserTool.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No usage matches this range/filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      perUserTool.map((u) => (
                        <TableRow key={`${u.user_id}:${u.tool}`}>
                          <TableCell className="font-medium">{nameFor(u.user_id)}</TableCell>
                          <TableCell>{TOOL_LABELS[u.tool] || u.tool}</TableCell>
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
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(u.lastUsed).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Raw, timestamped activity log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity log</CardTitle>
              <CardDescription>Individual tool-use events, most recent first.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Tool</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logPageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No events match this range/filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logPageRows.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{nameFor(e.user_id)}</TableCell>
                          <TableCell>{TOOL_LABELS[e.tool] || e.tool}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(e.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {e.blocked ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">Blocked</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-300">Used</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredEvents.length > 0 && (
                <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                  <span>
                    Page {logPage + 1} of {logTotalPages} · {filteredEvents.length.toLocaleString()} events
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                      disabled={logPage === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setLogPage((p) => Math.min(logTotalPages - 1, p + 1))}
                      disabled={logPage >= logTotalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
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
