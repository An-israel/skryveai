import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  ArrowLeft,
  Download,
  Mail, 
  Eye, 
  MessageSquare, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Filter
} from "lucide-react";
import { FeatureGuide } from "@/components/onboarding/FeatureGuide";
import { analyticsGuide } from "@/components/onboarding/guideConfigs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  emails_sent: number;
  emails_opened: number;
  replies: number;
  created_at: string;
}

interface Email {
  id: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  campaign_id: string;
}

interface DailyStats {
  date: string;
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}

const COLORS = {
  sent: "#3b82f6",
  opened: "#22c55e",
  replied: "#f59e0b",
  bounced: "#ef4444",
  pending: "#94a3b8",
};

export default function Analytics() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedCampaign, timeRange]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setCampaigns(campaignsData || []);

      // Fetch emails
      let emailsQuery = supabase
        .from("emails")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCampaign !== "all") {
        emailsQuery = emailsQuery.eq("campaign_id", selectedCampaign);
      }

      const { data: emailsData } = await emailsQuery;
      setEmails(emailsData || []);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalSent = emails.filter(e => e.status !== "pending").length;
  const totalOpened = emails.filter(e => e.opened_at).length;
  const totalReplied = emails.filter(e => e.replied_at).length;
  const totalBounced = emails.filter(e => e.status === "bounced" || e.status === "failed").length;
  const totalPending = emails.filter(e => e.status === "pending").length;

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0";
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : "0";

  // Generate daily stats for chart
  const getDailyStats = (): DailyStats[] => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const stats: DailyStats[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const displayDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const dayEmails = emails.filter(e => {
        const emailDate = e.sent_at ? new Date(e.sent_at).toISOString().split("T")[0] : null;
        return emailDate === dateStr;
      });

      stats.push({
        date: displayDate,
        sent: dayEmails.length,
        opened: dayEmails.filter(e => e.opened_at).length,
        replied: dayEmails.filter(e => e.replied_at).length,
        bounced: dayEmails.filter(e => e.status === "bounced" || e.status === "failed").length,
      });
    }

    return stats;
  };

  // Pie chart data
  const pieData = [
    { name: "Opened", value: totalOpened, color: COLORS.opened },
    { name: "Not Opened", value: Math.max(0, totalSent - totalOpened - totalBounced), color: COLORS.pending },
    { name: "Bounced", value: totalBounced, color: COLORS.bounced },
  ].filter(d => d.value > 0);

  // Campaign comparison data
  const campaignComparison = campaigns.slice(0, 10).map(c => ({
    name: c.name.length > 12 ? c.name.substring(0, 12) + "..." : c.name,
    sent: c.emails_sent,
    opened: c.emails_opened,
    replies: c.replies,
    openRate: c.emails_sent > 0 ? ((c.emails_opened / c.emails_sent) * 100).toFixed(0) : 0,
  }));

  // Export data as CSV
  const exportToCSV = () => {
    const headers = ["Campaign", "Email", "Status", "Sent At", "Opened At", "Replied At"];
    const rows = emails.map(e => {
      const campaign = campaigns.find(c => c.id === e.campaign_id);
      return [
        campaign?.name || "Unknown",
        e.id,
        e.status,
        e.sent_at || "",
        e.opened_at || "",
        e.replied_at || "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: "Your analytics data has been downloaded",
    });
  };

  const statCards = [
    { 
      label: "Emails Sent", 
      value: totalSent, 
      icon: Mail, 
      color: "text-info",
      bgColor: "bg-info/10",
      trend: null 
    },
    { 
      label: "Open Rate", 
      value: `${openRate}%`, 
      subValue: `${totalOpened} opened`,
      icon: Eye, 
      color: "text-success",
      bgColor: "bg-success/10",
      trend: parseFloat(openRate) >= 20 ? "up" : "down"
    },
    { 
      label: "Bounce Rate", 
      value: `${bounceRate}%`, 
      subValue: `${totalBounced} bounced`,
      icon: AlertTriangle, 
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      trend: parseFloat(bounceRate) <= 5 ? "up" : "down"
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = totalSent > 0 || campaigns.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FeatureGuide featureKey="analytics" steps={analyticsGuide} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-8 h-8" />
                  Campaign Analytics
                </h1>
                <p className="text-muted-foreground">
                  Detailed insights into your email campaign performance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </motion.div>

        {!hasData ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No analytics yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Once you send your first campaign, you'll see detailed charts showing open rates, reply rates, and more.
                </p>
                <Button onClick={() => navigate("/campaigns/new")}>
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
        <>
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
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    {stat.trend && (
                      stat.trend === "up" 
                        ? <TrendingUp className="w-4 h-4 text-success" />
                        : <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  {stat.subValue && (
                    <div className="text-xs text-muted-foreground mt-1">{stat.subValue}</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">By Campaign</TabsTrigger>
            <TabsTrigger value="emails">Email Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Performance Over Time */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Performance Over Time</CardTitle>
                  <CardDescription>Email metrics over the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getDailyStats()}>
                        <defs>
                          <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.sent} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLORS.sent} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.opened} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLORS.opened} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
                        <YAxis tickLine={false} axisLine={false} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Area type="monotone" dataKey="sent" stroke={COLORS.sent} fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} />
                        <Area type="monotone" dataKey="opened" stroke={COLORS.opened} fillOpacity={1} fill="url(#colorOpened)" strokeWidth={2} />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Email Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Distribution</CardTitle>
                  <CardDescription>Breakdown of email outcomes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No email data available
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {pieData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Emails */}
            {totalPending > 0 && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="flex items-center gap-4 p-4">
                  <Clock className="w-8 h-8 text-warning" />
                  <div>
                    <p className="font-medium">{totalPending} emails pending</p>
                    <p className="text-sm text-muted-foreground">
                      These emails are queued and will be sent automatically
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Comparison</CardTitle>
                <CardDescription>Performance across all your campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campaignComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="sent" fill={COLORS.sent} radius={[0, 4, 4, 0]} name="Sent" />
                      <Bar dataKey="opened" fill={COLORS.opened} radius={[0, 4, 4, 0]} name="Opened" />
                      
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Stats Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Campaign</th>
                        <th className="text-center py-3 px-4 font-medium">Sent</th>
                        <th className="text-center py-3 px-4 font-medium">Opened</th>
                         <th className="text-center py-3 px-4 font-medium">Open Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(campaign => {
                        const openR = campaign.emails_sent > 0 
                          ? ((campaign.emails_opened / campaign.emails_sent) * 100).toFixed(1) 
                          : "0";
                        const replyR = campaign.emails_sent > 0 
                          ? ((campaign.replies / campaign.emails_sent) * 100).toFixed(1) 
                          : "0";

                        return (
                          <tr key={campaign.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">{campaign.name}</td>
                            <td className="text-center py-3 px-4">{campaign.emails_sent}</td>
                            <td className="text-center py-3 px-4">{campaign.emails_opened}</td>
                            <td className="text-center py-3 px-4">
                              <Badge variant={parseFloat(openR) >= 20 ? "default" : "secondary"}>
                                {openR}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Emails</CardTitle>
                <CardDescription>Detailed view of individual email performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Campaign</th>
                        <th className="text-center py-3 px-4 font-medium">Status</th>
                        <th className="text-center py-3 px-4 font-medium">Sent</th>
                        <th className="text-center py-3 px-4 font-medium">Opened</th>
                        
                      </tr>
                    </thead>
                    <tbody>
                      {emails.slice(0, 50).map(email => {
                        const campaign = campaigns.find(c => c.id === email.campaign_id);
                        return (
                          <tr key={email.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">{campaign?.name || "Unknown"}</td>
                            <td className="text-center py-3 px-4">
                              <Badge 
                                variant={
                                  email.status === "sent" ? "default" :
                                  email.status === "bounced" || email.status === "failed" ? "destructive" :
                                  "secondary"
                                }
                              >
                                {email.status}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-4 text-sm text-muted-foreground">
                              {email.sent_at ? new Date(email.sent_at).toLocaleDateString() : "-"}
                            </td>
                            <td className="text-center py-3 px-4">
                              {email.opened_at ? (
                                <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
        )}
      </main>
    </div>
  );
}
