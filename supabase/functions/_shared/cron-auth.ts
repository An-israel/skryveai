// Shared authorization gate for functions that have TWO legitimate callers:
// an admin (via the UI, with a bearer token) and a pg_cron schedule (which,
// like every other cron in this app — scrape-jobs, send-digest,
// event-reminders, sonder-agent — calls with no Authorization header at all).
// A request WITH a token must be an admin; a request with none is allowed
// through but rate-limited hard, so a leaked URL can't be abused for cost.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

import { enforceRateLimit, rateLimitResponse } from "./rate-limit.ts";

export async function authorizeAdminOrCron(
  req: Request,
  serviceClient: SupabaseClient,
  corsHeaders: Record<string, string>,
  rateLimitKey: string,
  anonymousLimit = 2,
  anonymousWindowSeconds = 3600,
): Promise<Response | null> {
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  if (authHeader) {
    const { data: { user } } = await serviceClient.auth.getUser(authHeader);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: { role: string }) => ["super_admin", "content_editor", "support_agent"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return null; // authorized
  }

  const rl = await enforceRateLimit(serviceClient, rateLimitKey, anonymousLimit, anonymousWindowSeconds);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);
  return null; // authorized (anonymous, but rate-limited)
}

/** Strict variant for functions with no legitimate anonymous/cron caller. */
export async function requireAdmin(
  req: Request,
  serviceClient: SupabaseClient,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: { user } } = await serviceClient.auth.getUser(authHeader);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: roles } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = roles?.some((r: { role: string }) => ["super_admin", "content_editor", "support_agent"].includes(r.role));
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null; // authorized
}
