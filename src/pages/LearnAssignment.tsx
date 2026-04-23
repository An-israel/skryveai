import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { SEOHead } from "@/components/SEOHead";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Link as LinkIcon,
  Loader2,
  Send,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  passing_criteria: string | null;
  submission_type: string;
  max_revisions: number | null;
  credits_cost: number | null;
  lesson_id: string;
}

interface Submission {
  id: string;
  status: string;
  score: number | null;
  ai_feedback: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  submission_data: string | null;
  submission_url: string | null;
  file_path: string | null;
  revision_count: number;
  submitted_at: string;
  reviewed_at: string | null;
  passed_at: string | null;
}

// Parse the markdown ai_feedback into rubric sections we can render as a structured panel.
function parseRubric(feedback: string | null): {
  verdict: string;
  criteriaMet: string[];
  criteriaMissed: string[];
  nextStep: string;
} {
  if (!feedback) return { verdict: "", criteriaMet: [], criteriaMissed: [], nextStep: "" };
  const grab = (label: string): string[] => {
    const re = new RegExp(`\\*\\*${label}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|$)`, "i");
    const m = feedback.match(re);
    if (!m) return [];
    return m[1]
      .split("\n")
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter(Boolean);
  };
  const verdictMatch = feedback.match(/\*\*Verdict:\*\*\s*([^\n]+)/i);
  const nextMatch = feedback.match(/\*\*Next step:\*\*\s*([^\n]+)/i);
  return {
    verdict: verdictMatch?.[1]?.trim() || "",
    criteriaMet: grab("Criteria met"),
    criteriaMissed: grab("Criteria missed"),
    nextStep: nextMatch?.[1]?.trim() || "",
  };
}

