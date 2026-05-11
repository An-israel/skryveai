import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/layout/Header";
import { CreditsDisplay } from "@/components/dashboard/CreditsDisplay";
import { SubscriptionStats } from "@/components/dashboard/SubscriptionStats";
import { EmailQueueStatus } from "@/components/dashboard/EmailQueueStatus";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ReferralCard } from "@/components/dashboard/ReferralCard";
import { EmailSettingsDialog } from "@/components/settings/EmailSettingsDialog";
import { FeatureUpdatePopup } from "@/components/notifications/FeatureUpdatePopup";
import { UIRefreshPopup } from "@/components/notifications/UIRefreshPopup";
import { MotivationalPopup } from "@/components/notifications/MotivationalPopup";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useOnboarding } from "@/hooks/use-onboarding";
import { FeatureGuide } from "@/components/onboarding/FeatureGuide";
import { dashboardGuide } from "@/components/onboarding/guideConfigs";
import {
  Plus, Mail, Eye, MessageSquare, TrendingUp, BarChart3,
  Clock, ArrowRight, Send, Calendar, Settings, Gift,
  FileText, Zap, Search, Briefcase, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CampaignCharts } from "@/components/dashboard/CampaignCharts";

interface Campaign {
  id: string;
  name: string;
  business_type: string;
  location: string;
  status: string;
  emails_sent: number;
  emails_opened: number;
  replies: number;
  created_at: string;
}

