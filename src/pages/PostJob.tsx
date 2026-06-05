import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

const SKILL_CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "Design & UI/UX",
  "Data Science & Analytics",
  "DevOps & Cloud",
  "Writing & Content",
  "Marketing & SEO",
  "Video & Animation",
  "Photography",
  "Accounting & Finance",
  "Legal & Compliance",
  "Customer Support",
  "Product Management",
  "Cybersecurity",
  "AI & Machine Learning",
];

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

const TOTAL_STEPS = 3;
const STEP_LABELS = ["Job Details", "Budget & Timeline", "Preview & Publish"];

function StepIndicator({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-muted-foreground">
          Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-px w-full bg-border overflow-hidden">
        <div
          className="h-full bg-foreground transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
      </div>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </div>
  );
}

export default function PostJob() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const editId = searchParams.get("edit");

  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(editId);
  const [improvingDesc, setImprovingDesc] = useState(false);
  const [improvedDesc, setImprovedDesc] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [form, setForm] = useState({
    title: "",
    skillCategory: "",
    jobType: "gig" as "gig" | "contract" | "longterm",
    description: "",
    requiredSkills: [] as string[],
    attachments: [] as string[],
    budgetType: "fixed" as "fixed" | "hourly",
    budgetMin: "",
    budgetMax: "",
    currency: "NGN",
    duration: "",
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    locationPreference: "remote" as "remote" | "onsite" | "hybrid",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
      else navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data: job } = await (supabase as any)
        .from("job_posts")
        .select("*")
        .eq("id", editId)
        .single();
      if (job) {
        setForm({
          title: job.title || "",
          skillCategory: job.skill_category || "",
          jobType: job.job_type || "gig",
          description: job.description || "",
          requiredSkills: job.required_skills || [],
          attachments: [],
          budgetType: job.budget_type || "fixed",
          budgetMin: job.budget_min ? String(job.budget_min) : "",
          budgetMax: job.budget_max ? String(job.budget_max) : "",
          currency: job.budget_currency || "NGN",
          duration: job.duration || "",
          deadline: job.deadline
            ? new Date(job.deadline).toISOString().split("T")[0]
            : new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
          locationPreference: job.location_type || "remote",
        });
      }
    })();
  }, [editId]);

  const addSkill = (val: string) => {
    const trimmed = val.trim().replace(/,$/, "").trim();
    if (trimmed && !form.requiredSkills.includes(trimmed) && form.requiredSkills.length < 10) {
      setForm((f) => ({ ...f, requiredSkills: [...f.requiredSkills, trimmed] }));
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setForm((f) => ({ ...f, requiredSkills: f.requiredSkills.filter((s) => s !== skill) }));
  };

  const handleImproveDesc = async () => {
    if (!form.description.trim()) {
      toast({ title: "Please write a description first", variant: "destructive" });
      return;
    }
    setImprovingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-description", {
        body: { description: form.description },
      });
      if (error) throw error;
      setImprovedDesc(data?.improved || form.description);
      setShowDiff(true);
    } catch (e: any) {
      toast({ title: "Could not improve description", description: e.message, variant: "destructive" });
    } finally {
      setImprovingDesc(false);
    }
  };

  const handlePublish = async (status: "active" | "draft") => {
    setSaving(true);
    try {
      const { data: clientProfile } = await (supabase as any)
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!clientProfile) throw new Error("Client profile not found");

      const payload: any = {
        client_id: clientProfile.id,
        title: form.title,
        description: form.description,
        skill_category: form.skillCategory,
        job_type: form.jobType === "longterm" ? "long_term" : form.jobType,
        required_skills: form.requiredSkills,
        budget_type: form.budgetType,
        budget_min: form.budgetMin ? parseFloat(form.budgetMin) : null,
        budget_max: form.budgetMax ? parseFloat(form.budgetMax) : null,
        budget_currency: form.currency,
        duration: form.duration,
        deadline: form.deadline || null,
        location_type: form.locationPreference,
        status,
      };

      if (draftId) {
        await (supabase as any).from("job_posts").update(payload).eq("id", draftId);
      } else {
        const { data } = await (supabase as any)
          .from("job_posts")
          .insert(payload)
          .select("id")
          .single();
        setDraftId(data?.id);
      }

      if (status === "active") {
        toast({ title: "Job Published!", description: "Your job is now live on the marketplace." });
        navigate("/marketplace/my-jobs");
      } else {
        toast({ title: "Draft saved" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canProceedStep1 =
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 100 &&
    form.skillCategory;

  const canProceedStep2 =
    form.budgetType === "fixed"
      ? !!form.budgetMin
      : !!form.budgetMin && !!form.budgetMax;

  const currencySymbol = form.currency === "NGN" ? "₦" : form.currency === "USD" ? "$" : form.currency;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold text-foreground tracking-tight">
          {editId ? "Edit Job Post" : "Post a Job"}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Find the perfect talent for your project.
        </p>
      </div>

      <StepIndicator step={step} />

      {/* ── Step 1: Job Details ── */}
      {step === 1 && (
        <div className="space-y-4">
          <Panel title="Job Details">
            {/* Title */}
            <div>
              <FieldLabel>
                Job Title <span className="text-destructive normal-case">*</span>
              </FieldLabel>
              <div className="relative">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 80) }))}
                  placeholder="e.g. React Developer for E-commerce Site"
                  maxLength={80}
                  className="h-9 text-[13px] pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                  {form.title.length}/80
                </span>
              </div>
            </div>

            {/* Skill Category */}
            <div>
              <FieldLabel>
                Skill Category <span className="text-destructive normal-case">*</span>
              </FieldLabel>
              <Select
                value={form.skillCategory}
                onValueChange={(val) => setForm((f) => ({ ...f, skillCategory: val }))}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Select a category…" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-[13px]">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Type */}
            <div>
              <FieldLabel>Job Type</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "gig", label: "One-time Gig" },
                    { value: "contract", label: "Short Contract", sub: "1–4 wks" },
                    { value: "longterm", label: "Long-term", sub: "1+ month" },
                  ] as const
                ).map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, jobType: value }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      form.jobType === value
                        ? "border-foreground/40 bg-foreground/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <p className="text-[13px] font-medium text-foreground">{label}</p>
                    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Description">
            {/* Description textarea + AI improve */}
            <div>
              <FieldLabel>
                Job Description <span className="text-destructive normal-case">*</span>
                <span className="text-muted-foreground font-normal normal-case ml-1">(min 100 chars)</span>
              </FieldLabel>
              <Textarea
                rows={8}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the project, goals, deliverables, and any specific requirements…"
                className="text-[13px] resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] font-mono text-muted-foreground">
                  {form.description.length} chars
                </span>
                <button
                  type="button"
                  onClick={handleImproveDesc}
                  disabled={improvingDesc || form.description.trim().length < 50}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 transition-colors"
                >
                  {improvingDesc ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  AI Improve
                </button>
              </div>

              {showDiff && improvedDesc && (
                <div className="mt-4 space-y-3 border border-border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-3">
                      <p className="text-[11px] font-mono text-muted-foreground mb-2">Original</p>
                      <div className="text-[12px] text-muted-foreground whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                        {form.description}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] font-mono text-blue-500 mb-2">AI Improved</p>
                      <div className="text-[12px] whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                        {improvedDesc}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, description: improvedDesc }));
                        setShowDiff(false);
                        setImprovedDesc(null);
                      }}
                      className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90"
                    >
                      Use AI Version
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiff(false);
                        setImprovedDesc(null);
                      }}
                      className="px-4 py-1.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    >
                      Keep Original
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Required Skills */}
            <div>
              <FieldLabel>
                Required Skills{" "}
                <span className="normal-case font-normal text-muted-foreground">(max 10)</span>
              </FieldLabel>
              {form.requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[12px] text-muted-foreground"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-foreground transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {form.requiredSkills.length < 10 && (
                <Input
                  className="h-9 text-[13px]"
                  placeholder="Type skill and press Enter or comma"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addSkill(skillInput);
                    }
                  }}
                  onBlur={() => skillInput.trim() && addSkill(skillInput)}
                />
              )}
            </div>
          </Panel>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Next: Budget & Timeline <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Budget & Timeline ── */}
      {step === 2 && (
        <div className="space-y-4">
          <Panel title="Budget">
            {/* Budget Type toggle */}
            <div>
              <FieldLabel>Budget Type</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "fixed", label: "Fixed Price" },
                    { value: "hourly", label: "Hourly Rate" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, budgetType: value }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      form.budgetType === value
                        ? "border-foreground/40 bg-foreground/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <p className="text-[13px] font-medium text-foreground">{label}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.budgetType === "fixed" ? (
              <div>
                <FieldLabel>Fixed Price</FieldLabel>
                <Input
                  type="number"
                  className="h-9 text-[13px]"
                  placeholder="e.g. 150000"
                  value={form.budgetMin}
                  onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Min Rate (per hour)</FieldLabel>
                  <Input
                    type="number"
                    className="h-9 text-[13px]"
                    placeholder="e.g. 5000"
                    value={form.budgetMin}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel>Max Rate (per hour)</FieldLabel>
                  <Input
                    type="number"
                    className="h-9 text-[13px]"
                    placeholder="e.g. 15000"
                    value={form.budgetMax}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div>
              <FieldLabel>Currency</FieldLabel>
              <Select
                value={form.currency}
                onValueChange={(val) => setForm((f) => ({ ...f, currency: val }))}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-[13px]">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Panel>

          <Panel title="Timeline">
            {/* Project Duration */}
            <div>
              <FieldLabel>Project Duration</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {["Less than 1 week", "1–4 weeks", "1–3 months", "3+ months"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, duration: d }))}
                    className={`p-3 rounded-lg border text-[13px] text-left transition-colors ${
                      form.duration === d
                        ? "border-foreground/40 bg-foreground/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <FieldLabel>Application Deadline</FieldLabel>
              <Input
                type="date"
                className="h-9 text-[13px]"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>

            {/* Location Preference */}
            <div>
              <FieldLabel>Location Preference</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "remote", label: "Remote" },
                    { value: "onsite", label: "On-site" },
                    { value: "hybrid", label: "Hybrid" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, locationPreference: value }))}
                    className={`p-3 rounded-lg border text-[13px] text-left transition-colors ${
                      form.locationPreference === value
                        ? "border-foreground/40 bg-foreground/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Preview <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview & Publish ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Preview panel */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="text-[13px] font-semibold text-foreground">Preview</span>
              <div className="flex items-center gap-3 text-[12px]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit Details
                </button>
                <span className="text-border">·</span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit Budget
                </button>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground">{form.title}</h2>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {form.skillCategory && (
                      <span className="px-2 py-0.5 rounded-md border border-border text-[11px] text-muted-foreground">
                        {form.skillCategory}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md border border-border text-[11px] text-muted-foreground capitalize">
                      {form.jobType}
                    </span>
                    <span className="px-2 py-0.5 rounded-md border border-border text-[11px] text-muted-foreground capitalize">
                      {form.locationPreference}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {form.budgetMin && (
                    <p className="text-[15px] font-semibold text-foreground">
                      {currencySymbol}
                      {Number(form.budgetMin).toLocaleString()}
                      {form.budgetType === "hourly" && form.budgetMax && (
                        <span> – {currencySymbol}{Number(form.budgetMax).toLocaleString()}</span>
                      )}
                      {form.budgetType === "hourly" && (
                        <span className="text-[12px] font-normal text-muted-foreground">/hr</span>
                      )}
                    </p>
                  )}
                  {form.duration && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{form.duration}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Description
                </p>
                <p className="text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {form.description}
                </p>
              </div>

              {form.requiredSkills.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Required Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.requiredSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md bg-muted text-[12px] text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {form.deadline && (
                <p className="text-[12px] text-muted-foreground border-t border-border pt-3">
                  Deadline:{" "}
                  {new Date(form.deadline).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePublish("draft")}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 transition-colors"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handlePublish("active")}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Publish Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
