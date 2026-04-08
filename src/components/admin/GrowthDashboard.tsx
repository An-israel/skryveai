import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, subDays, differenceInHours, format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Zap, ArrowDownRight,
  Loader2, RefreshCw, Percent, Gift,
} from "lucide-react";


export function GrowthDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    newToday: 0,
    newThisWeek: 0,
    newThisMonth: 0,
    activatedUsers: 0,
    activationRate: 0,
    paidUsers: 0,
    trialUsers: 0,
    conversionRate: 0,
    churnedThisMonth: 0,
    churnRate: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    referralSignups: 0,
    referralConversions: 0,
  });
  const [signupTrend, setSignupTrend] = useState<{ date: string; count: number }[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<{ stage: string; count: number; rate: string }[]>([]);
  const [topReferrers, setTopReferrers] = useState<{ name: string; email: string; referrals: number; conversions: number }[]>([]);
  const [recentSignups, setRecentSignups] = useState<{ name: string; email: string; signed_up: string; activated: boolean; plan: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadGrowthData();
  }, []);

  const loadGrowthData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Fetch all data in parallel
      const [profilesRes, subsRes, campaignsRes, referralsRes, paymentsRes] = await Promise.all([
        (supabase as any).from("profiles").select("user_id, full_name, email, created_at, last_active_at"),
        supabase.from("subscriptions").select("user_id, status, plan, credits, created_at"),
        supabase.from("campaigns").select("user_id, created_at"),
        supabase.from("referrals").select("referrer_id, referred_id, status, created_at"),
        supabase.from("payment_history").select("user_id, status, plan, created_at").eq("status", "success"),
      ]);

      const profiles = profilesRes.data || [];
      const subs = subsRes.data || [];
      const campaigns = campaignsRes.data || [];
      const referrals = referralsRes.data || [];
      const payments = paymentsRes.data || [];

      const subsMap = new Map(subs.map(s => [s.user_id, s]));
      const usersWithCampaigns = new Set(campaigns.map(c => c.user_id));

      // Core metrics
      const totalUsers = profiles.length;
      const newToday = profiles.filter(p => new Date(p.created_at) >= todayStart).length;
      const newThisWeek = profiles.filter(p => new Date(p.created_at) >= weekAgo).length;
      const newThisMonth = profiles.filter(p => new Date(p.created_at) >= monthAgo).length;
      const activatedUsers = profiles.filter(p => usersWithCampaigns.has(p.user_id)).length;
      const activationRate = totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0;

      const paidUsers = subs.filter(s => s.status === "active").length;
      const trialUsers = subs.filter(s => s.status === "trial").length;

      // Active/Inactive: active = last_active_at within 48 hours
      const activeUsers = profiles.filter((p: any) => {
        if (!p.last_active_at) return false;
        return differenceInHours(now, new Date(p.last_active_at)) <= 48;
      }).length;
      const inactiveUsers = totalUsers - activeUsers;

      // Conversion: activated users who became paid
      const activatedAndPaid = profiles.filter(p => 
        usersWithCampaigns.has(p.user_id) && subsMap.get(p.user_id)?.status === "active"
      ).length;
      const conversionRate = activatedUsers > 0 ? Math.round((activatedAndPaid / activatedUsers) * 100) : 0;

      // Churn this month
      const churnedThisMonth = subs.filter(s =>
        (s.status === "expired" || s.status === "cancelled")
      ).length;
      const churnRate = (paidUsers + churnedThisMonth) > 0
        ? Math.round((churnedThisMonth / (paidUsers + churnedThisMonth)) * 100)
        : 0;

      // Referrals
      const referralSignups = referrals.length;
      const referralConversions = referrals.filter(r => r.status === "completed").length;

      setMetrics({
        totalUsers, newToday, newThisWeek, newThisMonth,
        activatedUsers, activationRate, paidUsers, trialUsers,
        conversionRate, churnedThisMonth, churnRate, activeUsers, inactiveUsers,
        referralSignups, referralConversions,
      });

      // Signup trend (last 30 days)
      const trendData: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = subDays(now, i);
        const key = format(d, "MMM d");
        trendData[key] = 0;
      }
      profiles.forEach(p => {
        const d = new Date(p.created_at);
        if (d >= monthAgo) {
          const key = format(d, "MMM d");
          if (trendData[key] !== undefined) trendData[key]++;
        }
      });
      setSignupTrend(Object.entries(trendData).map(([date, count]) => ({ date, count })));

      // Conversion funnel
      setConversionFunnel([
        { stage: "Signups", count: totalUsers, rate: "100%" },
        { stage: "Activated (ran campaign)", count: activatedUsers, rate: `${activationRate}%` },
        { stage: "Trial", count: trialUsers, rate: `${totalUsers > 0 ? Math.round((trialUsers / totalUsers) * 100) : 0}%` },
        { stage: "Paid", count: paidUsers, rate: `${conversionRate}%` },
      ]);

      // Top referrers
      const referrerMap = new Map<string, { referrals: number; conversions: number }>();
      referrals.forEach(r => {
        const existing = referrerMap.get(r.referrer_id) || { referrals: 0, conversions: 0 };
        existing.referrals++;
        if (r.status === "completed") existing.conversions++;
        referrerMap.set(r.referrer_id, existing);
      });
      const referrerIds = [...referrerMap.keys()];
      let referrerProfiles: { user_id: string; full_name: string; email: string }[] = [];
      if (referrerIds.length > 0) {
        const { data } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", referrerIds);
        referrerProfiles = data || [];
      }
      const topRefs = referrerProfiles
        .map(p => ({
          name: p.full_name,
          email: p.email,
          ...(referrerMap.get(p.user_id) || { referrals: 0, conversions: 0 }),
        }))
        .sort((a, b) => b.referrals - a.referrals)
        .slice(0, 10);
      setTopReferrers(topRefs);

      // Recent signups
      const recent = profiles
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20)
        .map(p => ({
          name: p.full_name,
          email: p.email,
          signed_up: p.created_at,
          activated: usersWithCampaigns.has(p.user_id),
          plan: subsMap.get(p.user_id)?.status || "none",
        }));
      setRecentSignups(recent);
    } catch (error) {
      console.error("Failed to load growth data:", error);
      toast({ title: "Failed to load growth data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">Total Signups</span>
            </div>
            <p className="text-xl font-bold">{metrics.totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              +{metrics.newToday} today · +{metrics.newThisWeek} this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs">Activation Rate</span>
            </div>
            <p className="text-xl font-bold">{metrics.activationRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metrics.activatedUsers} of {metrics.totalUsers} · Target: 70%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Percent className="w-3.5 h-3.5" />
              <span className="text-xs">Conversion Rate</span>
            </div>
            <p className="text-xl font-bold">{metrics.conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metrics.paidUsers} paid · Target: 20%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-destructive mb-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span className="text-xs">Churn Rate</span>
            </div>
            <p className="text-xl font-bold">{metrics.churnRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metrics.churnedThisMonth} churned · Target: &lt;8%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Gift className="w-3.5 h-3.5" />
              <span className="text-xs">Referrals</span>
            </div>
            <p className="text-xl font-bold">{metrics.referralSignups}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metrics.referralConversions} converted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadGrowthData} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Signup Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signupTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conversionFunnel.map((stage, i) => {
                const width = conversionFunnel[0].count > 0
                  ? Math.max(10, (stage.count / conversionFunnel[0].count) * 100)
                  : 10;
                return (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{stage.stage}</span>
                      <span className="font-medium">{stage.count} ({stage.rate})</span>
                    </div>
                    <div className="h-8 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full rounded flex items-center px-2 text-xs font-medium text-primary-foreground transition-all"
                        style={{
                          width: `${width}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      >
                        {stage.count > 0 && stage.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Signups</CardTitle>
            <CardDescription>Last 20 signups with activation status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSignups.map((user, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDistanceToNow(new Date(user.signed_up), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={user.activated ? "default" : "outline"} className="text-xs">
                          {user.activated ? "Activated" : "Not activated"}
                        </Badge>
                        <Badge variant={user.plan === "active" ? "default" : "secondary"} className="text-xs">
                          {user.plan}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4" /> Top Referrers
            </CardTitle>
            <CardDescription>Users driving the most referral signups</CardDescription>
          </CardHeader>
          <CardContent>
            {topReferrers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No referrals yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Converted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topReferrers.map((ref, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{ref.name}</p>
                          <p className="text-xs text-muted-foreground">{ref.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{ref.referrals}</TableCell>
                      <TableCell>
                        <Badge variant={ref.conversions > 0 ? "default" : "outline"}>
                          {ref.conversions}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
