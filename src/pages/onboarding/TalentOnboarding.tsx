import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OnboardingShell from "./OnboardingShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Upload } from "lucide-react";

const EXPERTISE_OPTIONS = [
  "3D Design", "Affiliate Marketing", "AI Development", "Amazon FBA", "Animation",
  "API Development", "Backend Development", "Blockchain", "Blog Writing", "Brand Identity",
  "Business Consulting", "Cloud Services", "Content Marketing", "Content Writing",
  "Copywriting", "Custom Software", "Customer Support", "Cybersecurity", "Data Entry",
  "Data Science", "DevOps", "Digital Strategy", "Dropshipping", "E-commerce", "Email Marketing",
  "Frontend Development", "Full Stack Development", "Game Development", "Ghostwriting",
  "Google Ads", "Graphic Design", "Growth Hacking", "GRC Consulting", "Illustration",
  "Influencer Marketing", "IT Support", "Lead Generation", "Logo Design", "Machine Learning",
  "Market Research", "Mobile App Development", "Motion Graphics", "Network Security",
  "No-Code Development", "Penetration Testing", "Photography", "Podcast Production",
  "PPC Advertising", "Product Design", "Product Listing", "Product Management",
  "Project Management", "Proofreading", "Public Relations", "Sales", "Scriptwriting",
  "SEO", "Shopify", "Social Media Management", "Social Media Marketing",
  "SaaS Development", "Supply Chain", "Technical Writing", "Translation", "UI/UX Design",
  "Video Editing", "Video Production", "Virtual Assistant", "Voice Over",
  "Web Design", "Web Development", "Webflow", "WordPress",
];

const TOP_SKILLS = [
  "Web Development", "UI/UX Design", "Copywriting", "Video Editing", "Graphic Design",
  "Social Media Management", "Data Analysis", "Mobile App Development", "SEO", "Virtual Assistant",
];

