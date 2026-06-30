import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Save,
  X,
  Palette,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeSelector } from "@/components/settings/ThemeSelector";

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

import { ALL_SKILLS as EXPERTISE_OPTIONS } from "@/lib/skills";

const JOB_TYPES = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const CURRENCIES = ["USD","EUR","GBP","NGN","CAD","AUD","GHS","KES","ZAR"];

// ── Nav items ──────────────────────────────────────────────────────────────────

type Section = "account" | "appearance" | "notifications" | "privacy" | "job-preferences" | "danger";

const NAV_ITEMS: { value: Section; label: string; icon: React.ReactNode }[] = [
  { value: "account", label: "Account", icon: <User className="w-4 h-4" /> },
  { value: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
  { value: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { value: "privacy", label: "Privacy", icon: <Shield className="w-4 h-4" /> },
  { value: "job-preferences", label: "Job Preferences", icon: <Briefcase className="w-4 h-4" /> },
  { value: "danger", label: "Danger Zone", icon: <AlertTriangle className="w-4 h-4 text-destructive" /> },
];

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

        // Load job prefs
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
      // Username
      if (talentId && username) {
        const { error } = await (supabase as any)
          .from("talent_profiles")
          .update({ username })
          .eq("id", talentId);
        if (error) throw error;
      }

      // Password
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
    <div className="max-w-5xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="flex gap-6 lg:items-start">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col gap-1 w-52 shrink-0 sticky top-4">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveSection(item.value)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
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
            <div className="flex gap-1 border-b pb-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setActiveSection(item.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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
          <div className="flex-1 min-w-0 space-y-6">
            {/* ── Account ── */}
            {activeSection === "account" && (
              <div className="space-y-6">
                {/* Email */}
                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-semibold text-base">Email Address</h2>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={userEmail} disabled className="bg-muted" />
                    <button
                      className="text-sm text-primary hover:underline"
                      onClick={() =>
                        toast({
                          title: "Email change",
                          description:
                            "We'll send a verification email to your new address.",
                        })
                      }
                    >
                      Change Email
                    </button>
                  </div>
                </section>

                {/* Username */}
                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-semibold text-base">Username</h2>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="flex items-center">
                      <span className="px-3 py-2 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">
                        @
                      </span>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="yourusername"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Password */}
                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-semibold text-base">Change Password</h2>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="currentPwd">Current Password</Label>
                      <Input
                        id="currentPwd"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPwd">New Password</Label>
                      <Input
                        id="newPwd"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPwd">Confirm New Password</Label>
                      <Input
                        id="confirmPwd"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex justify-end">
                  <Button onClick={saveAccount} disabled={savingAccount} className="gap-2">
                    {savingAccount ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}

            {/* ── Appearance ── */}
            {activeSection === "appearance" && (
              <div className="space-y-6">
                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="font-semibold text-base">Theme</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose how Skryve looks to you. Select a single theme, or sync
                      with your device's system settings.
                    </p>
                  </div>
                  <ThemeSelector />
                </section>
              </div>
            )}

            {/* ── Notifications ── */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-semibold text-base">Email Notifications</h2>
                  <div className="space-y-4">
                    {(
                      [
                        ["notif_email_jobs", "New job matches"],
                        ["notif_email_apps", "Application updates"],
                        ["notif_email_messages", "New messages"],
                        ["notif_email_offers", "Offers"],
                        ["notif_email_projects", "Project updates"],
                        ["notif_email_events", "Event reminders"],
                        ["notif_email_learning", "Learning updates"],
                        ["notif_email_marketing", "Marketing & tips"],
                      ] as [keyof typeof notifPrefs, string][]
                    ).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Email: {label}</p>
                        </div>
                        <Switch
                          checked={notifPrefs[key] as boolean}
                          onCheckedChange={(v) =>
                            setNotifPrefs((prev) => ({ ...prev, [key]: v }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-semibold text-base">Push Notifications</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Push notifications</p>
                      <p className="text-xs text-muted-foreground">
                        Receive browser / device push notifications
                      </p>
                    </div>
                    <Switch
                      checked={notifPrefs.notif_push_enabled}
                      onCheckedChange={(v) =>
                        setNotifPrefs((prev) => ({ ...prev, notif_push_enabled: v }))
                      }
                    />
                  </div>
                </section>

                <div className="flex justify-end">
                  <Button onClick={saveNotifications} disabled={savingNotifs} className="gap-2">
                    {savingNotifs ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}

            {/* ── Privacy ── */}
            {activeSection === "privacy" && (
              <div className="space-y-6">
                <section className="bg-card border border-border rounded-xl p-6 space-y-5">
                  <h2 className="font-semibold text-base">Privacy Settings</h2>

                  <div className="space-y-2">
                    <Label>Profile visibility</Label>
                    <Select
                      value={profileVisibility}
                      onValueChange={setProfileVisibility}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="registered">
                          Registered users only
                        </SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Who can message me</Label>
                    <Select
                      value={whoCanMessage}
                      onValueChange={setWhoCanMessage}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="worked_with">
                          Only people I've worked with
                        </SelectItem>
                        <SelectItem value="nobody">Nobody</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Show my earnings on profile
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Clients will be able to see your earnings history
                      </p>
                    </div>
                    <Switch
                      checked={showEarnings}
                      onCheckedChange={setShowEarnings}
                    />
                  </div>
                </section>

                <div className="flex justify-end">
                  <Button onClick={savePrivacy} disabled={savingPrivacy} className="gap-2">
                    {savingPrivacy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            )}

            {/* ── Job Preferences ── */}
            {activeSection === "job-preferences" && (
              <div className="space-y-6">
                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-semibold text-base">Job Types</h2>
                  <div className="flex flex-wrap gap-3">
                    {JOB_TYPES.map((jt) => (
                      <label
                        key={jt.value}
                        className="flex items-center gap-2 cursor-pointer border border-border rounded-lg px-4 py-2 hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={jpJobTypes.includes(jt.value)}
                          onCheckedChange={() => toggleJobType(jt.value)}
                        />
                        <span className="text-sm font-medium">{jt.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-semibold text-base">Desired Rate Range</h2>
                  <div className="flex gap-3">
                    <Select
                      value={jpCurrency}
                      onValueChange={setJpCurrency}
                    >
                      <SelectTrigger className="w-28">
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
                    <Input
                      type="number"
                      placeholder="Min rate (e.g. 500)"
                      value={jpRateMin}
                      onChange={(e) => setJpRateMin(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </section>

                <section className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-semibold text-base">Skills of Interest</h2>
                  <p className="text-xs text-muted-foreground">Select up to 10 skills</p>
                  {jpSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {jpSkills.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1">
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
                  />
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredSkills.map((skill) => (
                      <label
                        key={skill}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={jpSkills.includes(skill)}
                          onCheckedChange={() => toggleSkill(skill)}
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                </section>

                <div className="flex justify-end">
                  <Button onClick={saveJobPrefs} disabled={savingJobPrefs} className="gap-2">
                    {savingJobPrefs ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}

            {/* ── Danger Zone ── */}
            {activeSection === "danger" && (
              <section className="bg-card border-2 border-destructive rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <h2 className="font-semibold text-base">Danger Zone</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="deleteConfirm">
                    Type <strong>DELETE</strong> to enable the delete button
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>

                <Button
                  variant="destructive"
                  disabled={deleteInput !== "DELETE"}
                  onClick={() => setShowDeleteStep2(true)}
                >
                  Delete Account
                </Button>

                <AlertDialog
                  open={showDeleteStep2}
                  onOpenChange={setShowDeleteStep2}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your account and all data will be permanently deleted.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={deleteAccount}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
