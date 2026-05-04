import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, Gift, Loader2, CheckCircle2, Twitter, MessageCircle, Share2 } from "lucide-react";

interface ReferralCardProps {
  userId: string;
}

const MILESTONES = [
  { count: 1,  label: "First referral!",   reward: "Bonus credits" },
  { count: 5,  label: "5 referrals",        reward: "Featured badge" },
  { count: 10, label: "10 referrals",       reward: "Priority support" },
  { count: 25, label: "Super referrer!",    reward: "Lifetime discount" },
];

export function ReferralCard({ userId }: ReferralCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code, full_name")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["user-referrals", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("id, status, created_at, commission_amount")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/signup?ref=${profile.referral_code}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`I'm using SkryveAI to find and pitch clients on autopilot — it's 🔥. Sign up free with my link and we both get rewards!\n\n${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`Just discovered @SkryveAI — the AI tool that finds clients for you and writes the pitches. Try it free 👇`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`, "_blank");
  };

  const totalReferrals = referrals?.length || 0;
  const convertedReferrals = referrals?.filter(r => r.status === "completed" || r.status === "paid").length || 0;
  const pendingReferrals = referrals?.filter(r => r.status === "pending").length || 0;
  const totalEarnings = referrals
    ?.filter(r => r.status === "completed" || r.status === "paid")
    .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

  const nextMilestone = MILESTONES.find(m => m.count > totalReferrals) || MILESTONES[MILESTONES.length - 1];
  const prevMilestone = MILESTONES.filter(m => m.count <= totalReferrals).pop();
  const milestoneProgress = prevMilestone
    ? Math.round(((totalReferrals - prevMilestone.count) / (nextMilestone.count - prevMilestone.count)) * 100)
    : Math.round((totalReferrals / nextMilestone.count) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Refer & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Earnings hero */}
        <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
          <p className="text-3xl font-bold text-primary">₦{totalEarnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">40% commission · 6 months per referral</p>
        </div>

        {/* Stats row */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-2">
              <p className="text-xl font-bold">{totalReferrals}</p>
              <p className="text-xs text-muted-foreground">Referred</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-xl font-bold text-amber-500">{pendingReferrals}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-xl font-bold text-green-600">{convertedReferrals}</p>
              <p className="text-xs text-muted-foreground">Converted</p>
            </div>
          </div>
        )}

        {/* Milestone progress */}
        {totalReferrals < 25 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Next milestone: <strong className="text-foreground">{nextMilestone.label}</strong></span>
              <span>{totalReferrals}/{nextMilestone.count}</span>
            </div>
            <Progress value={Math.min(milestoneProgress, 100)} className="h-1.5" />
            <p className="text-xs text-primary">🎁 Reward: {nextMilestone.reward}</p>
          </div>
        )}

        {/* Referral link */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Your referral link</p>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="text-xs bg-muted/50" />
            <Button variant="outline" size="icon" onClick={copyLink} disabled={!referralLink}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Share via</p>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
              <Share2 className="w-3.5 h-3.5" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50" onClick={shareWhatsApp}>
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-blue-500 border-blue-200 hover:bg-blue-50" onClick={shareTwitter}>
              <Twitter className="w-3.5 h-3.5" /> Twitter
            </Button>
          </div>
        </div>

        {/* Recent referrals */}
        {isLoading ? (
          <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : referrals && referrals.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent referrals</p>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {referrals.slice(0, 8).map((ref) => (
                <div key={ref.id} className="flex items-center justify-between px-3 py-2 rounded-lg border text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ref.commission_amount > 0 && (
                      <span className="text-xs font-medium text-green-600">+₦{ref.commission_amount.toLocaleString()}</span>
                    )}
                    <Badge variant={ref.status === "completed" || ref.status === "paid" ? "default" : "secondary"} className="text-xs">
                      {ref.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-3 text-sm text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No referrals yet. Share your link to start earning!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
