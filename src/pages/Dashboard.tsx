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
import { UIRefreshPopup } from "@/components/notifications/UIRefreshPopup";
import { MotivationalPopup } from "@/components/notifications/MotivationalPopup";
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
  Gift,
  FileText,
  Target,
  Briefcase
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
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      const totalEmailsSent = campaignsData?.reduce((sum, c) => sum + c.emails_sent, 0) || 0;
      const totalOpens = campaignsData?.reduce((sum, c) => sum + c.emails_opened, 0) || 0;
      const totalReplies = campaignsData?.reduce((sum, c) => sum + c.replies, 0) || 0;

      setStats({
        totalCampaigns: campaignsData?.length || 0,
        totalEmailsSent,
        totalOpens,
        totalReplies,
        totalBounced: 0,
        openRate: totalEmailsSent > 0 ? Math.round((totalOpens / totalEmailsSent) * 100) : 0,
        replyRate: totalEmailsSent > 0 ? Math.round((totalReplies / totalEmailsSent) * 100) : 0,
      });

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

      if (totalEmailsSent > 0) {
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

      const { data: emailsData } = await supabase
        .from("emails")
        .select(`id, to_email, status, sent_at, opened_at`)
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
      case "sent": return "bg-info/10 text-info border-info/30";
      case "opened": return "bg-success/10 text-success border-success/30";
      case "replied": return "bg-primary/10 text-primary border-primary/30";
      case "bounced": return "bg-destructive/10 text-destructive border-destructive/30";
      case "failed": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted text-muted-foreground";
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
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
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
              <Button asChild size="default">
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
          <h2 className="font-display text-lg font-bold mb-3 tracking-tight">Career Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: "CV Builder", sub: "Build or optimize", route: "/cv-builder" },
              { icon: Target, label: "ATS Checker", sub: "Instant score", route: "/ats-checker" },
              { icon: Briefcase, label: "Job Search", sub: "Find & apply to 50", route: "/campaigns/new" },
              { icon: Send, label: "Outreach", sub: "Find clients", route: "/campaigns/new" },
            ].map((tool, i) => (
              <Card key={i} className="border-border-subtle card-hover cursor-pointer group" onClick={() => navigate(tool.route)}>
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <tool.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <p className="font-display font-bold text-sm">{tool.label}</p>
                  <p className="text-xs text-muted-foreground">{tool.sub}</p>
                </CardContent>
              </Card>
            ))}
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

        {/* Email Queue Status */}
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
              <Card className="border-border-subtle bg-gradient-stat">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center shadow-xs">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <TrendingUp className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {campaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-dashed border-border-subtle">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/8 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">Welcome! Here's how to get started 🚀</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                  Land your first client in 3 simple steps
                </p>

                <div className="max-w-lg mx-auto space-y-3 text-left mb-8">
                  {[
                    { step: "1", title: "Connect your email", desc: "Go to Settings and add your email so we can send pitches on your behalf.", link: "/settings", linkText: "Set Up", linkIcon: Settings },
                    { step: "2", title: "Create a campaign", desc: "Search for businesses, let AI analyze their websites, and generate personalized pitches.", link: null, linkText: null, linkIcon: null },
                    { step: "3", title: "Send & track", desc: "Review AI-generated pitches, approve them, and send. We'll track opens and replies for you.", link: null, linkText: null, linkIcon: null },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border-subtle">
                      <div className="w-8 h-8 rounded-full bg-gradient-accent text-primary-foreground flex items-center justify-center text-sm font-display font-bold shrink-0">{item.step}</div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-sm">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      {item.link && item.linkIcon && (
                        <Button asChild variant="outline" size="sm" className="shrink-0 mt-0.5">
                          <Link to={item.link}><item.linkIcon className="w-3 h-3 mr-1" />{item.linkText}</Link>
                        </Button>
                      )}
                    </div>
                  ))}
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2"
              >
                <Card className="border-border-subtle">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-display text-lg font-bold tracking-tight">Your Campaigns</CardTitle>
                        <CardDescription>{campaigns.length} campaigns total</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {campaigns.slice(0, 5).map((campaign) => {
                        const openRate = campaign.emails_sent > 0 
                          ? Math.round((campaign.emails_opened / campaign.emails_sent) * 100) 
                          : 0;
                        
                        return (
                          <div 
                            key={campaign.id} 
                            className="p-4 rounded-xl border border-border-subtle bg-card transition-all duration-200 hover:shadow-sm hover:border-border"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-display font-bold text-sm">{campaign.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {campaign.business_type} in {campaign.location}
                                </p>
                              </div>
                              <Badge className={getCampaignStatusColor(campaign.status)}>
                                {campaign.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                              <div>
                                <div className="text-xs text-muted-foreground">Sent</div>
                                <div className="font-display font-bold flex items-center gap-1">
                                  <Send className="w-3 h-3" />
                                  {campaign.emails_sent}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Opened</div>
                                <div className="font-display font-bold flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {campaign.emails_opened}
                                </div>
                              </div>
                            </div>

                            {campaign.emails_sent > 0 && (
                              <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>Open rate</span>
                                  <span className="font-mono">{openRate}%</span>
                                </div>
                                <Progress value={openRate} className="h-1" />
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="border-border-subtle">
                  <CardHeader>
                    <CardTitle className="font-display text-lg font-bold tracking-tight">Recent Emails</CardTitle>
                    <CardDescription>Latest email activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentEmails.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Clock className="w-5 h-5 mr-2" />
                        No emails sent yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentEmails.map((email) => (
                          <div key={email.id} className="flex items-start gap-3 p-3 rounded-lg border border-border-subtle bg-card">
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

                <Card className="mt-4 border-border-subtle">
                  <CardHeader>
                    <CardTitle className="font-display text-lg font-bold tracking-tight">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Open Rate</span>
                        <span className="font-display font-bold">{stats.openRate}%</span>
                      </div>
                      <Progress value={stats.openRate} className="h-1.5" />
                    </div>
                    <div className="pt-2 border-t border-border-subtle">
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