interface DashboardStats {
  totalCampaigns: number;
  totalEmailsSent: number;
  totalReplies: number;
  openRate: number;
  replyRate: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0, totalEmailsSent: 0, totalReplies: 0, openRate: 0, replyRate: 0,
  });
  const [performanceData, setPerformanceData] = useState<Array<{ date: string; sent: number; opened: number; replies: number }>>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showTour, showWizard, markOnboardingComplete } = useOnboarding(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) { setUser(session.user); fetchDashboardData(session.user.id); }
      else navigate("/login");
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); fetchDashboardData(session.user.id); }
      else navigate("/login");
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    try {
      const { data: campaignsData } = await supabase
        .from("campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      const data = campaignsData || [];
      setCampaigns(data);
      const totalEmailsSent = data.reduce((s, c) => s + c.emails_sent, 0);
      const totalOpens = data.reduce((s, c) => s + c.emails_opened, 0);
      const totalReplies = data.reduce((s, c) => s + c.replies, 0);
      setStats({
        totalCampaigns: data.length,
        totalEmailsSent,
        totalReplies,
        openRate: totalEmailsSent > 0 ? Math.round((totalOpens / totalEmailsSent) * 100) : 0,
        replyRate: totalEmailsSent > 0 ? Math.round((totalReplies / totalEmailsSent) * 100) : 0,
      });
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return { date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), sent: 0, opened: 0, replies: 0 };
      });
      if (totalEmailsSent > 0) {
        const perDay = Math.ceil(totalEmailsSent / 7);
        last7Days.forEach((day, i) => {
          if (i >= 4) {
            day.sent = Math.min(perDay, totalEmailsSent - (i - 4) * perDay);
            day.opened = Math.floor(day.sent * 0.22);
            day.replies = Math.floor(day.sent * 0.06);
          }
        });
      }
      setPerformanceData(last7Days);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/");
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success border-success/30";
      case "sending":   return "bg-info/10 text-info border-info/30";
      case "analyzing": return "bg-warning/10 text-warning border-warning/30";
      default:          return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const campaignChartData = campaigns.slice(0, 5).map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + "…" : c.name,
    sent: c.emails_sent, opened: c.emails_opened, replies: c.replies,
  }));

  const quickActions = [
    { label: "Find Clients",  icon: Search,   to: "/campaigns/new", primary: false },
    { label: "Auto-Pilot",    icon: Zap,      to: "/auto-pilot",    primary: true  },
    { label: "CV Builder",    icon: FileText,  to: "/cv-builder",    primary: false },
    { label: "Job Tracker",   icon: Briefcase, to: "/job-tracker",   primary: false },
    { label: "Refer & Earn",  icon: Gift,      to: "/referrals",     primary: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} onLogout={handleLogout} />
      <UIRefreshPopup />
      <FeatureUpdatePopup />
      <MotivationalPopup />

      {showWizard && user && (
        <OnboardingWizard
          userId={user.id}
          userEmail={user.email || ""}
          userName={user.user_metadata?.full_name || "User"}
          onComplete={markOnboardingComplete}
        />
      )}
      {showTour && !showWizard && <OnboardingTour onComplete={markOnboardingComplete} />}
      <FeatureGuide featureKey="dashboard" steps={dashboardGuide} />

      <main className="container mx-auto px-4 pt-24 pb-16">

        {/* ── Welcome Row ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Your client acquisition command centre</p>
          </div>
          <div className="flex items-center gap-2">
            <EmailSettingsDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Email Settings</span>
                </Button>
              }
            />
            <Button asChild size="default">
              <Link to="/campaigns/new">
                <Plus className="w-5 h-5 mr-1" /> New Campaign
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* ── Stats Row ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: "Total Campaigns",  value: stats.totalCampaigns.toString(),  icon: BarChart3,     color: "text-primary" },
            { label: "Emails Sent",      value: stats.totalEmailsSent.toString(),  icon: Mail,          color: "text-blue-500" },
            { label: "Replies Received", value: stats.totalReplies.toString(),     icon: MessageSquare, color: "text-green-600" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
              <Card className="border-border-subtle">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <TrendingUp className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Subscription + Credits ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          <SubscriptionStats />
          <CreditsDisplay userId={user?.id} />
        </motion.div>

        {/* ── Main 2-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left 2/3 — Campaigns + Activity */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active Campaigns */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <Card className="border-border-subtle">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-display text-base font-bold tracking-tight">Your Campaigns</CardTitle>
                      <CardDescription>{campaigns.length} campaigns total</CardDescription>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/campaigns/new"><Plus className="w-3.5 h-3.5 mr-1" /> New</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {campaigns.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/8 flex items-center justify-center">
                        <Mail className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-display font-bold mb-1">No campaigns yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">Create your first campaign to start finding clients</p>
                      <Button asChild><Link to="/campaigns/new">Create First Campaign <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.slice(0, 6).map((campaign) => {
                        const openRate = campaign.emails_sent > 0 ? Math.round((campaign.emails_opened / campaign.emails_sent) * 100) : 0;
                        return (
                          <div key={campaign.id} className="p-4 rounded-xl border border-border-subtle hover:border-border transition-all duration-200">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-display font-bold text-sm">{campaign.name}</p>
                                <p className="text-xs text-muted-foreground">{campaign.business_type} · {campaign.location}</p>
                              </div>
                              <Badge className={`text-xs ${getCampaignStatusColor(campaign.status)}`}>{campaign.status}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                              <span className="flex items-center gap-1"><Send className="w-3 h-3" />{campaign.emails_sent} sent</span>
                              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{campaign.emails_opened} opened</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{campaign.replies} replies</span>
                            </div>
                            {campaign.emails_sent > 0 && (
                              <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>Open rate</span><span>{openRate}%</span>
                                </div>
                                <Progress value={openRate} className="h-1" />
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/60">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />{formatDate(campaign.created_at)}
                              </span>
                              <Button asChild variant="ghost" size="sm" className="h-6 text-xs px-2">
                                <Link to={`/campaigns/${campaign.id}`}>View <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {campaigns.length > 6 && (
                        <p className="text-center text-xs text-muted-foreground pt-1">+{campaigns.length - 6} more campaigns</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* AutoPilot Activity Feed */}
            {user && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <ActivityFeed userId={user.id} />
              </motion.div>
            )}

            {/* Email Queue */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <EmailQueueStatus />
            </motion.div>
          </div>

          {/* Right 1/3 — Quick Actions + Referral */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
              <Card className="border-border-subtle">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base font-bold tracking-tight">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {quickActions.map(({ label, icon: Icon, to, primary }) => (
                    <Button
                      key={label}
                      asChild
                      variant={primary ? "default" : "outline"}
                      className="w-full justify-between"
                    >
                      <Link to={to}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" /> {label}
                        </span>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Referral Card */}
            {user && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                <ReferralCard userId={user.id} />
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Campaign Charts (only if data exists) ── */}
        {campaigns.length > 0 && stats.totalEmailsSent > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <CampaignCharts
              campaignData={campaignChartData}
              performanceData={performanceData}
              totalStats={{ sent: stats.totalEmailsSent, opened: 0, replied: stats.totalReplies, bounced: 0 }}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
