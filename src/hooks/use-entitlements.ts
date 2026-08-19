import { useAuth } from "./use-auth";

// Plans that unlock paid features. Admins/staff always count as paid. Mirrors
// the tiers verify-payment actually writes to subscriptions.plan — keep this in
// sync with normalizePlanTier() in supabase/functions/verify-payment/index.ts.
export const PAID_PLANS = ["basic", "pro", "unlimited", "business", "team_basic", "team_pro"];

// Sonder (the autonomous, AI-heavy job-application agent) is expensive to run,
// so it is intentionally the ONE feature admins do NOT get for free. It is
// limited to the Business plan, plus the owner account for operating it.
const SONDER_OWNER_EMAIL = "aniekaneazy@gmail.com";

/**
 * Central place to decide what a user can access.
 *  - isAdmin: staff/admin — gets every paid feature for free.
 *  - isPaid:  admin OR on a pro/business plan.
 *  - canUseSonder: Business plan only, OR the owner account. NOT other admins —
 *    Sonder's AI cost means it must be a deliberately paid, owner-gated surface.
 */
export function useEntitlements() {
  const { user, isStaffAdmin, subscription, loading } = useAuth(false);
  const plan = subscription?.plan || "free";
  const isPaid = isStaffAdmin || PAID_PLANS.includes(plan);
  const isOwner = (user?.email || "").toLowerCase() === SONDER_OWNER_EMAIL;
  const canUseSonder = isOwner || plan === "business";
  return { user, isAdmin: isStaffAdmin, isOwner, plan, isPaid, canUseSonder, loading };
}
