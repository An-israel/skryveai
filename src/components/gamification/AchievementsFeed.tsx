// A personal timeline of recent achievements — reinforces how far you've come.
import { formatDistanceToNow } from "date-fns";
import { Award, TrendingUp, Flame, Sparkles } from "lucide-react";
import type { GamAchievement } from "@/lib/gamification/api";

const ICON: Record<string, typeof Award> = {
  badge: Award,
  level_up: TrendingUp,
  streak_milestone: Flame,
  points: Sparkles,
};

export function AchievementsFeed({ items }: { items: GamAchievement[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Your journey</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((a) => {
          const Icon = ICON[a.type] || Sparkles;
          return (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{a.title}</p>
                {a.description && (
                  <p className="text-[11px] text-muted-foreground truncate">{a.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                {a.points_awarded > 0 && (
                  <p className="text-[11px] font-mono text-primary">+{a.points_awarded}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
