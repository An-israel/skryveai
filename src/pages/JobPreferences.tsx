import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, X } from "lucide-react";

import { ALL_SKILLS as EXPERTISE_OPTIONS, searchSkills } from "@/lib/skills";

const PLATFORMS = [
  { value: "upwork", label: "Upwork" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "jobberman", label: "Jobberman" },
  { value: "remoteok", label: "Remote OK" },
  { value: "weworkremotely", label: "We Work Remotely" },
];

const JOB_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "remote", label: "Remote" },
  { value: "full-time", label: "Full-time" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "CAD", "AUD", "GHS", "KES", "ZAR"];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior" },
  { value: "expert", label: "Expert" },
];

interface FormState {
  primarySkill: string;
  secondarySkills: string[];
  experienceLevel: string;
  budgetMin: string;
  currency: string;
  jobTypes: string[];
  locationPref: string;
  platforms: string[];
  digestEnabled: boolean;
}

export default function JobPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [form, setForm] = useState<FormState>({
    primarySkill: "",
    secondarySkills: [],
    experienceLevel: "",
    budgetMin: "",
    currency: "USD",
    jobTypes: [],
    locationPref: "",
    platforms: [],
    digestEnabled: true,
  });

  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      setLoading(true);
      const { data: talent } = await (supabase as any)
        .from("talent_profiles")
        .select("id, primary_skill, secondary_skills, experience_level")
        .eq("user_id", user.id)
        .single();

      if (!talent) { setLoading(false); return; }

      const { data: prefs } = await (supabase as any)
        .from("job_preferences")
        .select("*")
        .eq("talent_id", talent.id)
        .single();

      setForm({
        primarySkill: prefs?.primary_skill || talent.primary_skill || "",
        secondarySkills: prefs?.secondary_skills || talent.secondary_skills || [],
        experienceLevel: prefs?.experience_level || talent.experience_level || "",
        budgetMin: prefs?.budget_min ? String(prefs.budget_min) : "",
        currency: prefs?.budget_currency || "USD",
        jobTypes: prefs?.job_types || [],
        locationPref: prefs?.location_preference || "",
        platforms: prefs?.preferred_platforms || [],
        digestEnabled: prefs?.digest_enabled ?? true,
      });
      setLoading(false);
    };
    loadPrefs();
  }, [user]);

  const toggleSecondarySkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      secondarySkills: prev.secondarySkills.includes(skill)
        ? prev.secondarySkills.filter(s => s !== skill)
        : prev.secondarySkills.length < 10
          ? [...prev.secondarySkills, skill]
          : prev.secondarySkills,
    }));
  };

  const togglePlatform = (platform: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const toggleJobType = (type: string) => {
    setForm(prev => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type)
        ? prev.jobTypes.filter(t => t !== type)
        : [...prev.jobTypes, type],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: talent } = await (supabase as any)
        .from("talent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!talent) throw new Error("Talent profile not found");

      await (supabase as any)
        .from("job_preferences")
        .upsert({
          talent_id: talent.id,
          primary_skill: form.primarySkill || null,
          secondary_skills: form.secondarySkills,
          experience_level: form.experienceLevel || null,
          budget_min: form.budgetMin ? parseFloat(form.budgetMin) : null,
          job_types: form.jobTypes,
          location_preference: form.locationPref || null,
          preferred_platforms: form.platforms,
          digest_enabled: form.digestEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: "talent_id" });

      toast({ title: "Preferences saved", description: "Your job digest will be updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredSkills = skillSearch
    ? searchSkills(skillSearch, EXPERTISE_OPTIONS)
    : EXPERTISE_OPTIONS;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Preferences</h1>
          <p className="text-sm text-muted-foreground">Customize your feed and daily digest</p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Primary Skill</h2>
          <Select value={form.primarySkill} onValueChange={v => setForm(prev => ({ ...prev, primarySkill: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select your primary skill" />
            </SelectTrigger>
            <SelectContent>
              {EXPERTISE_OPTIONS.map(skill => (
                <SelectItem key={skill} value={skill}>{skill}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Secondary Skills</h2>
          <p className="text-sm text-muted-foreground">Select up to 10 skills</p>
          {form.secondarySkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.secondarySkills.map(skill => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button onClick={() => toggleSecondarySkill(skill)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Input
            placeholder="Search skills..."
            value={skillSearch}
            onChange={e => setSkillSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredSkills.filter(s => s !== form.primarySkill).map(skill => (
              <label key={skill} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={form.secondarySkills.includes(skill)}
                  onCheckedChange={() => toggleSecondarySkill(skill)}
                />
                {skill}
              </label>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Experience Level</h2>
          <RadioGroup value={form.experienceLevel} onValueChange={v => setForm(prev => ({ ...prev, experienceLevel: v }))}>
            <div className="grid grid-cols-2 gap-3">
              {EXPERIENCE_LEVELS.map(lvl => (
                <label key={lvl.value} className="flex items-center gap-2 cursor-pointer border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                  <RadioGroupItem value={lvl.value} />
                  <span className="text-sm font-medium">{lvl.label}</span>
                </label>
              ))}
            </div>
          </RadioGroup>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Minimum Budget</h2>
          <div className="flex gap-3">
            <Select value={form.currency} onValueChange={v => setForm(prev => ({ ...prev, currency: v }))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="e.g. 500"
              value={form.budgetMin}
              onChange={e => setForm(prev => ({ ...prev, budgetMin: e.target.value }))}
              className="flex-1"
            />
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Job Types</h2>
          <div className="flex flex-wrap gap-3">
            {JOB_TYPES.map(type => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer border border-border rounded-lg px-4 py-2 hover:bg-muted/40 transition-colors">
                <Checkbox
                  checked={form.jobTypes.includes(type.value)}
                  onCheckedChange={() => toggleJobType(type.value)}
                />
                <span className="text-sm font-medium">{type.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Location Preference</h2>
          <RadioGroup value={form.locationPref} onValueChange={v => setForm(prev => ({ ...prev, locationPref: v }))}>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "remote", label: "Remote" },
                { value: "onsite", label: "Onsite" },
                { value: "hybrid", label: "Hybrid" },
              ].map(loc => (
                <label key={loc.value} className="flex items-center gap-2 cursor-pointer border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                  <RadioGroupItem value={loc.value} />
                  <span className="text-sm font-medium">{loc.label}</span>
                </label>
              ))}
            </div>
          </RadioGroup>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Preferred Platforms</h2>
          <div className="grid grid-cols-2 gap-3">
            {PLATFORMS.map(p => (
              <label key={p.value} className="flex items-center gap-2 cursor-pointer border border-border rounded-lg px-4 py-3 hover:bg-muted/40 transition-colors">
                <Checkbox
                  checked={form.platforms.includes(p.value)}
                  onCheckedChange={() => togglePlatform(p.value)}
                />
                <span className="text-sm font-medium">{p.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Daily Email Digest</h2>
              <p className="text-sm text-muted-foreground mt-1">Receive your top job matches every morning at 8am WAT</p>
            </div>
            <Switch
              checked={form.digestEnabled}
              onCheckedChange={v => setForm(prev => ({ ...prev, digestEnabled: v }))}
            />
          </div>
        </section>

        <div className="flex gap-3 pb-8">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Preferences
          </Button>
          <Link to="/jobs">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
