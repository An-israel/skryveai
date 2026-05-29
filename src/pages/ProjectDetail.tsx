import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    awaiting_review: { label: "Awaiting Review", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    completed: { label: "Complete", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  };
  const s = map[status] || { label: status, className: "" };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

function PaymentBadge({ status }: { status: string }) {
  if (status === "released") return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Released</Badge>;
  if (status === "in_escrow") return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Escrow</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
}

function MilestonesSection({ milestones }: { milestones: any[] }) {
  const total = milestones.length;
  const completedCount = milestones.filter(m => m.status === "completed").length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">{completedCount}/{total} complete</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
      <div className="space-y-2">
        {milestones.map(m => (
          <div key={m.id} className="flex items-center gap-3 py-2 border-b last:border-0">
            {m.status === "completed" ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            ) : m.status === "in_progress" ? (
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.title}</p>
              {m.due_date && (
                <p className="text-xs text-muted-foreground">
                  Due {new Date(m.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={
                m.status === "completed"
                  ? "bg-green-500/10 text-green-600 border-green-500/20 text-xs"
                  : m.status === "in_progress"
                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs"
                  : "text-muted-foreground text-xs"
              }
            >
              {m.status === "in_progress" ? "In Progress" : m.status === "completed" ? "Done" : "Pending"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliverablesSection({ deliverables }: { deliverables: any[] }) {
  if (deliverables.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No deliverables submitted yet.</p>;
  }

  return (
    <div className="space-y-3">
      {deliverables.map(d => (
        <div key={d.id} className="space-y-2">
          <div className="flex items-start gap-3 py-2 border-b last:border-0">
            {d.file_url ? (
              <File className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            ) : (
              <LinkIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{d.file_name || d.external_url || "Deliverable"}</p>
              {d.delivery_note && (
                <p className="text-xs text-muted-foreground truncate">{d.delivery_note}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={
                  d.status === "approved"
                    ? "bg-green-500/10 text-green-600 border-green-500/20 text-xs"
                    : d.status === "revision_requested"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                {d.status === "approved"
                  ? "Approved"
                  : d.status === "revision_requested"
                  ? "Revision Requested"
                  : "Pending Review"}
              </Badge>
              {(d.file_url || d.external_url) && (
                <a
                  href={d.file_url || d.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-primary hover:text-primary/80"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          {d.status === "revision_requested" && d.client_feedback && (
            <div className="ml-7 p-3 bg-amber-500/5 border border-amber-500/20 rounded-md text-xs text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Client feedback: </span>{d.client_feedback}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniMessageThread({ messages, userId }: { messages: any[]; userId: string }) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
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
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">
              {isOwn ? "Y" : "C"}
            </div>
            <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(msg.created_at || msg.sent_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
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

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl">
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
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const jobTitle = project.job_posts?.title || project.title || "Untitled Project";
  const companyName = project.client_profiles?.company_name;
  const logoUrl = project.client_profiles?.logo_url;

  return (
    <div className="space-y-6 max-w-5xl">
      {project.status === "completed" && project.payment_status === "released" && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400 font-medium">
            Project Complete! Payment of {formatCurrency(project.total_amount, project.currency)} has been released.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} className="w-full h-full object-cover" alt={companyName} />
                ) : (
                  <span className="text-lg font-bold">{(companyName || "C")[0]}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold">{jobTitle}</h1>
                {companyName && <p className="text-muted-foreground">{companyName}</p>}
              </div>
            </div>
            <StatusBadge status={project.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Rate</p>
              <p className="font-semibold">{formatCurrency(project.total_amount, project.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="font-semibold">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Deadline</p>
              <p className={`font-semibold ${isOverdue(project.deadline) ? "text-red-500" : ""}`}>
                {project.deadline ? new Date(project.deadline).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment</p>
              <PaymentBadge status={project.payment_status || "pending"} />
            </div>
          </div>
        </CardContent>
      </Card>

      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <MilestonesSection milestones={milestones} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Deliverables</CardTitle>
          {project.status !== "completed" && (
            <Button size="sm" onClick={() => setShowDeliverableModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Submit Deliverable
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <DeliverablesSection deliverables={deliverables} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Messages</CardTitle>
          {conversationId && (
            <Link
              to={`/messages/${conversationId}`}
              className="text-sm text-primary hover:underline"
            >
              Open Full Conversation
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <MiniMessageThread messages={messages} userId={user?.id ?? ""} />
        </CardContent>
      </Card>

      {showReviewCard && !project.talent_review_submitted && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">
              Leave a Review for {companyName}
            </CardTitle>
            <CardDescription>Share your experience working with this client</CardDescription>
          </CardHeader>
          <CardContent>
            <StarRatingInput value={reviewRating} onChange={setReviewRating} />
            <Textarea
              className="mt-4"
              placeholder="Describe your experience (optional)"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleSubmitReview}
                disabled={reviewRating === 0 || submittingReview}
              >
                {submittingReview && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Submit Review
              </Button>
              <Button variant="ghost" onClick={handleSkipReview}>Skip</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDeliverableModal} onOpenChange={setShowDeliverableModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Deliverable</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={deliverableType === "file" ? "default" : "outline"}
                onClick={() => setDeliverableType("file")}
              >
                <File className="w-3 h-3 mr-1.5" /> File Upload
              </Button>
              <Button
                size="sm"
                variant={deliverableType === "url" ? "default" : "outline"}
                onClick={() => setDeliverableType("url")}
              >
                <LinkIcon className="w-3 h-3 mr-1.5" /> External URL
              </Button>
            </div>

            {deliverableType === "file" ? (
              <div>
                <Label>File</Label>
                <Input
                  type="file"
                  className="mt-1"
                  onChange={e => setDeliverableFile(e.target.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <div>
                <Label>URL</Label>
                <Input
                  className="mt-1"
                  placeholder="https://..."
                  value={deliverableUrl}
                  onChange={e => setDeliverableUrl(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>Delivery Note (optional)</Label>
              <Textarea
                className="mt-1"
                placeholder="Any notes for your client..."
                value={deliverableNote}
                onChange={e => setDeliverableNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeliverableModal(false)}
              disabled={uploadingDeliverable}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDeliverable}
              disabled={
                uploadingDeliverable ||
                (deliverableType === "file" && !deliverableFile) ||
                (deliverableType === "url" && !deliverableUrl)
              }
            >
              {uploadingDeliverable && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
