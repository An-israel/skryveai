import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEntitlements } from "@/hooks/use-entitlements";
import { ApplyWizard } from "@/components/jobs/ApplyWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Moon, Sparkles, Loader2, Play, X, Plus, CheckCircle2, AlertCircle,
  SkipForward, ExternalLink, Briefcase, Lock, ArrowRight, Check,
} from "lucide-react";

type Status = "ready" | "needs_review" | "skipped" | "submitted";

interface SonderApp {
  id: string;
  aggregated_job_id: string | null;
  company: string | null;
  title: string;
  job_url: string | null;
  platform: string | null;
  fit_score: number;
  status: Status;
  cover_letter: string | null;
  needs_review_reason: string | null;
}

const TABS: { id: Status; label: string; icon: any }[] = [
  { id: "ready", label: "Ready", icon: CheckCircle2 },
  { id: "needs_review", label: "Needs Review", icon: AlertCircle },
  { id: "skipped", label: "Skipped", icon: SkipForward },
  { id: "submitted", label: "Submitted", icon: Briefcase },
];

export default function Sonder() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPaid, loading: entLoading } = useEntitlements();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pref, setPref] = useState<any>(null);
  const [apps, setApps] = useState<SonderApp[]>([]);
  const [tab, setTab] = useState<Status>("ready");
  const [running, setRunning] = useState(false);
  const [reviewJob, setReviewJob] = useState<any>(null);
  const [reviewAppId, setReviewAppId] = useState<string | null>(null);

  // setup form
  const [titleInput, setTitleInput] = useState("");
  const [titles, setTitles] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [salaryMin, setSalaryMin] = useState("");
  const [dailyLimit, setDailyLimit] = useState("5");
  const [cvs, setCvs] = useState<any[]>([]);
  const [baseCvId, setBaseCvId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (uid: string) => {
    const [{ data: p }, { data: a }, { data: tp }] = await Promise.all([
      (supabase as any).from("sonder_preferences").select("*").eq("user_id", uid).maybeSingle(),
      (supabase as any).from("sonder_applications").select("*").eq("user_id", uid).order("fit_score", { ascending: false }),
      (supabase as any).from("talent_profiles").select("id").eq("user_id", uid).maybeSingle(),
    ]);
    setPref(p || null);
    setApps(a || []);
    if (p) {
      setTitles(p.titles || []);
      setRemoteOnly(p.remote_only);
      setSalaryMin(p.salary_min ? String(p.salary_min) : "");
      setDailyLimit(String(p.daily_limit || 5));
      setBaseCvId(p.base_cv_id || "");
    }
    if (tp?.id) {
      const { data: cvRows } = await (supabase as any).from("skryve_cvs").select("id, title").eq("talent_id", tp.id).order("updated_at", { ascending: false });
      setCvs(cvRows || []);
      if (!p?.base_cv_id && cvRows?.length) setBaseCvId(cvRows[0].id);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      await load(data.user.id);
      setLoading(false);
    });
  }, [load]);

  const savePreferences = async () => {
    if (!userId) return;
    if (!isPaid) { navigate("/pricing"); return; }
    if (!titles.length) { toast({ title: "Add at least one target role", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("sonder_preferences").upsert({
      user_id: userId,
      active: true,
      titles,
      remote_only: remoteOnly,
      salary_min: salaryMin ? parseFloat(salaryMin) : null,
      daily_limit: Math.min(20, Math.max(1, parseInt(dailyLimit) || 5)),
      base_cv_id: baseCvId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Sonder is on 🌙", description: "Running your first batch now…" });
    await load(userId);
    runNow();
  };

  const runNow = async () => {
    if (!userId) return;
    if (!isPaid) { navigate("/pricing"); return; }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("sonder-agent", { body: { userId } });
      if (error) throw error;
      toast({ title: "Sonder ran", description: `${data?.prepared || 0} application(s) prepared.` });
      await load(userId);
    } catch (e: any) {
      toast({ title: "Run failed", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const setStatus = async (app: SonderApp, status: Status, reason?: string) => {
    await (supabase as any).from("sonder_applications")
      .update({ status, ...(status === "submitted" ? { submitted_at: new Date().toISOString() } : {}), ...(reason ? { skipped_reason: reason } : {}) })
      .eq("id", app.id);
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
  };

  const openReview = async (app: SonderApp) => {
    if (!app.aggregated_job_id) return;
    const { data: job } = await (supabase as any).from("aggregated_jobs").select("*").eq("id", app.aggregated_job_id).maybeSingle();
    if (!job) { toast({ title: "Job no longer available", variant: "destructive" }); return; }
    setReviewAppId(app.id);
    setReviewJob({
      id: job.id, title: job.title, description: job.description || "",
      requiredSkills: job.skill_tags || [], platform: job.platform, externalUrl: job.external_url,
    });
  };

  const addTitle = () => {
    const t = titleInput.trim();
    if (t && !titles.includes(t)) setTitles([...titles, t]);
    setTitleInput("");
  };

  if (loading || entLoading) return <div className="max-w-3xl mx-auto space-y-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;

  // ── Setup / preferences ──
  const showSetup = !pref || !pref.active;

  const counts: Record<Status, number> = { ready: 0, needs_review: 0, skipped: 0, submitted: 0 };
  apps.forEach((a) => { counts[a.status]++; });
  const visible = apps.filter((a) => a.status === tab);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-950 to-purple-950 text-white p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
            <Moon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold flex items-center gap-2">Sonder <Badge className="bg-white/15 text-white text-[10px]">AGENT</Badge></h1>
            <p className="text-sm text-white/70">Applies to jobs while you sleep. You review &amp; submit each one.</p>
          </div>
          {isPaid && pref?.active && (
            <Button variant="secondary" size="sm" onClick={runNow} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
              Run now
            </Button>
          )}
        </div>
      </div>

      {!isPaid ? (
        <div className="rounded-xl border bg-card p-6 space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Sonder is a Pro feature</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Upgrade to let Sonder source, tailor and pre-fill job applications for you every night. You just review and submit each morning.
            </p>
          </div>
          <ul className="text-sm text-left max-w-sm mx-auto space-y-2">
            {["Applications prepared while you sleep", "Cover letters tailored to each role", "Review & submit in-app — nothing auto-sends", "Sourced from companies worldwide"].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button className="w-full sm:w-auto" onClick={() => navigate("/pricing")}>
            Upgrade to Pro <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      ) : showSetup ? (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Set up your agent</h2>
            <p className="text-sm text-muted-foreground mt-1">Tell Sonder what to look for. It runs every night and prepares tailored applications for your review.</p>
          </div>

          <div>
            <Label className="text-sm">Target roles</Label>
            <div className="flex gap-2 mt-1.5">
              <Input placeholder="e.g. Frontend Developer" value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTitle(); } }} />
              <Button type="button" variant="outline" onClick={addTitle}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {titles.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button onClick={() => setTitles(titles.filter((x) => x !== t))}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Minimum salary (optional)</Label>
              <Input type="number" placeholder="Any" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm">Applications per night</Label>
              <Input type="number" min={1} max={20} value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label className="text-sm">CV to tailor from</Label>
            {cvs.length ? (
              <Select value={baseCvId} onValueChange={setBaseCvId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose a CV" /></SelectTrigger>
                <SelectContent>{cvs.map((c) => <SelectItem key={c.id} value={c.id}>{c.title || "Untitled CV"}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5">No CV yet — Sonder still queues jobs; build a CV for tailored cover letters.</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} />
            <Label>Remote roles only</Label>
          </div>

          <Button className="w-full" onClick={savePreferences} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Moon className="w-4 h-4 mr-2" />}
            Turn Sonder on
          </Button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {t.label} {counts[t.id] > 0 && <span className="ml-1 opacity-70">{counts[t.id]}</span>}
              </button>
            ))}
            <Button variant="ghost" size="sm" className="text-xs ml-auto" onClick={() => { setPref({ ...pref, active: false }); }}>Edit preferences</Button>
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-16 border rounded-xl">
              <Moon className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {tab === "ready" ? "Nothing prepared yet. Hit “Run now” or check back in the morning." : `No ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} applications.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((app) => (
                <div key={app.id} className="border rounded-xl p-4 bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{app.title}</h3>
                        {app.platform && <Badge variant="outline" className="text-[10px] capitalize">{app.platform}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{app.company}</p>
                    </div>
                    <Badge className={`shrink-0 ${app.fit_score >= 70 ? "bg-green-600" : "bg-blue-600"} text-white`}>{app.fit_score}% fit</Badge>
                  </div>

                  {app.needs_review_reason && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {app.needs_review_reason}</p>
                  )}
                  {app.cover_letter && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3 bg-muted/50 rounded-lg p-2.5">{app.cover_letter}</p>
                  )}

                  {app.status !== "submitted" && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1" onClick={() => openReview(app)}>Review &amp; Submit</Button>
                      {app.status !== "skipped" && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(app, "skipped", "Skipped by user")}>Skip</Button>
                      )}
                      {app.job_url && (
                        <Button size="sm" variant="outline" onClick={() => window.open(app.job_url!, "_blank")}><ExternalLink className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                  )}
                  {app.status === "submitted" && (
                    <p className="text-xs text-green-600 mt-3 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Submitted &amp; tracked in Applications</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {reviewJob && (
        <ApplyWizard
          open={!!reviewJob}
          onClose={() => { setReviewJob(null); setReviewAppId(null); }}
          mode="external"
          job={reviewJob}
          onApplied={() => {
            const app = apps.find((a) => a.id === reviewAppId);
            if (app) setStatus(app, "submitted");
          }}
        />
      )}
    </div>
  );
}
