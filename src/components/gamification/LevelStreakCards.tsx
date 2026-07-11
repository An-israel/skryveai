// Level progress bar + streaks + "Road to First Hire" milestone tracker.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGamification } from "@/hooks/useGamification";
import type { GamStreak } from "@/lib/gamification/api";

/* ── Level progress ─────────────────────────────────────── */
export function LevelProgressCard() {
  const { stats } = useGamification();
  if (!stats) return null;

  const { stats: s, next_level } = stats;
  const cur = stats.current_level;
  const floor = cur?.points_required ?? 0;
  const ceil = next_level?.points_required ?? s.total_points;
  const span = Math.max(1, ceil - floor);
  const pct = next_level ? Math.min(100, Math.round(((s.total_points - floor) / span) * 100)) : 100;

  return (
    <div className="border border-border rounded-xl bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">{s.level_name}</span>
        </div>
        <span className="font-mono text-[12px] text-muted-foreground">{s.total_points.toLocaleString()} pts</span>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        {next_level
          ? `${(ceil - s.total_points).toLocaleString()} pts to ${next_level.name}`
          : "You’ve reached the top level — Elite."}
      </p>
    </div>
  );
}

/* ── Streaks ────────────────────────────────────────────── */
export function StreakCard() {
  const { stats } = useGamification();
  if (!stats) return null;

  const byType = (t: string): GamStreak | undefined =>
    stats.streaks.find((s) => s.streak_type === t);
  const app = byType("application");
  const learn = byType("learning");

  const rows = [
    { label: "Applying", streak: app },
    { label: "Learning", streak: learn },
  ].filter((r) => r.streak && r.streak.current_count > 0);

  if (rows.length === 0) {
    return (
      <div className="border border-border rounded-xl bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground">Streaks</span>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Apply to a job or finish a lesson today to start a streak.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="text-[13px] font-semibold text-foreground">Streaks</span>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ label, streak }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.span
                key={streak!.current_count}
                initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 12 }}
                className="font-mono text-lg font-bold text-orange-500 leading-none"
              >
                {streak!.current_count}
              </motion.span>
              <span className="text-[12px] text-foreground">day {label.toLowerCase()} streak</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Best: {streak!.longest_count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Road to First Hire ─────────────────────────────────── */
const STAGES = ["Profile complete", "First application", "First reply", "First interview", "First hire"];

export function RoadToFirstHire({ userId }: { userId: string }) {
  const { stats } = useGamification();
  const [reached, setReached] = useState<number>(0);

  useEffect(() => {
    if (!stats) return;
    (async () => {
      const { data: apps } = await (supabase as any)
        .from("job_applications")
        .select("status").eq("user_id", userId);
      const statuses = new Set<string>((apps || []).map((a: any) => a.status));
      let r = 0;
      if (stats.stats.profile_completion_percent >= 100) r = 1;
      if ((apps?.length ?? 0) > 0) r = Math.max(r, 2);
      if (statuses.has("replied") || statuses.has("interview") || statuses.has("offer") || statuses.has("hired")) r = Math.max(r, 3);
      if (statuses.has("interview") || statuses.has("offer") || statuses.has("hired")) r = Math.max(r, 4);
      if (statuses.has("hired") || statuses.has("offer") || stats.stats.projects_completed > 0) r = 5;
      setReached(r);
    })();
  }, [stats, userId]);

  // Hide once they've clearly landed work — the journey is done.
  if (!stats || reached >= 5) return null;

  return (
    <div className="border border-border rounded-xl bg-card p-5">
      <span className="text-[13px] font-semibold text-foreground">Road to your first hire</span>
      <div className="mt-4 space-y-0">
        {STAGES.map((stage, i) => {
          const done = i < reached;
          const current = i === reached;
          return (
            <div key={stage} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                {done
                  ? <CheckCircle2 className="w-4 h-4 text-primary" />
                  : <Circle className={`w-4 h-4 ${current ? "text-primary" : "text-muted-foreground/30"}`} />}
                {i < STAGES.length - 1 && (
                  <div className={`w-px h-6 ${done ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
              <span className={`text-[13px] -mt-0.5 ${done ? "text-muted-foreground line-through" : current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
