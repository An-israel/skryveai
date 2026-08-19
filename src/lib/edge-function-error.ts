/** Structured info carried by a plan-limit rejection, for the upgrade dialog. */
export interface ToolLimitInfo {
  plan: string;
  tool: string;
  limit: number | null;
  used?: number;
  message: string;
}

/**
 * Thrown instead of a generic Error when an edge function rejected the call
 * because the caller hit their plan's monthly usage cap for a tool. Callers
 * catch this specifically to show the upgrade dialog instead of a failure toast.
 */
export class ToolLimitError extends Error {
  info: ToolLimitInfo;
  constructor(info: ToolLimitInfo) {
    super(info.message);
    this.name = "ToolLimitError";
    this.info = info;
  }
}

async function readEdgeFunctionBody(error: unknown): Promise<Record<string, unknown> | null> {
  // FunctionsHttpError shape: error.context is the raw Response
  const ctx = (error as { context?: Response }).context;
  if (!ctx || typeof ctx.clone !== "function") return null;
  try {
    const text = await ctx.clone().text();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Turn a Supabase Edge Function invocation error into a clean, user-facing Error.
 *
 * `supabase.functions.invoke()` only surfaces "Edge Function returned a non-2xx
 * status code" when the function returns 4xx/5xx — the actual JSON body lives on
 * `error.context` (a Response object). This reads that body and:
 *  - returns a `ToolLimitError` (with plan/tool/limit) when the rejection was a
 *    plan's monthly cap, so the caller can show the upgrade dialog instead of a
 *    generic failure message;
 *  - otherwise returns a plain Error with the clearest message it can find.
 */
export async function getEdgeFunctionError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): Promise<Error> {
  if (!error) return new Error(fallback);

  const body = await readEdgeFunctionBody(error);
  if (body) {
    // A plan-tier cap (not the burst/anti-abuse ceiling, which sets reason:"rate").
    if (body.error === "rate_limit" && body.reason !== "rate") {
      return new ToolLimitError({
        plan: typeof body.plan === "string" ? body.plan : "free",
        tool: typeof body.tool === "string" ? body.tool : "",
        limit: typeof body.limit === "number" ? body.limit : null,
        used: typeof body.used === "number" ? body.used : undefined,
        message: typeof body.message === "string" ? body.message : fallback,
      });
    }
    const msg = body.message || body.error || body.details;
    if (typeof msg === "string" && msg) {
      if (/^rate.?limit$/i.test(msg)) {
        return new Error("You're doing that a lot in a short time. Please wait a moment and try again.");
      }
      return new Error(msg);
    }
  }

  if (error instanceof Error && error.message) {
    if (/non-2xx/i.test(error.message)) return new Error(fallback);
    return error;
  }

  return new Error(fallback);
}

/** String-returning convenience wrapper around {@link getEdgeFunctionError}. */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): Promise<string> {
  return (await getEdgeFunctionError(error, fallback)).message;
}
