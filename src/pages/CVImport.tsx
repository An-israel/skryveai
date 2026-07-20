import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, Sparkles, X, Plus, Wand2, ArrowRight, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useGamification } from "@/hooks/useGamification";
import {
  uploadAndParseCv, saveReviewedProfile, isSupportedCvFile, MAX_CV_BYTES,
  type ParsedCv, type CvWorkExperience, type CvEducation,
} from "@/lib/cv-import/api";

type Phase = "upload" | "parsing" | "review";

export default function CVImport() {
  const navigate = useNavigate();
  const { recalcProfile } = useGamification();
  const [phase, setPhase] = useState<Phase>("upload");
  const [cv, setCv] = useState<ParsedCv>({});
  const [skillDraft, setSkillDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!isSupportedCvFile(file)) { toast.error("Upload a PDF or DOCX file."); return; }
    if (file.size > MAX_CV_BYTES) { toast.error("That file is over 10MB."); return; }
    setPhase("parsing");
    try {
      const parsed = await uploadAndParseCv(file);
      setCv(parsed);
      setPhase("review");
      toast.success("We built your profile — review it below.");
    } catch (e) {
      setPhase("upload");
      toast.error(e instanceof Error ? e.message : "We couldn't read that CV.");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  // ── field helpers ──────────────────────────────────────────────
  const setField = <K extends keyof ParsedCv>(k: K, v: ParsedCv[K]) => setCv((c) => ({ ...c, [k]: v }));

  const addSkill = () => {
    const s = skillDraft.trim();
    if (!s) return;
    if (!(cv.skills ?? []).some((x) => x.toLowerCase() === s.toLowerCase())) {
      setField("skills", [...(cv.skills ?? []), s]);
    }
    setSkillDraft("");
  };
  const removeSkill = (i: number) => setField("skills", (cv.skills ?? []).filter((_, idx) => idx !== i));

  const updateWork = (i: number, patch: Partial<CvWorkExperience>) =>
    setField("work_experience", (cv.work_experience ?? []).map((w, idx) => idx === i ? { ...w, ...patch } : w));
  const addWork = () =>
    setField("work_experience", [...(cv.work_experience ?? []), { company: "", role: "" }]);
  const removeWork = (i: number) =>
    setField("work_experience", (cv.work_experience ?? []).filter((_, idx) => idx !== i));

  const updateEdu = (i: number, patch: Partial<CvEducation>) =>
    setField("education", (cv.education ?? []).map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const addEdu = () => setField("education", [...(cv.education ?? []), { institution: "" }]);
  const removeEdu = (i: number) => setField("education", (cv.education ?? []).filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await saveReviewedProfile(cv);
      // Recompute gamification profile completion (this also fires the
      // profile_completed credit reward when it reaches 100%).
      await recalcProfile().catch(() => {});
      toast.success("Profile saved");
      navigate("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── UPLOAD ─────────────────────────────────────────────────────
  if (phase === "upload" || phase === "parsing") {
    const busy = phase === "parsing";
    return (
      <main className="container mx-auto px-0 pb-12 max-w-xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="pt-6">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Upload your CV and we'll set up your profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We read your CV and fill in your profile for you. You review and edit everything before it saves.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !busy && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            } ${busy ? "pointer-events-none opacity-70" : ""}`}
          >
            {busy ? (
              <>
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="font-medium">Reading your CV…</p>
                <p className="text-sm text-muted-foreground">This takes a few seconds.</p>
              </>
            ) : (
              <>
                <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Drop your CV here, or click to browse</p>
                <p className="text-sm text-muted-foreground">PDF or DOCX · up to 10MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
            />
          </div>

          {!busy && (
            <div className="mt-5 text-center">
              <button
                onClick={() => navigate("/onboarding/talent")}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Skip and build manually
              </button>
            </div>
          )}
        </motion.div>
      </main>
    );
  }

  // ── REVIEW ─────────────────────────────────────────────────────
  return (
    <main className="container mx-auto px-0 pb-16 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="pt-6">
        <div className="mb-2 flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">We built your profile — review it</h1>
        </div>
        <p className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Info className="h-3.5 w-3.5" /> We pulled this from your CV — check it's right, then save.
        </p>

        {/* Basic info */}
        <Card className="mb-4">
          <CardHeader className="pb-3"><CardTitle className="text-base">Basic info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={cv.full_name ?? ""} onChange={(e) => setField("full_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="loc">Location</Label>
              <Input id="loc" value={cv.location ?? ""} onChange={(e) => setField("location", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="yrs">Years of experience</Label>
              <Input
                id="yrs" type="number" min={0}
                value={cv.years_experience ?? ""}
                onChange={(e) => setField("years_experience", e.target.value === "" ? undefined : Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Headline + bio */}
        <Card className="mb-4">
          <CardHeader className="pb-3"><CardTitle className="text-base">Headline & bio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline" placeholder="e.g. Senior Frontend Engineer"
                value={cv.headline ?? ""} onChange={(e) => setField("headline", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={4} value={cv.bio ?? ""} onChange={(e) => setField("bio", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="mb-4">
          <CardHeader className="pb-3"><CardTitle className="text-base">Skills</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              {(cv.skills ?? []).length === 0 && (
                <span className="text-sm text-muted-foreground">No skills yet — add some below.</span>
              )}
              {(cv.skills ?? []).map((s, i) => (
                <Badge key={`${s}-${i}`} variant="secondary" className="gap-1 py-1 pl-3 pr-1.5">
                  {s}
                  <button onClick={() => removeSkill(i)} className="rounded-full p-0.5 hover:bg-background/60" aria-label={`Remove ${s}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill and press Enter"
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              />
              <Button type="button" variant="outline" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Work experience */}
        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Work experience</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addWork}><Plus className="mr-1 h-4 w-4" />Add</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {(cv.work_experience ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No roles found. Add one if you'd like.</p>
            )}
            {(cv.work_experience ?? []).map((w, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <Input placeholder="Role" value={w.role ?? ""} onChange={(e) => updateWork(i, { role: e.target.value })} />
                    <Input placeholder="Company" value={w.company ?? ""} onChange={(e) => updateWork(i, { company: e.target.value })} />
                    <Input placeholder="Start (e.g. Jan 2020)" value={w.start_date ?? ""} onChange={(e) => updateWork(i, { start_date: e.target.value })} />
                    <Input placeholder="End (e.g. Present)" value={w.end_date ?? ""} onChange={(e) => updateWork(i, { end_date: e.target.value })} />
                  </div>
                  <button onClick={() => removeWork(i)} className="mt-1 text-muted-foreground hover:text-destructive" aria-label="Remove role">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Textarea
                  placeholder="What you did in this role"
                  rows={2} value={w.description ?? ""}
                  onChange={(e) => updateWork(i, { description: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Education</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addEdu}><Plus className="mr-1 h-4 w-4" />Add</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(cv.education ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No education found. Add one if you'd like.</p>
            )}
            {(cv.education ?? []).map((ed, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                <div className="grid flex-1 gap-2 sm:grid-cols-3">
                  <Input className="sm:col-span-2" placeholder="Institution" value={ed.institution ?? ""} onChange={(e) => updateEdu(i, { institution: e.target.value })} />
                  <Input placeholder="Year" value={ed.year ?? ""} onChange={(e) => updateEdu(i, { year: e.target.value })} />
                  <Input className="sm:col-span-3" placeholder="Qualification" value={ed.qualification ?? ""} onChange={(e) => updateEdu(i, { qualification: e.target.value })} />
                </div>
                <button onClick={() => removeEdu(i)} className="mt-1 text-muted-foreground hover:text-destructive" aria-label="Remove education">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Links */}
        <Card className="mb-6">
          <CardHeader className="pb-3"><CardTitle className="text-base">Links</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="links">Portfolio / LinkedIn / GitHub (one per line)</Label>
            <Textarea
              id="links" rows={3} placeholder="https://linkedin.com/in/you"
              value={(cv.links ?? []).join("\n")}
              onChange={(e) => setField("links", e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setPhase("upload")}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Upload a different CV
          </button>
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <>Save my profile<ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
