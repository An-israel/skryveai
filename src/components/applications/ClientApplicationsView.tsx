import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, X, MessageCircle, ClipboardList, Loader2, ExternalLink } from "lucide-react";

type SortOption = "match" | "newest" | "rate_low" | "rated";
type FilterTab = "all" | "shortlisted" | "interview" | "offer_sent";

function getInitials(name: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function scoreApplication(app: any, requiredSkills: string[]): number {
  if (!requiredSkills || requiredSkills.length === 0) return 0;
  const talent = app.talent_profiles;
  if (!talent) return 0;
  const talentSkills = [talent.primary_skill, ...(talent.secondary_skills || [])].filter(Boolean).map((s: string) => s.toLowerCase());
  const matched = requiredSkills.filter((s) => talentSkills.includes(s.toLowerCase())).length;
  return Math.round((matched / requiredSkills.length) * 100);
}

interface ApplicantCardProps {
  app: any;
  onClick: () => void;
  onShortlist: (app: any) => void;
  onReject: (app: any) => void;
  onMessage: (app: any) => void;
}

function ApplicantCard({ app, onClick, onShortlist, onReject, onMessage }: ApplicantCardProps) {
  const talent = app.talent_profiles;
  const portfolioItems: any[] = talent?.portfolio_items || [];
  const firstPortfolio = portfolioItems[0];

  const LEVEL_BADGE: Record<string, string> = {
    entry: "bg-blue-500/10 text-blue-600",
    mid: "bg-purple-500/10 text-purple-600",
    senior: "bg-amber-500/10 text-amber-600",
    expert: "bg-green-500/10 text-green-600",
  };

  return (
    <div
      className="border rounded-xl p-4 bg-card hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-sm">
          {talent?.profile_photo_url ? (
            <img
              src={talent.profile_photo_url}
              alt={talent.full_name}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            getInitials(talent?.full_name || "")
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{talent?.full_name || "Unknown"}</p>
            {talent?.experience_level && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${LEVEL_BADGE[talent.experience_level] || ""}`}
              >
                {talent.experience_level}
              </Badge>
            )}
            {app.matchScore !== undefined && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {app.matchScore}% match
              </Badge>
            )}
          </div>
          {talent?.primary_skill && (
            <p className="text-xs text-muted-foreground mt-0.5">{talent.primary_skill}</p>
          )}
        </div>
        {app.rate_proposed != null && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold">
              ₦{Number(app.rate_proposed).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">{app.rate_type || "fixed"}</p>
          </div>
        )}
      </div>

      {app.proposal_text && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
          {app.proposal_text.slice(0, 120)}{app.proposal_text.length > 120 ? "..." : ""}
        </p>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">
          Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
        </span>
        {firstPortfolio?.thumbnail_url || firstPortfolio?.image_url ? (
          <img
            src={firstPortfolio.thumbnail_url || firstPortfolio.image_url}
            alt={firstPortfolio.title}
            className="w-10 h-10 rounded object-cover border"
          />
        ) : null}
      </div>

      <div className="flex gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          title="Shortlist"
          onClick={() => onShortlist(app)}
          disabled={app.status === "shortlisted"}
        >
          <Star className={`w-3.5 h-3.5 ${app.status === "shortlisted" ? "fill-amber-400 text-amber-400" : ""}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 text-destructive border-destructive/30"
          title="Reject"
          onClick={() => onReject(app)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          title="Message"
          onClick={() => onMessage(app)}
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ClientApplicationsView({ user }: { user: any }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clientJobs, setClientJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cp } = await (supabase as any)
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!cp) return;

      const { data: jobs } = await (supabase as any)
        .from("job_posts")
        .select("id, title, status, applicant_count, required_skills")
        .eq("client_id", cp.id)
        .order("created_at", { ascending: false });
      setClientJobs(jobs || []);
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedJobId) return;
    const job = clientJobs.find((j) => j.id === selectedJobId);
    setSelectedJob(job || null);
    fetchApplications(selectedJobId, job?.required_skills || []);
  }, [selectedJobId, clientJobs]);

  const fetchApplications = async (jobId: string, requiredSkills: string[]) => {
    setLoading(true);
    const { data: apps } = await (supabase as any)
      .from("job_applications")
      .select(`
        *,
        talent_profiles(
          id, full_name, profile_photo_url, primary_skill, secondary_skills,
          experience_level, hourly_rate, bio,
          portfolio_items(id, title, thumbnail_url, image_url, project_url)
        )
      `)
      .eq("marketplace_job_id", jobId)
      .neq("status", "rejected")
      .order("created_at", { ascending: false });

    const scored = (apps || []).map((app: any) => ({
      ...app,
      matchScore: scoreApplication(app, requiredSkills),
    }));
    setApplications(scored);
    setLoading(false);
  };

  const handleShortlist = async (app: any) => {
    await (supabase as any)
      .from("job_applications")
      .update({ status: "shortlisted" })
      .eq("id", app.id);

    await (supabase as any).from("notifications").insert({
      user_id: app.user_id,
      title: "You've been shortlisted!",
      message: `Your application for "${selectedJob?.title}" has been shortlisted.`,
      type: "application_update",
    });

    setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "shortlisted" } : a)));
    toast({ title: "Applicant shortlisted!" });
  };

  const handleReject = async (appId: string) => {
    await (supabase as any)
      .from("job_applications")
      .update({ status: "rejected" })
      .eq("id", appId);
    setApplications((prev) => prev.filter((a) => a.id !== appId));
    setRejectId(null);
    if (selectedApp?.id === appId) setSelectedApp(null);
    toast({ title: "Application rejected." });
  };

  const handleMessage = (app: any) => {
    navigate(`/messages?talent=${app.talent_profiles?.id}&job=${selectedJobId}`);
  };

  const filteredApps = applications
    .filter((a) => {
      if (filterTab === "all") return true;
      if (filterTab === "shortlisted") return a.status === "shortlisted";
      if (filterTab === "interview") return a.status === "interview";
      if (filterTab === "offer_sent") return a.status === "offer_received";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "match") return (b.matchScore || 0) - (a.matchScore || 0);
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "rate_low") return (a.rate_proposed || 0) - (b.rate_proposed || 0);
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a job to view applications..." />
          </SelectTrigger>
          <SelectContent>
            {clientJobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title} — {job.applicant_count || 0} applicants
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedJobId ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold mb-2">Select a job to view its applications</h3>
          <p className="text-sm text-muted-foreground">Choose one of your job posts above.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
              <TabsList>
                <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
                <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
                <TabsTrigger value="interview">Interview</TabsTrigger>
                <TabsTrigger value="offer_sent">Offer Sent</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">AI Match</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="rate_low">Lowest Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No applications in this category.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredApps.map((app) => (
                <ApplicantCard
                  key={app.id}
                  app={app}
                  onClick={() => setSelectedApp(app)}
                  onShortlist={handleShortlist}
                  onReject={(a) => setRejectId(a.id)}
                  onMessage={handleMessage}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Sheet open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        {selectedApp && (
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Applicant Details</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 mt-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg shrink-0">
                  {selectedApp.talent_profiles?.profile_photo_url ? (
                    <img
                      src={selectedApp.talent_profiles.profile_photo_url}
                      alt={selectedApp.talent_profiles.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(selectedApp.talent_profiles?.full_name || "")
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedApp.talent_profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedApp.talent_profiles?.primary_skill}</p>
                </div>
              </div>

              {selectedApp.proposal_text && (
                <div>
                  <p className="text-sm font-semibold mb-1">Full Proposal</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                    {selectedApp.proposal_text}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">Their Terms</p>
                <div className="flex gap-4 text-sm">
                  {selectedApp.rate_proposed != null && (
                    <div>
                      <span className="text-muted-foreground">Rate: </span>
                      <span className="font-medium">₦{Number(selectedApp.rate_proposed).toLocaleString()}</span>
                      {selectedApp.rate_type && <span className="text-muted-foreground"> ({selectedApp.rate_type})</span>}
                    </div>
                  )}
                  {selectedApp.timeline && (
                    <div>
                      <span className="text-muted-foreground">Timeline: </span>
                      <span className="font-medium">{selectedApp.timeline}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedApp.talent_profiles?.portfolio_items?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Portfolio Samples</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedApp.talent_profiles.portfolio_items.slice(0, 6).map((item: any) => (
                      <a
                        key={item.id}
                        href={item.project_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center"
                      >
                        {item.thumbnail_url || item.image_url ? (
                          <img
                            src={item.thumbnail_url || item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.talent_profiles?.bio && (
                <div>
                  <p className="text-sm font-semibold mb-1">About</p>
                  <p className="text-sm text-muted-foreground">{selectedApp.talent_profiles.bio}</p>
                </div>
              )}
            </div>

            <SheetFooter className="mt-6 flex gap-2 flex-wrap">
              {selectedApp.status !== "shortlisted" && (
                <Button size="sm" variant="outline" onClick={() => handleShortlist(selectedApp)}>
                  <Star className="w-3.5 h-3.5 mr-1" /> Shortlist
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setShowOfferModal(true);
                }}
              >
                Send Offer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMessage(selectedApp)}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" /> Message
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectId(selectedApp.id)}
              >
                Reject
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      {showOfferModal && selectedApp && (
        <SendOfferInline
          app={selectedApp}
          job={selectedJob}
          user={user}
          open={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => {
            setShowOfferModal(false);
            setSelectedApp(null);
            if (selectedJobId && selectedJob?.required_skills) {
              fetchApplications(selectedJobId, selectedJob.required_skills);
            }
          }}
        />
      )}

      <AlertDialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this applicant?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectId && handleReject(rejectId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SendOfferInline({
  app,
  job,
  user,
  open,
  onClose,
  onSuccess,
}: {
  app: any;
  job: any;
  user: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    projectScope: job?.description || "",
    agreedRate: app?.rate_proposed ? String(app.rate_proposed) : "",
    rateType: "fixed" as "fixed" | "hourly",
    timeline: app?.timeline || "",
    startDate: new Date().toISOString().split("T")[0],
    additionalTerms: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    setSubmitting(true);
    try {
      const { data: cp } = await (supabase as any)
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!cp) throw new Error("Client profile not found");

      const { data: project, error: projErr } = await (supabase as any)
        .from("projects")
        .insert({
          client_id: cp.id,
          talent_id: app.talent_profiles?.id,
          job_id: job?.id,
          title: job?.title,
          total_amount: parseFloat(form.agreedRate),
          currency: "NGN",
          status: "active",
          deadline: form.startDate,
        })
        .select("id")
        .single();
      if (projErr) throw projErr;

      await (supabase as any)
        .from("job_applications")
        .update({ status: "offer_received" })
        .eq("id", app.id);

      await (supabase as any).from("notifications").insert({
        user_id: app.user_id,
        title: "You received an offer! 🎉",
        message: `${user.user_metadata?.full_name || "A client"} sent you an offer for "${job?.title}".`,
        type: "offer",
        link: "/applications",
      });

      toast({ title: "Offer sent!", description: "The talent has been notified." });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Send Offer to {app?.talent_profiles?.full_name}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-3 my-2">
          <div>
            <label className="text-sm font-medium">Agreed Rate (₦)</label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.agreedRate}
              onChange={(e) => setForm((f) => ({ ...f, agreedRate: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Timeline</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. 2 weeks"
                value={form.timeline}
                onChange={(e) => setForm((f) => ({ ...f, timeline: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSend}
            disabled={submitting || !form.agreedRate}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Send Offer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
