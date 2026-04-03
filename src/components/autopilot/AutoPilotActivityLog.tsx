import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  SkipForward,
  Mail,
  Eye,
  MousePointerClick,
  MessageSquare,
  Loader2,
  BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityRow {
  id: string;
  business_name: string | null;
  business_location: string | null;
  contact_email: string | null;
  email_subject: string | null;
  email_body: string | null;
  status: string;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
  created_at: string;
}

type DateFilter = "today" | "7days" | "30days" | "custom";
type StatusFilter = "all" | "sent" | "opened" | "clicked" | "replied" | "failed" | "skipped";

interface AutoPilotActivityLogProps {
  userId: string;
  onBack: () => void;
}

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateFilterToRange(filter: DateFilter, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (filter) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "7days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "30days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "custom":
      return {
        from: customFrom ? new Date(customFrom).toISOString() : undefined,
        to: customTo ? new Date(customTo + "T23:59:59").toISOString() : undefined,
      };
    default:
      return {};
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    sent: { variant: "default", label: "Sent" },
    opened: { variant: "default", label: "Opened" },
    clicked: { variant: "default", label: "Clicked" },
    replied: { variant: "default", label: "Replied" },
    failed: { variant: "destructive", label: "Failed" },
    skipped: { variant: "secondary", label: "Skipped" },
  };
  const cfg = variants[status] ?? { variant: "outline", label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
  ) : (
    <span className="text-muted-foreground text-center block">—</span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AutoPilotActivityLog({ userId, onBack }: AutoPilotActivityLogProps) {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const range = dateFilterToRange(dateFilter, customFrom, customTo);

      let query = supabase
        .from("autopilot_activity")
        .select(
          "id, business_name, business_location, contact_email, email_subject, email_body, status, opened, clicked, replied, created_at",
          { count: "exact" }
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (range.from) query = query.gte("created_at", range.from);
      if (range.to) query = query.lte("created_at", range.to);

      // Status filter — handle special cases
      if (statusFilter === "opened") {
        query = query.eq("opened", true);
      } else if (statusFilter === "clicked") {
        query = query.eq("clicked", true);
      } else if (statusFilter === "replied") {
        query = query.eq("replied", true);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Search
      if (search) {
        query = query.or(`business_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setRows((data as ActivityRow[]) ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      console.error("Activity log fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, dateFilter, customFrom, customTo, statusFilter, search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          Activity Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Full history of every email sent by your Auto-Pilot agent.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Date range */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Date range</p>
              <Select
                value={dateFilter}
                onValueChange={(v) => {
                  setDateFilter(v as DateFilter);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom date inputs */}
            {dateFilter === "custom" && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">From</p>
                  <Input
                    type="date"
                    className="w-40"
                    value={customFrom}
                    onChange={(e) => { setCustomFrom(e.target.value); setPage(0); }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">To</p>
                  <Input
                    type="date"
                    className="w-40"
                    value={customTo}
                    onChange={(e) => { setCustomTo(e.target.value); setPage(0); }}
                  />
                </div>
              </>
            )}

            {/* Status filter */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Status</p>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as StatusFilter);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="clicked">Clicked</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-1 flex-1 min-w-48">
              <p className="text-xs text-muted-foreground font-medium">Search</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Business name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button variant="outline" size="icon" onClick={handleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                `${total.toLocaleString()} result${total !== 1 ? "s" : ""}`
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Time</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    <Eye className="w-3.5 h-3.5 mx-auto" />
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    <MousePointerClick className="w-3.5 h-3.5 mx-auto" />
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    <MessageSquare className="w-3.5 h-3.5 mx-auto" />
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No activity found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <>
                    <TableRow
                      key={row.id}
                      className={cn(
                        "cursor-pointer",
                        expandedRow === row.id && "bg-muted/50"
                      )}
                      onClick={() =>
                        setExpandedRow((prev) => (prev === row.id ? null : row.id))
                      }
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(row.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[160px] truncate">
                        {row.business_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[120px] truncate">
                        {row.business_location ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell max-w-[160px] truncate">
                        {row.contact_email ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs hidden lg:table-cell max-w-[200px] truncate">
                        {row.email_subject ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <BoolIcon value={row.opened} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <BoolIcon value={row.clicked} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <BoolIcon value={row.replied} />
                      </TableCell>
                      <TableCell>
                        {expandedRow === row.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded row — email body */}
                    {expandedRow === row.id && (
                      <TableRow key={`${row.id}-expanded`} className="bg-muted/30">
                        <TableCell colSpan={10} className="py-4 px-6">
                          <div className="space-y-2">
                            {row.email_subject && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                                  Subject
                                </p>
                                <p className="text-sm">{row.email_subject}</p>
                              </div>
                            )}
                            {row.email_body && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                                  Email body
                                </p>
                                <div className="bg-background border rounded-md p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                                  {row.email_body}
                                </div>
                              </div>
                            )}
                            {/* Mobile-only stats */}
                            <div className="flex gap-4 sm:hidden text-sm">
                              <span className={cn(row.opened ? "text-green-500" : "text-muted-foreground")}>
                                Opened: {row.opened ? "Yes" : "No"}
                              </span>
                              <span className={cn(row.clicked ? "text-green-500" : "text-muted-foreground")}>
                                Clicked: {row.clicked ? "Yes" : "No"}
                              </span>
                              <span className={cn(row.replied ? "text-green-500" : "text-muted-foreground")}>
                                Replied: {row.replied ? "Yes" : "No"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages} ({total.toLocaleString()} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