const STEP_TITLES = [
  "Basic Info",
  "Primary Skill",
  "Secondary Skills",
  "Experience Level",
  "Set Your Rate",
  "Write Your Bio",
  "Portfolio",
  "Job Preferences",
];

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export default function TalentOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [skillSearch, setSkillSearch] = useState("");
  const [secondarySearch, setSecondarySearch] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    city: "",
    country: "",
    tagline: "",
    avatarUrl: "",
    primarySkill: "",
    secondarySkills: [] as string[],
    experienceLevel: "" as "beginner" | "intermediate" | "expert" | "",
    hourlyRate: "",
    rateCurrency: "NGN",
    bio: "",
    portfolio: [] as { title: string; type: "file" | "link"; url: string; description: string }[],
    jobTypes: [] as string[],
    locationPref: "",
    minBudget: "",
    platforms: [] as string[],
    dailyDigest: false,
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

      const { data: tp } = await (supabase as any)
        .from('talent_profiles')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();

      if (tp) {
        setTalentId(tp.id);
        const loc = tp.location || '';
        const parts = loc.split(', ');
        setForm(f => ({
          ...f,
          fullName: tp.full_name || u.user_metadata?.full_name || '',
          city: parts[0] || '',
          country: parts[1] || '',
          tagline: tp.tagline || '',
          avatarUrl: tp.profile_photo_url || '',
          primarySkill: tp.primary_skill || '',
          secondarySkills: tp.secondary_skills || [],
          experienceLevel: tp.experience_level || '',
          hourlyRate: tp.hourly_rate ? String(tp.hourly_rate) : '',
          rateCurrency: tp.rate_currency || 'NGN',
          bio: tp.bio || '',
        }));
        if (tp.onboarding_step && tp.onboarding_step > 1) {
          setStep(tp.onboarding_step);
        }
      } else {
        setForm(f => ({
          ...f,
          fullName: u.user_metadata?.full_name || '',
        }));
      }
    })();
  }, [navigate]);

  const saveStep = async (stepNum: number) => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('talent_profiles')
        .upsert({
          user_id: user.id,
          full_name: form.fullName,
          location: `${form.city}, ${form.country}`.trim().replace(/^,\s*/, ''),
          tagline: form.tagline,
          profile_photo_url: form.avatarUrl || null,
          primary_skill: form.primarySkill || null,
          secondary_skills: form.secondarySkills,
          experience_level: form.experienceLevel || null,
          hourly_rate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
          rate_currency: form.rateCurrency,
          bio: form.bio || null,
          onboarding_step: stepNum,
        }, { onConflict: 'user_id' })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) setTalentId(data.id);
    } catch (e: any) {
      toast({ title: "Could not save progress", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setForm(f => ({ ...f, avatarUrl: data.publicUrl }));
    } catch {
      toast({ title: "Avatar upload failed", description: "You can add a photo later from your profile.", variant: "destructive" });
    }
  };

  const handleAIBio = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-bio', {
        body: {
          name: form.fullName,
          primarySkill: form.primarySkill,
          skills: form.secondarySkills,
          experienceLevel: form.experienceLevel,
          location: `${form.city}, ${form.country}`,
        }
      });
      if (error) throw error;
      setForm(f => ({ ...f, bio: data?.bio || data?.text || '' }));
    } catch {
      toast({ title: "AI unavailable", description: "Please write your bio manually.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (talentId) {
        await (supabase as any).from('job_preferences').upsert({
          talent_id: talentId,
          job_types: form.jobTypes,
          location_preference: form.locationPref || null,
          budget_min: form.minBudget ? parseFloat(form.minBudget) : null,
          preferred_platforms: form.platforms,
          digest_enabled: form.dailyDigest,
        }, { onConflict: 'talent_id' });
      }
      await (supabase as any).from('talent_profiles').update({ onboarding_completed: true }).eq('user_id', user.id);
      toast({ title: "Welcome to Skryve! 🎉", description: "Your profile is live." });
      navigate('/dashboard');
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (step === 8) {
      await handleFinish();
      return;
    }
    await saveStep(step + 1);
    setDirection(1);
    setStep(s => Math.min(s + 1, 8));
  };

  const goBack = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 1));
  };

  const handlePortfolioFileUpload = async (index: number, file: File) => {
    if (!user) return;
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('portfolio').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('portfolio').getPublicUrl(path);
      setForm(f => {
        const updated = [...f.portfolio];
        updated[index] = { ...updated[index], url: data.publicUrl };
        return { ...f, portfolio: updated };
      });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload file.", variant: "destructive" });
    }
  };

  const filteredSkills = EXPERTISE_OPTIONS.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase()) && s !== form.primarySkill
  );

  const filteredSecondary = EXPERTISE_OPTIONS.filter(s =>
    s.toLowerCase().includes(secondarySearch.toLowerCase()) &&
    s !== form.primarySkill &&
    !form.secondarySkills.includes(s)
  );

  const toggleJobType = (val: string) => {
    setForm(f => ({
      ...f,
      jobTypes: f.jobTypes.includes(val)
        ? f.jobTypes.filter(j => j !== val)
        : [...f.jobTypes, val],
    }));
  };

  const togglePlatform = (val: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(val)
        ? f.platforms.filter(p => p !== val)
        : [...f.platforms, val],
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
              />
              <div
                className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-colors overflow-hidden"
                onClick={() => avatarInputRef.current?.click()}
              >
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Photo</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500">Click to upload profile photo</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Full Name</Label>
              <Input
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Your full name"
                className="border-gray-300 text-gray-900 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">City</Label>
                <Input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Lagos"
                  className="border-gray-300 text-gray-900 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Country</Label>
                <Input
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  placeholder="Nigeria"
                  className="border-gray-300 text-gray-900 bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Professional Tagline</Label>
              <Input
                value={form.tagline}
                onChange={e => setForm(f => ({ ...f, tagline: e.target.value.slice(0, 100) }))}
                placeholder="React Developer | UI/UX Designer"
                maxLength={100}
                className="border-gray-300 text-gray-900 bg-white"
              />
              <p className="text-xs text-gray-400">{form.tagline.length} / 100</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-gray-500">Choose your main skill</p>
            {form.primarySkill && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {form.primarySkill}
                  <button onClick={() => setForm(f => ({ ...f, primarySkill: '' }))} className="hover:text-blue-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}
            <Input
              value={skillSearch}
              onChange={e => setSkillSearch(e.target.value)}
              placeholder="Search skills..."
              className="border-gray-300 text-gray-900 bg-white"
            />
            {!skillSearch && (
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Popular</p>
                <div className="flex flex-wrap gap-2">
                  {TOP_SKILLS.map(skill => (
                    <button
                      key={skill}
                      onClick={() => setForm(f => ({ ...f, primarySkill: skill }))}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        form.primarySkill === skill
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'border-gray-300 text-gray-700 hover:border-[#2563EB] hover:text-[#2563EB]'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
              {filteredSkills.map(skill => (
                <button
                  key={skill}
                  onClick={() => setForm(f => ({ ...f, primarySkill: skill }))}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    form.primarySkill === skill
                      ? 'bg-blue-50 text-[#2563EB] font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-gray-500">Add up to 5 more skills</p>
            {form.secondarySkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.secondarySkills.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {skill}
                    <button
                      onClick={() => setForm(f => ({ ...f, secondarySkills: f.secondarySkills.filter(s => s !== skill) }))}
                      className="hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              value={secondarySearch}
              onChange={e => setSecondarySearch(e.target.value)}
              placeholder="Search skills..."
              className="border-gray-300 text-gray-900 bg-white"
              disabled={form.secondarySkills.length >= 5}
            />
            <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
              {filteredSecondary.map(skill => (
                <button
                  key={skill}
                  onClick={() => {
                    if (form.secondarySkills.length >= 5) return;
                    setForm(f => ({ ...f, secondarySkills: [...f.secondarySkills, skill] }));
                  }}
                  disabled={form.secondarySkills.length >= 5}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  {skill}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">{form.secondarySkills.length} / 5 selected</p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-3">
            {[
              { value: "beginner" as const, label: "Beginner", sub: "0–1 years · Still building your portfolio" },
              { value: "intermediate" as const, label: "Intermediate", sub: "2–4 years · Have client experience" },
              { value: "expert" as const, label: "Expert", sub: "5+ years · Seasoned professional" },
            ].map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setForm(f => ({ ...f, experienceLevel: value }))}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                  form.experienceLevel === value
                    ? 'border-[#2563EB] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <p className={`font-semibold text-base ${form.experienceLevel === value ? 'text-[#2563EB]' : 'text-gray-900'}`}>{label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Hourly rate</Label>
              <div className="flex gap-3">
                <Select value={form.rateCurrency} onValueChange={v => setForm(f => ({ ...f, rateCurrency: v }))}>
                  <SelectTrigger className="w-28 border-gray-300 bg-white text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN ₦</SelectItem>
                    <SelectItem value="USD">USD $</SelectItem>
                    <SelectItem value="GBP">GBP £</SelectItem>
                    <SelectItem value="EUR">EUR €</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={form.hourlyRate}
                  onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 border-gray-300 text-gray-900 bg-white"
                />
              </div>
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Suggested range: ₦3,000–₦15,000/hr for most skills. Top experts charge ₦20,000+/hr.
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 500) }))}
                placeholder="Tell clients about yourself, your experience, and what makes you unique..."
                rows={6}
                maxLength={500}
                className="border-gray-300 text-gray-900 bg-white resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{form.bio.length} / 500</p>
            </div>
            <Button
              variant="outline"
              onClick={handleAIBio}
              disabled={saving}
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <span className="mr-2">✨</span>}
              AI Write Bio for Me
            </Button>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            {form.portfolio.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Sample {index + 1}</p>
                  <button
                    onClick={() => setForm(f => ({ ...f, portfolio: f.portfolio.filter((_, i) => i !== index) }))}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Input
                  value={item.title}
                  onChange={e => setForm(f => {
                    const updated = [...f.portfolio];
                    updated[index] = { ...updated[index], title: e.target.value };
                    return { ...f, portfolio: updated };
                  })}
                  placeholder="Project title"
                  className="border-gray-300 text-gray-900 bg-white"
                />
                <div className="flex gap-2">
                  {(["link", "file"] as const).map(type => (
                    <Button
                      key={type}
                      variant={item.type === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForm(f => {
                        const updated = [...f.portfolio];
                        updated[index] = { ...updated[index], type, url: '' };
                        return { ...f, portfolio: updated };
                      })}
                      className={item.type === type ? "bg-[#2563EB] hover:bg-[#1d4ed8] text-white" : "border-gray-300 text-gray-700"}
                    >
                      {type === 'link' ? 'Link' : 'File'}
                    </Button>
                  ))}
                </div>
                {item.type === 'link' ? (
                  <Input
                    value={item.url}
                    onChange={e => setForm(f => {
                      const updated = [...f.portfolio];
                      updated[index] = { ...updated[index], url: e.target.value };
                      return { ...f, portfolio: updated };
                    })}
                    placeholder="https://..."
                    className="border-gray-300 text-gray-900 bg-white"
                  />
                ) : (
                  <input
                    type="file"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handlePortfolioFileUpload(index, file);
                    }}
                    className="text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                  />
                )}
                <Input
                  value={item.description}
                  onChange={e => setForm(f => {
                    const updated = [...f.portfolio];
                    updated[index] = { ...updated[index], description: e.target.value };
                    return { ...f, portfolio: updated };
                  })}
                  placeholder="Short description (optional)"
                  className="border-gray-300 text-gray-900 bg-white"
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setForm(f => ({
                ...f,
                portfolio: [...f.portfolio, { title: '', type: 'link', url: '', description: '' }],
              }))}
              disabled={form.portfolio.length >= 5}
              className="w-full border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              + Add Sample
            </Button>
            {form.portfolio.length >= 5 && (
              <p className="text-xs text-gray-400 text-center">Maximum 5 portfolio samples</p>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-8">
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">Job Types</Label>
              {["One-time Gig", "Short Contract", "Long-term"].map(type => (
                <div key={type} className="flex items-center gap-3">
                  <Checkbox
                    id={`jt-${type}`}
                    checked={form.jobTypes.includes(type)}
                    onCheckedChange={() => toggleJobType(type)}
                  />
                  <label htmlFor={`jt-${type}`} className="text-sm text-gray-700 cursor-pointer">{type}</label>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">Location Preference</Label>
              {[
                { value: "remote", label: "Remote only" },
                { value: "onsite", label: "Open to On-site" },
                { value: "hybrid", label: "Both" },
              ].map(({ value, label }) => (
                <div key={value} className="flex items-center gap-3">
                  <input
                    type="radio"
                    id={`loc-${value}`}
                    name="locationPref"
                    value={value}
                    checked={form.locationPref === value}
                    onChange={() => setForm(f => ({ ...f, locationPref: value }))}
                    className="accent-[#2563EB]"
                  />
                  <label htmlFor={`loc-${value}`} className="text-sm text-gray-700 cursor-pointer">{label}</label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Minimum Budget</Label>
              <Input
                type="number"
                value={form.minBudget}
                onChange={e => setForm(f => ({ ...f, minBudget: e.target.value }))}
                placeholder="e.g. 50000"
                className="border-gray-300 text-gray-900 bg-white"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">Preferred Platforms</Label>
              {["Upwork", "LinkedIn", "Indeed", "Jobberman", "Remote OK"].map(platform => (
                <div key={platform} className="flex items-center gap-3">
                  <Checkbox
                    id={`pl-${platform}`}
                    checked={form.platforms.includes(platform)}
                    onCheckedChange={() => togglePlatform(platform)}
                  />
                  <label htmlFor={`pl-${platform}`} className="text-sm text-gray-700 cursor-pointer">{platform}</label>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">Daily job digest emails</p>
                <p className="text-xs text-gray-500">Get matched jobs delivered to your inbox</p>
              </div>
              <Switch
                checked={form.dailyDigest}
                onCheckedChange={v => setForm(f => ({ ...f, dailyDigest: v }))}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return !form.fullName.trim();
    if (step === 2) return !form.primarySkill;
    if (step === 4) return !form.experienceLevel;
    return false;
  };

  return (
    <OnboardingShell
      step={step}
      totalSteps={8}
      title={STEP_TITLES[step - 1]}
      onBack={step > 1 ? goBack : undefined}
      onNext={goNext}
      nextLabel={step === 8 ? "Finish" : "Continue"}
      nextDisabled={isNextDisabled()}
      isLoading={saving}
      showSkip={step === 7}
      onSkip={() => {
        setDirection(1);
        setStep(8);
      }}
    >
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
    </OnboardingShell>
  );
}
