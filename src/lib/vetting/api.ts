// Vetting client API — wrappers over the SECURITY DEFINER RPCs in
// supabase/migrations/20260720000000_vetting.sql. State transitions are all
// server-side; the client only submits work and reads status.
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => (supabase as any).rpc(name, args);

export type VettingStatus = "skill_pending" | "skill_passed" | "prof_pending" | "approved" | "rejected";
export type StageStatus = "not_started" | "submitted" | "passed" | "failed";

export interface VettingApplication {
  id: string;
  skill_category: string;
  status: VettingStatus;
  skill_test_status: StageStatus;
  professionalism_status: StageStatus;
  overall_result: string | null;
  retry_after: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestBrief {
  id: string;
  skill_category: string;
  title: string;
  brief: string;
  reference_template_url: string | null;
  pass_criteria: string | null;
}

export interface VettingBadge {
  skill_category: string;
  level: string;
  vetted_at: string;
}

export async function fetchMyVetting(): Promise<VettingApplication[]> {
  const { data, error } = await rpc("vetting_mine");
  if (error || !Array.isArray(data)) return [];
  return data as VettingApplication[];
}

export async function fetchBriefsFor(skill: string): Promise<TestBrief[]> {
  const { data, error } = await supabase
    .from("test_briefs" as never)
    .select("id, skill_category, title, brief, reference_template_url, pass_criteria")
    .eq("skill_category", skill)
    .eq("is_active", true);
  if (error || !Array.isArray(data)) return [];
  return data as unknown as TestBrief[];
}

export async function startVetting(skill: string) {
  const { data, error } = await rpc("vetting_start", { _skill_category: skill });
  if (error) return { ok: false as const, error: error.message as string };
  return data as { ok: boolean; application_id?: string; status?: VettingStatus };
}

export async function submitSkillWork(args: {
  applicationId: string; portfolioUrl?: string; testBriefId?: string; submissionUrl: string;
}) {
  const { data, error } = await rpc("vetting_submit_skill", {
    _application_id: args.applicationId,
    _portfolio_url: args.portfolioUrl ?? null,
    _test_brief_id: args.testBriefId ?? null,
    _submission_url: args.submissionUrl,
    _submission_files: [],
  });
  if (error) return { ok: false as const, reason: "error" };
  return data as { ok: boolean; reason?: string };
}

export async function submitProfessionalism(applicationId: string, answers: Record<string, string>, videoUrl?: string) {
  const { data, error } = await rpc("vetting_submit_professionalism", {
    _application_id: applicationId, _answers: answers, _video_url: videoUrl ?? null,
  });
  if (error) return { ok: false as const, reason: "error" };
  return data as { ok: boolean; reason?: string };
}

export async function fetchBadgesFor(userId: string): Promise<VettingBadge[]> {
  const { data, error } = await rpc("vetting_badges_for", { _user_id: userId });
  if (error || !Array.isArray(data)) return [];
  return data as VettingBadge[];
}

// ── Admin / reviewer ─────────────────────────────────────────────────────────
export interface ReviewQueueItem extends VettingApplication {
  user_id: string;
  pending_stage: "skill" | "professionalism" | null;
}

export async function fetchReviewQueue(): Promise<ReviewQueueItem[]> {
  const { data, error } = await rpc("vetting_review_queue");
  if (error || !Array.isArray(data)) return [];
  return data as ReviewQueueItem[];
}

export async function fetchLatestSkillSubmission(applicationId: string) {
  const { data } = await supabase
    .from("skill_submissions" as never)
    .select("id, portfolio_url, submission_url, submission_files, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { id: string; portfolio_url: string | null; submission_url: string | null; created_at: string } | null;
}

export async function fetchLatestProfCheck(applicationId: string) {
  const { data } = await supabase
    .from("professionalism_checks" as never)
    .select("id, answers, video_url, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { id: string; answers: Record<string, string>; video_url: string | null; created_at: string } | null;
}

export async function reviewSkill(submissionId: string, score: number, pass: boolean, notes?: string) {
  const { data, error } = await rpc("vetting_review_skill", {
    _submission_id: submissionId, _score: score, _pass: pass, _notes: notes ?? null,
  });
  if (error) return { ok: false as const };
  return data as { ok: boolean };
}

export async function reviewProfessionalism(
  checkId: string, communication: number, reliability: number, responsiveness: number, pass: boolean, notes?: string
) {
  const { data, error } = await rpc("vetting_review_professionalism", {
    _check_id: checkId, _communication: communication, _reliability: reliability,
    _responsiveness: responsiveness, _pass: pass, _notes: notes ?? null,
  });
  if (error) return { ok: false as const };
  return data as { ok: boolean };
}

// The structured professionalism questions (the "attitude" signal). Kept here so
// the copy is easy to tune.
export const PROFESSIONALISM_QUESTIONS = [
  { key: "scope_change", q: "A client changes the brief halfway through, after you've started. How do you respond?" },
  { key: "missed_deadline", q: "You realise you'll miss a deadline by a day. What do you do, and when?" },
  { key: "unclear_brief", q: "A brief is vague and you're unsure what the client wants. What's your first move?" },
  { key: "why_remote", q: "Why do you want to work with international clients, and what makes you reliable to work with?" },
] as const;
