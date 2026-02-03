import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QueuedEmail {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  scheduled_for: string;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
  campaign_id: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

export function useEmailQueueRealtime(campaignId?: string) {
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState<QueuedEmail[]>([]);
  const [stats, setStats] = useState<QueueStats>({ pending: 0, processing: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      let query = supabase
        .from("email_queue")
        .select("*")
        .order("scheduled_for", { ascending: false });
      
      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }
      
      const { data, error } = await query.limit(50);

      if (error) {
        console.error("Error fetching email queue:", error);
        return;
      }

      setEmails(data || []);

      // Calculate stats
      const newStats = { pending: 0, processing: 0, sent: 0, failed: 0 };
      (data || []).forEach((e) => {
        if (e.status in newStats) {
          newStats[e.status as keyof QueueStats]++;
        }
      });
      setStats(newStats);
    } catch (error) {
      console.error("Error fetching email queue:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("email-queue-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_queue",
        },
        (payload) => {
          console.log("Email queue realtime update:", payload);
          // Refetch to get updated data
          fetchQueue();
          // Also invalidate any related queries
          queryClient.invalidateQueries({ queryKey: ["email-queue"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);

  return { emails, stats, loading, refetch: fetchQueue };
}
