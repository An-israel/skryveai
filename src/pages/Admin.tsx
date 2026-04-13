import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Users, CreditCard, FileText, Image, UserCog, Activity,
  Loader2, Plus, Trash2, Edit, Search, Download, RefreshCw, BarChart3,
  Mail, Target, Send, Shield, Coins, Gift, MessageSquare, ClipboardList,
  CheckCircle, XCircle, MailCheck, ShieldCheck, Wrench, TrendingUp, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { CMSPageEditor } from "@/components/admin/CMSPageEditor";
import { CMSImageUploader } from "@/components/admin/CMSImageUploader";
import { IPAddressManager } from "@/components/admin/IPAddressManager";
import { EmailQueueManager } from "@/components/admin/EmailQueueManager";
import { CreditManager } from "@/components/admin/CreditManager";
import { ReferralManager } from "@/components/admin/ReferralManager";
import { SendUserEmailDialog } from "@/components/admin/SendUserEmailDialog";
import { StaffReports } from "@/components/admin/StaffReports";
import { PageToggleManager } from "@/components/admin/PageToggleManager";
import { AdminEmailTracker } from "@/components/admin/AdminEmailTracker";
import { ToolUsageTracker } from "@/components/admin/ToolUsageTracker";
import { CustomerSuccessDashboard } from "@/components/admin/CustomerSuccessDashboard";
import { GrowthDashboard } from "@/components/admin/GrowthDashboard";
import { AdminChatManager } from "@/components/admin/AdminChatManager";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalCampaigns: number;
  totalEmails: number;
  totalRevenue: number;
  totalEmailsSentByAll: number;
  totalRepliesByAll: number;
}

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  content: unknown;
  is_published: boolean | null;
  created_at: string;
  updated_at: string;
}

// Role-based tab definitions
type TabId = "users" | "campaigns" | "email-queue" | "pages" | "images" | "staff" | "activity" | "ip-addresses" | "credits" | "referrals" | "analytics" | "send-email" | "email-tracker" | "reports" | "page-toggle" | "tool-usage" | "cs-dashboard" | "growth" | "chat";

