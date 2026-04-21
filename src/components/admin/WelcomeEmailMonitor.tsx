import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock, Send, Search, Mail,
} from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

type Status = "all" | "sent" | "failed" | "pending";

interface LogRow {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined client-side
  phone?: string | null;
}

export function WelcomeEmailMonitor() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("welcome_email_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const logs = (data || []) as LogRow[];

      // Hydrate phone numbers from profiles so CS can WhatsApp users with failed sends.
      const userIds = Array.from(
        new Set(logs.map((l) => l.user_id).filter(Boolean) as string[]),
      );
      const phoneMap = new Map<string, string | null>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, phone")
          .in("user_id", userIds);
        (profs || []).forEach((p: { user_id: string; phone: string | null }) => {
          phoneMap.set(p.user_id, p.phone);
        });
      }
      logs.forEach((l) => {
        if (l.user_id) l.phone = phoneMap.get(l.user_id) ?? null;
      });

      setRows(logs);
    } catch (e) {
      console.error("[WelcomeEmailMonitor] load error", e);
      toast({
        title: "Failed to load welcome email log",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.email.toLowerCase().includes(q) ||
          (r.full_name || "").toLowerCase().includes(q) ||
          (r.error_message || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, statusFilter, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter((r) => r.status === "sent").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, failed, pending, successRate };
  }, [rows]);

  const retry = async (row: LogRow) => {
    setRetryingId(row.id);
    try {
      const ctx = (row.context || {}) as { plan?: string; firstAction?: string; source?: string };
      const { error } = await supabase.functions.invoke("send-welcome-email", {
        body: {
          email: row.email,
          fullName: row.full_name || "",
          userId: row.user_id || undefined,
          plan: ctx.plan,
          firstAction: ctx.firstAction,
          source: "manual-retry",
        },
      });
      if (error) throw error;
      toast({ title: "Welcome email re-sent", description: row.email });
      await load();
    } catch (e) {
      toast({
        title: "Retry failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const statusBadge = (s: string) => {
    if (s === "sent") {
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
          <CheckCircle2 className="w-3 h-3" /> Sent
        </Badge>
      );
    }
    if (s === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" /> Failed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="w-3 h-3" /> Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Mail className="w-3.5 h-3.5" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-green-600 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs">Sent ({stats.successRate}%)</span>
            </div>
            <p className="text-xl font-bold text-green-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-destructive mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-xs">Failed</span>
            </div>
            <p className="text-xl font-bold text-destructive">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">Pending</span>
            </div>
            <p className="text-xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Welcome Email Send Log</CardTitle>
              <CardDescription>
                Last 200 attempts — troubleshoot failed sends and retry from here.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search email, name, error..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 w-56 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status)}>
                <SelectTrigger className="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[480px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const ctx = (r.context || {}) as {
                      plan?: string; firstAction?: string; source?: string;
                    };
                    const wa = r.phone ? whatsappUrl(r.phone, `Hi ${r.full_name || "there"}, this is SkryveAI Customer Success — we noticed your welcome email had trouble. How can we help?`) : "";
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="space-y-0.5">
                            {ctx.plan && <div><span className="font-medium">plan:</span> {ctx.plan}</div>}
                            {ctx.firstAction && <div><span className="font-medium">action:</span> {ctx.firstAction}</div>}
                            {ctx.source && <div><span className="font-medium">src:</span> {ctx.source}</div>}
                            {!ctx.plan && !ctx.firstAction && !ctx.source && <span>—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          {r.error_message ? (
                            <p className="text-xs text-destructive truncate" title={r.error_message}>
                              {r.error_message}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div title={format(new Date(r.created_at), "PPpp")}>
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {wa && (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:underline"
                                title="Message on WhatsApp"
                              >
                                💬
                              </a>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              onClick={() => retry(r)}
                              disabled={retryingId === r.id}
                            >
                              {retryingId === r.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Retry
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                        No records match the current filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
