import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase, Users, CalendarDays, Upload, ShieldCheck, Sparkles,
  CreditCard, Headset, ArrowLeft, ArrowRight, Loader2,
} from "lucide-react";

const HIRING_CATEGORIES = [
  "Web Dev", "Mobile Dev", "UI/UX Design", "Graphic Design", "Copywriting",
  "Video Editing", "Marketing", "Data Analysis", "AI/ML", "Virtual Assistant", "Other",
];

const BUDGET_OPTIONS = [
  { value: "under_50k", label: "Under ₦50,000", sub: "Small projects or one-off tasks" },
  { value: "50k_200k", label: "₦50,000–₦200,000", sub: "Medium projects or short contracts" },
  { value: "200k_500k", label: "₦200,000–₦500,000", sub: "Larger projects or ongoing work" },
  { value: "500k_plus", label: "₦500,000+", sub: "Enterprise or long-term engagements" },
];

const STEP_TITLES = ["Tell us about your company", "What are you hiring for?", "Your typical budget", "You're all set"];
const STEP_SUBTITLES = [
  "This helps us present you to top talent and tailor your matches.",
  "We'll surface the best professionals in these areas first.",
  "So we can match you with talent in your range — change anytime.",
  "Welcome to Skryve for Business. Where would you like to start?",
];

