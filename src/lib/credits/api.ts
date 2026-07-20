// Credits & Rewards client API — thin wrappers over the SECURITY DEFINER RPCs
// defined in supabase/migrations/20260715000000_credits_rewards.sql.
// All balance changes happen server-side (transactional, row-locked, append-only
// ledger). The client can only *read* and *request* — it can never mutate a wallet.
// The RPCs aren't in the generated Supabase types yet, so we cast to any.
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => (supabase as any).rpc(name, args);

export interface WalletBalance {
  credits: number;
  cash_kobo: number;
  lifetime: number;
  cash_enabled: boolean;
}

export interface CreditTx {
  id: string;
  amount: number;
  type: "earn" | "spend" | "adjust";
  reason: string;
  reference_id: string | null;
  balance_after: number;
  created_at: string;
}

export interface RewardRule {
  action_key: string;
  credit_amount: number;
  enabled: boolean;
  daily_cap: number | null;
  sort_order: number;
  description: string | null;
}

export interface SpendItem {
  item_key: string;
  cost_credits: number;
  duration_secs: number | null;
  enabled: boolean;
  sort_order: number;
  name: string;
  description: string | null;
}

/** Result of an earn/spend/buy call. `ok:false` carries a machine `reason`. */
export interface CreditResult {
  ok: boolean;
  reason?: string;
  balance?: number;
  credited?: number;
  spent?: number;
  needed?: number;
  description?: string;
  item?: string;
  expires_at?: string | null;
}

/** The action keys the client is allowed to award. Server validates + caps. */
export type EarnAction =
  | "course_completed"
  | "certificate_earned"
  | "five_star_review"
  | "daily_active"
  | "application_streak_7"
  | "learning_streak_7";

export async function fetchBalance(): Promise<WalletBalance | null> {
  const { data, error } = await rpc("credits_balance");
  if (error || !data) return null;
  return data as WalletBalance;
}

export async function fetchHistory(limit = 40): Promise<CreditTx[]> {
  const { data, error } = await rpc("credits_history", { _limit: limit });
  if (error || !Array.isArray(data)) return [];
  return data as CreditTx[];
}

export async function fetchRewardRules(): Promise<RewardRule[]> {
  const { data, error } = await supabase
    .from("reward_rules" as never)
    .select("action_key, credit_amount, enabled, daily_cap, sort_order, description")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as unknown as RewardRule[];
}

export async function fetchSpendItems(): Promise<SpendItem[]> {
  const { data, error } = await supabase
    .from("spend_items" as never)
    .select("item_key, cost_credits, duration_secs, enabled, sort_order, name, description")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as unknown as SpendItem[];
}

/**
 * Award credits for a real, client-observable action. Idempotent per
 * (action, referenceId) on the server, and daily-capped where configured, so
 * calling this more than once is safe — it just returns `ok:false, reason:"already"`.
 */
export async function earnCredits(action: EarnAction, referenceId?: string): Promise<CreditResult> {
  const { data, error } = await rpc("credits_earn", { _action_key: action, _reference_id: referenceId ?? null });
  if (error) return { ok: false, reason: "error" };
  return (data ?? { ok: false }) as CreditResult;
}

/** Buy a store perk with credits. Server spends + grants the entitlement atomically. */
export async function buyItem(itemKey: string, referenceId?: string): Promise<CreditResult> {
  const { data, error } = await rpc("credits_buy", { _item_key: itemKey, _reference_id: referenceId ?? null });
  if (error) return { ok: false, reason: "error" };
  return (data ?? { ok: false }) as CreditResult;
}

/** Phase 2 (locked): request a cash withdrawal. Blocked until cash_rewards_enabled. */
export async function requestWithdrawal(amountKobo: number, method: string, destination: Record<string, unknown>): Promise<CreditResult> {
  const { data, error } = await rpc("request_withdrawal", {
    _amount_kobo: amountKobo,
    _method: method,
    _destination: destination,
  });
  if (error) return { ok: false, reason: "error" };
  return (data ?? { ok: false }) as CreditResult;
}

/** Human labels for ledger `reason` codes (falls back to a tidied key). */
export function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    job_completed: "Completed a job",
    got_hired: "Got hired",
    five_star_review: "5-star review",
    referral_first_job: "Referral landed first job",
    course_completed: "Completed a course",
    referral_joined: "Referral joined",
    certificate_earned: "Earned a certificate",
    profile_completed: "Completed profile",
    application_streak_7: "7-day application streak",
    learning_streak_7: "7-day learning streak",
    daily_active: "Daily check-in",
    job_application_boost: "Application Boost",
    proposal_priority: "Enhanced Proposal",
    extra_ai_proposals: "+10 AI Proposals",
    featured_profile_24h: "Featured Profile",
    pro_day_pass: "Pro Day Pass",
    course_unlock: "Course unlock",
    pro_week_pass: "Pro Week Pass",
  };
  return map[reason] ?? reason.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
