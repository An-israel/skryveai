import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function StepIndicator({ step }: { step: number }) {
  const steps = ["Job Details", "Budget & Timeline", "Preview & Publish"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i + 1 === step
                ? "bg-primary text-primary-foreground"
                : i + 1 < step
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1 < step ? "✓" : i + 1}
          </div>
          <span
            className={`text-sm hidden md:inline ${
              i + 1 === step ? "font-medium" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
          )}
        </div>
      ))}
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Post a Job</h1>
        <p className="text-muted-foreground text-sm mt-1">Find the perfect talent for your project.</p>
      </div>

      <StepIndicator step={step} />

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <Label htmlFor="title">
              Job Title <span className="text-destructive">*</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 80) }))}
                placeholder="e.g. React Developer for E-commerce Site"
                maxLength={80}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {form.title.length}/80
              </span>
            </div>
          </div>

          <div>
            <Label>
              Skill Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.skillCategory}
              onValueChange={(val) => setForm((f) => ({ ...f, skillCategory: val }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {SKILL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Job Type</Label>
            <div className="grid grid-cols-3 gap-3 mt-1">
              {(
                [
                  { value: "gig", label: "One-time Gig", sub: "" },
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
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{label}</p>
                  {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="description">
              Job Description <span className="text-destructive">*</span>
              <span className="text-muted-foreground font-normal ml-1">(min 100 chars)</span>
            </Label>
            <Textarea
              id="description"
              className="mt-1"
              rows={8}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the project, goals, deliverables, and any specific requirements..."
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">{form.description.length} chars</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImproveDesc}
                disabled={improvingDesc || form.description.trim().length < 50}
                className="gap-1"
              >
                {improvingDesc ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                AI Improve
              </Button>
            </div>

            {showDiff && improvedDesc && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Original</p>
                    <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">
                      {form.description}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 mb-1">AI Improved</p>
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">
                      {improvedDesc}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setForm((f) => ({ ...f, description: improvedDesc }));
                      setShowDiff(false);
                      setImprovedDesc(null);
                    }}
                  >
                    Use AI Version
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowDiff(false);
                      setImprovedDesc(null);
                    }}
                  >
                    Keep Original
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Required Skills (max 10)</Label>
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {form.requiredSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {form.requiredSkills.length < 10 && (
              <Input
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

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="gap-1"
            >
              Next: Budget & Timeline <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <Label>Budget Type</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
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
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {form.budgetType === "fixed" ? (
              <div className="col-span-2">
                <Label>Fixed Price</Label>
                <Input
                  type="number"
                  className="mt-1"
                  placeholder="e.g. 150000"
                  value={form.budgetMin}
                  onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                />
              </div>
            ) : (
              <>
                <div>
                  <Label>Min Rate (per hour)</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    placeholder="e.g. 5000"
                    value={form.budgetMin}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Max Rate (per hour)</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    placeholder="e.g. 15000"
                    value={form.budgetMax}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <Label>Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(val) => setForm((f) => ({ ...f, currency: val }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Project Duration</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {[
                "Less than 1 week",
                "1–4 weeks",
                "1–3 months",
                "3+ months",
              ].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, duration: d }))}
                  className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                    form.duration === d
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="deadline">Application Deadline</Label>
            <Input
              id="deadline"
              type="date"
              className="mt-1"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>

          <div>
            <Label>Location Preference</Label>
            <div className="grid grid-cols-3 gap-3 mt-1">
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
                  className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                    form.locationPreference === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="gap-1">
              Preview <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{form.title}</h2>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {form.skillCategory && (
                      <Badge variant="outline">{form.skillCategory}</Badge>
                    )}
                    <Badge variant="outline" className="capitalize">{form.jobType}</Badge>
                    <Badge variant="outline" className="capitalize">{form.locationPreference}</Badge>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {form.budgetMin && (
                    <p className="font-bold text-lg">
                      {form.currency === "NGN" ? "₦" : form.currency === "USD" ? "$" : form.currency}
                      {Number(form.budgetMin).toLocaleString()}
                      {form.budgetType === "hourly" && form.budgetMax && (
                        <span>
                          {" "}–{" "}
                          {form.currency === "NGN" ? "₦" : form.currency === "USD" ? "$" : form.currency}
                          {Number(form.budgetMax).toLocaleString()}
                        </span>
                      )}
                      {form.budgetType === "hourly" && <span className="text-sm font-normal">/hr</span>}
                    </p>
                  )}
                  {form.duration && (
                    <p className="text-xs text-muted-foreground mt-0.5">{form.duration}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-1">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{form.description}</p>
              </div>

              {form.requiredSkills.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.requiredSkills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {form.deadline && (
                <p className="text-xs text-muted-foreground">
                  Deadline: {new Date(form.deadline).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-primary hover:underline"
              >
                Edit Details
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                onClick={() => setStep(2)}
                className="text-sm text-primary hover:underline"
              >
                Edit Budget
              </button>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handlePublish("draft")}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save as Draft
              </Button>
              <Button
                onClick={() => handlePublish("active")}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Publish Job
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
