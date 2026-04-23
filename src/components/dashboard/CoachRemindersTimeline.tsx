import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Clock, Sparkles, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReminderRow {
  id: string;
  message_text: string;
  message_type: string;
  sent_at: string;
  context: any;
  user_learning_id: string | null;
}

interface PathRow {
  id: string;
  reminders_enabled: boolean;
  reminder_inactivity_days: number;
  last_reminder_sent_at: string | null;
  last_activity_date: string | null;
  learning_paths: { display_name: string; skill_name: string };
}

export function CoachRemindersTimeline() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: msgs }, { data: ulPaths }] = await Promise.all([
      supabase
        .from("coach_messages")
        .select("id, message_text, message_type, sent_at, context, user_learning_id")
        .eq("user_id", user!.id)
        .eq("is_proactive", true)
        .order("sent_at", { ascending: false })
        .limit(8),
      supabase
        .from("user_learning")
        .select(
          "id, reminders_enabled, reminder_inactivity_days, last_reminder_sent_at, last_activity_date, learning_paths(display_name, skill_name)"
        )
        .eq("user_id", user!.id)
        .eq("is_active", true),
    ]);
    setReminders((msgs as ReminderRow[]) || []);
    setPaths((ulPaths as unknown as PathRow[]) || []);
    setLoading(false);
  }

  if (loading || (paths.length === 0 && reminders.length === 0)) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Coach Reminders</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tools/learn">
            Manage <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Per-path reminder settings summary */}
      {paths.length > 0 && (
        <div className="space-y-2 mb-4">
          {paths.map((p) => {
            const lastActivity = p.last_activity_date
              ? formatDistanceToNow(new Date(p.last_activity_date), { addSuffix: true })
              : "no activity yet";
            const lastReminder = p.last_reminder_sent_at
              ? formatDistanceToNow(new Date(p.last_reminder_sent_at), { addSuffix: true })
              : "never";
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
              >
                <Link
                  to={`/tools/learn/${p.id}`}
                  className="text-sm font-medium hover:underline truncate max-w-[40%]"
                >
                  {p.learning_paths?.display_name}
                </Link>
                <Badge
                  variant="outline"
                  className={
                    p.reminders_enabled
                      ? "bg-success/10 text-success border-success/30 text-[10px]"
                      : "bg-muted text-muted-foreground text-[10px]"
                  }
                >
                  {p.reminders_enabled ? (
                    <>
                      <Bell className="h-3 w-3 mr-1" />
                      After {p.reminder_inactivity_days}d inactive
                    </>
                  ) : (
                    <>
                      <BellOff className="h-3 w-3 mr-1" />
                      Off
                    </>
                  )}
                </Badge>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  Last activity: {lastActivity} · Last nudge: {lastReminder}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline of past coach nudges */}
      {reminders.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No proactive nudges yet — your coach only reaches out when you've been inactive past your threshold.
        </p>
      ) : (
        <div className="relative pl-5 space-y-4">
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
          {reminders.map((r) => {
            const ctx = r.context || {};
            const reason: string =
              ctx.reason ||
              (r.message_type === "revision_guidance"
                ? "Submission needs revision"
                : r.message_type === "reminder"
                ? `Inactive for ${ctx.inactive_days ?? "?"} day${ctx.inactive_days === 1 ? "" : "s"}`
                : "Coach check-in");
            return (
              <div key={r.id} className="relative">
                <span className="absolute -left-[18px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {reason}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(r.sent_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.message_text}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
