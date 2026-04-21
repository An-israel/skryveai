// Helpers for normalizing user-entered phone numbers into formats that
// WhatsApp / tel: / mailto: links accept reliably. Centralized so Customer
// Success links always behave the same across the admin UI.

/**
 * Strips everything except digits and a leading "+" so we can reason about
 * the number consistently. Returns "" if the input has no digits.
 */
export function cleanPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";

  // Keep digits and a leading plus sign; drop spaces, dashes, parens, dots.
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Returns digits-only E.164-ish number suitable for `https://wa.me/<number>`.
 * WhatsApp wants no plus, no spaces, just the country code + subscriber number.
 *
 * Heuristics for missing country codes:
 *   - 10 digits starting with non-0 → assume Nigeria (234) — primary market
 *   - 11 digits starting with 0     → strip leading 0, prepend 234
 *   - Already has country code      → use as-is
 */
export function toWhatsAppNumber(raw: string | null | undefined): string {
  const cleaned = cleanPhone(raw);
  if (!cleaned) return "";

  // Already in international form (had a +)
  if (cleaned.startsWith("+")) return cleaned.slice(1);

  // No plus — try to infer Nigerian local formats so links don't break.
  // (Users commonly type "08012345678" or "8012345678".)
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `234${cleaned.slice(1)}`;
  }
  if (cleaned.length === 10) {
    return `234${cleaned}`;
  }

  // Otherwise assume the user already typed a country code without "+".
  return cleaned;
}

/** Builds a `https://wa.me/...` URL or "" when the number is unusable. */
export function whatsappUrl(
  raw: string | null | undefined,
  prefilledMessage?: string,
): string {
  const num = toWhatsAppNumber(raw);
  if (!num) return "";
  const base = `https://wa.me/${num}`;
  return prefilledMessage
    ? `${base}?text=${encodeURIComponent(prefilledMessage)}`
    : base;
}

/** Builds a tel: URL preserving the leading "+" when present. */
export function telUrl(raw: string | null | undefined): string {
  const cleaned = cleanPhone(raw);
  return cleaned ? `tel:${cleaned}` : "";
}

/** Light-touch validator used at signup + profile edit. */
export function isValidPhone(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const digitCount = (String(raw).match(/\d/g) || []).length;
  return digitCount >= 7 && /^[+\d\s\-().]+$/.test(String(raw));
}

/**
 * Returns a friendly display form: keeps the user's "+" but normalizes
 * separators to single spaces (handy for tooltips).
 */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw).replace(/\s+/g, " ").trim();
}
