import { useAuth } from "./use-auth";

// Plans that unlock paid features. Admins/staff always count as paid.
const PAID_PLANS = ["pro", "business"];

/**
 * Central place to decide what a user can access.
 *  - isAdmin: staff/admin — gets every paid feature for free.
 *  - isPaid:  admin OR on a pro/business plan.
 * Use this to gate paid-only surfaces (e.g. Sonder) and admin-only tools.
 */
export function useEntitlements() {
  const { user, isStaffAdmin, subscription, loading } = useAuth(false);
  const plan = subscription?.plan || "free";
  const isPaid = isStaffAdmin || PAID_PLANS.includes(plan);
  return { user, isAdmin: isStaffAdmin, plan, isPaid, loading };
}
