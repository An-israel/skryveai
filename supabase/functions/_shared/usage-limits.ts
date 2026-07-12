// Server-side per-plan rate limiting + usage logging for AI tools (#8).
// Used by tool edge functions to HARD-enforce free-tier monthly caps.
//
// Usage:
//   const gate = await enforceToolLimit(serviceClient, user.id, "cv_builder");
//   if (!gate.allowed) return limitResponse(gate, corsHeaders);

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

import { enforceRateLimit } from "./rate-limit.ts";

// Global anti-abuse ceiling across ALL AI tools, per user. Generous enough that
// a real human never hits it, but it stops a runaway loop or abusive script from
// spiking the API bill. Applied inside enforceToolLimit so every gated tool is
// covered without per-function changes.
const AI_BURST_PER_MIN = 30;
const AI_MAX_PER_DAY = 200;

export interface ToolGate {
  allowed: boolean;
  plan: string;
  tool: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  reason?: "plan" | "rate";
}

function monthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Resolve the user's plan, compare this month's usage against the configured
 * (plan, tool) cap, log the event, and return whether the action is allowed.
 * A missing limit row means unlimited. Blocked attempts are logged too (for
 * admin visibility) but do not count toward the cap.
 */
export async function enforceToolLimit(
  serviceClient: SupabaseClient,
  userId: string,
  tool: string
): Promise<ToolGate> {
  // 0. Global anti-abuse ceiling (per user, across every AI tool). Fail-open on
  // limiter errors — never let it break a legitimate request.
  const burst = await enforceRateLimit(serviceClient, `ai:${userId}`, AI_BURST_PER_MIN, 60);
  if (!burst.allowed) {
    return { allowed: false, plan: "free", tool, limit: null, used: 0, remaining: 0, reason: "rate" };
  }
  const daily = await enforceRateLimit(serviceClient, `aiday:${userId}`, AI_MAX_PER_DAY, 86400);
  if (!daily.allowed) {
    return { allowed: false, plan: "free", tool, limit: null, used: 0, remaining: 0, reason: "rate" };
  }

  // 1. Plan. The subscriptions.plan column is a legacy enum
  // (monthly/yearly/lifetime) in some environments, so only an explicit
  // 'pro'/'business' counts as paid; everything else is treated as 'free'.
  let plan = "free";
  try {
    const { data: sub } = await serviceClient
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const raw = sub?.plan ? String(sub.plan) : "free";
    plan = raw === "pro" || raw === "business" ? raw : "free";
  } catch (_e) {
    // If subscriptions can't be read, fail closed to "free" (still capped).
  }

  // 2. Limit for (plan, tool).
  let limit: number | null = null;
  try {
    const { data: lim } = await serviceClient
      .from("tool_plan_limits")
      .select("monthly_limit")
      .eq("plan", plan)
      .eq("tool", tool)
      .maybeSingle();
    limit = lim ? lim.monthly_limit : null;
  } catch (_e) {
    limit = null;
  }

  // 3. Usage this calendar month (non-blocked only).
  let used = 0;
  try {
    const { count } = await serviceClient
      .from("tool_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("tool", tool)
      .eq("blocked", false)
      .gte("created_at", monthStartISO());
    used = count ?? 0;
  } catch (_e) {
    used = 0;
  }

  const blocked = limit !== null && used >= limit;

  // 4. Log the event (best effort — never let logging break the tool).
  try {
    await serviceClient
      .from("tool_usage_events")
      .insert({ user_id: userId, tool, plan, blocked });
  } catch (_e) {
    /* ignore */
  }

  return {
    allowed: !blocked,
    plan,
    tool,
    limit,
    used: blocked ? used : used + 1,
    remaining: limit === null ? null : Math.max(0, limit - used - (blocked ? 0 : 1)),
  };
}

/** Build a 429 response describing the hit limit. */
export function limitResponse(gate: ToolGate, corsHeaders: Record<string, string>): Response {
  if (gate.reason === "rate") {
    return new Response(
      JSON.stringify({
        error: "rate_limit",
        message: "You're doing that a lot in a short time. Please wait a moment and try again.",
        reason: "rate",
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
    );
  }
  return new Response(
    JSON.stringify({
      error: "rate_limit",
      message: `You've reached your ${gate.plan} plan limit of ${gate.limit} ${gate.tool.replace(/_/g, " ")} uses this month. Upgrade to Pro for unlimited access.`,
      plan: gate.plan,
      tool: gate.tool,
      limit: gate.limit,
      used: gate.used,
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
