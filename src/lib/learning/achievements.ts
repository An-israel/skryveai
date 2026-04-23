// Client-side achievement evaluator.
// Called after a lesson is completed; checks streak/milestones and inserts via SECURITY DEFINER RPC.
import { supabase } from "@/integrations/supabase/client";

interface UserLearningSnapshot {
  id: string;
  user_id: string;
  completed_lessons: number;
  total_lessons: number;
  streak_days: number;
  current_module: number;
  current_level: number;
  learning_paths: { display_name: string };
}

const STREAK_BADGES: { days: number; type: string; name: string; desc: string }[] =
  [
    { days: 3, type: "streak_3", name: "3-Day Streak", desc: "Learned 3 days in a row." },
    { days: 7, type: "streak_7", name: "Week Warrior", desc: "7-day learning streak." },
    {
      days: 30,
      type: "streak_30",
      name: "Month Master",
      desc: "30-day learning streak — incredible discipline.",
    },
  ];

const LESSON_MILESTONES: { count: number; type: string; name: string; desc: string }[] =
  [
    { count: 1, type: "first_lesson", name: "Getting Started", desc: "Completed your first lesson." },
    { count: 5, type: "lessons_5", name: "Building Momentum", desc: "Completed 5 lessons." },
    {
      count: 10,
      type: "lessons_10",
      name: "Double Digits",
      desc: "Completed 10 lessons.",
    },
    { count: 25, type: "lessons_25", name: "Quarter Done", desc: "Completed 25 lessons." },
    {
      count: 50,
      type: "lessons_50",
      name: "Half Century",
      desc: "Completed 50 lessons across your learning.",
    },
  ];

export async function evaluateAchievements(
  ul: UserLearningSnapshot
): Promise<string[]> {
  const skill = ul.learning_paths?.display_name || "freelancing";
  const earned: string[] = [];

  // Streak badges (per skill)
  for (const b of STREAK_BADGES) {
    if (ul.streak_days >= b.days) {
      const { data } = await supabase.rpc("award_learning_achievement", {
        _user_id: ul.user_id,
        _user_learning_id: ul.id,
        _achievement_type: b.type,
        _achievement_name: b.name,
        _achievement_description: b.desc,
        _skill_name: skill,
      });
      if (data) earned.push(b.name);
    }
  }

  // Lesson milestones (per skill)
  for (const m of LESSON_MILESTONES) {
    if (ul.completed_lessons >= m.count) {
      const { data } = await supabase.rpc("award_learning_achievement", {
        _user_id: ul.user_id,
        _user_learning_id: ul.id,
        _achievement_type: m.type,
        _achievement_name: m.name,
        _achievement_description: m.desc,
        _skill_name: skill,
      });
      if (data) earned.push(m.name);
    }
  }

  // Skill complete
  if (ul.total_lessons > 0 && ul.completed_lessons >= ul.total_lessons) {
    const { data } = await supabase.rpc("award_learning_achievement", {
      _user_id: ul.user_id,
      _user_learning_id: ul.id,
      _achievement_type: "skill_complete",
      _achievement_name: `${skill} Graduate`,
      _achievement_description: `Completed every lesson in ${skill}.`,
      _skill_name: skill,
    });
    if (data) earned.push(`${skill} Graduate`);
  }

  return earned;
}
