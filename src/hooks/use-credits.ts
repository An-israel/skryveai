import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

/**
 * Handles credit checking and deduction for tool usage.
 * Staff/admins and lifetime plan users are never charged.
 */
export function useCredits() {
  const { user, isStaffAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  /**
   * Check if the user has enough credits for a tool.
   * Returns { ok: true, credits, plan } if they can proceed, or { ok: false } if not.
   */
  const checkCredits = useCallback(async (required: number) => {
    if (!user) return { ok: false as const };
    if (isStaffAdmin) return { ok: true as const, credits: Infinity, plan: "staff" };

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("credits, plan, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !sub) {
      return { ok: false as const };
    }

    // Lifetime plan is never charged
    if (sub.plan === "lifetime") {
      return { ok: true as const, credits: Infinity, plan: sub.plan };
    }

    if ((sub.credits ?? 0) < required) {
      toast({
        title: "Not enough credits",
        description: `This action costs ${required} credit${required !== 1 ? "s" : ""}. You have ${(sub.credits ?? 0).toFixed(1)} left. Upgrade your plan to get more.`,
        variant: "destructive",
      });
      navigate("/pricing");
      return { ok: false as const };
    }

    return { ok: true as const, credits: sub.credits ?? 0, plan: sub.plan };
  }, [user, isStaffAdmin, toast, navigate]);

  /**
   * Deduct credits after a successful tool run.
   * Silently skips for staff/admins and lifetime plan.
   */
  const deductCredits = useCallback(async (amount: number) => {
    if (!user || isStaffAdmin) return;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("credits, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub || sub.plan === "lifetime") return;

    const newCredits = Math.max(0, (sub.credits ?? 0) - amount);
    await supabase
      .from("subscriptions")
      .update({ credits: newCredits })
      .eq("user_id", user.id);
  }, [user, isStaffAdmin]);

  return { checkCredits, deductCredits };
}
