import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Infinity, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CreditsDisplayProps {
  userId: string;
}

export function CreditsDisplay({ userId }: CreditsDisplayProps) {
  const { data: subscription } = useQuery({
    queryKey: ["user-subscription-credits", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("credits, plan, status, last_daily_credit")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const isLifetime = subscription?.plan === "lifetime";
  const credits = subscription?.credits || 0;
  const lastDailyCredit = subscription?.last_daily_credit;

  // Calculate time until next free credits
  let nextFreeCredits = null;
  if (lastDailyCredit) {
    const lastCreditDate = new Date(lastDailyCredit);
    const nextCreditDate = new Date(lastCreditDate.getTime() + 24 * 60 * 60 * 1000);
    if (nextCreditDate > new Date()) {
      nextFreeCredits = formatDistanceToNow(nextCreditDate, { addSuffix: true });
    }
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              {isLifetime ? (
                <Infinity className="h-5 w-5 text-primary" />
              ) : (
                <Coins className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Credits</p>
              <p className="text-2xl font-bold">
                {isLifetime ? "Unlimited" : credits.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="mb-1">
              {subscription?.plan || "Free"}
            </Badge>
            {!isLifetime && nextFreeCredits && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                +5 credits {nextFreeCredits}
              </p>
            )}
          </div>
        </div>
        {!isLifetime && (
          <p className="text-xs text-muted-foreground mt-3">
            Everyone gets 5 free credits daily • Upgrade for more
          </p>
        )}
      </CardContent>
    </Card>
  );
}
