// Global gamification context: single source of truth for the user's stats +
// owns the celebration queue. Polls the server for unseen celebration-worthy
// achievements (including server-side ones like job applications) and renders
// the celebration modal above the whole app.
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGamStats, awardPoints, updateStreak, recalcProfileCompletion,
  popCelebrations, type GamStats, type GamAction, type GamAchievement,
} from "@/lib/gamification/api";
import { CelebrationModal } from "@/components/gamification/CelebrationModal";

interface GamContextValue {
  stats: GamStats | null;
  loading: boolean;
  /** Refetch stats now and pull any new celebrations. */
  refresh: () => void;
  award: (action: GamAction) => Promise<void>;
  streak: (type: "application" | "learning" | "login") => Promise<void>;
  recalcProfile: () => Promise<void>;
}

const GamContext = createContext<GamContextValue>({
  stats: null, loading: true,
  refresh: () => {},
  award: async () => {}, streak: async () => {}, recalcProfile: async () => {},
});

export function useGamificationContext() {
  return useContext(GamContext);
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<GamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<GamAchievement[]>([]);
  const [authed, setAuthed] = useState(false);
  const checking = useRef(false);

  const loadStats = useCallback(async () => {
    const s = await fetchGamStats();
    setStats(s);
    setLoading(false);
  }, []);

  const check = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const items = await popCelebrations();
      if (items.length) setQueue((q) => [...q, ...items]);
    } finally {
      checking.current = false;
    }
  }, []);

  const refresh = useCallback(() => {
    void loadStats();
    void check();
  }, [loadStats, check]);

  const award = useCallback(async (action: GamAction) => {
    await awardPoints(action);
    refresh();
  }, [refresh]);

  const streak = useCallback(async (type: "application" | "learning" | "login") => {
    await updateStreak(type);
    refresh();
  }, [refresh]);

  const recalcProfile = useCallback(async () => {
    await recalcProfileCompletion();
    refresh();
  }, [refresh]);

  // Load once a session is present; clear on sign-out.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session?.user) { setAuthed(true); void loadStats(); void check(); }
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setAuthed(true); void loadStats(); void check(); }
      else { setAuthed(false); setStats(null); setQueue([]); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [loadStats, check]);

  // Catch celebrations produced while the tab was in the background.
  useEffect(() => {
    if (!authed) return;
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [authed, check]);

  const current = queue[0] ?? null;

  return (
    <GamContext.Provider value={{ stats, loading, refresh, award, streak, recalcProfile }}>
      {children}
      <CelebrationModal
        achievement={current}
        onClose={() => setQueue((q) => q.slice(1))}
      />
    </GamContext.Provider>
  );
}