const CLIENT_BENEFITS = [
  { icon: ShieldCheck, title: "Verified, vetted talent", desc: "Hire professionals with proven track records and ratings." },
  { icon: Sparkles, title: "AI-matched shortlists", desc: "We surface the right people for your brief — instantly." },
  { icon: CreditCard, title: "Secure escrow payments", desc: "Funds are protected and released only when you approve." },
  { icon: Headset, title: "Priority client support", desc: "A dedicated team to help you hire with confidence." },
];

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    teamSize: "",
    location: "",
    website: "",
    logoUrl: "",
    hiringCategories: [] as string[],
    typicalBudget: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      const u = session.user;
      setUser(u);

      const { data: cp } = await (supabase as any)
        .from('client_profiles')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();

      if (cp) {
        setClientId(cp.id);
        setForm(f => ({
          ...f,
          companyName: cp.company_name || '',
          industry: cp.industry || '',
          teamSize: cp.team_size || '',
          location: cp.location || '',
          website: cp.website || '',
          logoUrl: cp.logo_url || '',
          hiringCategories: cp.hiring_categories || [],
          typicalBudget: cp.typical_budget || '',
        }));
        if (cp.onboarding_step && cp.onboarding_step > 1) {
          setStep(cp.onboarding_step);
        }
      }
    })();
  }, [navigate]);

  const saveStep = async (stepNum: number, extraFields?: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        company_name: form.companyName,
        industry: form.industry || null,
        team_size: form.teamSize || null,
        location: form.location || null,
        website: form.website || null,
        logo_url: form.logoUrl || null,
        hiring_categories: form.hiringCategories,
        typical_budget: form.typicalBudget || null,
        onboarding_step: stepNum,
        ...extraFields,
      };
      const { data, error } = await (supabase as any)
        .from('client_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) setClientId(data.id);
    } catch (e: any) {
      toast({ title: "Could not save progress", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('logos').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('logos').getPublicUrl(path);
      setForm(f => ({ ...f, logoUrl: data.publicUrl }));
    } catch {
      toast({ title: "Logo upload failed", description: "You can add a logo later.", variant: "destructive" });
    }
  };

  const toggleCategory = (cat: string) => {
    setForm(f => ({
      ...f,
      hiringCategories: f.hiringCategories.includes(cat)
        ? f.hiringCategories.filter(c => c !== cat)
        : [...f.hiringCategories, cat],
    }));
  };

  const goNext = async () => {
    if (step === 3) {
      await saveStep(4, { onboarding_completed: false });
      setDirection(1);
      setStep(4);
      return;
    }
    await saveStep(step + 1);
    setDirection(1);
    setStep(s => Math.min(s + 1, 4));
  };

  const goBack = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleStepFourAction = async (destination: string) => {
    setSaving(true);
    try {
      await (supabase as any)
        .from('client_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
      await (supabase as any).from('profiles').update({ active_role: 'client' }).eq('user_id', user.id);
      navigate(destination);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
              <div
                className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-colors overflow-hidden"
                onClick={() => logoInputRef.current?.click()}
              >
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Logo</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500">Upload company logo (optional)</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Company Name</Label>
              <Input
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder="Acme Corp"
                className="border-gray-300 text-gray-900 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Industry</Label>
              <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {["Technology", "Marketing", "Finance", "Healthcare", "Education", "E-commerce", "Media", "Legal", "Other"].map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Team Size</Label>
              <Select value={form.teamSize} onValueChange={v => setForm(f => ({ ...f, teamSize: v }))}>
                <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  {["Just me", "2–10", "11–50", "51–200", "200+"].map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Location</Label>
              <Input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Lagos, Nigeria"
                className="border-gray-300 text-gray-900 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Website (optional)</Label>
              <Input
                value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://yourcompany.com"
                className="border-gray-300 text-gray-900 bg-white"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-gray-500">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {HIRING_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    form.hiringCategories.includes(cat)
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'border-gray-300 text-gray-700 hover:border-[#2563EB] hover:text-[#2563EB] bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            {BUDGET_OPTIONS.map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setForm(f => ({ ...f, typicalBudget: value }))}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                  form.typicalBudget === value
                    ? 'border-[#2563EB] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <p className={`font-semibold text-base ${form.typicalBudget === value ? 'text-[#2563EB]' : 'text-gray-900'}`}>{label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-gray-500">Your account is ready. What would you like to do first?</p>
            <div className="space-y-3">
              <button
                onClick={() => handleStepFourAction('/dashboard')}
                disabled={saving}
                className="w-full text-left p-5 rounded-xl border-2 border-gray-200 hover:border-[#2563EB] bg-white transition-all group flex items-center gap-4 disabled:opacity-60"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                  <Briefcase className="w-6 h-6 text-[#2563EB]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Post a Job</p>
                  <p className="text-sm text-gray-500">Create your first job listing</p>
                </div>
              </button>
              <button
                onClick={() => handleStepFourAction('/marketplace?view=talent')}
                disabled={saving}
                className="w-full text-left p-5 rounded-xl border-2 border-gray-200 hover:border-[#2563EB] bg-white transition-all group flex items-center gap-4 disabled:opacity-60"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors shrink-0">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Browse Talent</p>
                  <p className="text-sm text-gray-500">Find skilled professionals</p>
                </div>
              </button>
              <button
                onClick={() => handleStepFourAction('/events')}
                disabled={saving}
                className="w-full text-left p-5 rounded-xl border-2 border-gray-200 hover:border-[#2563EB] bg-white transition-all group flex items-center gap-4 disabled:opacity-60"
              >
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors shrink-0">
                  <CalendarDays className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Explore Events</p>
                  <p className="text-sm text-gray-500">Connect and network with the community</p>
                </div>
              </button>
            </div>
            <div className="text-center pt-2">
              <button
                onClick={() => handleStepFourAction('/dashboard')}
                disabled={saving}
                className="text-sm text-gray-400 hover:text-gray-600 underline disabled:opacity-60"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return !form.companyName.trim();
    return false;
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Premium brand panel (desktop) ─────────────────────────── */}
      <aside
        className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0B162B 0%, #15294a 55%, #1E3A5F 100%)" }}
      >
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/[0.04]" />
        <div className="absolute -right-10 bottom-10 w-56 h-56 rounded-full bg-[#2563EB]/10 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <img src="/logo.png" alt="Skryve" className="h-8 w-8 object-contain" />
            <span className="font-bold text-xl">Skryve</span>
            <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-white/60 border border-white/20 rounded-full px-2 py-0.5">
              for Business
            </span>
          </div>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight mb-3">
            Hire Africa's best talent — with confidence.
          </h2>
          <p className="text-white/55 text-[15px] leading-relaxed max-w-sm">
            You're a few steps from a hiring experience built around you. No noise, no friction — just the right people for your work.
          </p>
        </div>

        <ul className="relative z-10 space-y-5 my-10">
          {CLIENT_BENEFITS.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
                <Icon className="w-[18px] h-[18px] text-[#7dd3fc]" />
              </div>
              <div>
                <p className="font-semibold text-[14px]">{title}</p>
                <p className="text-white/45 text-[13px] leading-snug">{desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="relative z-10 text-white/35 text-[12px]">
          Trusted by teams hiring across Africa and beyond.
        </p>
      </aside>

      {/* ── Form panel ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* mobile header */}
        <div className="lg:hidden flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <img src="/logo.png" alt="Skryve" className="h-7 w-7 object-contain" />
          <span className="font-bold text-gray-900">Skryve</span>
          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">
            for Business
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-xl mx-auto w-full px-6 pt-10 pb-28">
            {/* progress dots */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    n === step ? "w-8 bg-[#2563EB]" : n < step ? "w-8 bg-[#2563EB]/40" : "w-8 bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <p className="text-[13px] font-semibold uppercase tracking-wide text-[#2563EB] mb-1">
              Step {step} of 4
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">{STEP_TITLES[step - 1]}</h1>
            <p className="text-gray-500 mb-8">{STEP_SUBTITLES[step - 1]}</p>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* footer nav (not on the final action step) */}
        {step < 4 && (
          <div className="border-t border-gray-100 bg-white">
            <div className="max-w-xl mx-auto w-full px-6 py-4 flex items-center justify-between">
              {step > 1 ? (
                <Button variant="ghost" onClick={goBack} disabled={saving} className="text-gray-600">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
              ) : <span />}
              <Button
                onClick={goNext}
                disabled={isNextDisabled() || saving}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-6"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                {step === 3 ? "Finish setup" : "Continue"}
                {!saving && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
