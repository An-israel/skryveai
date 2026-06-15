import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SkryveRole = "talent" | "client" | "loading" | "none";

export function useSkryveRole(userId: string | null | undefined) {
  const [role, setRole] = useState<SkryveRole>("loading");

  useEffect(() => {
    if (!userId) { setRole("none"); return; }

    let cancelled = false;
    // Safety net: never leave the dashboard stuck on the loading skeleton
    const failsafe = setTimeout(() => { if (!cancelled) setRole("talent"); }, 8000);
    (async () => {
      try {
        const [{ data: tp }, { data: cp }] = await Promise.all([
          supabase.from("talent_profiles").select("id").eq("user_id", userId).maybeSingle(),
          supabase.from("client_profiles").select("id").eq("user_id", userId).maybeSingle(),
        ]);
        if (cancelled) return;
        if (cp)      setRole("client");
        else if (tp) setRole("talent");
        else         setRole("talent"); // default for new users — onboarding will set it
      } catch (err) {
        console.error("useSkryveRole error:", err);
        if (!cancelled) setRole("talent");
      } finally {
        clearTimeout(failsafe);
      }
    })();

    return () => { cancelled = true; clearTimeout(failsafe); };
  }, [userId]);

  return role;
}
