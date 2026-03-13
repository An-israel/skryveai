import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CampaignCharts } from "@/components/dashboard/CampaignCharts";
import { SubscriptionStats } from "@/components/dashboard/SubscriptionStats";
import { EmailQueueStatus } from "@/components/dashboard/EmailQueueStatus";
import { CreditsDisplay } from "@/components/dashboard/CreditsDisplay";

import { EmailSettingsDialog } from "@/components/settings/EmailSettingsDialog";
import { FeatureUpdatePopup } from "@/components/notifications/FeatureUpdatePopup";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useOnboarding } from "@/hooks/use-onboarding";
import { 
  Plus, 
  Mail, 
  Eye, 
  MessageSquare, 
  TrendingUp,
  BarChart3,
  Clock,
  CheckCircle2,
  ArrowRight,
  Send,
  Calendar,
  Settings,
  Gift
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  totalOpens: number;
  totalReplies: number;
  totalBounced: number;
  openRate: number;
  replyRate: number;
}

interface RecentEmail {
  id: string;
  to_email: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  business_name?: string;
  campaign_name?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    totalEmailsSent: 0,
    totalOpens: 0,
    totalReplies: 0,
    totalBounced: 0,
    openRate: 0,
    replyRate: 0,
  });
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [performanceData, setPerformanceData] = useState<Array<{ date: string; sent: number; opened: number; replies: number }>>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Onboarding
  const { showTour, showWizard, markOnboardingComplete } = useOnboarding(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchDashboardData(session.user.id);
      } else {
        navigate("/login");
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchDashboardData(session.user.id);
      } else {
        navigate("/login");
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    try {
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Calculate stats
      const totalEmailsSent = campaignsData?.reduce((sum, c) => sum + c.emails_sent, 0) || 0;
      const totalOpens = campaignsData?.reduce((sum, c) => sum + c.emails_opened, 0) || 0;
      const totalReplies = campaignsData?.reduce((sum, c) => sum + c.replies, 0) || 0;

      setStats({
        totalCampaigns: campaignsData?.length || 0,
        totalEmailsSent,
        totalOpens,
        totalReplies,
        totalBounced: 0, // Would need to query emails table
        openRate: totalEmailsSent > 0 ? Math.round((totalOpens / totalEmailsSent) * 100) : 0,
        replyRate: totalEmailsSent > 0 ? Math.round((totalReplies / totalEmailsSent) * 100) : 0,
      });

      // Generate performance data for the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          sent: 0,
          opened: 0,
          replies: 0,
        };
      });

      // In a real implementation, you'd query emails by date
      // For now, show the structure
      if (totalEmailsSent > 0) {
        // Distribute data across days for demo
        const perDay = Math.ceil(totalEmailsSent / 7);
        last7Days.forEach((day, i) => {
          if (i >= 4) {
            day.sent = Math.min(perDay, totalEmailsSent - (i - 4) * perDay);
            day.opened = Math.floor(day.sent * (stats.openRate / 100));
            day.replies = Math.floor(day.sent * (stats.replyRate / 100));
          }
        });
      }
      setPerformanceData(last7Days);

      // Fetch recent emails
      const { data: emailsData } = await supabase
        .from("emails")
        .select(`
          id,
          to_email,
          status,
          sent_at,
          opened_at
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (emailsData) {
        setRecentEmails(emailsData.map((e: any) => ({
          id: e.id,
          to_email: e.to_email,
          status: e.status,
          sent_at: e.sent_at,
          opened_at: e.opened_at,
        })));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "opened": return "bg-green-500/10 text-green-500 border-green-500/30";
      case "replied": return "bg-purple-500/10 text-purple-500 border-purple-500/30";
      case "bounced": return "bg-red-500/10 text-red-500 border-red-500/30";
      case "failed": return "bg-red-500/10 text-red-500 border-red-500/30";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/30";
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success border-success/30";
      case "sending": return "bg-info/10 text-info border-info/30";
      case "analyzing": return "bg-warning/10 text-warning border-warning/30";
      case "draft": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Campaigns", value: stats.totalCampaigns.toString(), icon: BarChart3, color: "text-primary" },
    { label: "Emails Sent", value: stats.totalEmailsSent.toString(), icon: Mail, color: "text-info" },
    { label: "Opens", value: `${stats.totalOpens} (${stats.openRate}%)`, icon: Eye, color: "text-success" },
  ];

  const campaignChartData = campaigns.slice(0, 5).map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
    sent: c.emails_sent,
    opened: c.emails_opened,
    replies: c.replies,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} onLogout={handleLogout} />
      <FeatureUpdatePopup />
      
      {/* Onboarding Wizard for new users */}
      {showWizard && user && (
        <OnboardingWizard
          userId={user.id}
          userEmail={user.email || ""}
          userName={user.user_metadata?.full_name || "User"}
          onComplete={markOnboardingComplete}
        />
      )}
      {/* Onboarding Tour (legacy) */}
      {showTour && !showWizard && <OnboardingTour onComplete={markOnboardingComplete} />}
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                Welcome, {user?.user_metadata?.full_name || "there"}! 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Here's an overview of your outreach campaigns
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/analytics">
                  <BarChart3 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Analytics</span>
                </Link>
              </Button>
              <EmailSettingsDialog 
                trigger={
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                }
              />
              <Button asChild size="default" className="bg-primary text-primary-foreground shadow-md">
                <Link to="/campaigns/new">
                  <Plus className="w-5 h-5 mr-1 sm:mr-2" />
                  <span className="font-semibold">New Campaign</span>
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Subscription Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid gap-4 md:grid-cols-2"
        >
          <SubscriptionStats />
          <CreditsDisplay userId={user?.id} />
        </motion.div>

        {/* Career Tools */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-3">Career Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate("/cv-builder")}>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <p className="font-medium text-sm">CV Builder</p>
                <p className="text-xs text-muted-foreground">Build or optimize</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">FREE</Badge>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate("/ats-checker")}>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <p className="font-medium text-sm">ATS Checker</p>
                <p className="text-xs text-muted-foreground">Instant score</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">FREE</Badge>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate("/campaigns/new")}>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <p className="font-medium text-sm">Job Search</p>
                <p className="text-xs text-muted-foreground">Find & apply to 50</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">FREE + PAID</Badge>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate("/campaigns/new")}>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Send className="w-5 h-5 text-primary" />
                </div>
                <p className="font-medium text-sm">Outreach</p>
                <p className="text-xs text-muted-foreground">Find clients</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">PAID</Badge>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Referral link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mb-8"
        >
          <Button asChild variant="outline" size="sm">
            <Link to="/referrals">
              <Gift className="w-4 h-4 mr-2" />
              Refer & Earn
            </Link>
          </Button>
        </motion.div>

        {/* Email Queue Status - Real-time updates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <EmailQueueStatus />
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {campaigns.length === 0 ? (
          /* Enhanced Empty State with step-by-step guide */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Welcome! Here's how to get started 🚀</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                  Land your first client in 3 simple steps
                </p>

                {/* Step-by-step guide */}
                <div className="max-w-lg mx-auto space-y-4 text-left mb-8">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                    <div>
                      <p className="font-medium">Connect your email</p>
                      <p className="text-sm text-muted-foreground">Go to Settings and add your email so we can send pitches on your behalf.</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0 mt-0.5">
                      <Link to="/settings"><Settings className="w-3 h-3 mr-1" />Set Up</Link>
                    </Button>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                    <div>
                      <p className="font-medium">Create a campaign</p>
                      <p className="text-sm text-muted-foreground">Search for businesses, let AI analyze their websites, and generate personalized pitches.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                    <div>
                      <p className="font-medium">Send & track</p>
                      <p className="text-sm text-muted-foreground">Review AI-generated pitches, approve them, and send. We'll track opens and replies for you.</p>
                    </div>
                  </div>
                </div>

                <Button asChild size="lg">
                  <Link to="/campaigns/new">
                    Create Your First Campaign
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Charts Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <CampaignCharts
                campaignData={campaignChartData}
                performanceData={performanceData}
                totalStats={{
                  sent: stats.totalEmailsSent,
                  opened: stats.totalOpens,
                  replied: stats.totalReplies,
                  bounced: stats.totalBounced,
                }}
              />
            </motion.div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Campaigns List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Your Campaigns</CardTitle>
                        <CardDescription>{campaigns.length} campaigns total</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {campaigns.slice(0, 5).map((campaign) => {
                        const openRate = campaign.emails_sent > 0 
                          ? Math.round((campaign.emails_opened / campaign.emails_sent) * 100) 
                          : 0;
                        
                        return (
                          <div 
                            key={campaign.id} 
                            className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold">{campaign.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {campaign.business_type} in {campaign.location}
                                </p>
                              </div>
                              <Badge className={getCampaignStatusColor(campaign.status)}>
                                {campaign.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                              <div>
                                <div className="text-muted-foreground">Sent</div>
                                <div className="font-medium flex items-center gap-1">
                                  <Send className="w-3 h-3" />
                                  {campaign.emails_sent}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Opened</div>
                                <div className="font-medium flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {campaign.emails_opened}
                                </div>
                              </div>
                            </div>

                            {campaign.emails_sent > 0 && (
                              <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>Open rate</span>
                                  <span>{openRate}%</span>
                                </div>
                                <Progress value={openRate} className="h-1.5" />
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {formatDate(campaign.created_at)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Emails</CardTitle>
                    <CardDescription>Latest email activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentEmails.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Clock className="w-5 h-5 mr-2" />
                        No emails sent yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentEmails.map((email) => (
                          <div key={email.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {email.to_email}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-xs ${getStatusColor(email.status)}`}>
                                  {email.status}
                                </Badge>
                                {email.opened_at && (
                                  <span className="text-xs text-muted-foreground">
                                    Opened {formatDate(email.opened_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Performance Summary */}
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Open Rate</span>
                        <span className="font-medium">{stats.openRate}%</span>
                      </div>
                      <Progress value={stats.openRate} className="h-2" />
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Industry average: 20-30% open rate
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
