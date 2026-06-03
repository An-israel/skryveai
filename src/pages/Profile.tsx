import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Upload, CheckCircle, Clock, XCircle } from "lucide-react";

const ALL_SKILLS = [
  "Web Development", "UI/UX Design", "Copywriting", "Video Editing", "Graphic Design",
  "Social Media Management", "Data Analysis", "Mobile App Development", "SEO", "Virtual Assistant",
  "Content Writing", "Translation", "Photography", "Animation", "3D Modeling",
  "WordPress", "E-commerce", "Email Marketing", "Brand Identity", "Logo Design",
  "JavaScript", "Python", "React", "Node.js", "Flutter",
  "iOS Development", "Android Development", "DevOps", "Cloud Computing", "Cybersecurity",
  "Blockchain", "AI/ML", "Data Science", "Business Analysis", "Project Management",
  "Product Management", "Agile/Scrum", "Technical Writing", "Research", "Legal Writing",
  "Accounting", "Bookkeeping", "Financial Modeling", "HR & Recruitment", "Sales",
  "Customer Support", "Community Management", "Podcast Editing", "Music Production", "Voice Over",
  "Illustration", "Infographics", "Presentation Design", "Print Design", "Packaging Design",
  "Shopify", "WooCommerce", "Magento", "Drupal", "Joomla",
  "Vue.js", "Angular", "Next.js", "Laravel", "Django",
  "PostgreSQL", "MongoDB", "MySQL", "Redis", "Elasticsearch",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes",
];

const LANGUAGES = [
  "English", "Yoruba", "Igbo", "Hausa", "French", "Spanish", "Portuguese",
  "Arabic", "Mandarin", "Hindi", "Swahili", "German", "Italian",
  "Japanese", "Korean", "Russian", "Dutch", "Turkish", "Polish", "Bengali",
];

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

const AVAILABILITY_OPTIONS = [
  { value: "available",   label: "Available",     icon: CheckCircle, color: "text-green-500 border-green-500 bg-green-500/10" },
  { value: "busy",        label: "Busy",          icon: Clock,       color: "text-yellow-500 border-yellow-500 bg-yellow-500/10" },
  { value: "unavailable", label: "Not Available", icon: XCircle,     color: "text-red-500 border-red-500 bg-red-500/10" },
];

