import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ExternalLink, Check, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  fetchReviewQueue, fetchLatestSkillSubmission, fetchLatestProfCheck, fetchBriefById,
  reviewSkill, reviewProfessionalism, fetchAllBriefs, upsertBrief, blankBrief, PROFESSIONALISM_QUESTIONS,
  type ReviewQueueItem, type AdminBrief, type TestBrief,
} from "@/lib/vetting/api";

export default function VettingReview() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const reload = async () => {
    const q = await fetchReviewQueue();
    setQueue(q);
  };

  useEffect(() => {
    (async () => {
      const q = await fetchReviewQueue().catch(() => null);
      if (q === null) setDenied(true);
      else setQueue(q);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (denied) {
    return (
      <div className="container mx-auto max-w-lg py-24 text-center">
        <p className="text-muted-foreground">You don't have access to this page.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin")}>Back to Admin</Button>
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-0 pb-16">
      <div className="mb-6 flex items-center gap-3 pt-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-6 w-6 text-primary" />Vetting review</h1>
          <p className="text-sm text-muted-foreground">{queue.length} awaiting review</p>
        </div>
      </div>

      {queue.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nothing in the queue. 🎉</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">
                  {item.skill_category}
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.pending_stage === "skill" ? "Skill test" : "Professionalism"}
                  </span>
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                  {openId === item.id ? "Close" : "Review"}
                </Button>
              </CardHeader>
              {openId === item.id && (
                <CardContent>
                  {item.pending_stage === "skill"
                    ? <SkillReview item={item} onDone={async () => { setOpenId(null); await reload(); }} />
                    : <ProfReview item={item} onDone={async () => { setOpenId(null); await reload(); }} />}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <BriefsEditor />
    </main>
  );
}

function SkillReview({ item, onDone }: { item: ReviewQueueItem; onDone: () => void }) {
  const [sub, setSub] = useState<Awaited<ReturnType<typeof fetchLatestSkillSubmission>>>(null);
  const [brief, setBrief] = useState<TestBrief | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchLatestSkillSubmission(item.id).then((s) => {
      setSub(s);
      setChecked((s?.checklist_results as Record<string, boolean>) ?? {});
      if (s?.test_brief_id) fetchBriefById(s.test_brief_id).then(setBrief);
    });
  }, [item.id]);

  const decide = async (pass: boolean) => {
    if (!sub) return;
    setBusy(true);
    const res = await reviewSkill(sub.id, pass ? 80 : 40, pass, notes.trim() || undefined, checked);
    setBusy(false);
    if (!res.ok) { toast.error("Couldn't save."); return; }
    toast.success(pass ? "Passed — advanced to professionalism" : "Rejected");
    onDone();
  };

  if (!sub) return <Loader2 className="h-4 w-4 animate-spin" />;
  return (
    <div className="space-y-3">
      {brief && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{brief.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{brief.brief}</p>
        </div>
      )}
      <div className="space-y-1 text-sm">
        {sub.portfolio_url && <a href={sub.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary underline">Portfolio <ExternalLink className="h-3 w-3" /></a>}
        {sub.submission_url && <a href={sub.submission_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary underline">Submission <ExternalLink className="h-3 w-3" /></a>}
      </div>
      {brief && brief.reviewer_checklist?.length > 0 && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">Confirm each item before deciding:</p>
          {brief.reviewer_checklist.map((c) => (
            <label key={c} className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={!!checked[c]}
                onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [c]: v === true }))}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      )}
      <Textarea rows={2} placeholder="Reviewer notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => decide(true)}><Check className="mr-1 h-4 w-4" />Pass</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(false)}><X className="mr-1 h-4 w-4" />Reject</Button>
      </div>
    </div>
  );
}

function ProfReview({ item, onDone }: { item: ReviewQueueItem; onDone: () => void }) {
  const [chk, setChk] = useState<Awaited<ReturnType<typeof fetchLatestProfCheck>>>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchLatestProfCheck(item.id).then(setChk); }, [item.id]);

  const decide = async (pass: boolean) => {
    if (!chk) return;
    setBusy(true);
    const s = pass ? 5 : 2;
    const res = await reviewProfessionalism(chk.id, s, s, s, pass, notes.trim() || undefined);
    setBusy(false);
    if (!res.ok) { toast.error("Couldn't save."); return; }
    toast.success(pass ? "Approved — badge issued" : "Rejected");
    onDone();
  };

  if (!chk) return <Loader2 className="h-4 w-4 animate-spin" />;
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {PROFESSIONALISM_QUESTIONS.map((q) => (
          <div key={q.key} className="text-sm">
            <p className="font-medium text-muted-foreground">{q.q}</p>
            <p className="mt-0.5 whitespace-pre-wrap">{chk.answers?.[q.key] || <span className="italic text-muted-foreground">— no answer —</span>}</p>
          </div>
        ))}
        {chk.video_url && <a href={chk.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary underline">Intro video <ExternalLink className="h-3 w-3" /></a>}
      </div>
      <Textarea rows={2} placeholder="Reviewer notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => decide(true)}><Check className="mr-1 h-4 w-4" />Approve &amp; issue badge</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(false)}><X className="mr-1 h-4 w-4" />Reject</Button>
      </div>
    </div>
  );
}

// Admin editor for the skill-test briefs — attach the reference template link
// candidates recreate, and tune the brief/pass criteria per skill.
function BriefsEditor() {
  const [briefs, setBriefs] = useState<AdminBrief[]>([]);
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<AdminBrief[]>([]);

  useEffect(() => { if (open && briefs.length === 0) fetchAllBriefs().then(setBriefs); }, [open, briefs.length]);

  const patch = (id: string, p: Partial<AdminBrief>) =>
    setBriefs((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const patchDraft = (i: number, p: Partial<AdminBrief>) =>
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...p } : d)));

  const checklistToText = (c: string[]) => (c ?? []).join("\n");
  const textToChecklist = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);

  const save = async (b: AdminBrief, draftIndex?: number) => {
    setSavingId(b.id || `draft-${draftIndex}`);
    const res = await upsertBrief({
      id: b.id || null, skill_category: b.skill_category, title: b.title, brief: b.brief,
      reference_template_url: b.reference_template_url, pass_criteria: b.pass_criteria, is_active: b.is_active,
      submit_format: b.submit_format, resources: b.resources, hands_on_time: b.hands_on_time,
      submit_within_days: b.submit_within_days, reviewer_checklist: b.reviewer_checklist,
    });
    setSavingId(null);
    if (res.ok) {
      toast.success(`${b.skill_category} brief saved`);
      if (draftIndex !== undefined) setDrafts((ds) => ds.filter((_, i) => i !== draftIndex));
      setBriefs([]);
    } else toast.error("Couldn't save.");
  };

  const fields = (b: AdminBrief, onPatch: (p: Partial<AdminBrief>) => void) => (
    <>
      <div>
        <Label className="text-xs">Skill category</Label>
        <Input value={b.skill_category} placeholder="e.g. Graphic Design" onChange={(e) => onPatch({ skill_category: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Task title</Label>
        <Input value={b.title} onChange={(e) => onPatch({ title: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Full brief</Label>
        <Textarea rows={4} value={b.brief} onChange={(e) => onPatch({ brief: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Hands-on time</Label>
          <Input value={b.hands_on_time ?? ""} placeholder="e.g. 90 minutes" onChange={(e) => onPatch({ hands_on_time: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Submission window (days)</Label>
          <Input type="number" min={1} value={b.submit_within_days} onChange={(e) => onPatch({ submit_within_days: Number(e.target.value) || 2 })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Exact submit format</Label>
        <Textarea rows={2} value={b.submit_format ?? ""} onChange={(e) => onPatch({ submit_format: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Resources (free/legal tools, or "None needed")</Label>
        <Input value={b.resources ?? ""} onChange={(e) => onPatch({ resources: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Reviewer checklist — one item per line</Label>
        <Textarea rows={3} value={checklistToText(b.reviewer_checklist)}
          onChange={(e) => onPatch({ reviewer_checklist: textToChecklist(e.target.value) })} />
      </div>
      <div>
        <Label className="text-xs">Reference template link (optional)</Label>
        <Input value={b.reference_template_url ?? ""} placeholder="https://figma.com/… or Drive link"
          onChange={(e) => onPatch({ reference_template_url: e.target.value })} />
      </div>
    </>
  );

  return (
    <div className="mt-8">
      <button onClick={() => setOpen((v) => !v)} className="text-sm font-semibold text-primary hover:underline">
        {open ? "▾ " : "▸ "}Skill vetting task briefs
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Each skill's hands-on task, submit format, resources, time estimate and reviewer checklist. Add a new one at any time —
            it appears as a selectable skill for talents immediately.
          </p>
          <Button size="sm" variant="outline" onClick={() => setDrafts((ds) => [...ds, blankBrief()])}>
            + Add a new skill brief
          </Button>
          {drafts.map((d, i) => (
            <Card key={`draft-${i}`} className="border-primary/40">
              <CardHeader className="pb-2"><CardTitle className="text-base">{d.skill_category || "New skill"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {fields(d, (p) => patchDraft(i, p))}
                <div className="flex gap-2">
                  <Button size="sm" disabled={savingId === `draft-${i}` || !d.skill_category.trim()} onClick={() => save(d, i)}>
                    {savingId === `draft-${i}` ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Saving…</> : "Create"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDrafts((ds) => ds.filter((_, idx) => idx !== i))}>Discard</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {briefs.map((b) => (
            <Card key={b.id}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{b.skill_category}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {fields(b, (p) => patch(b.id, p))}
                <Button size="sm" disabled={savingId === b.id} onClick={() => save(b)}>
                  {savingId === b.id ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Saving…</> : "Save"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {briefs.length === 0 && drafts.length === 0 && <p className="text-sm text-muted-foreground">Loading briefs…</p>}
        </div>
      )}
    </div>
  );
}
