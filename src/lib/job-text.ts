// Shared job-text helpers for the feed and the jobs listing.

// Scraped descriptions arrive as (often double-encoded) HTML. Decode the
// entities and strip the tags so we render clean, readable plain text.
export function cleanJobText(raw?: string | null): string {
  if (!raw) return "";
  if (typeof document === "undefined") {
    return raw.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  }
  const ta = document.createElement("textarea");
  ta.innerHTML = raw;          // decode &lt; -> < (handles double-encoding)
  const div = document.createElement("div");
  div.innerHTML = ta.value;    // parse the now-real HTML tags
  let text = div.textContent || div.innerText || "";
  ta.innerHTML = text;         // decode any residual entities (&#39; -> ')
  text = ta.value;
  return text.replace(/\s+/g, " ").trim();
}

// Cheap language heuristic (mirrors the scraper): flag listings that carry
// non-English diacritics/function words and lack English stop-word density, so
// we can hide German/French/etc. jobs still sitting in the DB. No AI, no cost.
const EN_STOP = /\b(the|and|for|with|you|are|our|will|your|work|team|experience|responsibilities|requirements|about|role)\b/gi;
const FOREIGN_HINT = /[äöüßàâçéèêëîïôûùñãõ]|\b(und|oder|für|mit|der|die|das|wir|deine|erfahrung|aufgaben|nous|vous|votre|et|le|la|les|des|para|con|una|trabajo|equipo|voor|een|het|werk)\b/i;
export function looksNonEnglish(title: string, desc: string): boolean {
  const text = `${title} ${desc}`.trim();
  if (text.length < 12) return false;
  const enMatches = (text.match(EN_STOP) || []).length;
  const density = enMatches / Math.max(text.split(/\s+/).length, 1);
  return FOREIGN_HINT.test(text) && density < 0.06;
}
