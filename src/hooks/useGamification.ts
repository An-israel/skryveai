// Thin accessor over the gamification context (single source of truth lives in
// GamificationProvider). Exposes the current user's stats + action helpers.
import { useGamificationContext } from "@/context/GamificationProvider";

export function useGamification() {
  const { stats, loading, refresh, award, streak, recalcProfile } = useGamificationContext();
  return { stats, loading, reload: refresh, award, streak, recalcProfile };
}
