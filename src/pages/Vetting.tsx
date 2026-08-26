import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ShieldCheck, ArrowLeft, Loader2, BadgeCheck, Clock, XCircle,
  ArrowRight, FileText, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VettedBadge } from "@/components/vetting/VettedBadge";
import {
  fetchMyVetting, fetchBriefsFor, fetchAvailableSkills, startVetting, submitSkillWork, submitProfessionalism,
  PROFESSIONALISM_QUESTIONS,
  type VettingApplication, type TestBrief,
} from "@/lib/vetting/api";
import { supabase } from "@/integrations/supabase/client";

function statusChip(app: VettingApplication) {
  switch (app.status) {
    case "approved":
      return <VettedBadge skill={app.skill_category} size="sm" />;
    case "rejected":
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-400/15 dark:text-red-300"><XCircle className="h-3 w-3" />Not passed</span>;
    default:
      return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-300"><Clock className="h-3 w-3" />In progress</span>;
  }
}

export default function Vetting() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<VettingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<VettingApplication | null>(null);
  const [briefs, setBriefs] = useState<TestBrief[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // skill-stage form
  const [portfolio, setPortfolio] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  // professionalism form
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [videoUrl, setVideoUrl] = useState("");

  const reload = async () => {
    const list = await fetchMyVetting();
    setApps(list);
    return list;
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/login"); return; }
      await Promise.all([reload(), fetchAvailableSkills().then(setAvailableSkills)]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openApp = async (app: VettingApplication) => {
    setActive(app);
    setPortfolio(""); setSubmissionUrl(""); setAnswers({}); setVideoUrl("");
    if (app.status === "skill_pending") setBriefs(await fetchBriefsFor(app.skill_category));
  };

  const begin = async (skill: string) => {
    setBusy(true);
    const res = await startVetting(skill);
    setBusy(false);
    if (!res.ok) {
      const detail = "error" in res ? res.error : undefined;
      // A missing function/table means the DB migrations aren't applied yet.
      const isSetup = detail && /(does not exist|schema cache|not find|relation)/i.test(detail);
      toast.error(isSetup ? "Vetting isn't set up on the server yet." : "Couldn't start. Try again.", {
        description: detail,
      });
      return;
    }
    const list = await reload();
    const app = list.find((a) => a.skill_category === skill);
    if (app) await openApp(app);
  };

  const doSubmitSkill = async () => {
    if (!active) return;
    if (!submissionUrl.trim()) { toast.error("Add a link to your submission."); return; }
    setBusy(true);
    const res = await submitSkillWork({
      applicationId: active.id,
      portfolioUrl: portfolio.trim() || undefined,
      testBriefId: briefs[0]?.id,
      submissionUrl: submissionUrl.trim(),
    });
    setBusy(false);
    if (!res.ok) { toast.error("Couldn't submit. Try again."); return; }
    toast.success("Submitted for review");
    const list = await reload();
    setActive(list.find((a) => a.id === active.id) ?? null);
  };

  const doSubmitProf = async () => {
    if (!active) return;
    const answered = PROFESSIONALISM_QUESTIONS.every((q) => (answers[q.key] ?? "").trim().length > 0);
    if (!answered) { toast.error("Please answer all questions."); return; }
    setBusy(true);
    const res = await submitProfessionalism(active.id, answers, videoUrl.trim() || undefined);
    setBusy(false);
    if (!res.ok) { toast.error("Couldn't submit. Try again."); return; }
    toast.success("Submitted for review");
    const list = await reload();
    setActive(list.find((a) => a.id === active.id) ?? null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const startedSkills = new Set(apps.map((a) => a.skill_category));
  const startable = availableSkills.filter((s) => !startedSkills.has(s));

  return (
    <main className="container mx-auto max-w-2xl px-0 pb-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="pt-6">
        <div className="mb-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-6 w-6 text-primary" />Get Vetted</h1>
            <p className="text-sm text-muted-foreground">
              Pass once — a skill test and a professionalism check — and earn a badge international clients trust.{" "}
              <button onClick={() => navigate("/vetting/how-it-works")} className="underline underline-offset-2">How it works</button>
            </p>
          </div>
        </div>

        {/* Active application detail */}
        {active ? (
          <div className="mt-4">
            <button onClick={() => setActive(null)} className="mb-3 text-sm text-muted-foreground hover:text-foreground">← All applications</button>
            <StageView
              app={active}
              briefs={briefs}
              busy={busy}
              portfolio={portfolio} setPortfolio={setPortfolio}
              submissionUrl={submissionUrl} setSubmissionUrl={setSubmissionUrl}
              answers={answers} setAnswers={setAnswers}
              videoUrl={videoUrl} setVideoUrl={setVideoUrl}
              onSubmitSkill={doSubmitSkill}
              onSubmitProf={doSubmitProf}
            />
          </div>
        ) : (
          <>
            {/* My applications */}
            {apps.length > 0 && (
              <div className="mb-6 mt-4 space-y-2">
                {apps.map((app) => (
                  <Card key={app.id} className="cursor-pointer transition-colors hover:border-primary/40" onClick={() => openApp(app)}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium">{app.skill_category}</p>
                        <p className="text-xs text-muted-foreground">{stageLabel(app)}</p>
                      </div>
                      <div className="flex items-center gap-2">{statusChip(app)}<ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Start a new one */}
            {startable.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-2"><CardTitle className="text-base">Get vetted in a skill</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {startable.map((s) => (
                      <Button key={s} variant="outline" size="sm" disabled={busy} onClick={() => begin(s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>
    </main>
  );
}

function stageLabel(app: VettingApplication): string {
  switch (app.status) {
    case "approved": return "Vetted — badge earned";
    case "rejected": return app.retry_after ? `Not passed — you can retry after ${new Date(app.retry_after).toLocaleDateString()}` : "Not passed";
    case "prof_pending":
      return app.professionalism_status === "submitted" ? "Professionalism check — under review" : "Skill passed — professionalism check next";
    case "skill_pending":
    default:
      return app.skill_test_status === "submitted" ? "Skill test — under review" : "Skill test — submit your work";
  }
}

interface StageProps {
  app: VettingApplication;
  briefs: TestBrief[];
  busy: boolean;
  portfolio: string; setPortfolio: (v: string) => void;
  submissionUrl: string; setSubmissionUrl: (v: string) => void;
  answers: Record<string, string>; setAnswers: (v: Record<string, string>) => void;
  videoUrl: string; setVideoUrl: (v: string) => void;
  onSubmitSkill: () => void;
  onSubmitProf: () => void;
}

function StageView(p: StageProps) {
  const { app } = p;

  if (app.status === "approved") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-400/15">
            <BadgeCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold">You're vetted in {app.skill_category}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Clients now see your Vetted badge. Keep it by delivering great work.</p>
          <div className="mt-4 flex justify-center"><VettedBadge skill={app.skill_category} /></div>
        </CardContent>
      </Card>
    );
  }

  if (app.status === "rejected") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Not passed this time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {app.retry_after ? `You can try again after ${new Date(app.retry_after).toLocaleDateString()}.` : "You can try again soon."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Skill stage
  if (app.status === "skill_pending") {
    if (app.skill_test_status === "submitted") return <UnderReview label="Your skill submission is under review." />;
    const brief = p.briefs[0];
    const deadline = brief ? new Date(new Date(app.updated_at).getTime() + brief.submit_within_days * 86400000) : null;
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Skill test — {app.skill_category}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {brief ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium"><FileText className="h-4 w-4" />{brief.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{brief.brief}</p>

              {brief.submit_format && (
                <p className="mt-3 text-xs"><strong>How to submit:</strong> <span className="text-muted-foreground">{brief.submit_format}</span></p>
              )}
              {brief.resources && (
                <p className="mt-1 text-xs"><strong>Resources:</strong> <span className="text-muted-foreground">{brief.resources}</span></p>
              )}
              {brief.hands_on_time && (
                <p className="mt-1 text-xs"><strong>Expect this to take:</strong> <span className="text-muted-foreground">{brief.hands_on_time}</span></p>
              )}
              {deadline && (
                <p className="mt-1 text-xs">
                  <strong>Suggested deadline:</strong>{" "}
                  <span className="text-muted-foreground">{deadline.toLocaleDateString()} — not enforced, just a pace guide.</span>
                </p>
              )}
              {brief.reviewer_checklist?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium">What reviewers look for:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                    {brief.reviewer_checklist.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              {brief.reference_template_url ? (
                <a href={brief.reference_template_url} target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <FileText className="h-4 w-4" /> Open the reference template <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">A brief for this skill will appear here.</p>
          )}
          <div>
            <Label htmlFor="pf">Portfolio link <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="pf" value={p.portfolio} onChange={(e) => p.setPortfolio(e.target.value)} placeholder="behance.net/you" />
          </div>
          <div>
            <Label htmlFor="sub">Link to your submission</Label>
            <Input id="sub" value={p.submissionUrl} onChange={(e) => p.setSubmissionUrl(e.target.value)} placeholder="Figma / Drive / StackBlitz / Loom link" />
          </div>
          <Button onClick={p.onSubmitSkill} disabled={p.busy}>
            {p.busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit for review"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Professionalism stage
  if (app.status === "prof_pending") {
    if (app.professionalism_status === "submitted") return <UnderReview label="Your professionalism check is under review." />;
    return (
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base">Professionalism check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Skill passed. This last step is what makes your badge mean something to clients — answer honestly and clearly.
          </p>
          {PROFESSIONALISM_QUESTIONS.map((q) => (
            <div key={q.key}>
              <Label htmlFor={q.key} className="text-sm">{q.q}</Label>
              <Textarea
                id={q.key} rows={2}
                value={p.answers[q.key] ?? ""}
                onChange={(e) => p.setAnswers({ ...p.answers, [q.key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <Label htmlFor="vid">Short intro video link <span className="text-muted-foreground">(optional — Loom/YouTube)</span></Label>
            <Input id="vid" value={p.videoUrl} onChange={(e) => p.setVideoUrl(e.target.value)} placeholder="loom.com/share/…" />
          </div>
          <Button onClick={p.onSubmitProf} disabled={p.busy}>
            {p.busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit for review"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <UnderReview label="Under review." />;
}

function UnderReview({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Under review</h2>
        <p className="mt-1 text-sm text-muted-foreground">{label} We'll email you when there's an update.</p>
      </CardContent>
    </Card>
  );
}
