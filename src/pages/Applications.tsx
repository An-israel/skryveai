import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Download, Plus, ExternalLink, Trash2, ClipboardList } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-gray-100 text-gray-700",
  replied: "bg-yellow-100 text-yellow-700",
  interview: "bg-purple-100 text-purple-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUSES = ["applied", "replied", "interview", "offer", "rejected"];

interface AppRow {
  id: string;
  user_id: string;
  role_title: string;
  company_name: string;
  status: string;
  job_url?: string | null;
  notes?: string | null;
  salary_range?: string | null;
  source?: string | null;
  applied_at: string;
  rate_proposed?: number | null;
  proposal_text?: string | null;
  job_title?: string | null;
  platform?: string | null;
  external_url?: string | null;
}

interface AddForm {
  jobTitle: string;
  platform: string;
  url: string;
  dateApplied: string;
  status: string;
  rate: string;
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export default function Applications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);
  const [addForm, setAddForm] = useState<AddForm>({
    jobTitle: "",
    platform: "",
    url: "",
    dateApplied: "",
    status: "applied",
    rate: "",
  });
  const [addSaving, setAddSaving] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    setUser(session.user);

    let query = (supabase as any)
      .from("job_applications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("applied_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data } = await query;
    let filtered = data || [];
    if (platformFilter !== "all") {
      filtered = filtered.filter(
        (a: AppRow) =>
          (a.platform || a.company_name || "").toLowerCase() === platformFilter.toLowerCase()
      );
    }
    setApps(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, [statusFilter, platformFilter]);

  const stats = {
    total: apps.length,
    responseRate: apps.length
      ? Math.round(
          (apps.filter((a) => ["replied", "interview", "offer"].includes(a.status)).length /
            apps.length) *
            100
        )
      : 0,
    interviews: apps.filter((a) => a.status === "interview").length,
    offers: apps.filter((a) => a.status === "offer").length,
  };

  const uniquePlatforms = Array.from(
    new Set(apps.map((a) => a.platform || a.company_name || "").filter(Boolean))
  );

  const updateStatus = async (id: string, status: string) => {
    await (supabase as any).from("job_applications").update({ status }).eq("id", id);
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const saveNote = async (id: string) => {
    if (!editingNote || editingNote.id !== id) return;
    await (supabase as any)
      .from("job_applications")
      .update({ notes: editingNote.note })
      .eq("id", id);
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notes: editingNote.note } : a))
    );
    setEditingNote(null);
  };

  const deleteApp = async (id: string) => {
    await (supabase as any).from("job_applications").delete().eq("id", id);
    setApps((prev) => prev.filter((a) => a.id !== id));
    setDeleteId(null);
  };

  const handleAddSave = async () => {
    if (!addForm.jobTitle.trim()) {
      toast({ title: "Job title is required", variant: "destructive" });
      return;
    }
    setAddSaving(true);
    const { error } = await (supabase as any).from("job_applications").insert({
      user_id: user?.id,
      role_title: addForm.jobTitle,
      company_name: addForm.platform || "Unknown",
      job_title: addForm.jobTitle,
      platform: addForm.platform || null,
      external_url: addForm.url || null,
      job_url: addForm.url || null,
      applied_at: addForm.dateApplied || new Date().toISOString(),
      status: addForm.status || "applied",
      rate_proposed: addForm.rate ? parseFloat(addForm.rate) : null,
    });
    setAddSaving(false);
    if (error) {
      toast({ title: "Failed to add application", description: error.message, variant: "destructive" });
      return;
    }
    setShowAddForm(false);
    setAddForm({ jobTitle: "", platform: "", url: "", dateApplied: "", status: "applied", rate: "" });
    fetchApps();
    toast({ title: "Application added!" });
  };

  const exportCSV = () => {
    const rows = [
      ["Job Title", "Platform/Company", "Date Applied", "Status", "Rate Proposed", "Notes"],
      ...apps.map((a) => [
        a.job_title || a.role_title || "",
        a.platform || a.company_name || "",
        a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "",
        a.status || "",
        a.rate_proposed != null ? String(a.rate_proposed) : "",
        a.notes || "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applications-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground text-sm">Track all your job applications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Application
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Applications</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{stats.responseRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">Response Rate</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{stats.interviews}</div>
          <div className="text-xs text-muted-foreground mt-1">Interviews</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{stats.offers}</div>
          <div className="text-xs text-muted-foreground mt-1">Offers</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {uniquePlatforms.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || platformFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPlatformFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <TableSkeleton />
      ) : apps.length ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Date Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rate Proposed</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {app.job_title || app.role_title || "Unknown Job"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {app.platform || app.company_name || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {app.applied_at
                      ? formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={app.status || "applied"}
                      onValueChange={(val) => updateStatus(app.id, val)}
                    >
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">
                    {app.rate_proposed != null ? `$${app.rate_proposed}/hr` : "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={
                        editingNote?.id === app.id ? editingNote.note : app.notes || ""
                      }
                      onFocus={() =>
                        setEditingNote({ id: app.id, note: app.notes || "" })
                      }
                      onChange={(e) =>
                        setEditingNote({ id: app.id, note: e.target.value })
                      }
                      onBlur={() => saveNote(app.id)}
                      placeholder="Add note..."
                      className="h-7 text-xs w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {(app.external_url || app.job_url) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <a
                            href={app.external_url || app.job_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(app.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No applications yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Start applying to jobs and track them here.
          </p>
          <Button onClick={() => navigate("/jobs")}>Browse Jobs</Button>
        </div>
      )}

      <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Application</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                value={addForm.jobTitle}
                onChange={(e) => setAddForm((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="e.g. Frontend Developer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="platform">Company / Platform</Label>
              <Input
                id="platform"
                value={addForm.platform}
                onChange={(e) => setAddForm((f) => ({ ...f, platform: e.target.value }))}
                placeholder="e.g. Upwork, Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">Job URL (optional)</Label>
              <Input
                id="url"
                value={addForm.url}
                onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateApplied">Date Applied</Label>
              <Input
                id="dateApplied"
                type="date"
                value={addForm.dateApplied}
                onChange={(e) => setAddForm((f) => ({ ...f, dateApplied: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={addForm.status}
                onValueChange={(val) => setAddForm((f) => ({ ...f, status: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate">Proposed Rate ($/hr)</Label>
              <Input
                id="rate"
                type="number"
                value={addForm.rate}
                onChange={(e) => setAddForm((f) => ({ ...f, rate: e.target.value }))}
                placeholder="e.g. 50"
              />
            </div>
            <Button className="w-full" onClick={handleAddSave} disabled={addSaving}>
              {addSaving ? "Saving..." : "Save Application"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this application from your tracker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteApp(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