const TAB_PERMISSIONS: Record<TabId, string[]> = {
  "cs-dashboard": ["super_admin", "support_agent"],
  users: ["super_admin", "support_agent"],
  campaigns: ["super_admin"],
  "email-queue": ["super_admin"],
  pages: ["super_admin", "content_editor"],
  images: ["super_admin", "content_editor"],
  staff: ["super_admin"],
  activity: ["super_admin"],
  "ip-addresses": ["super_admin"],
  credits: ["super_admin"],
  referrals: ["super_admin"],
  analytics: ["super_admin", "content_editor", "support_agent"],
  "send-email": ["super_admin", "support_agent"],
  "email-tracker": ["super_admin", "support_agent"],
  reports: ["super_admin", "content_editor", "support_agent", "staff"],
  "page-toggle": ["super_admin"],
  "tool-usage": ["super_admin", "content_editor", "support_agent"],
  growth: ["super_admin", "staff"],
  chat: ["super_admin", "support_agent"],
};

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [signupTrend, setSignupTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "unverified" | "verified">("all");
  const [checkingAll, setCheckingAll] = useState(false);
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<string>("");
  
  // Email dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTarget, setEmailTarget] = useState<{ email: string; userId?: string; name?: string }>({ email: "" });
  const [userAuthStatuses, setUserAuthStatuses] = useState<Record<string, any>>({});
  const [loadingAuthStatus, setLoadingAuthStatus] = useState<Record<string, boolean>>({});
  
  // Edit user dialog state
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // CMS state
  const [showPageEditor, setShowPageEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [showImageUploader, setShowImageUploader] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSuperAdmin = userRole === "super_admin";

  const hasTabAccess = (tab: TabId) => {
    return TAB_PERMISSIONS[tab]?.includes(userRole);
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const adminRole = roles?.find(r => 
        ["super_admin", "content_editor", "support_agent", "staff"].includes(r.role)
      );

      if (!adminRole) {
        toast({ title: "Access Denied", description: "You don't have admin privileges", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      setUserRole(adminRole.role);
      setIsAdmin(true);
      loadData(adminRole.role);
    } catch (error) {
      console.error("Admin access check failed:", error);
      navigate("/dashboard");
    }
  };

  const loadData = async (role?: string) => {
    const currentRole = role || userRole;
    setLoading(true);
    try {
      // Fetch admin stats (all roles get some stats)
      const { data: statsData } = await supabase.functions.invoke("admin-stats");
      if (statsData) {
        setStats(statsData.stats);
        setActivityLog(statsData.recentActivity || []);
        const trendData = Object.entries(statsData.signupsByMonth || {}).map(([month, count]) => ({
          month, signups: count,
        }));
        setSignupTrend(trendData);
      }

      // Fetch users (super_admin and support_agent)
      if (["super_admin", "support_agent"].includes(currentRole)) {
        const { data: usersData } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        
        // Fetch subscriptions separately (no FK between profiles and subscriptions)
        const { data: subsData } = await supabase
          .from("subscriptions")
          .select("*");

        // Fetch tool usage per user (CV Builder, ATS Checker)
        const { data: toolUsageData } = await (supabase as any)
          .from("tool_usage")
          .select("user_id, tool_name");

        // Fetch campaigns per user
        const { data: campaignData } = await supabase
          .from("campaigns")
          .select("user_id");

        // Fetch autopilot configs per user
        const { data: autopilotData } = await supabase
          .from("autopilot_configs")
          .select("user_id");

        // Build product usage map
        const productUsageMap = new Map<string, Set<string>>();
        (toolUsageData || []).forEach((t: any) => {
          if (!productUsageMap.has(t.user_id)) productUsageMap.set(t.user_id, new Set());
          const toolLabels: Record<string, string> = { cv_builder: "CV Builder", ats_checker: "ATS Checker", linkedin_analyzer: "LinkedIn Analyzer", autopilot: "AutoPilot", campaign_email: "Campaign Emails" };
          const label = toolLabels[t.tool_name] || t.tool_name;
          productUsageMap.get(t.user_id)!.add(label);
        });
        (campaignData || []).forEach((c: any) => {
          if (!productUsageMap.has(c.user_id)) productUsageMap.set(c.user_id, new Set());
          productUsageMap.get(c.user_id)!.add("Campaigns");
        });
        (autopilotData || []).forEach((a: any) => {
          if (!productUsageMap.has(a.user_id)) productUsageMap.set(a.user_id, new Set());
          productUsageMap.get(a.user_id)!.add("AutoPilot");
        });
        
        const subsMap = new Map((subsData || []).map(s => [s.user_id, s]));
        const usersWithSubs = (usersData || []).map(u => ({
          ...u,
          subscriptions: subsMap.get(u.user_id) || null,
          productsUsed: Array.from(productUsageMap.get(u.user_id) || []),
        }));
        setUsers(usersWithSubs);
      }

      // Fetch campaigns (super_admin only)
      if (currentRole === "super_admin") {
        const { data: campaignsData } = await supabase
          .from("campaigns")
          .select("*")
          .order("created_at", { ascending: false });
        setCampaigns(campaignsData || []);
      }

      // Fetch CMS pages (super_admin + content_editor)
      if (["super_admin", "content_editor"].includes(currentRole)) {
        const { data: pagesData } = await supabase
          .from("cms_pages")
          .select("*")
          .order("updated_at", { ascending: false });
        setPages(pagesData || []);

        const { data: imagesData } = await supabase
          .from("cms_images")
          .select("*")
          .order("created_at", { ascending: false });
        setImages(imagesData || []);
      }

      // Fetch staff (super_admin only)
      if (currentRole === "super_admin") {
        const { data: rolesData } = await supabase.from("user_roles").select("*");
        if (rolesData) {
          const staffWithProfiles = await Promise.all(
            rolesData.map(async (role) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("user_id", role.user_id)
                .single();
              return { ...role, profiles: profile };
            })
          );
          setStaff(staffWithProfiles);
        }
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffEmail || !newStaffRole) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", newStaffEmail)
        .single();
      if (!profile) {
        toast({ title: "User not found", variant: "destructive" });
        return;
      }
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: profile.user_id,
          role: newStaffRole as "super_admin" | "content_editor" | "support_agent",
        });
      if (error) throw error;
      toast({ title: "Staff added successfully" });
      setShowAddStaffDialog(false);
      setNewStaffEmail("");
      setNewStaffRole("");
      loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add staff";
      toast({ title: message, variant: "destructive" });
    }
  };

  const handleRemoveStaff = async (roleId: string) => {
    try {
      await supabase.from("user_roles").delete().eq("id", roleId);
      toast({ title: "Staff removed" });
      loadData();
    } catch {
      toast({ title: "Failed to remove staff", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await supabase.from("profiles").delete().eq("user_id", userId);
      toast({ title: "User deleted" });
      loadData();
    } catch {
      toast({ title: "Failed to delete user", variant: "destructive" });
    }
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.full_name || "");
    setEditUserEmail(user.email || "");
    setShowEditUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editUserName.trim(), email: editUserEmail.trim() })
        .eq("user_id", editingUser.user_id);
      if (error) throw error;
      toast({ title: "User updated" });
      setShowEditUserDialog(false);
      loadData();
    } catch {
      toast({ title: "Failed to update user", variant: "destructive" });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!editingUser) return;
    if (!confirm(`Deactivate account for ${editingUser.email}? They will be unable to use the app.`)) return;
    setSavingUser(true);
    try {
      // Remove the profile row — user auth still exists but app is inaccessible without a profile
      await supabase.from("profiles").delete().eq("user_id", editingUser.user_id);
      toast({ title: "Account deactivated", description: "Profile removed. The auth account still exists but the user cannot access the app." });
      setShowEditUserDialog(false);
      loadData();
    } catch {
      toast({ title: "Failed to deactivate account", variant: "destructive" });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      const { error } = await supabase.from("cms_pages").delete().eq("id", pageId);
      if (error) throw error;
      toast({ title: "Page deleted" });
      loadData();
    } catch {
      toast({ title: "Failed to delete page", variant: "destructive" });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    try {
      const { error } = await supabase.from("cms_images").delete().eq("id", imageId);
      if (error) throw error;
      toast({ title: "Image deleted" });
      loadData();
    } catch {
      toast({ title: "Failed to delete image", variant: "destructive" });
    }
  };

  const checkUserAuthStatus = async (userId: string) => {
    setLoadingAuthStatus(prev => ({ ...prev, [userId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-auth-actions", {
        body: { action: "get-auth-status", userId },
      });
      if (error) throw error;
      setUserAuthStatuses(prev => ({ ...prev, [userId]: data }));
    } catch (error) {
      console.error("Failed to check auth status:", error);
      toast({ title: "Failed to check user status", variant: "destructive" });
    } finally {
      setLoadingAuthStatus(prev => ({ ...prev, [userId]: false }));
    }
  };

  const resendConfirmation = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-auth-actions", {
        body: { action: "resend-confirmation", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Confirmation email resent successfully" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Failed to resend", variant: "destructive" });
    }
  };

  const forceConfirmUser = async (userId: string) => {
    if (!confirm("Force confirm this user's email? They will be able to sign in immediately.")) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-auth-actions", {
        body: { action: "force-confirm", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "User email confirmed manually" });
      setUserAuthStatuses(prev => ({ ...prev, [userId]: { ...prev[userId], confirmed: true } }));
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Failed to confirm", variant: "destructive" });
    }
  };

  const checkAllUsersAuth = async () => {
    setCheckingAll(true);
    try {
      const uncheckedUsers = users.filter(u => !userAuthStatuses[u.user_id]);
      for (let i = 0; i < uncheckedUsers.length; i += 5) {
        const batch = uncheckedUsers.slice(i, i + 5);
        await Promise.all(batch.map(async (user) => {
          try {
            const { data, error } = await supabase.functions.invoke("admin-user-auth-actions", {
              body: { action: "get-auth-status", userId: user.user_id },
            });
            if (!error && data) {
              setUserAuthStatuses(prev => ({ ...prev, [user.user_id]: data }));
            }
          } catch {}
        }));
      }
      toast({ title: "All user statuses checked" });
    } catch {
      toast({ title: "Failed to check all users", variant: "destructive" });
    } finally {
      setCheckingAll(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (verificationFilter === "all") return true;
    const status = userAuthStatuses[user.user_id];
    if (!status) return verificationFilter === "unverified"; // unchecked = show in unverified
    return verificationFilter === "verified" ? status.confirmed : !status.confirmed;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // Determine default tab based on role
  const getDefaultTab = (): TabId => {
    if (isSuperAdmin) return "users";
    if (userRole === "content_editor") return "pages";
    if (userRole === "support_agent") return "cs-dashboard";
    if (userRole === "staff") return "growth";
    return "reports";
  };

  // Role label for header
  const getRoleLabel = () => {
    if (userRole === "super_admin") return "Super Admin";
    if (userRole === "content_editor") return "Marketing Manager";
    if (userRole === "support_agent") return "Customer Success";
    if (userRole === "staff") return "Growth Expert";
    return userRole;
  };

  // Visible tabs for this role
  const visibleTabs = (Object.keys(TAB_PERMISSIONS) as TabId[]).filter(tab => hasTabAccess(tab));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">
                {getRoleLabel()} — SkryveAI Management
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to App
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards - Role filtered */}
        <div className={`grid grid-cols-2 md:grid-cols-4 ${isSuperAdmin ? 'lg:grid-cols-8' : 'lg:grid-cols-4'} gap-4 mb-6`}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs">Active Subs</span>
              </div>
              <p className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs">Trial Users</span>
              </div>
              <p className="text-2xl font-bold">{stats?.trialUsers || 0}</p>
            </CardContent>
          </Card>
          {(isSuperAdmin || userRole === "content_editor") && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-xs">Campaigns</span>
                </div>
                <p className="text-2xl font-bold">{stats?.totalCampaigns || 0}</p>
              </CardContent>
            </Card>
          )}
          {isSuperAdmin && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs">Emails (DB)</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.totalEmails || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Send className="w-4 h-4" />
                    <span className="text-xs">Total Sent</span>
                  </div>
                  <p className="text-2xl font-bold text-info">{stats?.totalEmailsSentByAll || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs">Total Replies</span>
                  </div>
                  <p className="text-2xl font-bold text-warning">{stats?.totalRepliesByAll || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-xs">Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">₦{((stats?.totalRevenue || 0) / 100).toLocaleString()}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Tabs - Role filtered */}
        <Tabs defaultValue={getDefaultTab()}>
          <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
            {visibleTabs.map(tab => {
              const icons: Record<TabId, React.ReactNode> = {
                users: <Users className="w-3.5 h-3.5 shrink-0" />,
                campaigns: <Target className="w-3.5 h-3.5 shrink-0" />,
                "email-queue": <Send className="w-3.5 h-3.5 shrink-0" />,
                pages: <FileText className="w-3.5 h-3.5 shrink-0" />,
                images: <Image className="w-3.5 h-3.5 shrink-0" />,
                staff: <UserCog className="w-3.5 h-3.5 shrink-0" />,
                activity: <Activity className="w-3.5 h-3.5 shrink-0" />,
                "ip-addresses": <Shield className="w-3.5 h-3.5 shrink-0" />,
                credits: <Coins className="w-3.5 h-3.5 shrink-0" />,
                referrals: <Gift className="w-3.5 h-3.5 shrink-0" />,
                analytics: <BarChart3 className="w-3.5 h-3.5 shrink-0" />,
                "send-email": <MessageSquare className="w-3.5 h-3.5 shrink-0" />,
                "email-tracker": <MailCheck className="w-3.5 h-3.5 shrink-0" />,
                reports: <ClipboardList className="w-3.5 h-3.5 shrink-0" />,
                "page-toggle": <Shield className="w-3.5 h-3.5 shrink-0" />,
                "tool-usage": <Wrench className="w-3.5 h-3.5 shrink-0" />,
                "cs-dashboard": <Users className="w-3.5 h-3.5 shrink-0" />,
                growth: <TrendingUp className="w-3.5 h-3.5 shrink-0" />,
                chat: <MessageCircle className="w-3.5 h-3.5 shrink-0" />,
              };
              const labels: Record<TabId, string> = {
                "cs-dashboard": "CS Dashboard",
                users: "Users",
                campaigns: "Campaigns",
                "email-queue": "Queue",
                pages: "Pages",
                images: "Images",
                staff: "Staff",
                activity: "Activity",
                "ip-addresses": "IPs",
                credits: "Credits",
                referrals: "Referrals",
                analytics: "Analytics",
                "send-email": "Email Users",
                "email-tracker": "Email Tracker",
                reports: "Reports",
                "page-toggle": "Visibility",
                "tool-usage": "Tool Usage",
                growth: "Growth",
                chat: "Live Chat",
              };
              return (
                <TabsTrigger key={tab} value={tab} className="gap-1 text-xs sm:text-sm px-2 py-1.5">
                  {icons[tab]} <span className="hidden sm:inline">{labels[tab]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Users Tab */}
          {hasTabAccess("users") && (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        {userRole === "support_agent" ? "View users and send onboarding/follow-up emails" : "View and manage all users"}
                      </CardDescription>
                    </div>
                     <div className="flex flex-wrap gap-2 items-center">
                       <div className="relative flex-1 sm:flex-none">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <Input
                           placeholder="Search users..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="pl-9 w-full sm:w-56"
                         />
                       </div>
                       <Select value={verificationFilter} onValueChange={(v: "all" | "unverified" | "verified") => setVerificationFilter(v)}>
                         <SelectTrigger className="w-36">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="all">All Users</SelectItem>
                           <SelectItem value="unverified">Unverified</SelectItem>
                           <SelectItem value="verified">Verified</SelectItem>
                         </SelectContent>
                       </Select>
                       <Button variant="outline" size="sm" onClick={checkAllUsersAuth} disabled={checkingAll} className="gap-1.5">
                         {checkingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                         Check All
                       </Button>
                       <Button variant="outline" size="icon" onClick={() => loadData()}>
                         <RefreshCw className="w-4 h-4" />
                       </Button>
                     </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead>Name</TableHead>
                         <TableHead>Email</TableHead>
                         <TableHead>Verified</TableHead>
                         <TableHead>Products Used</TableHead>
                         <TableHead>Subscription</TableHead>
                         <TableHead>Joined</TableHead>
                         <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const authStatus = userAuthStatuses[user.user_id];
                        const isLoadingAuth = loadingAuthStatus[user.user_id];
                        return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="text-xs">{user.email}</TableCell>
                          <TableCell>
                            {isLoadingAuth ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : authStatus ? (
                              <div className="flex flex-col gap-1">
                                {authStatus.confirmed ? (
                                  <Badge variant="default" className="text-xs gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Verified</Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs gap-1 w-fit"><XCircle className="w-3 h-3" /> Unverified</Badge>
                                )}
                                {authStatus.has_signed_in ? (
                                  <span className="text-xs text-muted-foreground">Last login: {new Date(authStatus.last_sign_in_at).toLocaleDateString()}</span>
                                ) : (
                                  <span className="text-xs text-warning">Never signed in</span>
                                )}
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => checkUserAuthStatus(user.user_id)}>
                                Check
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-48">
                              {user.productsUsed?.length > 0 ? user.productsUsed.map((p: string) => (
                                <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {p}
                                </Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.subscriptions?.status === "active" ? "default" : "secondary"}>
                              {user.subscriptions?.status || "none"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {/* Resend confirmation - show if user is unverified */}
                              {authStatus && !authStatus.confirmed && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Resend confirmation email"
                                    onClick={() => resendConfirmation(user.user_id)}
                                  >
                                    <MailCheck className="w-4 h-4 text-warning" />
                                  </Button>
                                  {isSuperAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Force confirm email"
                                      onClick={() => forceConfirmUser(user.user_id)}
                                    >
                                      <ShieldCheck className="w-4 h-4 text-green-600" />
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Send email"
                                onClick={() => {
                                  setEmailTarget({ email: user.email, userId: user.user_id, name: user.full_name });
                                  setShowEmailDialog(true);
                                }}
                              >
                                <MessageSquare className="w-4 h-4 text-primary" />
                              </Button>
                              {isSuperAdmin && (
                                <>
                                  <Button variant="ghost" size="icon" title="Edit user" onClick={() => openEditUser(user)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" title="Delete user" onClick={() => handleDeleteUser(user.user_id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Campaigns Tab */}
          {hasTabAccess("campaigns") && (
            <TabsContent value="campaigns">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Overview</CardTitle>
                  <CardDescription>All campaigns across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Emails Sent</TableHead>
                        <TableHead>Open Rate</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell>{campaign.business_type}</TableCell>
                          <TableCell>{campaign.location}</TableCell>
                          <TableCell>
                            <Badge variant={campaign.status === "completed" ? "default" : "secondary"}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{campaign.emails_sent}</TableCell>
                          <TableCell>
                            {campaign.emails_sent > 0
                              ? `${Math.round((campaign.emails_opened / campaign.emails_sent) * 100)}%`
                              : "N/A"}
                          </TableCell>
                          <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Email Queue Tab */}
          {hasTabAccess("email-queue") && (
            <TabsContent value="email-queue"><EmailQueueManager /></TabsContent>
          )}

          {/* Pages Tab */}
          {hasTabAccess("pages") && (
            <TabsContent value="pages">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>CMS Pages</CardTitle>
                    <CardDescription>Manage website content and pages</CardDescription>
                  </div>
                  <Button className="gap-2" onClick={() => { setEditingPage(null); setShowPageEditor(true); }}>
                    <Plus className="w-4 h-4" /> Add Page
                  </Button>
                </CardHeader>
                <CardContent>
                  {pages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No pages created yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pages.map((page) => (
                          <TableRow key={page.id}>
                            <TableCell className="font-medium">{page.title}</TableCell>
                            <TableCell>/{page.slug}</TableCell>
                            <TableCell>
                              <Badge variant={page.is_published ? "default" : "secondary"}>
                                {page.is_published ? "Published" : "Draft"}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(page.updated_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingPage(page); setShowPageEditor(true); }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {isSuperAdmin && (
                                  <Button variant="ghost" size="icon" onClick={() => handleDeletePage(page.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Images Tab */}
          {hasTabAccess("images") && (
            <TabsContent value="images">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Image Library</CardTitle>
                    <CardDescription>Manage all uploaded images</CardDescription>
                  </div>
                  <Button className="gap-2" onClick={() => setShowImageUploader(true)}>
                    <Plus className="w-4 h-4" /> Upload Image
                  </Button>
                </CardHeader>
                <CardContent>
                  {images.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No images uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {images.map((image) => (
                        <div key={image.id} className="relative group">
                          <img src={image.url} alt={image.alt_text || image.name} className="w-full h-32 object-cover rounded-lg" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button size="icon" variant="ghost" className="text-white" onClick={() => window.open(image.url, "_blank")}>
                              <Download className="w-4 h-4" />
                            </Button>
                            {isSuperAdmin && (
                              <Button size="icon" variant="ghost" className="text-white" onClick={() => handleDeleteImage(image.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{image.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Staff Tab - super_admin only */}
          {hasTabAccess("staff") && (
            <TabsContent value="staff">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Staff Management</CardTitle>
                    <CardDescription>Manage admin team and roles</CardDescription>
                  </div>
                  <Dialog open={showAddStaffDialog} onOpenChange={setShowAddStaffDialog}>
                    <DialogTrigger asChild>
                      <Button className="gap-2"><Plus className="w-4 h-4" /> Add Staff</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Staff Member</DialogTitle>
                        <DialogDescription>Add a new admin, marketing manager, or customer success agent</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input placeholder="staff@example.com" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={newStaffRole} onValueChange={setNewStaffRole}>
                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="content_editor">Marketing Manager</SelectItem>
                              <SelectItem value="support_agent">Customer Success</SelectItem>
                              <SelectItem value="staff">Growth Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddStaffDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddStaff}>Add Staff</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.profiles?.full_name || "Unknown"}</TableCell>
                          <TableCell>{member.profiles?.email || "Unknown"}</TableCell>
                          <TableCell>
                             <Badge variant={member.role === "super_admin" ? "default" : "secondary"}>
                              {member.role === "content_editor" ? "Marketing Manager" : member.role === "support_agent" ? "Customer Success" : member.role === "staff" ? "Growth Expert" : member.role.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveStaff(member.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Activity Tab */}
          {hasTabAccess("activity") && (
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>Recent system activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLog.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-medium">{activity.action}</TableCell>
                          <TableCell><Badge variant="outline">{activity.entity_type}</Badge></TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">{JSON.stringify(activity.details)}</TableCell>
                          <TableCell>{new Date(activity.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {activityLog.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No activity recorded yet</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* IP Addresses Tab */}
          {hasTabAccess("ip-addresses") && (
            <TabsContent value="ip-addresses"><IPAddressManager /></TabsContent>
          )}

          {/* Analytics Tab */}
          {hasTabAccess("analytics") && (
            <TabsContent value="analytics">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                    <CardDescription>Monthly signups over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={signupTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Breakdown</CardTitle>
                    <CardDescription>Current subscription status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: "Trial", count: stats?.trialUsers || 0 },
                          { name: "Active", count: stats?.activeSubscriptions || 0 },
                          { name: "Total", count: stats?.totalUsers || 0 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Credits Tab */}
          {hasTabAccess("credits") && (
            <TabsContent value="credits"><CreditManager /></TabsContent>
          )}

          {/* Referrals Tab */}
          {hasTabAccess("referrals") && (
            <TabsContent value="referrals"><ReferralManager /></TabsContent>
          )}

          {/* Send Email Tab */}
          {hasTabAccess("send-email") && (
            <TabsContent value="send-email">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Email Users
                  </CardTitle>
                  <CardDescription>
                    Send onboarding, follow-up, or conversion emails to users. Select a user from the Users tab or compose directly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button
                      className="gap-2"
                      onClick={() => {
                        setEmailTarget({ email: "" });
                        setShowEmailDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4" /> Compose Email
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      💡 Tip: You can also click the email icon next to any user in the <strong>Users</strong> tab to send them a pre-filled email using templates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Email Tracker Tab */}
          {hasTabAccess("email-tracker") && (
            <TabsContent value="email-tracker">
              <AdminEmailTracker />
            </TabsContent>
          )}

          {/* Reports Tab */}
          {hasTabAccess("reports") && (
            <TabsContent value="reports">
              <StaffReports userRole={userRole} isSuperAdmin={isSuperAdmin} />
            </TabsContent>
          )}

          {/* Page Toggle Tab */}
          {hasTabAccess("page-toggle") && (
            <TabsContent value="page-toggle">
              <PageToggleManager />
            </TabsContent>
          )}

          {/* Tool Usage Tab */}
          {hasTabAccess("tool-usage") && (
            <TabsContent value="tool-usage">
              <ToolUsageTracker />
            </TabsContent>
          )}

          {/* CS Dashboard Tab */}
          {hasTabAccess("cs-dashboard") && (
            <TabsContent value="cs-dashboard">
              <CustomerSuccessDashboard />
            </TabsContent>
          )}

          {/* Growth Dashboard Tab */}
          {hasTabAccess("growth") && (
            <TabsContent value="growth">
              <GrowthDashboard />
            </TabsContent>
          )}

          {/* Live Chat Tab */}
          {hasTabAccess("chat") && (
            <TabsContent value="chat">
              <AdminChatManager />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* CMS Page Editor Dialog */}
      <CMSPageEditor open={showPageEditor} onOpenChange={setShowPageEditor} page={editingPage} onSave={() => loadData()} />

      {/* CMS Image Uploader Dialog */}
      <CMSImageUploader open={showImageUploader} onOpenChange={setShowImageUploader} onUpload={() => loadData()} />

      {/* Send Email Dialog */}
      <SendUserEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        userEmail={emailTarget.email}
        userId={emailTarget.userId}
        userName={emailTarget.name}
      />

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update this user's profile details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={editUserName} onChange={(e) => setEditUserName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={editUserEmail} onChange={(e) => setEditUserEmail(e.target.value)} placeholder="Email address" type="email" />
            </div>
            {editingUser && (
              <div className="text-xs text-muted-foreground border rounded p-2 space-y-0.5">
                <p><span className="font-medium">User ID:</span> {editingUser.user_id}</p>
                <p><span className="font-medium">Joined:</span> {editingUser.created_at ? new Date(editingUser.created_at).toLocaleDateString() : "—"}</p>
                <p><span className="font-medium">Subscription:</span> {editingUser.subscriptions?.status || "none"}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="destructive"
              onClick={handleDeactivateUser}
              disabled={savingUser}
              className="w-full sm:w-auto"
            >
              Deactivate Account
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditUserDialog(false)} disabled={savingUser}>Cancel</Button>
              <Button onClick={handleSaveUser} disabled={savingUser}>
                {savingUser ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
