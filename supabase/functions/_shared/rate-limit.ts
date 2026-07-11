// Sliding-window rate limiting for edge functions (anti-abuse, Prompt 2).
// Uses the service client so it works regardless of the caller. Thresholds are
// generous — real users never hit them; bots and scripts do.
//
// Usage:
//   const rl = await enforceRateLimit(serviceClient, `tiptip:${user.id}`, 20, 60);
//   if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export async function enforceRateLimit(
  serviceClient: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  try {
    const { count } = await serviceClient
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", since);
    const used = count ?? 0;
    if (used >= limit) {
      return { allowed: false, remaining: 0, retryAfter: windowSeconds };
    }
    await serviceClient.from("rate_limit_events").insert({ key });
    return { allowed: true, remaining: limit - used - 1, retryAfter: 0 };
  } catch (_e) {
    // Never let the limiter itself break the request — fail open.
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

export function rateLimitResponse(corsHeaders: Record<string, string>, retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests", retryAfter }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
  );
}
