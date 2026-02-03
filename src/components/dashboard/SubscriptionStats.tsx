import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Crown, AlertTriangle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface SubscriptionData {
  status: string;
  plan: string;
  trialEndsAt: string | null;
}

export function SubscriptionStats() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("status, plan, trial_ends_at")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSubscription({
          status: data.status,
          plan: data.plan,
          trialEndsAt: data.trial_ends_at,
        });
      }
      setLoading(false);
    };

    fetchSubscription();
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4">
          <div className="h-12 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const isTrialing = subscription.status === "trial";
  const isActive = subscription.status === "active";
  const isExpired = subscription.status === "expired";

  const getDaysRemaining = () => {
    if (!subscription.trialEndsAt) return 0;
    const end = new Date(subscription.trialEndsAt);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Card className={`border-2 ${isTrialing ? "border-warning/30 bg-warning/5" : isActive ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isTrialing ? (
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
            ) : isActive ? (
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-success" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {isTrialing ? "Free Trial" : isActive ? `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan` : "Subscription Expired"}
                </span>
                <Badge variant={isTrialing ? "outline" : isActive ? "default" : "destructive"}>
                  {subscription.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isTrialing ? (
                  daysRemaining > 0 ? (
                    <span className={daysRemaining <= 3 ? "text-warning font-medium" : ""}>
                      {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                    </span>
                  ) : (
                    <span className="text-destructive font-medium">Trial expired</span>
                  )
                ) : isActive ? (
                  "Full access to all features"
                ) : (
                  "Upgrade to continue using SkryveAI"
                )}
              </p>
            </div>
          </div>
          {(isTrialing || isExpired) && (
            <Button asChild size="sm" variant={isExpired ? "default" : "outline"}>
              <Link to="/pricing">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Now
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