export default function Profile() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [tab1, setTab1] = useState({
    fullName: "",
    tagline: "",
    location: "",
    bio: "",
    languages: [] as string[],
    availability: "available",
    profilePhotoUrl: "",
  });

  const [tab2, setTab2] = useState({
    primarySkill: "",
    secondarySkills: [] as string[],
    experienceLevel: "",
    hourlyRate: "",
    rateCurrency: "NGN",
  });

  const [tab3, setTab3] = useState({
    linkedin: "",
    twitter: "",
    github: "",
    website: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      setUser(session.user);

      const { data } = await (supabase as any)
        .from("talent_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setTab1({
          fullName:        data.full_name || "",
          tagline:         data.tagline || "",
          location:        data.location || "",
          bio:             data.bio || "",
          languages:       data.languages || [],
          availability:    data.availability_status || "available",
          profilePhotoUrl: data.profile_photo_url || "",
        });
        setTab2({
          primarySkill:    data.primary_skill || "",
          secondarySkills: data.secondary_skills || [],
          experienceLevel: data.experience_level || "",
          hourlyRate:      data.hourly_rate ? String(data.hourly_rate) : "",
          rateCurrency:    data.rate_currency || "NGN",
        });
        const links = data.social_links || {};
        setTab3({
          linkedin: links.linkedin || "",
          twitter:  links.twitter  || "",
          github:   links.github   || "",
          website:  links.website  || "",
        });
      }
    });
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setTab1(prev => ({ ...prev, profilePhotoUrl: publicUrl }));
    setUploading(false);
    toast({ title: "Photo uploaded" });
  }

  async function saveBasicInfo() {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("talent_profiles")
      .upsert({
        user_id:             user.id,
        full_name:           tab1.fullName || null,
        tagline:             tab1.tagline || null,
        location:            tab1.location || null,
        bio:                 tab1.bio || null,
        languages:           tab1.languages,
        availability_status: tab1.availability,
        profile_photo_url:   tab1.profilePhotoUrl || null,
        updated_at:          new Date().toISOString(),
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile Updated" });
  }

  async function saveSkillsExperience() {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("talent_profiles")
      .upsert({
        user_id:          user.id,
        primary_skill:    tab2.primarySkill || null,
        secondary_skills: tab2.secondarySkills,
        experience_level: tab2.experienceLevel || null,
        hourly_rate:      tab2.hourlyRate ? parseFloat(tab2.hourlyRate) : null,
        rate_currency:    tab2.rateCurrency,
        updated_at:       new Date().toISOString(),
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile Updated" });
  }

  async function saveLinks() {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("talent_profiles")
      .upsert({
        user_id: user.id,
        social_links: {
          linkedin: tab3.linkedin || null,
          twitter:  tab3.twitter  || null,
          github:   tab3.github   || null,
          website:  tab3.website  || null,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile Updated" });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Edit Profile</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Keep your profile up to date to attract more clients.</p>
      </div>

      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="skills">Skills & Experience</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        {/* ── Basic Info ── */}
        <TabsContent value="basic" className="mt-4">
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <span className="text-[13px] font-semibold text-foreground">Basic Information</span>
            </div>
            <div className="px-5 py-5 space-y-5">

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full border border-border cursor-pointer flex items-center justify-center overflow-hidden bg-muted hover:border-primary/50 transition-colors relative mx-auto"
                >
                  {tab1.profilePhotoUrl ? (
                    <img src={tab1.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <Upload className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload photo"}
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</p>
                <Input value={tab1.fullName} onChange={e => setTab1(p => ({ ...p, fullName: e.target.value }))} placeholder="Your full name" />
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Professional Tagline <span className="normal-case text-[11px]">(max 100)</span>
                </p>
                <Input
                  value={tab1.tagline}
                  maxLength={100}
                  onChange={e => setTab1(p => ({ ...p, tagline: e.target.value }))}
                  placeholder="e.g. Full-Stack Developer & UI/UX Designer"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Location</p>
                <Input value={tab1.location} onChange={e => setTab1(p => ({ ...p, location: e.target.value }))} placeholder="City, Country" />
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Bio <span className="normal-case text-[11px]">({tab1.bio.length}/500)</span>
                </p>
                <Textarea
                  value={tab1.bio}
                  maxLength={500}
                  rows={4}
                  onChange={e => setTab1(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell clients about yourself, your experience, and what you do best..."
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Languages Spoken</p>
                <SearchableMultiSelect
                  options={LANGUAGES}
                  selected={tab1.languages}
                  onChange={langs => setTab1(p => ({ ...p, languages: langs }))}
                  placeholder="Search languages..."
                />
              </div>

              <div className="space-y-2">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Availability Status</p>
                <div className="flex gap-2 flex-wrap">
                  {AVAILABILITY_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTab1(p => ({ ...p, availability: value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all ${
                        tab1.availability === value
                          ? color
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={saveBasicInfo}
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ── Skills & Experience ── */}
        <TabsContent value="skills" className="mt-4">
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <span className="text-[13px] font-semibold text-foreground">Skills & Experience</span>
            </div>
            <div className="px-5 py-5 space-y-5">

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Primary Skill</p>
                <Select value={tab2.primarySkill} onValueChange={v => setTab2(p => ({ ...p, primarySkill: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your main skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SKILLS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Secondary Skills <span className="normal-case text-[11px]">(max 5)</span>
                </p>
                <SearchableMultiSelect
                  options={ALL_SKILLS.filter(s => s !== tab2.primarySkill)}
                  selected={tab2.secondarySkills}
                  onChange={skills => setTab2(p => ({ ...p, secondarySkills: skills.slice(0, 5) }))}
                  placeholder="Search additional skills..."
                />
              </div>

              <div className="space-y-2">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Experience Level</p>
                <RadioGroup
                  value={tab2.experienceLevel}
                  onValueChange={v => setTab2(p => ({ ...p, experienceLevel: v }))}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {[
                    { value: "entry",  label: "Entry Level", desc: "0–2 years" },
                    { value: "mid",    label: "Mid Level",   desc: "2–5 years" },
                    { value: "senior", label: "Senior",      desc: "5+ years"  },
                  ].map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                        tab2.experienceLevel === value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={value} className="sr-only" />
                      <span className="text-[14px] font-medium text-foreground">{label}</span>
                      <span className="text-[12px] text-muted-foreground">{desc}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Hourly Rate</p>
                <div className="flex gap-2">
                  <Select value={tab2.rateCurrency} onValueChange={v => setTab2(p => ({ ...p, rateCurrency: v }))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={tab2.hourlyRate}
                    onChange={e => setTab2(p => ({ ...p, hourlyRate: e.target.value }))}
                    placeholder="e.g. 50"
                    className="flex-1"
                    min={0}
                  />
                </div>
              </div>

              <button
                onClick={saveSkillsExperience}
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ── Links ── */}
        <TabsContent value="links" className="mt-4">
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <span className="text-[13px] font-semibold text-foreground">Social Links</span>
            </div>
            <div className="px-5 py-5 space-y-5">

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">LinkedIn URL</p>
                <Input
                  value={tab3.linkedin}
                  onChange={e => setTab3(p => ({ ...p, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                  type="url"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Twitter / X URL</p>
                <Input
                  value={tab3.twitter}
                  onChange={e => setTab3(p => ({ ...p, twitter: e.target.value }))}
                  placeholder="https://twitter.com/yourhandle"
                  type="url"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">GitHub URL</p>
                <Input
                  value={tab3.github}
                  onChange={e => setTab3(p => ({ ...p, github: e.target.value }))}
                  placeholder="https://github.com/yourusername"
                  type="url"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Personal Website URL</p>
                <Input
                  value={tab3.website}
                  onChange={e => setTab3(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  type="url"
                />
              </div>

              <button
                onClick={saveLinks}
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
