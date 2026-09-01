// Every edge function used to hardcode "Access-Control-Allow-Origin": "*".
// Skryve auth is bearer-token (Authorization header), not cookies, so a
// malicious site can't get a victim's browser to auto-attach their session
// the way it could with cookie auth — but a wildcard still lets any site's
// JS read a response it has no business reading (e.g. if a user is ever
// tricked into pasting their own token into a third-party page's fetch).
// Reflect the origin only when it's one we actually serve from.
const ALLOWED_ORIGINS = [
  "https://skryve.app",
  "https://www.skryve.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

// Static fallback for call sites that build a Response outside the request
// handler (rare) or haven't been migrated to getCorsHeaders(req) yet.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
