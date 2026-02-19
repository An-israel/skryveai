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
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Image,
  UserCog,
  Activity,
  Loader2,
  Plus,
  Trash2,
  Edit,
  Search,
  Download,
  RefreshCw,
  BarChart3,
  Mail,
  Target,
  Send,
  Shield,
  Coins,
  Gift,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<string>("");
  
  // CMS state
  const [showPageEditor, setShowPageEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [showImageUploader, setShowImageUploader] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

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

      const hasAdminRole = roles?.some(r => 
        ["super_admin", "content_editor", "support_agent"].includes(r.role)
      );

      if (!hasAdminRole) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      loadData();
    } catch (error) {
      console.error("Admin access check failed:", error);
      navigate("/dashboard");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch admin stats
      const { data: statsData } = await supabase.functions.invoke("admin-stats");
      if (statsData) {
        setStats(statsData.stats);
        setActivityLog(statsData.recentActivity || []);
        
        // Transform signup trend for chart
        const trendData = Object.entries(statsData.signupsByMonth || {}).map(([month, count]) => ({
          month,
          signups: count,
        }));
        setSignupTrend(trendData);
      }

      // Fetch users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*, subscriptions(*)")
        .order("created_at", { ascending: false });
      setUsers(usersData || []);

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      setCampaigns(campaignsData || []);

      // Fetch CMS pages
      const { data: pagesData } = await supabase
        .from("cms_pages")
        .select("*")
        .order("updated_at", { ascending: false });
      setPages(pagesData || []);

      // Fetch images
      const { data: imagesData } = await supabase
        .from("cms_images")
        .select("*")
        .order("created_at", { ascending: false });
      setImages(imagesData || []);

      // Fetch staff with profiles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("*");
      
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
      // Find user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", newStaffEmail)
        .single();

      if (!profile) {
        toast({ title: "User not found", variant: "destructive" });
        return;
      }

      // Add role
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

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
              <p className="text-xs text-muted-foreground">SkryveAI Management</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to App
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs">Campaigns</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalCampaigns || 0}</p>
            </CardContent>
          </Card>
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
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-4 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 h-auto gap-1">
            <TabsTrigger value="users" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Users className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Target className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Campaigns</span>
            </TabsTrigger>
            <TabsTrigger value="email-queue" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Send className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Queue</span>
            </TabsTrigger>
            <TabsTrigger value="pages" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <FileText className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Pages</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Image className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <UserCog className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Activity className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="ip-addresses" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Shield className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">IPs</span>
            </TabsTrigger>
            <TabsTrigger value="credits" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Coins className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Credits</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Gift className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <BarChart3 className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all users</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-64"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={loadData}>
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
                      <TableHead>Expertise</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(user.expertise || []).slice(0, 2).map((skill: string) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {(user.expertise?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.expertise.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.subscriptions?.status === "active" ? "default" : "secondary"}>
                            {user.subscriptions?.status || "none"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(user.user_id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
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

          {/* Email Queue Tab */}
          <TabsContent value="email-queue">
            <EmailQueueManager />
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>CMS Pages</CardTitle>
                  <CardDescription>Manage website content and pages</CardDescription>
                </div>
                <Button className="gap-2" onClick={() => {
                  setEditingPage(null);
                  setShowPageEditor(true);
                }}>
                  <Plus className="w-4 h-4" /> Add Page
                </Button>
              </CardHeader>
              <CardContent>
                {pages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No pages created yet. Click "Add Page" to create your first page.
                  </p>
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
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditingPage(page);
                                  setShowPageEditor(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeletePage(page.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
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

          {/* Images Tab */}
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
                  <p className="text-muted-foreground text-center py-8">
                    No images uploaded yet. Click "Upload Image" to add your first image.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.url}
                          alt={image.alt_text || image.name}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-white"
                            onClick={() => window.open(image.url, "_blank")}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-white"
                            onClick={() => handleDeleteImage(image.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{image.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Staff Management</CardTitle>
                  <CardDescription>Manage admin team and roles</CardDescription>
                </div>
                <Dialog open={showAddStaffDialog} onOpenChange={setShowAddStaffDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Add Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Staff Member</DialogTitle>
                      <DialogDescription>
                        Add a new admin, content editor, or support agent
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                          placeholder="staff@example.com"
                          value={newStaffEmail}
                          onChange={(e) => setNewStaffEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newStaffRole} onValueChange={setNewStaffRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="content_editor">Content Editor</SelectItem>
                            <SelectItem value="support_agent">Support Agent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddStaffDialog(false)}>
                        Cancel
                      </Button>
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
                        <TableCell className="font-medium">
                          {member.profiles?.full_name || "Unknown"}
                        </TableCell>
                        <TableCell>{member.profiles?.email || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={member.role === "super_admin" ? "default" : "secondary"}
                          >
                            {member.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStaff(member.id)}
                          >
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

          {/* Activity Tab */}
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
                        <TableCell>
                          <Badge variant="outline">{activity.entity_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {JSON.stringify(activity.details)}
                        </TableCell>
                        <TableCell>
                          {new Date(activity.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {activityLog.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No activity recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IP Addresses Tab */}
          <TabsContent value="ip-addresses">
            <IPAddressManager />
          </TabsContent>

          {/* Analytics Tab */}
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
                        <Line
                          type="monotone"
                          dataKey="signups"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                        />
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
                      <BarChart
                        data={[
                          { name: "Trial", count: stats?.trialUsers || 0 },
                          { name: "Active", count: stats?.activeSubscriptions || 0 },
                          { name: "Total", count: stats?.totalUsers || 0 },
                        ]}
                      >
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

          {/* Credits Tab */}
          <TabsContent value="credits">
            <CreditManager />
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <ReferralManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* CMS Page Editor Dialog */}
      <CMSPageEditor
        open={showPageEditor}
        onOpenChange={setShowPageEditor}
        page={editingPage}
        onSave={loadData}
      />

      {/* CMS Image Uploader Dialog */}
      <CMSImageUploader
        open={showImageUploader}
        onOpenChange={setShowImageUploader}
        onUpload={loadData}
      />
    </div>
  );
}
