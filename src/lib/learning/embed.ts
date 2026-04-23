// Convert a content URL into an in-app embeddable iframe URL.
// We deliberately keep users INSIDE the product — no "open in new tab" CTAs.
// Supported: YouTube, Vimeo, Loom, Google Docs/Slides, generic http(s) (best effort).

import { parseUrl } from "./url-validation";

export type EmbedKind = "video" | "doc" | "article" | "unsupported";

export interface EmbedInfo {
  kind: EmbedKind;
  embedUrl: string | null;
  /** Recommended aspect ratio for the iframe wrapper. */
  aspect: "16/9" | "4/3" | "auto";
  /** Some sites (most blogs/news) refuse to be iframed via X-Frame-Options. */
  iframeLikelyBlocked: boolean;
  hostname: string;
}

const IFRAME_FRIENDLY_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "vimeo.com",
  "player.vimeo.com",
  "loom.com",
  "www.loom.com",
  "docs.google.com",
  "drive.google.com",
]);

export function getEmbedInfo(rawUrl: string | null | undefined): EmbedInfo {
  const url = parseUrl(rawUrl);
  if (!url) {
    return { kind: "unsupported", embedUrl: null, aspect: "auto", iframeLikelyBlocked: true, hostname: "" };
  }
  const host = url.hostname.toLowerCase();

  // YouTube
  if (host === "youtu.be") {
    const id = url.pathname.replace("/", "").split("/")[0];
    if (id) {
      return {
        kind: "video",
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
        aspect: "16/9",
        iframeLikelyBlocked: false,
        hostname: host,
      };
    }
  }
  if (host.endsWith("youtube.com")) {
    let id: string | null = url.searchParams.get("v");
    if (!id) {
      // /embed/<id> or /shorts/<id>
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (idx !== -1 && parts[idx + 1]) id = parts[idx + 1];
    }
    if (id) {
      const t = url.searchParams.get("t") || url.searchParams.get("start");
      const start = t ? parseTimeToSeconds(t) : 0;
      const startQs = start ? `&start=${start}` : "";
      return {
        kind: "video",
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${startQs}`,
        aspect: "16/9",
        iframeLikelyBlocked: false,
        hostname: host,
      };
    }
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) {
      return {
        kind: "video",
        embedUrl: `https://player.vimeo.com/video/${id}`,
        aspect: "16/9",
        iframeLikelyBlocked: false,
        hostname: host,
      };
    }
  }
  if (host === "player.vimeo.com") {
    return { kind: "video", embedUrl: url.toString(), aspect: "16/9", iframeLikelyBlocked: false, hostname: host };
  }

  // Loom
  if (host.endsWith("loom.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const i = parts.findIndex((p) => p === "share" || p === "embed");
    const id = i !== -1 ? parts[i + 1] : parts[parts.length - 1];
    if (id) {
      return {
        kind: "video",
        embedUrl: `https://www.loom.com/embed/${id}`,
        aspect: "16/9",
        iframeLikelyBlocked: false,
        hostname: host,
      };
    }
  }

  // Google Docs / Slides
  if (host === "docs.google.com") {
    // Convert /edit → /preview when possible for clean embed.
    const embedded = url.toString().replace(/\/edit(\?.*)?$/, "/preview");
    return { kind: "doc", embedUrl: embedded, aspect: "4/3", iframeLikelyBlocked: false, hostname: host };
  }

  // Generic article — try to iframe but warn it may be blocked.
  return {
    kind: "article",
    embedUrl: url.toString(),
    aspect: "auto",
    iframeLikelyBlocked: !IFRAME_FRIENDLY_HOSTS.has(host),
    hostname: host,
  };
}

function parseTimeToSeconds(t: string): number {
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  // e.g. 1h2m3s
  const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!m) return 0;
  const [, h, mm, s] = m;
  return (parseInt(h || "0") * 3600) + (parseInt(mm || "0") * 60) + parseInt(s || "0");
}
