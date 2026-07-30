// Event-to-Waitlist Engine client API. Public registration goes through the
// event-register edge function (it creates the account server-side); admin
// management + dashboard use SECURITY DEFINER RPCs.
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => (supabase as any).rpc(name, args);

export interface Webinar {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_type: string | null;
  event_datetime: string | null;
  host_name: string | null;
  cover_image_url: string | null;
  community_type: string | null;
  registration_count: number;
  community_clicks?: number;
  is_active: boolean;
}

export interface RegisterResult {
  ok: boolean;
  is_new_account?: boolean;
  registration_id?: string | null;
  community_link?: string | null;
  community_type?: string | null;
  event_title?: string | null;
  error?: string;
}

export async function fetchWebinarBySlug(slug: string): Promise<Webinar | null> {
  const { data, error } = await rpc("webinar_by_slug", { _slug: slug });
  if (error || !data) return null;
  return data as Webinar;
}

export async function registerForEvent(input: {
  slug: string; name: string; email: string; phone?: string; country?: string; skill?: string; consent: boolean;
}): Promise<RegisterResult> {
  const { data, error } = await supabase.functions.invoke("event-register", { body: input });
  if (error) {
    // Try to surface the function's own error body.
    let msg = "";
    const ctx = (error as { context?: Response }).context;
    const status = ctx?.status;
    if (ctx?.clone) { try { const j = await ctx.clone().json(); if (j?.error) msg = j.error; } catch { /* ignore */ } }
    if (!msg) {
      msg = status === 404
        ? "Registration isn't switched on yet — the event-register function needs deploying."
        : "Couldn't complete registration. Please try again.";
    }
    return { ok: false, error: msg };
  }
  return (data ?? { ok: false }) as RegisterResult;
}

export async function markCommunityClick(registrationId: string) {
  await rpc("event_mark_community_click", { _registration_id: registrationId });
}

/**
 * Email a passwordless magic sign-in link via Resend (reliable path), optionally
 * redirecting to `next` after sign-in. Returns an error message on failure.
 */
export async function sendMagicLink(email: string, next = "/feed"): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-magic-link", { body: { email, next } });
  if (error) {
    let msg = "";
    const ctx = (error as { context?: Response }).context;
    if (ctx?.clone) { try { const j = await ctx.clone().json(); if (j?.error) msg = j.error; } catch { /* ignore */ } }
    if (!msg) msg = ctx?.status === 404 ? "Sign-in email isn't switched on yet — the send-magic-link function needs deploying." : "Couldn't send the sign-in link.";
    return { ok: false, error: msg };
  }
  return { ok: (data as { ok?: boolean } | null)?.ok !== false };
}

// ── Admin ────────────────────────────────────────────────────────────────────
export async function listWebinars(): Promise<Webinar[]> {
  const { data, error } = await rpc("webinar_list_admin");
  if (error || !Array.isArray(data)) return [];
  return data as Webinar[];
}

export async function upsertWebinar(w: {
  id?: string | null; title: string; slug: string; description?: string; event_type?: string;
  event_datetime?: string | null; host_name?: string; cover_image_url?: string;
  community_link?: string; community_type?: string;
}) {
  const { data, error } = await rpc("webinar_upsert", {
    _id: w.id ?? null, _title: w.title, _slug: w.slug, _description: w.description ?? null,
    _event_type: w.event_type ?? null, _event_datetime: w.event_datetime ?? null,
    _host_name: w.host_name ?? null, _cover_image_url: w.cover_image_url ?? null,
    _community_link: w.community_link ?? null, _community_type: w.community_type ?? null,
  });
  if (error) return { ok: false as const, reason: "error" };
  return data as { ok: boolean; id?: string; slug?: string; reason?: string };
}

export async function toggleWebinar(id: string, active: boolean) {
  await rpc("webinar_toggle", { _id: id, _active: active });
}

export interface Registrant {
  name: string | null; email: string; phone: string | null; country: string | null;
  skill: string | null; community_clicked: boolean; registered_at: string;
}
export async function fetchRegistrants(webinarId: string): Promise<Registrant[]> {
  const { data, error } = await rpc("webinar_registrants", { _webinar_id: webinarId });
  if (error || !Array.isArray(data)) return [];
  return data as Registrant[];
}

export interface DashboardStats {
  waitlist_total: number; last_7_days: number; from_events: number; community_clicks: number;
  by_event: { title: string; slug: string; registrations: number; community_clicks: number; is_active: boolean }[];
  by_skill: { skill: string | null; count: number }[];
  by_country: { country: string | null; count: number }[];
  by_vetting: { vetted: number; pending: number; rejected: number };
}
export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  const { data, error } = await rpc("event_dashboard_stats");
  if (error || !data) return null;
  return data as DashboardStats;
}

export interface WaitlistPerson {
  name: string | null; email: string; phone: string | null; country: string | null;
  skill: string | null; source: string | null; consent: boolean; created_at: string; vetting: string;
}
export async function fetchWaitlistPeople(limit = 1000): Promise<WaitlistPerson[]> {
  const { data, error } = await rpc("waitlist_people", { _limit: limit });
  if (error || !Array.isArray(data)) return [];
  return data as WaitlistPerson[];
}

// ── Vetting gate (two-path) ──────────────────────────────────────────────────
export interface VettingAccess {
  gate_enabled: boolean; exempt: boolean; vetted: boolean; allowed: boolean;
}
export async function fetchVettingAccess(): Promise<VettingAccess> {
  const { data, error } = await rpc("vetting_access");
  // Fail open (allow) if the RPC isn't available yet, so nothing breaks pre-migration.
  if (error || !data) return { gate_enabled: false, exempt: true, vetted: false, allowed: true };
  return data as VettingAccess;
}

/** Turn a list of rows into a CSV blob and trigger a download. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
