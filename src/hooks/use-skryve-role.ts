import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SkryveRole = "talent" | "client" | "loading" | "none";

/**
 * Resolves the user's ACTIVE role.
 * Priority:
 *   1. profiles.active_role (the explicit, persisted choice — set at onboarding
 *      completion and whenever the user switches modes)
 *   2. fall back to whichever profile row exists (client wins if both)
 *   3. default to "talent" for brand-new users
 * Reading the persisted active_role is what lets a client stay a client and a
 * user switch between talent/client without being silently reset to talent.
 */
export function useSkryveRole(userId: string | null | undefined) {
  const [role, setRole] = useState<SkryveRole>("loading");

  useEffect(() => {
    if (!userId) { setRole("none"); return; }

    let cancelled = false;
    // Safety net: never leave the dashboard stuck on the loading skeleton
    const failsafe = setTimeout(() => { if (!cancelled) setRole("talent"); }, 8000);
    (async () => {
      try {
        const [{ data: prof }, { data: tp }, { data: cp }] = await Promise.all([
          (supabase as any).from("profiles").select("active_role").eq("user_id", userId).maybeSingle(),
          supabase.from("talent_profiles").select("id").eq("user_id", userId).maybeSingle(),
          supabase.from("client_profiles").select("id").eq("user_id", userId).maybeSingle(),
        ]);
        if (cancelled) return;

        const active = prof?.active_role as "talent" | "client" | null | undefined;
        if (active === "client" || active === "talent") {
          setRole(active);
        } else if (cp) {
          setRole("client");
        } else if (tp) {
          setRole("talent");
        } else {
          setRole("talent"); // default for new users — onboarding sets active_role
        }
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

/**
 * Switch the active role. If the target role's profile already exists, persist
 * the choice and reload into the dashboard. If it doesn't exist yet, send the
 * user through that role's onboarding (which creates the profile and sets
 * active_role on completion).
 * Returns the path the caller should navigate to, or null if it already reloaded.
 */
export async function switchActiveRole(
  userId: string,
  target: "talent" | "client",
): Promise<{ navigateTo: string | null }> {
  const table = target === "client" ? "client_profiles" : "talent_profiles";
  const { data: existing } = await (supabase as any)
    .from(table).select("id, onboarding_completed").eq("user_id", userId).maybeSingle();

  // Remember the preference either way.
  await (supabase as any).from("profiles").update({ active_role: target }).eq("user_id", userId);
  // Keep auth metadata in sync so the onboarding dispatcher routes correctly.
  await supabase.auth.updateUser({ data: { role: target } }).catch(() => {});

  if (existing && existing.onboarding_completed) {
    return { navigateTo: "/dashboard" };
  }
  // No profile yet (or onboarding unfinished) → run that role's onboarding.
  return { navigateTo: `/onboarding/${target}` };
}
