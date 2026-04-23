// Lightweight client-side URL validator.
// We can't reliably do CORS-safe HEAD checks against arbitrary YouTube/article hosts,
// so we use two cheap signals:
//   1) Syntactic shape (must be http(s) and parseable URL).
//   2) Known-good host allowlist for instant pass (YouTube, common doc hosts).
// For everything else we attempt a no-cors HEAD; if the request *throws* (DNS/connection
// refused) we treat it as broken. Opaque responses are accepted (we can't see status).

const TRUSTED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "m.youtube.com",
  "vimeo.com",
  "player.vimeo.com",
  "loom.com",
  "www.loom.com",
  "ahrefs.com",
  "backlinko.com",
  "moz.com",
  "hubspot.com",
  "blog.hubspot.com",
  "nngroup.com",
  "www.nngroup.com",
  "smashingmagazine.com",
  "css-tricks.com",
  "developer.mozilla.org",
  "freecodecamp.org",
  "www.freecodecamp.org",
  "medium.com",
  "dev.to",
  "github.com",
  "docs.google.com",
  "notion.so",
  "www.notion.so",
];

export type UrlStatus = "checking" | "ok" | "broken";

export function parseUrl(u: string | null | undefined): URL | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function isTrusted(u: string | null | undefined): boolean {
  const parsed = parseUrl(u);
  if (!parsed) return false;
  return TRUSTED_HOSTS.includes(parsed.hostname.toLowerCase());
}

const cache = new Map<string, UrlStatus>();

/** Seed the cache with verdicts already validated server-side. */
export function seedUrlStatuses(entries: { url: string; status: UrlStatus }[]) {
  for (const { url, status } of entries) cache.set(url, status);
}

export async function validateUrl(u: string): Promise<UrlStatus> {
  const parsed = parseUrl(u);
  if (!parsed) return "broken";
  if (cache.has(u)) return cache.get(u)!;
  if (isTrusted(u)) {
    cache.set(u, "ok");
    return "ok";
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    // no-cors gives us an opaque response — we treat reachability as "ok".
    await fetch(u, { method: "HEAD", mode: "no-cors", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    cache.set(u, "ok");
    return "ok";
  } catch {
    cache.set(u, "broken");
    return "broken";
  }
}
