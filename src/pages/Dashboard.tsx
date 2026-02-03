import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Loader2,
  ExternalLink,
  Calendar
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
    openRate: 0,
    replyRate: 0,
  });
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

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
        openRate: totalEmailsSent > 0 ? Math.round((totalOpens / totalEmailsSent) * 100) : 0,
        replyRate: totalEmailsSent > 0 ? Math.round((totalReplies / totalEmailsSent) * 100) : 0,
      });

      // Fetch recent emails with business and campaign info
      const { data: emailsData, error: emailsError } = await supabase
        .from("emails")
        .select(`
          id,
          to_email,
          status,
          sent_at,
          opened_at,
          businesses!inner(name),
          campaigns!inner(name)
        `)
        .eq("campaigns.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!emailsError && emailsData) {
        setRecentEmails(emailsData.map((e: any) => ({
          id: e.id,
          to_email: e.to_email,
          status: e.status,
          sent_at: e.sent_at,
          opened_at: e.opened_at,
          business_name: e.businesses?.name,
          campaign_name: e.campaigns?.name,
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
    { label: "Replies", value: `${stats.totalReplies} (${stats.replyRate}%)`, icon: MessageSquare, color: "text-warning" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} onLogout={handleLogout} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome, {user?.user_metadata?.full_name || "there"}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's an overview of your outreach campaigns
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/campaigns/new">
                <Plus className="w-5 h-5 mr-2" />
                New Campaign
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
          /* Empty State / Quick Start */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Start Your First Campaign</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Find potential clients, analyze their websites with AI, and send personalized cold emails that get responses.
                </p>
                <Button asChild size="lg">
                  <Link to="/campaigns/new">
                    Create Campaign
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>

                <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    AI-powered website analysis
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Personalized pitches
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Bulk email sending
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Campaigns List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
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
                    {campaigns.map((campaign) => {
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
                          
                          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
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
                            <div>
                              <div className="text-muted-foreground">Replies</div>
                              <div className="font-medium flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {campaign.replies}
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
              transition={{ delay: 0.5 }}
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
                              {email.business_name || email.to_email}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
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
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Reply Rate</span>
                      <span className="font-medium">{stats.replyRate}%</span>
                    </div>
                    <Progress value={stats.replyRate} className="h-2" />
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Industry average: 20-30% open rate, 1-5% reply rate
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
