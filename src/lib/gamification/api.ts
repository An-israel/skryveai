// Gamification client API — thin wrappers over the SECURITY DEFINER RPCs
// defined in supabase/migrations/20260711000000_gamification.sql.
// The RPCs aren't in the generated Supabase types yet, so we cast to any.
import { supabase } from "@/integrations/supabase/client";

export type BadgeTier = "bronze" | "silver" | "gold";

export interface GamBadge {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: BadgeTier;
  sort_order?: number;
  earned: boolean;
  earned_at: string | null;
}

export interface GamLevel {
  level: number;
  name: string;
  points_required: number;
  perks: string | null;
}

export interface GamStreak {
  streak_type: "application" | "learning" | "login";
  current_count: number;
  longest_count: number;
  last_active_date: string | null;
}

export interface GamStatsRow {
  total_points: number;
  current_level: number;
  level_name: string;
  profile_completion_percent: number;
  jobs_applied: number;
  projects_completed: number;
  courses_completed: number;
  certificates_earned: number;
  avg_rating: number;
  total_earnings: number;
}

export interface GamAchievement {
  id: string;
  type: string;
  title: string;
  description: string | null;
  points_awarded: number;
  celebrate: boolean;
  seen: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface GamStats {
  stats: GamStatsRow;
  current_level: GamLevel | null;
  next_level: GamLevel | null;
  streaks: GamStreak[];
  badges: GamBadge[];
  recent: GamAchievement[];
}

/** Real, client-driven actions worth points (job applications are server-side). */
export type GamAction =
  | "profile_section"
  | "lesson_complete"
  | "course_complete"
  | "land_client"
  | "review_5star"
  | "referral";

const rpc = (name: string, args?: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).rpc(name, args);

export async function fetchGamStats(): Promise<GamStats | null> {
  const { data, error } = await rpc("gam_stats");
  if (error) return null;
  return data as GamStats;
}

export async function fetchPublicProfile(userId: string): Promise<{
  current_level: number;
  level_name: string;
  badges: Omit<GamBadge, "earned">[];
} | null> {
  const { data, error } = await rpc("gam_public_profile", { _uid: userId });
  if (error || !data || Object.keys(data).length === 0) return null;
  return data;
}

/** Award points for a real action. Returns the raw engine result (may contain leveled_up). */
export async function awardPoints(action: GamAction) {
  const { data } = await rpc("gam_award", { _action: action });
  return data;
}

export async function updateStreak(type: "application" | "learning" | "login") {
  const { data } = await rpc("gam_update_streak", { _type: type });
  return data;
}

export async function recalcProfileCompletion(): Promise<number | null> {
  const { data } = await rpc("gam_recalc_profile");
  return typeof data === "number" ? data : null;
}

/** Pull unseen celebration-worthy achievements (and mark them seen). */
export async function popCelebrations(): Promise<GamAchievement[]> {
  const { data, error } = await rpc("gam_pop_celebrations");
  if (error || !Array.isArray(data)) return [];
  return data as GamAchievement[];
}