export default function LearnAssignment() {
  const { assignmentId, userLearningId } = useParams<{
    assignmentId: string;
    userLearningId: string;
  }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const [textValue, setTextValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<"text" | "url" | "file">("text");
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showRubric, setShowRubric] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !assignmentId) return;
    void loadAll();
  }, [user, assignmentId]);

  async function loadAll() {
    setLoadingData(true);
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase
        .from("learning_assignments")
        .select("*")
        .eq("id", assignmentId!)
        .maybeSingle(),
      supabase
        .from("learning_submissions")
        .select("*")
        .eq("assignment_id", assignmentId!)
        .eq("user_id", user!.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!a) {
      toast({ title: "Assignment not found", variant: "destructive" });
      navigate(`/tools/learn/${userLearningId}`);
      return;
    }
    setAssignment(a as Assignment);
    if (s) {
      setSubmission(s as Submission);
      setTextValue((s as Submission).submission_data || "");
      setUrlValue((s as Submission).submission_url || "");
      if ((s as Submission).submission_url) setTab("url");
      else if ((s as Submission).file_path) setTab("file");
    }

    // default tab from assignment.submission_type
    if (!s) {
      const t = (a.submission_type || "text").toLowerCase();
      if (t.includes("url")) setTab("url");
      else if (t.includes("file")) setTab("file");
      else setTab("text");
    }

    setLoadingData(false);
  }

  async function uploadFileIfAny(): Promise<string | null> {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/${assignmentId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("learning-submissions")
      .upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  }

  async function handleSubmit() {
    if (!assignment || !user) return;
    if (tab === "text" && !textValue.trim()) {
      toast({ title: "Add your written submission", variant: "destructive" });
      return;
    }
    if (tab === "url" && !urlValue.trim()) {
      toast({ title: "Add a URL", variant: "destructive" });
      return;
    }
    if (tab === "file" && !file && !submission?.file_path) {
      toast({ title: "Choose a file", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const filePath = tab === "file" && file ? await uploadFileIfAny() : submission?.file_path || null;

      // Append learner notes (intent / context for the reviewer) to whatever was submitted.
      const notesBlock = notesValue.trim()
        ? `\n\n---\n📝 Notes for the reviewer (from the learner):\n${notesValue.trim()}`
        : "";

      const payload = {
        user_id: user.id,
        assignment_id: assignment.id,
        user_learning_id: userLearningId || null,
        submission_data:
          tab === "text"
            ? `${textValue}${notesBlock}`
            : notesValue.trim()
            ? notesBlock.trim()
            : null,
        submission_url: tab === "url" ? urlValue : null,
        file_path: tab === "file" ? filePath : null,
        status: "pending",
        ai_feedback: null,
        score: null,
        strengths: [],
        improvements: [],
        reviewed_at: null,
        passed_at: null,
      };

      let row: Submission | null = null;
      if (submission && submission.status !== "approved") {
        const { data, error } = await supabase
          .from("learning_submissions")
          .update(payload)
          .eq("id", submission.id)
          .select("*")
          .single();
        if (error) throw error;
        row = data as Submission;
      } else {
        const { data, error } = await supabase
          .from("learning_submissions")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        row = data as Submission;
      }
      setSubmission(row);
      toast({ title: "Submitted!", description: "Sending to your AI coach for review." });

      // Trigger review
      await runReview(row!.id);
    } catch (e: any) {
      toast({
        title: "Submission failed",
        description: e.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function runReview(submissionId: string) {
    setReviewing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/learning-review-assignment`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ submissionId }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || "Review failed");
      }
      // Reload latest
      const { data: latest } = await supabase
        .from("learning_submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();
      if (latest) setSubmission(latest as Submission);
      toast({
        title: json.passed ? "✅ Approved!" : "Needs revision",
        description: `Score: ${json.score}/100`,
      });
    } catch (e: any) {
      toast({
        title: "Review failed",
        description: e.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setReviewing(false);
    }
  }

  if (loading || loadingData || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isApproved = submission?.status === "approved";
  const isPending = submission?.status === "pending";
  const needsRevision = submission?.status === "needs_revision";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${assignment.title} | SkryveAI Learn`}
        description="Submit your assignment for AI-powered review and feedback."
      />
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={`/tools/learn/${userLearningId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to lessons
          </Link>
        </Button>

        <div className="mb-6">
          <Badge variant="secondary" className="mb-2">
            <Sparkles className="h-3 w-3 mr-1" /> Assignment
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{assignment.title}</h1>
          <p className="text-muted-foreground">{assignment.description}</p>
        </div>

        {/* Brief */}
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Brief
          </h2>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{assignment.instructions}</ReactMarkdown>
          </div>
          {assignment.passing_criteria && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm">
              <strong>Passing criteria:</strong> {assignment.passing_criteria}
            </div>
          )}
        </Card>

        {/* Status */}
        {submission && (
          <Card className="p-5 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                {isApproved && <CheckCircle2 className="h-5 w-5 text-primary" />}
                {needsRevision && <XCircle className="h-5 w-5 text-destructive" />}
                {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
                <h3 className="font-semibold">
                  {isApproved
                    ? "Approved"
                    : needsRevision
                    ? "Needs revision"
                    : reviewing
                    ? "AI coach is reviewing…"
                    : "Pending review"}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {submission.score !== null && (
                  <Badge variant={isApproved ? "default" : "outline"}>
                    {submission.score}/100
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Revision {submission.revision_count}
                </Badge>
              </div>
            </div>

            {submission.score !== null && (
              <Progress value={submission.score} className="mb-4" />
            )}

            {submission.ai_feedback ? (
              <>
                {/* Structured rubric panel */}
                {(() => {
                  const r = parseRubric(submission.ai_feedback);
                  const hasAny =
                    r.verdict || r.criteriaMet.length || r.criteriaMissed.length || r.nextStep;
                  if (!hasAny) return null;
                  return (
                    <div className="mb-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <h4 className="text-sm font-semibold flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI grading rubric
                        </h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setShowRubric((s) => !s)}
                        >
                          {showRubric ? "Hide" : "Show"}
                        </Button>
                      </div>
                      {showRubric && (
                        <div className="space-y-3 text-sm">
                          {r.verdict && (
                            <p className="text-muted-foreground italic">{r.verdict}</p>
                          )}
                          {r.criteriaMet.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-primary mb-1">
                                ✓ Criteria met
                              </p>
                              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                                {r.criteriaMet.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {r.criteriaMissed.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-destructive mb-1">
                                ✗ Criteria missed
                              </p>
                              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                                {r.criteriaMissed.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {r.nextStep && (
                            <p className="text-xs">
                              <span className="font-medium">Next step:</span> {r.nextStep}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{submission.ai_feedback}</ReactMarkdown>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {reviewing
                  ? "Gemini 2.5 Pro is reviewing your work — this usually takes 10–30 seconds."
                  : "Click 'Run AI review' below to get feedback."}
              </p>
            )}

            {!reviewing && submission.status === "pending" && submission.ai_feedback === null && (
              <Button
                size="sm"
                className="mt-3"
                onClick={() => runReview(submission.id)}
              >
                <Sparkles className="h-4 w-4 mr-1" /> Run AI review (0.5 cr)
              </Button>
            )}
          </Card>
        )}

        {/* Submit / Resubmit */}
        {!isApproved && (
          <Card className="p-5">
            <h2 className="font-semibold mb-3">
              {submission ? "Resubmit your work" : "Submit your work"}
            </h2>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-1" /> Text
                </TabsTrigger>
                <TabsTrigger value="url">
                  <LinkIcon className="h-4 w-4 mr-1" /> URL
                </TabsTrigger>
                <TabsTrigger value="file">
                  <Upload className="h-4 w-4 mr-1" /> File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <Textarea
                  rows={10}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Paste your written submission here…"
                />
              </TabsContent>

              <TabsContent value="url" className="mt-4">
                <Input
                  type="url"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://github.com/yourname/project or https://figma.com/file/…"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  GitHub, Figma, Google Docs, Canva, YouTube — any public link works.
                </p>
              </TabsContent>

              <TabsContent value="file" className="mt-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept="image/*,application/pdf,.doc,.docx,.zip,.psd,.fig,.mp4"
                />
                {file && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {file.name} · {(file.size / 1024).toFixed(0)} KB
                  </p>
                )}
                {!file && submission?.file_path && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Current file: {submission.file_path.split("/").pop()}
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Reviewed by Gemini 2.5 Pro · costs 0.5 credits
              </p>
              <Button onClick={handleSubmit} disabled={submitting || reviewing}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" /> Submit for review
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {isApproved && (
          <Card className="p-5 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Great work — you passed this assignment!</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Head back to your lessons to keep building momentum.
            </p>
            <Button asChild>
              <Link to={`/tools/learn/${userLearningId}`}>Continue learning</Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
