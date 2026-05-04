import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Mail, Eye, MessageSquare, AlertCircle, Bot, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  business_name: string;
  status: string;
  email_subject?: string;
  opened: boolean;
  replied: boolean;
  created_at: string;
}

const statusMeta: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  sent:      { icon: Mail,          label: "Email sent",     color: "text-blue-500" },
  opened:    { icon: Eye,           label: "Email opened",   color: "text-amber-500" },
  replied:   { icon: MessageSquare, label: "Reply received", color: "text-green-500" },
  failed:    { icon: AlertCircle,   label: "Send failed",    color: "text-red-500" },
  skipped:   { icon: Zap,           label: "Skipped",        color: "text-muted-foreground" },
};

interface ActivityFeedProps {
  userId: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("autopilot_activity")
        .select("id, business_name, status, email_subject, opened, replied, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      setItems((data as ActivityItem[]) || []);
      setLoading(false);
    }
    fetch();

    // Real-time updates
    const channel = supabase
      .channel(`activity-feed-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "autopilot_activity", filter: `user_id=eq.${userId}` },
        (payload) => setItems(prev => [payload.new as ActivityItem, ...prev].slice(0, 10))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" /> AutoPilot Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {items.map((item) => {
            // Determine the effective display status
            const displayStatus = item.replied ? "replied" : item.opened ? "opened" : item.status;
            const meta = statusMeta[displayStatus] || statusMeta["sent"];
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className={`mt-0.5 ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.business_name}</p>
                  {item.email_subject && (
                    <p className="text-xs text-muted-foreground truncate">{item.email_subject}</p>
                  )}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <Badge variant="outline" className={`text-xs ${meta.color} border-current`}>
                    {meta.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground block">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
