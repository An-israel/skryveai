import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { notifyUser } from "@/lib/notify";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import {
  Loader2, Sparkles, Copy, Check, FileText, Download, Wand2,
  ExternalLink, ArrowRight, ArrowLeft, CheckCircle2, Info, Bot, Send as SendIcon,
} from "lucide-react";
import {
  tailorCvToJob, extractFnErrorMessage, type StoredCv,
} from "@/lib/tailor-cv";

type Mode = "external" | "marketplace";

interface ApplyWizardProps {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  job: {
    id: string;
    title: string;
    description: string;
    requiredSkills?: string[];
    platform?: string;
    externalUrl?: string;
    clientUserId?: string;
    companyName?: string;
  };
  onApplied?: () => void;
}

const STEPS = ["Proposal", "Tailor CV", "Apply"];
const STEP_KEYS = ["proposal", "cv", "apply"] as const;

function GuideNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-3">
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
      <span>{children}</span>
    </div>
  );
}

export function ApplyWizard({ open, onClose, mode, job, onApplied }: ApplyWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [talent, setTalent] = useState<any>(null);

  // Step 1 — proposal
  const [proposal, setProposal] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Step 2 — CV
  const [cvs, setCvs] = useState<StoredCv[]>([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [tailoredCvId, setTailoredCvId] = useState<string | null>(null);

  // Step 3 — marketplace terms
  const [rateType, setRateType] = useState<"fixed" | "hourly">("fixed");
  const [proposedRate, setProposedRate] = useState("");
  const [timeline, setTimeline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Copilot
  const [copilotTips, setCopilotTips] = useState<Record<number, string>>({});
  const [tipsLoading, setTipsLoading] = useState(false);
  const [copilotQ, setCopilotQ] = useState("");
  const [copilotA, setCopilotA] = useState("");
  const [copilotAsking, setCopilotAsking] = useState(false);

  const fetchTips = useCallback(async (forStep: number) => {
    setTipsLoading(true);
    try {
      const { data } = await supabase.functions.invoke("application-copilot", {
        body: {
          jobTitle: job.title,
          jobDescription: job.description,
          requiredSkills: job.requiredSkills || [],
          step: STEP_KEYS[forStep],
        },
      });
      if (data?.reply) setCopilotTips((p) => ({ ...p, [forStep]: data.reply }));
    } catch { /* tips are optional — never block the flow */ }
    setTipsLoading(false);
  }, [job]);

  useEffect(() => {
    if (!open) return;
    setCopilotA("");
    setCopilotQ("");
    if (!copilotTips[step]) fetchTips(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const askCopilot = async () => {
    const q = copilotQ.trim();
    if (!q || copilotAsking) return;
    setCopilotAsking(true);
    setCopilotA("");
    try {
      const { data, error } = await supabase.functions.invoke("application-copilot", {
        body: {
          jobTitle: job.title,
          jobDescription: job.description,
          requiredSkills: job.requiredSkills || [],
          step: STEP_KEYS[step],
          question: q,
          proposal: step === 0 ? proposal : undefined,
        },
      });
      if (error) throw error;
      setCopilotA(data?.reply || "I couldn't answer that — try rephrasing.");
      setCopilotQ("");
    } catch (e: any) {
      const msg = await extractFnErrorMessage(e);
      setCopilotA(msg);
    } finally {
      setCopilotAsking(false);
    }
  };

  const generateProposal = useCallback(async (profile: any) => {
    setGenLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: {
          action: "generate",
          jobTitle: job.title,
          jobDescription: job.description,
          requiredSkills: job.requiredSkills || [],
          talentName: profile?.full_name,
          talentBio: profile?.bio || "",
          talentSkills: [profile?.primary_skill, ...(profile?.secondary_skills || [])].filter(Boolean),
          experienceLevel: profile?.experience_level || "",
        },
      });
      if (error) throw error;
      setProposal(data?.proposal || "");
    } catch (e: any) {
      const msg = await extractFnErrorMessage(e);
      toast({ title: "Couldn't generate proposal", description: msg, variant: "destructive" });
    } finally {
      setGenLoading(false);
    }
  }, [job, toast]);

  // Load everything on open
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setProposal("");
    setTailoredCvId(null);
    setSelectedCvId("");
    setCopilotTips({});

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      const { data: profile } = await (supabase as any)
        .from("talent_profiles")
        .select("id, full_name, bio, primary_skill, secondary_skills, experience_level, hourly_rate")
        .eq("user_id", user.id)
        .maybeSingle();
      setTalent(profile || null);
      if (profile?.hourly_rate) setProposedRate(String(profile.hourly_rate));

      if (profile?.id) {
        const { data: cvRows } = await (supabase as any)
          .from("skryve_cvs")
          .select("id, title, template_name, personal_info, summary, experiences, education, skills, certifications, projects, updated_at")
          .eq("talent_id", profile.id)
          .order("updated_at", { ascending: false });
        const rows = (cvRows as StoredCv[]) || [];
        setCvs(rows);
        if (rows.length) setSelectedCvId(rows[0].id);
      }

      generateProposal(profile);
    })();
  }, [open, navigate, generateProposal]);

  const copyProposal = async () => {
    await navigator.clipboard.writeText(proposal);
    setCopied(true);
    toast({ title: "Proposal copied" });
    setTimeout(() => setCopied(false), 1800);
  };

  const handleTailor = async () => {
    const source = cvs.find((c) => c.id === selectedCvId);
    if (!source || !talent?.id) return;
    setTailoring(true);
    try {
      const cvId = await tailorCvToJob({
        talentId: talent.id,
        source,
        jobTitle: job.title,
        jobDescription: job.description,
        requiredSkills: job.requiredSkills,
      });
      setTailoredCvId(cvId);
      toast({ title: "CV tailored ✨", description: "Download it below, then attach it to your application." });
    } catch (e: any) {
      const msg = await extractFnErrorMessage(e);
      toast({ title: "Tailoring failed", description: msg, variant: "destructive" });
    } finally {
      setTailoring(false);
    }
  };

  const downloadCv = () => {
    const id = tailoredCvId || selectedCvId;
    if (id) window.open(`/cv-builder/${id}?download=1`, "_blank");
  };

  const trackExternal = async () => {
    if (!userId) return;
    await (supabase as any).from("job_applications").upsert(
      {
        user_id: userId,
        role_title: job.title,
        company_name: job.platform || "External",
        status: "applied",
        proposal_text: proposal,
        job_title: job.title,
        platform: job.platform || null,
        external_url: job.externalUrl || null,
        applied_at: new Date().toISOString(),
      },
      { onConflict: "user_id,role_title" }
    );
  };

  const finishExternal = async () => {
    if (job.externalUrl) window.open(job.externalUrl, "_blank");
    try { await trackExternal(); } catch { /* ignore */ }
    toast({ title: "Application tracked", description: "Find it under Applications." });
    onApplied?.();
    onClose();
  };

  const submitMarketplace = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("job_applications").insert({
        user_id: userId,
        marketplace_job_id: job.id,
        proposal_text: proposal,
        rate_proposed: proposedRate ? parseFloat(proposedRate) : null,
        rate_type: rateType,
        timeline: timeline || null,
        status: "applied",
        role_title: job.title,
        company_name: job.companyName || "",
      });
      if (error) throw error;
      if (job.clientUserId) {
        notifyUser({
          userId: job.clientUserId,
          type: "application",
          title: "New application received",
          message: `A talent applied to your job "${job.title}".`,
          link: "/marketplace/my-jobs",
          emailCategory: "apps",
        });
      }
      toast({ title: "Application submitted!", description: "Track it under Applications." });
      onApplied?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Couldn't submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = proposal.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Apply for: {job.title}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  i === step ? "text-primary" : i < step ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    i < step ? "bg-primary text-primary-foreground"
                    : i === step ? "bg-primary/15 text-primary border border-primary"
                    : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {label}
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-1">
          {/* STEP 1 — PROPOSAL */}
          {step === 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Your proposal</Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => generateProposal(talent)} disabled={genLoading}>
                    {genLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    Regenerate
                  </Button>
                  <Button size="sm" variant="outline" onClick={copyProposal} disabled={!proposal}>
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    Copy
                  </Button>
                </div>
              </div>
              {genLoading && !proposal ? (
                <div className="h-44 flex items-center justify-center bg-muted rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <Textarea value={proposal} onChange={(e) => setProposal(e.target.value)} rows={9} className="text-sm" placeholder="Your AI-written proposal will appear here…" />
              )}
              <p className="text-xs text-muted-foreground">{wordCount} words (ideal 150–250)</p>
              <GuideNote>
                We drafted a proposal from your profile and this job. Edit it to sound like you, then
                <strong> Copy</strong> it — you'll paste it when you apply. Next, we'll tailor your CV to match.
              </GuideNote>
            </div>
          )}

          {/* STEP 2 — TAILOR CV */}
          {step === 1 && (
            <div className="space-y-3">
              {cvs.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">You don't have a CV yet.</p>
                  <Button onClick={() => navigate("/cv-builder/new")}>Create a CV</Button>
                  <p className="text-xs text-muted-foreground">You can skip this step and apply without a tailored CV.</p>
                </div>
              ) : (
                <>
                  <Label className="text-sm font-semibold">Tailor a CV to this job</Label>
                  <Select value={selectedCvId} onValueChange={(v) => { setSelectedCvId(v); setTailoredCvId(null); }}>
                    <SelectTrigger><SelectValue placeholder="Choose a CV" /></SelectTrigger>
                    <SelectContent>
                      {cvs.map((cv) => (
                        <SelectItem key={cv.id} value={cv.id}>{cv.title || "Untitled CV"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!tailoredCvId ? (
                    <Button className="w-full" onClick={handleTailor} disabled={tailoring || !selectedCvId}>
                      {tailoring ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Tailoring…</> : <><Wand2 className="w-4 h-4 mr-2" />Tailor my CV to this job</>}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="w-4 h-4" /> Tailored CV ready
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={downloadCv}>
                          <Download className="w-4 h-4 mr-1.5" /> Download CV
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => window.open(`/cv-builder/${tailoredCvId}`, "_blank")}>
                          <FileText className="w-4 h-4 mr-1.5" /> Open in editor
                        </Button>
                      </div>
                    </div>
                  )}
                  <GuideNote>
                    Tailoring rewrites a <strong>copy</strong> of your CV to match this job's keywords (your original stays
                    untouched). <strong>Download</strong> it, then attach it when you apply.
                  </GuideNote>
                </>
              )}
            </div>
          )}

          {/* STEP 3 — APPLY */}
          {step === 2 && (
            <div className="space-y-3">
              {mode === "external" ? (
                <>
                  <Label className="text-sm font-semibold">Submit your application</Label>
                  <p className="text-sm text-muted-foreground">
                    This job lives on <strong>{job.platform || "an external site"}</strong>. Click below to open the
                    original posting, then paste your proposal and attach your downloaded CV there.
                  </p>
                  <Button className="w-full" onClick={finishExternal}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open posting & apply on {job.platform || "site"}
                  </Button>
                  <GuideNote>
                    We'll add this to your <strong>Applications</strong> tracker so you can follow up. Your proposal is
                    copied and your tailored CV is downloaded — just paste &amp; attach them on the site.
                  </GuideNote>
                </>
              ) : (
                <>
                  <Label className="text-sm font-semibold">Your terms</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant={rateType === "fixed" ? "default" : "outline"} onClick={() => setRateType("fixed")}>Fixed Price</Button>
                    <Button size="sm" variant={rateType === "hourly" ? "default" : "outline"} onClick={() => setRateType("hourly")}>Hourly Rate</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Proposed Rate (₦)</Label>
                      <Input type="number" value={proposedRate} onChange={(e) => setProposedRate(e.target.value)} placeholder="e.g. 50000" />
                    </div>
                    <div>
                      <Label className="text-xs">Timeline</Label>
                      <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 2 weeks" />
                    </div>
                  </div>
                  <Button className="w-full" onClick={submitMarketplace} disabled={submitting || !proposal}>
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Submit application</>}
                  </Button>
                  <GuideNote>
                    This client posts on Skryve, so your application is submitted right here — no external site. They'll be
                    notified and you can track the status under <strong>Applications</strong>.
                  </GuideNote>
                </>
              )}
            </div>
          )}

          {/* ── Copilot ── */}
          <div className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.04] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/15">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">Copilot</span>
              <span className="text-[10px] text-muted-foreground">— tips for this exact job</span>
            </div>
            <div className="px-3 py-2.5 text-sm">
              {tipsLoading && !copilotTips[step] ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Studying this job…
                </div>
              ) : copilotTips[step] ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-ul:my-0 prose-li:my-0.5 text-[13px]">
                  <ReactMarkdown>{copilotTips[step]}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Ask me anything about applying to this job.</p>
              )}

              {copilotA && (
                <div className="mt-2 rounded-lg bg-background border px-3 py-2 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 text-[13px]">
                  <ReactMarkdown>{copilotA}</ReactMarkdown>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Ask the copilot… e.g. 'What should I highlight?'"
                  value={copilotQ}
                  onChange={(e) => setCopilotQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askCopilot(); }
                  }}
                  className="h-8 text-xs"
                  disabled={copilotAsking}
                />
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={askCopilot} disabled={copilotAsking || !copilotQ.trim()}>
                  {copilotAsking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendIcon className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t pt-3">
          <Button variant="ghost" size="sm" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
            {step === 0 ? "Cancel" : <><ArrowLeft className="w-4 h-4 mr-1" /> Back</>}
          </Button>
          {step < 2 && (
            <Button size="sm" onClick={() => setStep(step + 1)}>
              {step === 1 && !tailoredCvId ? "Skip & continue" : "Next"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
