// Compute the next unlockable badge for a learner based on current snapshot.
// Mirrors the thresholds in src/lib/learning/achievements.ts.
export interface BadgeProgress {
  type: string;
  name: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  pct: number;
  category: "streak" | "lessons" | "skill";
}

const STREAKS = [
  { days: 3, type: "streak_3", name: "3-Day Streak", desc: "Learn 3 days in a row." },
  { days: 7, type: "streak_7", name: "Week Warrior", desc: "Hit a 7-day learning streak." },
  { days: 30, type: "streak_30", name: "Month Master", desc: "Hit a 30-day streak — incredible discipline." },
];

const LESSONS = [
  { count: 1, type: "first_lesson", name: "Getting Started", desc: "Complete your first lesson." },
  { count: 5, type: "lessons_5", name: "Building Momentum", desc: "Complete 5 lessons." },
  { count: 10, type: "lessons_10", name: "Double Digits", desc: "Complete 10 lessons." },
  { count: 25, type: "lessons_25", name: "Quarter Done", desc: "Complete 25 lessons." },
  { count: 50, type: "lessons_50", name: "Half Century", desc: "Complete 50 lessons." },
];

export function computeNextBadge(args: {
  completedLessons: number;
  totalLessons: number;
  streakDays: number;
  earnedTypes: Set<string>;
  skillName: string;
}): BadgeProgress | null {
  const { completedLessons, totalLessons, streakDays, earnedTypes, skillName } = args;

  const nextStreak = STREAKS.find((s) => !earnedTypes.has(s.type));
  const nextLesson = LESSONS.find((l) => !earnedTypes.has(l.type));
  const skillDone = totalLessons > 0 && completedLessons >= totalLessons;
  const skillEarned = earnedTypes.has("skill_complete");

  const candidates: BadgeProgress[] = [];

  if (nextLesson) {
    candidates.push({
      type: nextLesson.type,
      name: nextLesson.name,
      description: nextLesson.desc,
      current: Math.min(completedLessons, nextLesson.count),
      target: nextLesson.count,
      unit: "lessons",
      pct: Math.min(100, Math.round((completedLessons / nextLesson.count) * 100)),
      category: "lessons",
    });
  }

  if (nextStreak) {
    candidates.push({
      type: nextStreak.type,
      name: nextStreak.name,
      description: nextStreak.desc,
      current: Math.min(streakDays, nextStreak.days),
      target: nextStreak.days,
      unit: "days",
      pct: Math.min(100, Math.round((streakDays / nextStreak.days) * 100)),
      category: "streak",
    });
  }

  if (!skillEarned && totalLessons > 0) {
    candidates.push({
      type: "skill_complete",
      name: `${skillName} Graduate`,
      description: `Finish every lesson in ${skillName}.`,
      current: completedLessons,
      target: totalLessons,
      unit: "lessons",
      pct: Math.min(100, Math.round((completedLessons / totalLessons) * 100)),
      category: "skill",
    });
  }

  if (candidates.length === 0) return null;

  // Pick the one with highest progress percentage (closest to unlock).
  candidates.sort((a, b) => b.pct - a.pct);
  return candidates[0];
}
