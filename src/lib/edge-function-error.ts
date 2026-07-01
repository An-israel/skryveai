/**
 * Extract a user-friendly error message from a Supabase Edge Function invocation.
 *
 * `supabase.functions.invoke()` only surfaces "Edge Function returned a non-2xx
 * status code" when the function returns 4xx/5xx — the actual JSON body
 * (with a useful `error` field) lives on `error.context` (a Response object).
 *
 * This helper reads that body and returns a clean message, falling back to the
 * generic message if nothing useful is found.
 */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): Promise<string> {
  if (!error) return fallback;

  // FunctionsHttpError shape: error.context is the raw Response
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.clone === "function") {
    try {
      const cloned = ctx.clone();
      const text = await cloned.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          // Prefer `message` (human-readable) over `error` (often a short code
          // like "rate_limit"), then other fallbacks.
          const msg =
            parsed?.message ||
            parsed?.error ||
            parsed?.details ||
            (typeof parsed === "string" ? parsed : null);
          if (msg && typeof msg === "string") {
            if (/^rate.?limit$/i.test(msg)) {
              return "You've hit your plan's usage limit for this tool. Upgrade for unlimited access.";
            }
            return msg;
          }
        } catch {
          // not JSON — return the raw text if short
          if (text.length < 300) return text;
        }
      }
    } catch {
      // ignore
    }
  }

  if (error instanceof Error && error.message) {
    if (/non-2xx/i.test(error.message)) return fallback;
    return error.message;
  }

  return fallback;
}
