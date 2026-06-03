import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useSkryveRole } from "@/hooks/use-skryve-role";
import ClientApplicationsView from "@/components/applications/ClientApplicationsView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Download, Plus, ExternalLink, Trash2, ClipboardList, Eye, MessageSquare, CheckCircle, XCircle } from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  applied: "bg-muted-foreground/40",
  replied: "bg-blue-500",
  interview: "bg-yellow-500",
  offer: "bg-primary",
  rejected: "bg-destructive",
};

const MKT_STATUS_DOT: Record<string, string> = {
  pending: "bg-muted-foreground/40",
  viewed: "bg-blue-500",
  shortlisted: "bg-purple-500",
  interview: "bg-yellow-500",
  hired: "bg-primary",
  rejected: "bg-destructive",
  offer_received: "bg-amber-500",
  countered: "bg-yellow-500",
};

const MKT_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  viewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shortlisted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  interview: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  hired: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  offer_received: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  countered: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const MKT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
  offer_received: "Offer Received",
  countered: "Counter Sent",
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

function RowSkeleton() {
  return (
    <div className="space-y-2 mt-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}

interface MarketplaceApplicationsTabProps {
  user: any;
}

function NegotiateForm({
  app,
  onClose,
  onDone,
}: {
  app: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [counterRate, setCounterRate] = useState("");
  const [counterTimeline, setCounterTimeline] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await (supabase as any)
        .from("job_applications")
        .update({
          status: "countered",
          counter_rate: counterRate ? parseFloat(counterRate) : null,
          counter_timeline: counterTimeline || null,
          counter_note: counterNote || null,
        })
        .eq("id", app.id);

      const job = app.marketplace_jobs;
      if (job?.client_profiles?.user_id) {
        const { data: convo } = await (supabase as any)
          .from("marketplace_conversations")
          .upsert(
            {
              talent_id: app.marketplace_jobs?.talent_profile_id || null,
              client_id: job.client_id,
              job_id: app.marketplace_job_id,
              last_message_at: new Date().toISOString(),
            },
            { onConflict: "talent_id,client_id,job_id" }
          )
          .select("id")
          .maybeSingle();

        if (convo?.id) {
          await (supabase as any).from("marketplace_messages").insert({
            conversation_id: convo.id,
            sender_id: app.user_id,
            content: `Counter offer: ₦${counterRate} / ${counterTimeline}. ${counterNote}`,
          });
        }
      }

      toast({ title: "Counter offer sent!" });
      onDone();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 mt-4 p-4 border border-border rounded-xl bg-muted/30">
      <p className="text-[13px] font-semibold text-foreground">Negotiate Terms</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Proposed Rate (₦)</Label>
          <Input
            type="number"
            value={counterRate}
            onChange={(e) => setCounterRate(e.target.value)}
            placeholder="e.g. 60000"
            className="h-8 text-[13px] mt-1"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Proposed Timeline</Label>
          <Input
            value={counterTimeline}
            onChange={(e) => setCounterTimeline(e.target.value)}
            placeholder="e.g. 3 weeks"
            className="h-8 text-[13px] mt-1"
          />
        </div>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">Note to Client</Label>
        <Textarea
          value={counterNote}
          onChange={(e) => setCounterNote(e.target.value)}
          rows={3}
          placeholder="Explain your counter offer..."
          className="text-[13px] mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-8 text-[13px]" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="h-8 text-[13px]" onClick={handleSubmit} disabled={submitting || !counterRate}>
          {submitting ? "Sending..." : "Send Counter Offer"}
        </Button>
      </div>
    </div>
  );
}

function ApplicationDetailDrawer({
  app,
  open,
  onClose,
  onStatusChange,
}: {
  app: any | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [showNegotiate, setShowNegotiate] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  if (!app) return null;

  const job = app.marketplace_jobs;
  const client = job?.client_profiles;
  const status: string = app.status || "pending";

  const handleAccept = async () => {
    await (supabase as any).from("job_applications").update({ status: "hired" }).eq("id", app.id);
    onStatusChange(app.id, "hired");
    toast({ title: "Offer accepted!" });
    onClose();
  };

  const handleDecline = async () => {
    await (supabase as any).from("job_applications").update({ status: "rejected" }).eq("id", app.id);
    onStatusChange(app.id, "rejected");
    toast({ title: "Offer declined." });
    setConfirmDecline(false);
    onClose();
  };

  const handleWithdraw = async () => {
    await (supabase as any).from("job_applications").delete().eq("id", app.id);
    onStatusChange(app.id, "__deleted__");
    toast({ title: "Application withdrawn." });
    setConfirmWithdraw(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Application Details</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div>
              <p className="text-[15px] font-semibold text-foreground">{job?.title || app.role_title}</p>
              <p className="text-[13px] text-muted-foreground">{client?.company_name || app.company_name}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${MKT_STATUS_CLASSES[status] || ""}`}>
                {MKT_STATUS_LABELS[status] || status}
              </span>
              <span className="text-[12px] text-muted-foreground">
                Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
              </span>
            </div>

            {app.proposal_text && (
              <div>
                <p className="text-[13px] font-semibold text-foreground mb-1">Your Proposal</p>
                <p className="text-[13px] text-muted-foreground bg-muted/50 rounded-xl p-3 whitespace-pre-wrap">
                  {app.proposal_text}
                </p>
              </div>
            )}

            {(app.rate_proposed || app.timeline) && (
              <div>
                <p className="text-[13px] font-semibold text-foreground mb-2">Your Terms</p>
                <div className="flex gap-4 text-[13px]">
                  {app.rate_proposed && (
                    <div>
                      <span className="text-muted-foreground">Rate: </span>
                      <span className="font-medium">₦{Number(app.rate_proposed).toLocaleString()}</span>
                    </div>
                  )}
                  {app.timeline && (
                    <div>
                      <span className="text-muted-foreground">Timeline: </span>
                      <span className="font-medium">{app.timeline}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {["shortlisted", "interview", "hired"].includes(status) && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-[13px] font-medium text-blue-700 dark:text-blue-400">
                  {status === "shortlisted"
                    ? "You've been shortlisted! The client will be in touch soon."
                    : status === "interview"
                    ? "You have an interview! Check your messages for details."
                    : "Congratulations! You've been hired for this job."}
                </p>
              </div>
            )}

            {status === "offer_received" && (
              <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 space-y-3">
                <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">Offer Received!</p>
                <p className="text-[13px] text-muted-foreground">
                  The client has sent you an offer. Review and respond below.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="h-8 text-[13px] bg-green-600 hover:bg-green-700" onClick={handleAccept}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Accept Offer
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-[13px]"
                    onClick={() => setConfirmDecline(true)}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Decline Offer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[13px] border-blue-400 text-blue-600"
                    onClick={() => setShowNegotiate((v) => !v)}
                  >
                    Negotiate
                  </Button>
                </div>
                {showNegotiate && (
                  <NegotiateForm
                    app={app}
                    onClose={() => setShowNegotiate(false)}
                    onDone={() => {
                      setShowNegotiate(false);
                      onStatusChange(app.id, "countered");
                      onClose();
                    }}
                  />
                )}
              </div>
            )}

            {status === "countered" && app.counter_rate && (
              <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-[13px] font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                  Counter Offer Sent
                </p>
                <div className="flex gap-4 text-[13px]">
                  <span>Rate: ₦{Number(app.counter_rate).toLocaleString()}</span>
                  {app.counter_timeline && <span>Timeline: {app.counter_timeline}</span>}
                </div>
                {app.counter_note && (
                  <p className="text-[12px] text-muted-foreground mt-1">{app.counter_note}</p>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="mt-8 flex gap-2 flex-wrap">
            {client?.user_id && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[13px]"
                onClick={() => navigate(`/messages?to=${client.user_id}`)}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Message Client
              </Button>
            )}
            {["pending", "viewed"].includes(status) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[13px] text-destructive border-destructive/40"
                onClick={() => setConfirmWithdraw(true)}
              >
                Withdraw Application
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDecline} onOpenChange={setConfirmDecline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Offer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this offer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Decline Offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your application. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdraw}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MarketplaceApplicationsTab({ user }: MarketplaceApplicationsTabProps) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("job_applications")
      .select(`
        *,
        marketplace_jobs:job_posts(
          id, title, client_id,
          client_profiles(company_name, logo_url, user_id)
        )
      `)
      .eq("user_id", user.id)
      .not("marketplace_job_id", "is", null)
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchApps();
  }, [user]);

  const handleStatusChange = (id: string, status: string) => {
    if (status === "__deleted__") {
      setApps((prev) => prev.filter((a) => a.id !== id));
    } else {
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    }
  };

  const openDetail = (app: any) => {
    setSelectedApp(app);
    setDetailOpen(true);
  };

  if (loading) {
    return <RowSkeleton />;
  }

  if (!apps.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ClipboardList className="w-10 h-10 text-foreground opacity-20 mb-4" />
        <p className="text-[14px] font-medium text-foreground mb-1">No marketplace applications yet</p>
        <p className="text-[13px] text-muted-foreground mb-4">
          Browse the marketplace and submit your first application.
        </p>
        <Button asChild size="sm" variant="outline" className="h-8 text-[13px]">
          <a href="/marketplace">Browse Marketplace</a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border rounded-xl bg-card overflow-hidden mt-4">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground">Marketplace Applications</span>
          <span className="text-[12px] text-muted-foreground">{apps.length} total</span>
        </div>
        <div className="divide-y divide-border">
          {apps.map((app) => {
            const job = app.marketplace_jobs;
            const client = job?.client_profiles;
            const status: string = app.status || "pending";
            const dotClass = MKT_STATUS_DOT[status] || "bg-muted-foreground/40";
            return (
              <div
                key={app.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => openDetail(app)}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {job?.title || app.role_title || "Unknown Job"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {client?.company_name || app.company_name || "—"} · {app.created_at
                      ? formatDistanceToNow(new Date(app.created_at), { addSuffix: true })
                      : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {app.rate_proposed != null && (
                    <span className="text-[12px] text-muted-foreground">
                      ₦{Number(app.rate_proposed).toLocaleString()}
                    </span>
                  )}
                  <span className="text-[12px] text-muted-foreground capitalize">
                    {MKT_STATUS_LABELS[status] || status}
                  </span>
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => { e.stopPropagation(); openDetail(app); }}
                    aria-label="View details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ApplicationDetailDrawer
        app={selectedApp}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </>
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
  const role = useSkryveRole(user?.id);
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
      .is("marketplace_job_id", null)
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

  const trackerContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Total Applications</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{stats.responseRate}%</div>
          <div className="text-[11px] text-muted-foreground mt-1">Response Rate</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{stats.interviews}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Interviews</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{stats.offers}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Offers</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-[13px]">
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
          <SelectTrigger className="w-40 h-8 text-[13px]">
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
            className="h-8 text-[13px]"
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
        <RowSkeleton />
      ) : apps.length ? (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">Applications</span>
            <span className="text-[12px] text-muted-foreground">{apps.length} total</span>
          </div>
          <div className="divide-y divide-border">
            {apps.map((app) => {
              const status = app.status || "applied";
              const dotClass = STATUS_DOT[status] || "bg-muted-foreground/40";
              return (
                <div key={app.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {app.job_title || app.role_title || "Unknown Job"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {app.platform || app.company_name || "—"} · {app.applied_at
                        ? formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={app.status || "applied"}
                      onValueChange={(val) => updateStatus(app.id, val)}
                    >
                      <SelectTrigger className="w-28 h-7 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-[12px] capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {app.rate_proposed != null && (
                      <span className="text-[12px] text-muted-foreground hidden sm:inline">
                        ${app.rate_proposed}/hr
                      </span>
                    )}
                    <Input
                      value={editingNote?.id === app.id ? editingNote.note : app.notes || ""}
                      onFocus={() => setEditingNote({ id: app.id, note: app.notes || "" })}
                      onChange={(e) => setEditingNote({ id: app.id, note: e.target.value })}
                      onBlur={() => saveNote(app.id)}
                      placeholder="Note..."
                      className="h-7 text-[12px] w-24 hidden md:block"
                    />
                    {(app.external_url || app.job_url) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
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
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ClipboardList className="w-10 h-10 text-foreground opacity-20 mb-4" />
          <p className="text-[14px] font-medium text-foreground mb-1">No applications yet</p>
          <p className="text-[13px] text-muted-foreground mb-4">
            Start applying to jobs and track them here.
          </p>
          <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => navigate("/jobs")}>
            Browse Jobs
          </Button>
        </div>
      )}
    </div>
  );

  if (role === "client" && user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Applications Inbox</h1>
          <p className="text-[13px] text-muted-foreground">Review and manage applications to your jobs.</p>
        </div>
        <ClientApplicationsView user={user} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Applications</h1>
          <p className="text-[13px] text-muted-foreground">Track all your job applications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[13px]" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button size="sm" className="h-8 text-[13px]" onClick={() => setShowAddForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Application
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tracker">
        <TabsList>
          <TabsTrigger value="tracker">Job Tracker</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>
        <TabsContent value="tracker" className="mt-6">
          {trackerContent}
        </TabsContent>
        <TabsContent value="marketplace">
          {user && <MarketplaceApplicationsTab user={user} />}
        </TabsContent>
      </Tabs>

      <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Application</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle" className="text-[13px]">Job Title *</Label>
              <Input
                id="jobTitle"
                value={addForm.jobTitle}
                onChange={(e) => setAddForm((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="e.g. Frontend Developer"
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="platform" className="text-[13px]">Company / Platform</Label>
              <Input
                id="platform"
                value={addForm.platform}
                onChange={(e) => setAddForm((f) => ({ ...f, platform: e.target.value }))}
                placeholder="e.g. Upwork, Acme Corp"
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url" className="text-[13px]">Job URL (optional)</Label>
              <Input
                id="url"
                value={addForm.url}
                onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateApplied" className="text-[13px]">Date Applied</Label>
              <Input
                id="dateApplied"
                type="date"
                value={addForm.dateApplied}
                onChange={(e) => setAddForm((f) => ({ ...f, dateApplied: e.target.value }))}
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Status</Label>
              <Select
                value={addForm.status}
                onValueChange={(val) => setAddForm((f) => ({ ...f, status: val }))}
              >
                <SelectTrigger className="h-8 text-[13px]">
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
              <Label htmlFor="rate" className="text-[13px]">Proposed Rate ($/hr)</Label>
              <Input
                id="rate"
                type="number"
                value={addForm.rate}
                onChange={(e) => setAddForm((f) => ({ ...f, rate: e.target.value }))}
                placeholder="e.g. 50"
                className="h-8 text-[13px]"
              />
            </div>
            <Button className="w-full h-8 text-[13px]" onClick={handleAddSave} disabled={addSaving}>
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
