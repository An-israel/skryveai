import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Loader2,
  Plus,
  Star,
  File,
  Link as LinkIcon,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

function formatCurrency(amount: number | null, currency = "NGN") {
  if (!amount) return "—";
  const sym: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return `${sym[currency] || "₦"}${amount.toLocaleString()}`;
}

function isOverdue(deadline: string | null) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    active: "bg-primary",
    awaiting_review: "bg-amber-500",
    completed: "bg-green-500",
    overdue: "bg-destructive",
  };
  return map[status] || "bg-muted-foreground";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    active: "Active",
    awaiting_review: "Awaiting Review",
    completed: "Complete",
    overdue: "Overdue",
  };
  return map[status] || status;
}

function milestoneStatusDot(status: string) {
  if (status === "completed") return "bg-green-500";
  if (status === "in_progress") return "bg-primary";
  return "bg-border";
}

function deliverableStatusDot(status: string) {
  if (status === "approved") return "bg-green-500";
  if (status === "revision_requested") return "bg-amber-500";
  return "bg-muted-foreground";
}

function deliverableStatusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "revision_requested") return "Revision";
  return "Pending";
}

function paymentStatusDot(status: string) {
  if (status === "released") return "bg-green-500";
  if (status === "in_escrow") return "bg-primary";
  return "bg-muted-foreground";
}

