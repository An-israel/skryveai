import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, XCircle, Clock, FileText, ArrowRight, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface SubmissionRow {
  id: string;
  status: string;
  score: number | null;
  ai_feedback: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  revision_count: number;
  submitted_at: string;
  reviewed_at: string | null;
  assignment_id: string;
  user_learning_id: string | null;
  learning_assignments: { title: string; lesson_id: string } | null;
}

export function LearningSubmissionsCard() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("learning_submissions")
      .select(
        "id, status, score, ai_feedback, strengths, improvements, revision_count, submitted_at, reviewed_at, assignment_id, user_learning_id, learning_assignments(title, lesson_id)"
      )
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(10);
    setRows((data || []) as unknown as SubmissionRow[]);
    setLoading(false);
  }

  // Group by assignment to show progression across revisions
  const grouped = rows.reduce<Record<string, SubmissionRow[]>>((acc, r) => {
    (acc[r.assignment_id] ||= []).push(r);
    return acc;
  }, {});

  const totalSubmissions = rows.length;
  const passed = rows.filter((r) => r.status === "approved").length;
  const avgScore = rows.length
    ? Math.round(
        rows.filter((r) => r.score != null).reduce((s, r) => s + (r.score || 0), 0) /
          Math.max(1, rows.filter((r) => r.score != null).length)
      )
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Assignment History
            </CardTitle>
            <CardDescription>
              Track your AI-reviewed submissions and improvements over time
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/tools/learn">
              Continue learning <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : totalSubmissions === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              No submissions yet. Complete a lesson with an assignment to start building your portfolio.
            </p>
            <Button asChild size="sm">
              <Link to="/tools/learn">Browse skills</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">{totalSubmissions}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Passed</p>
                <p className="text-xl font-semibold text-primary">{passed}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Avg score
                </p>
                <p className="text-xl font-semibold">{avgScore}/100</p>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {Object.entries(grouped).map(([assignmentId, attempts]) => {
                const latest = attempts[0];
                const title = latest.learning_assignments?.title || "Assignment";
                return (
                  <AccordionItem key={assignmentId} value={assignmentId}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between gap-3 w-full pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {latest.status === "approved" && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                          {latest.status === "needs_revision" && (
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          {latest.status === "pending" && (
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">{title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {latest.score != null && (
                            <Badge variant={latest.status === "approved" ? "default" : "outline"}>
                              {latest.score}/100
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {attempts.map((a, idx) => (
                          <div key={a.id} className="rounded-md border p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <span className="text-xs text-muted-foreground">
                                Attempt #{attempts.length - idx} ·{" "}
                                {new Date(a.submitted_at).toLocaleDateString()}
                              </span>
                              <Badge
                                variant={
                                  a.status === "approved"
                                    ? "default"
                                    : a.status === "needs_revision"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {a.status.replace("_", " ")}
                              </Badge>
                            </div>
                            {a.score != null && (
                              <Progress value={a.score} className="h-1.5 mb-3" />
                            )}
                            {a.ai_feedback && (
                              <div className="prose prose-xs max-w-none dark:prose-invert text-xs">
                                <ReactMarkdown>{a.ai_feedback}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        ))}
                        {latest.status !== "approved" && latest.user_learning_id && (
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <Link
                              to={`/tools/learn/${latest.user_learning_id}/assignment/${assignmentId}`}
                            >
                              {latest.status === "needs_revision"
                                ? "Revise & resubmit"
                                : "Open assignment"}{" "}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
}
