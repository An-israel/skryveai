import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ReferralWithDetails {
  id: string;
  referrer_email: string;
  referrer_name: string;
  referred_email: string;
  referred_name: string;
  referral_code: string;
  status: string;
  commission_rate: number;
  commission_amount: number;
  commission_currency: string;
  created_at: string;
  completed_at: string | null;
}

interface ReferrerStats {
  user_id: string;
  email: string;
  full_name: string;
  referral_code: string;
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_earnings: number;
}

export function ReferralManager() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: referrals, isLoading: loadingReferrals } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profiles for referrers and referred users
      const userIds = [...new Set([
        ...data.map(r => r.referrer_id),
        ...data.map(r => r.referred_id)
      ])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(r => ({
        id: r.id,
        referrer_email: profileMap.get(r.referrer_id)?.email || "Unknown",
        referrer_name: profileMap.get(r.referrer_id)?.full_name || "Unknown",
        referred_email: profileMap.get(r.referred_id)?.email || "Unknown",
        referred_name: profileMap.get(r.referred_id)?.full_name || "Unknown",
        referral_code: r.referral_code,
        status: r.status,
        commission_rate: r.commission_rate,
        commission_amount: r.commission_amount || 0,
        commission_currency: r.commission_currency || "NGN",
        created_at: r.created_at,
        completed_at: r.completed_at,
      })) as ReferralWithDetails[];
    },
  });

  const { data: referrerStats, isLoading: loadingStats } = useQuery({
    queryKey: ["admin-referrer-stats"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, referral_code");

      if (profilesError) throw profilesError;

      const { data: allReferrals, error: referralsError } = await supabase
        .from("referrals")
        .select("*");

      if (referralsError) throw referralsError;

      const stats: ReferrerStats[] = profiles
        .filter(p => p.referral_code)
        .map(profile => {
          const userReferrals = allReferrals.filter(r => r.referrer_id === profile.user_id);
          return {
            user_id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name,
            referral_code: profile.referral_code!,
            total_referrals: userReferrals.length,
            completed_referrals: userReferrals.filter(r => r.status === "completed").length,
            pending_referrals: userReferrals.filter(r => r.status === "pending").length,
            total_earnings: userReferrals
              .filter(r => r.status === "completed" || r.status === "paid")
              .reduce((sum, r) => sum + (r.commission_amount || 0), 0),
          };
        })
        .filter(s => s.total_referrals > 0)
        .sort((a, b) => b.total_referrals - a.total_referrals);

      return stats;
    },
  });

  const totalReferrals = referrals?.length || 0;
  const completedReferrals = referrals?.filter(r => r.status === "completed").length || 0;
  const totalCommissions = referrals?.reduce((sum, r) => sum + r.commission_amount, 0) || 0;

  const filteredReferrals = referrals?.filter(
    r =>
      r.referrer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.referred_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = loadingReferrals || loadingStats;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReferrals}</p>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedReferrals}</p>
                <p className="text-sm text-muted-foreground">Converted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <DollarSign className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">₦{totalCommissions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers (Influencer Tracking) */}
      <Card>
        <CardHeader>
          <CardTitle>Top Referrers (Influencer Tracking)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {referrerStats?.slice(0, 10).map((stat, index) => (
                <div
                  key={stat.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{stat.full_name}</p>
                      <p className="text-sm text-muted-foreground">{stat.email}</p>
                      <Badge variant="outline" className="mt-1">
                        Code: {stat.referral_code}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{stat.total_referrals} referrals</p>
                    <p className="text-sm text-green-600">
                      {stat.completed_referrals} converted
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ₦{stat.total_earnings.toLocaleString()} earned
                    </p>
                  </div>
                </div>
              ))}
              {(!referrerStats || referrerStats.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No referrals yet
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Referrals */}
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredReferrals?.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {referral.referrer_name} → {referral.referred_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {referral.referrer_email} referred {referral.referred_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(referral.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        referral.status === "completed"
                          ? "default"
                          : referral.status === "paid"
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {referral.status}
                    </Badge>
                    <p className="text-sm mt-1">
                      {(referral.commission_rate * 100).toFixed(0)}% commission
                    </p>
                    {referral.commission_amount > 0 && (
                      <p className="text-sm font-medium text-green-600">
                        ₦{referral.commission_amount.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(!filteredReferrals || filteredReferrals.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No referrals found
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