function paymentStatusLabel(status: string) {
  if (status === "released") return "Released";
  if (status === "in_escrow") return "In Escrow";
  return "Pending";
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              n <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function MiniMessageThread({ messages, userId }: { messages: any[]; userId: string }) {
  if (messages.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground py-4 text-center">
        No messages yet. Start the conversation.
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {messages.map(msg => {
        const isOwn = msg.sender_id === userId;
        return (
          <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-[11px] font-bold text-muted-foreground">
              {isOwn ? "Y" : "C"}
            </div>
            <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className={`rounded-lg px-3 py-2 text-[13px] ${
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(msg.created_at || msg.sent_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <Skeleton className="h-5 w-28 rounded-lg" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [deliverableType, setDeliverableType] = useState<"file" | "url">("file");
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [deliverableNote, setDeliverableNote] = useState("");
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
  const [uploadingDeliverable, setUploadingDeliverable] = useState(false);

  const [showReviewCard, setShowReviewCard] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      await fetchProject(session?.user ?? null);
    };
    init();
  }, [projectId]);

  const fetchProject = async (currentUser: any) => {
    if (!projectId) return;

    const { data: proj } = await (supabase as any)
      .from("projects")
      .select(`
        *,
        client_profiles(id, company_name, logo_url, user_id, industry),
        job_posts(title, description)
      `)
      .eq("id", projectId)
      .single();

    const { data: milestoneData } = await (supabase as any)
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true });

    const { data: deliverableData } = await (supabase as any)
      .from("project_deliverables")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (proj?.job_id) {
      const { data: convo } = await (supabase as any)
        .from("marketplace_conversations")
        .select("id")
        .eq("job_id", proj.job_id)
        .maybeSingle();

      if (convo?.id) {
        const { data: msgs } = await (supabase as any)
          .from("marketplace_messages")
          .select("id, content, sender_id, created_at, sent_at")
          .eq("conversation_id", convo.id)
          .order("sent_at", { ascending: false })
          .limit(5);
        setMessages((msgs || []).reverse());
        setConversationId(convo.id);
      }
    }

    setProject(proj);
    setMilestones(milestoneData || []);
    setDeliverables(deliverableData || []);

    if (
      proj?.status === "completed" &&
      proj?.payment_status === "released" &&
      !proj?.talent_review_submitted
    ) {
      setShowReviewCard(true);
    }

    setLoading(false);
  };

  const handleSubmitDeliverable = async () => {
    if (!user || !projectId) return;
    setUploadingDeliverable(true);
    try {
      let fileUrl = deliverableUrl;
      let fileName = "";

      if (deliverableType === "file" && deliverableFile) {
        const path = `${user.id}/${projectId}/${Date.now()}-${deliverableFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("deliverables")
          .upload(path, deliverableFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("deliverables").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileName = deliverableFile.name;
      }

      await (supabase as any).from("project_deliverables").insert({
        project_id: projectId,
        file_url: deliverableType === "file" ? fileUrl : null,
        file_name: fileName || null,
        external_url: deliverableType === "url" ? deliverableUrl : null,
        delivery_note: deliverableNote || null,
        status: "pending_review",
      });

      if (project?.client_profiles?.user_id) {
        await (supabase as any).from("notifications").insert({
          user_id: project.client_profiles.user_id,
          title: "New Deliverable Submitted",
          message: `${user.user_metadata?.full_name || "Talent"} submitted a deliverable for your project.`,
          type: "deliverable",
          link: `/projects/${projectId}`,
        });
      }

      toast({ title: "Deliverable submitted!", description: "Your client has been notified." });
      setShowDeliverableModal(false);
      setDeliverableFile(null);
      setDeliverableUrl("");
      setDeliverableNote("");
      await fetchProject(user);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploadingDeliverable(false);
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0 || !user || !projectId) return;
    setSubmittingReview(true);
    try {
      await (supabase as any).from("talent_reviews").insert({
        project_id: projectId,
        reviewer_id: user.id,
        reviewee_id: project.client_profiles?.user_id,
        rating: reviewRating,
        review_text: reviewText || null,
        review_type: "talent_to_client",
      });
      await (supabase as any)
        .from("projects")
        .update({ talent_review_submitted: true })
        .eq("id", projectId);
      setShowReviewCard(false);
      setProject((p: any) => ({ ...p, talent_review_submitted: true }));
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      navigate("/projects");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSkipReview = async () => {
    if (!projectId) return;
    await (supabase as any)
      .from("projects")
      .update({ talent_review_submitted: true })
      .eq("id", projectId);
    navigate("/projects");
  };

  if (loading) return <ProjectDetailSkeleton />;

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 text-center py-20">
        <p className="text-[14px] text-muted-foreground">Project not found.</p>
        <button
          onClick={() => navigate("/projects")}
          className="mt-4 px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const jobTitle = project.job_posts?.title || project.title || "Untitled Project";
  const companyName = project.client_profiles?.company_name;
  const logoUrl = project.client_profiles?.logo_url;
  const companyInitial = (companyName || "C")[0].toUpperCase();

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === "completed").length;
  const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const effectiveStatus = isOverdue(project.deadline) && project.status === "active"
    ? "overdue"
    : project.status;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Back link */}
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Projects
      </button>

      {/* Completion banner */}
      {project.status === "completed" && project.payment_status === "released" && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-green-500/30 bg-green-500/8">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-[13px] text-green-700 dark:text-green-400 font-medium">
            Project complete — payment of {formatCurrency(project.total_amount, project.currency)} has been released.
          </p>
        </div>
      )}

      {/* Project header panel */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            {/* Client identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} className="w-full h-full object-cover" alt={companyName} />
                ) : (
                  <span className="text-[13px] font-bold text-muted-foreground">{companyInitial}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-[18px] font-bold text-foreground leading-snug truncate">
                  {jobTitle}
                </h1>
                {companyName && (
                  <p className="text-[13px] text-muted-foreground">{companyName}</p>
                )}
              </div>
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${statusDot(effectiveStatus)}`} />
              <span className="text-[12px] text-muted-foreground">{statusLabel(effectiveStatus)}</span>
            </div>
          </div>

          {/* Overall progress bar */}
          {totalMilestones > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Progress
                </p>
                <span className="text-[12px] text-muted-foreground font-mono">
                  {completedMilestones}/{totalMilestones} milestones · {progressPct}%
                </span>
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="px-5 py-3.5 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Total</p>
            <p className="text-[13px] font-semibold text-foreground">
              {formatCurrency(project.total_amount, project.currency)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Started</p>
            <p className="text-[13px] font-semibold text-foreground">
              {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Deadline</p>
            <p className={`text-[13px] font-semibold ${isOverdue(project.deadline) ? "text-destructive" : "text-foreground"}`}>
              {project.deadline ? new Date(project.deadline).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Payment</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${paymentStatusDot(project.payment_status || "pending")}`} />
              <span className="text-[13px] font-semibold text-foreground">
                {paymentStatusLabel(project.payment_status || "pending")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones panel */}
      {milestones.length > 0 && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">Milestones</p>
            <span className="text-[12px] text-muted-foreground">
              {completedMilestones} of {totalMilestones} done
            </span>
          </div>
          <div className="divide-y divide-border">
            {milestones.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
                {/* Status dot / icon */}
                <div className="shrink-0">
                  {m.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : m.status === "in_progress" ? (
                    <Clock className="w-4 h-4 text-primary" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{m.title}</p>
                  {m.due_date && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Due {new Date(m.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Amount */}
                {m.amount && (
                  <span className="text-[12px] text-muted-foreground font-mono shrink-0">
                    {formatCurrency(m.amount, project.currency)}
                  </span>
                )}

                {/* Status chip */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${milestoneStatusDot(m.status)}`} />
                  <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                    {m.status === "in_progress" ? "In Progress" : m.status === "completed" ? "Done" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliverables panel */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Deliverables</p>
          {project.status !== "completed" && (
            <button
              onClick={() => setShowDeliverableModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Submit
            </button>
          )}
        </div>

        {deliverables.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-muted-foreground">No deliverables submitted yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {deliverables.map(d => (
              <div key={d.id}>
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
                  {/* File icon */}
                  <div className="shrink-0">
                    {d.file_url ? (
                      <File className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Name + note + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {d.file_name || d.external_url || "Deliverable"}
                    </p>
                    {d.delivery_note && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{d.delivery_note}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Status + external link */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${deliverableStatusDot(d.status)}`} />
                      <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                        {deliverableStatusLabel(d.status)}
                      </span>
                    </div>
                    {(d.file_url || d.external_url) && (
                      <a
                        href={d.file_url || d.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                {/* Client feedback */}
                {d.status === "revision_requested" && d.client_feedback && (
                  <div className="mx-5 mb-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-[12px] text-amber-700 dark:text-amber-400">
                      <span className="font-semibold">Client feedback: </span>
                      {d.client_feedback}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages panel */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Messages</p>
          {conversationId && (
            <Link
              to={`/messages/${conversationId}`}
              className="text-[12px] text-primary hover:text-primary/80 transition-colors"
            >
              Open full conversation
            </Link>
          )}
        </div>
        <div className="px-5 py-5">
          <MiniMessageThread messages={messages} userId={user?.id ?? ""} />
        </div>
      </div>

      {/* Review panel */}
      {showReviewCard && !project.talent_review_submitted && (
        <div className="border border-amber-500/30 rounded-xl bg-amber-500/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-500/20">
            <p className="text-[13px] font-semibold text-foreground">
              Leave a review for {companyName}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Share your experience working with this client
            </p>
          </div>
          <div className="px-5 py-5 space-y-4">
            <StarRatingInput value={reviewRating} onChange={setReviewRating} />
            <Textarea
              placeholder="Describe your experience (optional)"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              rows={3}
              className="text-[13px]"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSubmitReview}
                disabled={reviewRating === 0 || submittingReview}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submittingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Review
              </button>
              <button
                onClick={handleSkipReview}
                className="px-5 py-2.5 rounded-lg text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Deliverable Modal */}
      <Dialog open={showDeliverableModal} onOpenChange={setShowDeliverableModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">Submit Deliverable</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setDeliverableType("file")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  deliverableType === "file"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                <File className="w-3 h-3" /> File Upload
              </button>
              <button
                onClick={() => setDeliverableType("url")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  deliverableType === "url"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                <LinkIcon className="w-3 h-3" /> External URL
              </button>
            </div>

            {deliverableType === "file" ? (
              <div>
                <Label className="text-[12px]">File</Label>
                <Input
                  type="file"
                  className="mt-1 text-[13px]"
                  onChange={e => setDeliverableFile(e.target.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <div>
                <Label className="text-[12px]">URL</Label>
                <Input
                  className="mt-1 text-[13px]"
                  placeholder="https://..."
                  value={deliverableUrl}
                  onChange={e => setDeliverableUrl(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label className="text-[12px]">Delivery Note (optional)</Label>
              <Textarea
                className="mt-1 text-[13px]"
                placeholder="Any notes for your client..."
                value={deliverableNote}
                onChange={e => setDeliverableNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => setShowDeliverableModal(false)}
              disabled={uploadingDeliverable}
              className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitDeliverable}
              disabled={
                uploadingDeliverable ||
                (deliverableType === "file" && !deliverableFile) ||
                (deliverableType === "url" && !deliverableUrl)
              }
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploadingDeliverable && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
