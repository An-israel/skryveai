import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  Bell,
  Shield,
  Briefcase,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TalentPrefs {
  id: string;
  username: string | null;
  notif_email_jobs: boolean;
  notif_email_apps: boolean;
  notif_email_messages: boolean;
  notif_email_offers: boolean;
  notif_email_projects: boolean;
  notif_email_events: boolean;
  notif_email_learning: boolean;
  notif_email_marketing: boolean;
  notif_push_enabled: boolean;
  profile_visibility: string;
  who_can_message: string;
  show_earnings: boolean;
}

// ── Job prefs constants ────────────────────────────────────────────────────────

const EXPERTISE_OPTIONS = [
  "3D Design","Affiliate Marketing","AI Development","Amazon FBA","Animation",
  "API Development","Backend Development","Blockchain","Blog Writing","Brand Identity",
  "Business Consulting","Cloud Services","Content Marketing","Content Writing",
  "Copywriting","Custom Software","Customer Support","Cybersecurity","Data Entry",
  "Data Science","DevOps","Digital Strategy","Dropshipping","E-commerce","Email Marketing",
  "Frontend Development","Full Stack Development","Game Development","Ghostwriting",
  "Google Ads","Graphic Design","Growth Hacking","GRC Consulting","Illustration",
  "Influencer Marketing","IT Support","Lead Generation","Logo Design","Machine Learning",
  "Market Research","Mobile App Development","Motion Graphics","Network Security",
  "No-Code Development","Penetration Testing","Photography","Podcast Production",
  "PPC Advertising","Product Design","Product Listing","Product Management",
  "Project Management","Proofreading","Public Relations","Sales","Scriptwriting",
  "SEO","Shopify","Social Media Management","Social Media Marketing",
  "SaaS Development","Supply Chain","Technical Writing","Translation","UI/UX Design",
  "Video Editing","Video Production","Virtual Assistant","Voice Over",
  "Web Design","Web Development","Webflow","WordPress",
];

const JOB_TYPES = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const CURRENCIES = ["USD","EUR","GBP","NGN","CAD","AUD","GHS","KES","ZAR"];

// ── Nav items ──────────────────────────────────────────────────────────────────

type Section = "account" | "notifications" | "privacy" | "job-preferences" | "danger";

const NAV_ITEMS: { value: Section; label: string; icon: React.ReactNode }[] = [
  { value: "account", label: "Account", icon: <User className="w-4 h-4" /> },
  { value: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { value: "privacy", label: "Privacy", icon: <Shield className="w-4 h-4" /> },
  { value: "job-preferences", label: "Job Preferences", icon: <Briefcase className="w-4 h-4" /> },
  { value: "danger", label: "Danger Zone", icon: <AlertTriangle className="w-4 h-4 text-destructive" /> },
];

// ── Shared panel primitives ────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden mb-4">
      {children}
    </div>
  );
}

function PanelHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-5 py-3.5 border-b border-border">
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function PanelBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-4 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      {children}
    </div>
  );
}

function RowLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-foreground">{label}</p>
      {sub && <p className="text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
      {children}
    </p>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
    >
      {children}
    </button>
  );
}

function DangerButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-[13px] font-medium hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
    >
      {children}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>("account");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [talentId, setTalentId] = useState<string | null>(null);

  // Account
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState({
    notif_email_jobs: true,
    notif_email_apps: true,
    notif_email_messages: true,
    notif_email_offers: true,
    notif_email_projects: true,
    notif_email_events: true,
    notif_email_learning: true,
    notif_email_marketing: false,
    notif_push_enabled: true,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Privacy
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [whoCanMessage, setWhoCanMessage] = useState("everyone");
  const [showEarnings, setShowEarnings] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Job preferences
  const [jpJobTypes, setJpJobTypes] = useState<string[]>([]);
  const [jpRateMin, setJpRateMin] = useState("");
  const [jpCurrency, setJpCurrency] = useState("USD");
  const [jpSkillSearch, setJpSkillSearch] = useState("");
  const [jpSkills, setJpSkills] = useState<string[]>([]);
  const [savingJobPrefs, setSavingJobPrefs] = useState(false);

  // Danger zone
  const [deleteInput, setDeleteInput] = useState("");
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate("/login");
        return;
      }
      const uid = data.user.id;
      setUserId(uid);
      setUserEmail(data.user.email || "");

      const { data: talent } = await (supabase as any)
        .from("talent_profiles")
        .select(
          "id, username, notif_email_jobs, notif_email_apps, notif_email_messages, notif_email_offers, notif_email_projects, notif_email_events, notif_email_learning, notif_email_marketing, notif_push_enabled, profile_visibility, who_can_message, show_earnings"
        )
        .eq("user_id", uid)
        .maybeSingle();

      if (talent) {
        setTalentId(talent.id);
        setUsername(talent.username || "");
        setNotifPrefs({
          notif_email_jobs: talent.notif_email_jobs ?? true,
          notif_email_apps: talent.notif_email_apps ?? true,
          notif_email_messages: talent.notif_email_messages ?? true,
          notif_email_offers: talent.notif_email_offers ?? true,
          notif_email_projects: talent.notif_email_projects ?? true,
          notif_email_events: talent.notif_email_events ?? true,
          notif_email_learning: talent.notif_email_learning ?? true,
          notif_email_marketing: talent.notif_email_marketing ?? false,
          notif_push_enabled: talent.notif_push_enabled ?? true,
        });
        setProfileVisibility(talent.profile_visibility || "public");
        setWhoCanMessage(talent.who_can_message || "everyone");
        setShowEarnings(talent.show_earnings ?? false);

        const { data: prefs } = await (supabase as any)
          .from("job_preferences")
          .select("job_types, budget_min, budget_currency, secondary_skills")
          .eq("talent_id", talent.id)
          .maybeSingle();

        if (prefs) {
          setJpJobTypes(prefs.job_types || []);
          setJpRateMin(prefs.budget_min ? String(prefs.budget_min) : "");
          setJpCurrency(prefs.budget_currency || "USD");
          setJpSkills(prefs.secondary_skills || []);
        }
      }

      setLoading(false);
    });
  }, [navigate]);

  // ── Save handlers ──────────────────────────────────────────────────────────────

  const saveAccount = async () => {
    if (!userId) return;
    setSavingAccount(true);
    try {
      if (talentId && username) {
        const { error } = await (supabase as any)
          .from("talent_profiles")
          .update({ username })
          .eq("id", talentId);
        if (error) throw error;
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast({ title: "Passwords do not match", variant: "destructive" });
          setSavingAccount(false);
          return;
        }
        if (newPassword.length < 8) {
          toast({ title: "Password must be at least 8 characters", variant: "destructive" });
          setSavingAccount(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      toast({ title: "Account settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSavingAccount(false);
  };

  const saveNotifications = async () => {
    if (!userId) return;
    setSavingNotifs(true);
    try {
      const { error } = await (supabase as any)
        .from("talent_profiles")
        .upsert({ user_id: userId, ...notifPrefs }, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Notification preferences saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSavingNotifs(false);
  };

  const savePrivacy = async () => {
    if (!userId) return;
    setSavingPrivacy(true);
    try {
      const { error } = await (supabase as any)
        .from("talent_profiles")
        .upsert(
          { user_id: userId, profile_visibility: profileVisibility, who_can_message: whoCanMessage, show_earnings: showEarnings },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      toast({ title: "Privacy settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSavingPrivacy(false);
  };

  const saveJobPrefs = async () => {
    if (!talentId) return;
    setSavingJobPrefs(true);
    try {
      const { error } = await (supabase as any)
        .from("job_preferences")
        .upsert(
          {
            talent_id: talentId,
            job_types: jpJobTypes,
            budget_min: jpRateMin ? parseFloat(jpRateMin) : null,
            budget_currency: jpCurrency,
            secondary_skills: jpSkills,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "talent_id" }
        );
      if (error) throw error;
      toast({ title: "Job preferences saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSavingJobPrefs(false);
  };

  const deleteAccount = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      if (talentId) {
        await (supabase as any)
          .from("talent_profiles")
          .update({ is_deleted: true })
          .eq("id", talentId);
      }
      await supabase.auth.signOut();
      navigate("/");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────────

  const toggleJobType = (val: string) => {
    setJpJobTypes((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
    );
  };

  const toggleSkill = (skill: string) => {
    setJpSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : prev.length < 10
        ? [...prev, skill]
        : prev
    );
  };

  const filteredSkills = jpSkillSearch
    ? EXPERTISE_OPTIONS.filter((s) =>
        s.toLowerCase().includes(jpSkillSearch.toLowerCase())
      )
    : EXPERTISE_OPTIONS;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Manage your account, preferences, and privacy</p>
      </div>

      <div className="flex gap-8 lg:items-start">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-0.5 w-48 shrink-0 sticky top-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveSection(item.value)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left ${
                activeSection === item.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </aside>

        {/* Mobile tab bar */}
        <div className="lg:hidden w-full overflow-x-auto mb-2">
          <div className="flex gap-0.5 border-b border-border pb-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveSection(item.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
                  activeSection === item.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── Account ── */}
          {activeSection === "account" && (
            <div>
              {/* Email */}
              <Panel>
                <PanelHeader title="Email Address" sub="Your sign-in email address" />
                <PanelBody>
                  <div>
                    <FormLabel>Email</FormLabel>
                    <Input value={userEmail} disabled className="h-9 text-[13px] bg-muted" />
                  </div>
                  <button
                    className="text-[13px] text-primary hover:underline"
                    onClick={() =>
                      toast({
                        title: "Email change",
                        description: "We'll send a verification email to your new address.",
                      })
                    }
                  >
                    Change email address
                  </button>
                </PanelBody>
              </Panel>

              {/* Username */}
              <Panel>
                <PanelHeader title="Username" sub="Your public username on Skryve" />
                <PanelBody>
                  <div>
                    <FormLabel>Username</FormLabel>
                    <div className="flex items-center">
                      <span className="px-3 h-9 flex items-center border border-r-0 rounded-l-md bg-muted text-muted-foreground text-[13px] border-input">
                        @
                      </span>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="yourusername"
                        className="rounded-l-none h-9 text-[13px]"
                      />
                    </div>
                  </div>
                </PanelBody>
              </Panel>

              {/* Password */}
              <Panel>
                <PanelHeader title="Change Password" sub="Update your account password" />
                <PanelBody>
                  <div>
                    <FormLabel>Current Password</FormLabel>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div>
                    <FormLabel>New Password</FormLabel>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div>
                    <FormLabel>Confirm New Password</FormLabel>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 text-[13px]"
                    />
                  </div>
                </PanelBody>
              </Panel>

              <div className="flex justify-end">
                <PrimaryButton onClick={saveAccount} disabled={savingAccount}>
                  {savingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save changes
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeSection === "notifications" && (
            <div>
              <Panel>
                <PanelHeader title="Email Notifications" sub="Choose which emails you want to receive" />
                <div className="px-5 divide-y divide-border">
                  {(
                    [
                      ["notif_email_jobs", "New job matches", "Get notified when new jobs match your profile"],
                      ["notif_email_apps", "Application updates", "Status changes on your applications"],
                      ["notif_email_messages", "New messages", "When someone sends you a message"],
                      ["notif_email_offers", "Offers", "When you receive a job offer"],
                      ["notif_email_projects", "Project updates", "Updates on active projects"],
                      ["notif_email_events", "Event reminders", "Upcoming events and webinars"],
                      ["notif_email_learning", "Learning updates", "New courses and learning content"],
                      ["notif_email_marketing", "Marketing & tips", "Product news and tips from Skryve"],
                    ] as [keyof typeof notifPrefs, string, string][]
                  ).map(([key, label, sub]) => (
                    <Row key={key}>
                      <RowLabel label={label} sub={sub} />
                      <Switch
                        checked={notifPrefs[key] as boolean}
                        onCheckedChange={(v) =>
                          setNotifPrefs((prev) => ({ ...prev, [key]: v }))
                        }
                      />
                    </Row>
                  ))}
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Push Notifications" sub="Browser and device notifications" />
                <div className="px-5 divide-y divide-border">
                  <Row>
                    <RowLabel label="Enable push notifications" sub="Receive browser and device push notifications" />
                    <Switch
                      checked={notifPrefs.notif_push_enabled}
                      onCheckedChange={(v) =>
                        setNotifPrefs((prev) => ({ ...prev, notif_push_enabled: v }))
                      }
                    />
                  </Row>
                </div>
              </Panel>

              <div className="flex justify-end">
                <PrimaryButton onClick={saveNotifications} disabled={savingNotifs}>
                  {savingNotifs && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save preferences
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── Privacy ── */}
          {activeSection === "privacy" && (
            <div>
              <Panel>
                <PanelHeader title="Privacy Settings" sub="Control who can see your profile and contact you" />
                <PanelBody>
                  <div>
                    <FormLabel>Profile visibility</FormLabel>
                    <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="registered">Registered users only</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FormLabel>Who can message me</FormLabel>
                    <Select value={whoCanMessage} onValueChange={setWhoCanMessage}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="worked_with">Only people I've worked with</SelectItem>
                        <SelectItem value="nobody">Nobody</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PanelBody>

                <div className="px-5 divide-y divide-border border-t border-border">
                  <Row>
                    <RowLabel
                      label="Show earnings on profile"
                      sub="Clients will be able to see your earnings history"
                    />
                    <Switch checked={showEarnings} onCheckedChange={setShowEarnings} />
                  </Row>
                </div>
              </Panel>

              <div className="flex justify-end">
                <PrimaryButton onClick={savePrivacy} disabled={savingPrivacy}>
                  {savingPrivacy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save changes
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── Job Preferences ── */}
          {activeSection === "job-preferences" && (
            <div>
              <Panel>
                <PanelHeader title="Job Types" sub="Select the work arrangements you prefer" />
                <PanelBody>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map((jt) => (
                      <label
                        key={jt.value}
                        className="flex items-center gap-2 cursor-pointer border border-border rounded-lg px-4 py-2 hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={jpJobTypes.includes(jt.value)}
                          onCheckedChange={() => toggleJobType(jt.value)}
                        />
                        <span className="text-[13px] font-medium">{jt.label}</span>
                      </label>
                    ))}
                  </div>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Desired Rate" sub="Set your minimum acceptable rate" />
                <PanelBody>
                  <div>
                    <FormLabel>Currency &amp; minimum rate</FormLabel>
                    <div className="flex gap-2">
                      <Select value={jpCurrency} onValueChange={setJpCurrency}>
                        <SelectTrigger className="w-28 h-9 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Min rate (e.g. 500)"
                        value={jpRateMin}
                        onChange={(e) => setJpRateMin(e.target.value)}
                        className="flex-1 h-9 text-[13px]"
                      />
                    </div>
                  </div>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Skills of Interest" sub="Select up to 10 skills you want to work with" />
                <PanelBody>
                  {jpSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {jpSkills.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1 text-[12px]">
                          {s}
                          <button onClick={() => toggleSkill(s)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Input
                    placeholder="Search skills..."
                    value={jpSkillSearch}
                    onChange={(e) => setJpSkillSearch(e.target.value)}
                    className="h-9 text-[13px]"
                  />
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredSkills.map((skill) => (
                      <label
                        key={skill}
                        className="flex items-center gap-2 cursor-pointer text-[13px]"
                      >
                        <Checkbox
                          checked={jpSkills.includes(skill)}
                          onCheckedChange={() => toggleSkill(skill)}
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                </PanelBody>
              </Panel>

              <div className="flex justify-end">
                <PrimaryButton onClick={saveJobPrefs} disabled={savingJobPrefs}>
                  {savingJobPrefs && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save preferences
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── Danger Zone ── */}
          {activeSection === "danger" && (
            <div>
              <div className="border border-destructive/30 rounded-xl bg-card overflow-hidden mb-4">
                <div className="px-5 py-3.5 border-b border-destructive/20 bg-destructive/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <p className="text-[13px] font-semibold text-destructive">Danger Zone</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">These actions are irreversible. Proceed with caution.</p>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">Delete Account</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <div>
                    <FormLabel>Type DELETE to confirm</FormLabel>
                    <Input
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="DELETE"
                      className="h-9 text-[13px] max-w-xs"
                    />
                  </div>
                  <DangerButton
                    onClick={() => setShowDeleteStep2(true)}
                    disabled={deleteInput !== "DELETE"}
                  >
                    Delete my account
                  </DangerButton>
                </div>
              </div>

              <AlertDialog open={showDeleteStep2} onOpenChange={setShowDeleteStep2}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your account and all data will be permanently deleted. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={deleteAccount}
                      disabled={deleting}
                    >
                      {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
