import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, Gift, Loader2 } from "lucide-react";

interface ReferralCardProps {
  userId: string;
}

export function ReferralCard({ userId }: ReferralCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const totalReferrals = referrals?.length || 0;
  const completedReferrals = referrals?.filter(r => r.status === "completed").length || 0;
  const totalEarnings = referrals
    ?.filter(r => r.status === "completed" || r.status === "paid")
    .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Refer & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
          <p className="text-sm font-medium mb-2">Your Referral Link</p>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="text-sm bg-background"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              disabled={!referralLink}
            >
              <Copy className={`h-4 w-4 ${copied ? "text-green-500" : ""}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Earn 40% commission for 6 months when your referrals subscribe!
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 border rounded-lg">
                <p className="text-2xl font-bold">{totalReferrals}</p>
                <p className="text-xs text-muted-foreground">Total Referrals</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">{completedReferrals}</p>
                <p className="text-xs text-muted-foreground">Converted</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-2xl font-bold text-primary">₦{totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </div>
            </div>

            {referrals && referrals.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Recent Referrals</p>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {referrals.slice(0, 5).map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between p-2 border rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Referral</span>
                      </div>
                      <Badge
                        variant={ref.status === "completed" ? "default" : "secondary"}
                      >
                        {ref.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
