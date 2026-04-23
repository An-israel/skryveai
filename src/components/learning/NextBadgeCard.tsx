import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, Flame, BookOpen, GraduationCap, Trophy } from "lucide-react";
import { computeNextBadge, type BadgeProgress } from "@/lib/learning/next-badge";

interface Props {
  userId: string;
  userLearningId: string;
  completedLessons: number;
  totalLessons: number;
  streakDays: number;
  skillName: string;
}

function iconFor(b: BadgeProgress) {
  if (b.category === "streak") return Flame;
  if (b.category === "skill") return GraduationCap;
  if (b.type === "first_lesson") return Trophy;
  return BookOpen;
}

export function NextBadgeCard({
  userId,
  completedLessons,
  totalLessons,
  streakDays,
  skillName,
}: Props) {
  const [next, setNext] = useState<BadgeProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("learning_achievements")
        .select("achievement_type, skill_name")
        .eq("user_id", userId);
      if (cancelled) return;
      const earnedTypes = new Set(
        (data || [])
          .filter((a: any) => !a.skill_name || a.skill_name === skillName || a.achievement_type !== "skill_complete")
          .map((a: any) => a.achievement_type as string)
      );
      const result = computeNextBadge({
        completedLessons,
        totalLessons,
        streakDays,
        earnedTypes,
        skillName,
      });
      setNext(result);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, completedLessons, totalLessons, streakDays, skillName]);

  if (loading) return null;

  if (!next) {
    return (
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">All badges unlocked 🏆</p>
            <p className="text-xs text-muted-foreground">
              You've collected every badge for this skill. Legend.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const Icon = iconFor(next);
  const remaining = Math.max(0, next.target - next.current);
  const lessonsPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold truncate">Next badge: {next.name}</p>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {next.pct}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{next.description}</p>
          <Progress value={next.pct} className="h-1.5 mb-1.5" />
          <p className="text-[11px] text-muted-foreground">
            {next.current}/{next.target} {next.unit}
            {remaining > 0 && (
              <span className="text-primary font-medium">
                {" "}
                · {remaining} {next.unit} to unlock
              </span>
            )}
          </p>

          {/* Exact inputs used to compute this preview */}
          <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Flame className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Streak:</span>
              <span className="font-semibold">{streakDays}d</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Lessons:</span>
              <span className="font-semibold">
                {completedLessons}/{totalLessons}
              </span>
              <span className="text-muted-foreground">({lessonsPct}%)</span>
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground/80">
            Used to compute next-badge progress · category: <span className="capitalize">{next.category}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
