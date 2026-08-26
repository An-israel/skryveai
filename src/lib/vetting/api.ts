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
  submit_format: string | null;
  resources: string | null;
  hands_on_time: string | null;
  submit_within_days: number;
  reviewer_checklist: string[];
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
    .select("id, skill_category, title, brief, reference_template_url, pass_criteria, submit_format, resources, hands_on_time, submit_within_days, reviewer_checklist")
    .eq("skill_category", skill)
    .eq("is_active", true);
  if (error || !Array.isArray(data)) return [];
  return data as unknown as TestBrief[];
}

// The full list of skills a talent can currently pick from — read straight off
// the active briefs, so adding a new brief in the admin editor immediately
// makes that skill selectable without a code change.
export async function fetchAvailableSkills(): Promise<string[]> {
  const { data, error } = await supabase
    .from("test_briefs" as never)
    .select("skill_category")
    .eq("is_active", true);
  if (error || !Array.isArray(data)) return [];
  const seen = new Set<string>();
  for (const row of data as unknown as { skill_category: string }[]) seen.add(row.skill_category);
  return Array.from(seen).sort();
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
    .select("id, portfolio_url, submission_url, submission_files, test_brief_id, checklist_results, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as {
    id: string; portfolio_url: string | null; submission_url: string | null;
    test_brief_id: string | null; checklist_results: Record<string, boolean>; created_at: string;
  } | null;
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

// Reviewer's copy of a brief, by id — used when reviewing a submission so the
// admin sees the exact checklist attached to whichever brief was submitted
// against (including one since deactivated).
export async function fetchBriefById(id: string): Promise<TestBrief | null> {
  const { data, error } = await supabase
    .from("test_briefs" as never)
    .select("id, skill_category, title, brief, reference_template_url, pass_criteria, submit_format, resources, hands_on_time, submit_within_days, reviewer_checklist")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as TestBrief;
}

export async function reviewSkill(
  submissionId: string, score: number, pass: boolean, notes?: string,
  checklistResults?: Record<string, boolean>,
) {
  const { data, error } = await rpc("vetting_review_skill", {
    _submission_id: submissionId, _score: score, _pass: pass, _notes: notes ?? null,
    _checklist_results: checklistResults ?? null,
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

// ── Admin: manage test briefs (attach reference templates, edit copy) ────────
export interface AdminBrief {
  id: string;
  skill_category: string;
  title: string;
  brief: string;
  reference_template_url: string | null;
  pass_criteria: string | null;
  is_active: boolean;
  submit_format: string | null;
  resources: string | null;
  hands_on_time: string | null;
  submit_within_days: number;
  reviewer_checklist: string[];
}

export async function fetchAllBriefs(): Promise<AdminBrief[]> {
  const { data, error } = await rpc("vetting_briefs_all");
  if (error || !Array.isArray(data)) return [];
  return data as AdminBrief[];
}

export async function upsertBrief(b: {
  id?: string | null; skill_category: string; title: string; brief: string;
  reference_template_url?: string | null; pass_criteria?: string | null; is_active?: boolean;
  submit_format?: string | null; resources?: string | null; hands_on_time?: string | null;
  submit_within_days?: number; reviewer_checklist?: string[];
}) {
  const { data, error } = await rpc("vetting_brief_upsert", {
    _id: b.id ?? null, _skill_category: b.skill_category, _title: b.title, _brief: b.brief,
    _reference_template_url: b.reference_template_url ?? null, _pass_criteria: b.pass_criteria ?? null,
    _is_active: b.is_active ?? true,
    _submit_format: b.submit_format ?? null, _resources: b.resources ?? null,
    _hands_on_time: b.hands_on_time ?? null, _submit_within_days: b.submit_within_days ?? 2,
    _reviewer_checklist: b.reviewer_checklist ?? [],
  });
  if (error) return { ok: false as const };
  return data as { ok: boolean; id?: string };
}

// A blank brief for the admin "add new skill" flow.
export function blankBrief(): AdminBrief {
  return {
    id: "", skill_category: "", title: "", brief: "",
    reference_template_url: null, pass_criteria: null, is_active: true,
    submit_format: null, resources: null, hands_on_time: null,
    submit_within_days: 2, reviewer_checklist: [],
  };
}

// The structured professionalism questions (the "attitude" signal). Kept here so
// the copy is easy to tune.
export const PROFESSIONALISM_QUESTIONS = [
  { key: "scope_change", q: "A client changes the brief halfway through, after you've started. How do you respond?" },
  { key: "missed_deadline", q: "You realise you'll miss a deadline by a day. What do you do, and when?" },
  { key: "unclear_brief", q: "A brief is vague and you're unsure what the client wants. What's your first move?" },
  { key: "why_remote", q: "Why do you want to work with international clients, and what makes you reliable to work with?" },
] as const;
