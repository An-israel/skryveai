// tiptip data layer — owner-only growth control center.
// RPCs/tables aren't in the generated Supabase types, so we cast to any.
import { supabase } from "@/integrations/supabase/client";

export const TIPTIP_OWNER_EMAIL = "aniekaneazy@gmail.com";

export type ContentStatus = "idea" | "drafting" | "ready" | "published";
export type TaskStatus = "todo" | "in_progress" | "done";
export type AutoType = "auto" | "prep_send" | "human";
export type MentionStatus = "draft" | "ready" | "posted";

export interface TiptipContent {
  id: string;
  title: string;
  kind: string;
  target_keyword: string | null;
  keyword_tier: number | null;
  status: ContentStatus;
  calendar_month: number | null;
  calendar_week: number | null;
  priority: number;
  meta_title: string | null;
  meta_description: string | null;
  slug: string | null;
  excerpt: string | null;
  body: string | null;
  faq: { q: string; a: string }[];
  internal_links: { anchor: string; target: string }[];
  schema_type: string;
  blog_post_id: string | null;
  published_at: string | null;
  updated_at: string;
}

export interface TiptipKeyword {
  id: string; keyword: string; tier: number; intent: string | null;
  is_question: boolean; status: "planned" | "next" | "covered";
  content_id: string | null; notes: string | null;
}

export interface TiptipMention {
  id: string; platform: string; title: string | null; body: string;
  target: string | null; rules_note: string | null; status: MentionStatus;
  content_id: string | null; created_at: string;
}

export interface TiptipTask {
  id: string; doc: number; category: string | null; label: string;
  auto_type: AutoType; status: TaskStatus; notes: string | null; sort_order: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function isTiptipOwner(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return (user?.email || "").toLowerCase() === TIPTIP_OWNER_EMAIL;
}

export async function fetchContent(): Promise<TiptipContent[]> {
  const { data } = await db.from("tiptip_content").select("*")
    .order("calendar_month", { ascending: true })
    .order("priority", { ascending: true });
  return data || [];
}

export async function fetchKeywords(): Promise<TiptipKeyword[]> {
  const { data } = await db.from("tiptip_keywords").select("*")
    .order("tier", { ascending: true }).order("keyword", { ascending: true });
  return data || [];
}

export async function fetchMentions(): Promise<TiptipMention[]> {
  const { data } = await db.from("tiptip_brand_mentions").select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchTasks(): Promise<TiptipTask[]> {
  const { data } = await db.from("tiptip_tasks").select("*")
    .order("sort_order", { ascending: true });
  return data || [];
}

export async function updateContent(id: string, patch: Partial<TiptipContent>) {
  return db.from("tiptip_content").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function createContent(row: Partial<TiptipContent>) {
  return db.from("tiptip_content").insert(row).select().maybeSingle();
}

export async function deleteContent(id: string) {
  return db.from("tiptip_content").delete().eq("id", id);
}

export async function updateKeyword(id: string, patch: Partial<TiptipKeyword>) {
  return db.from("tiptip_keywords").update(patch).eq("id", id);
}

export async function updateTask(id: string, patch: Partial<TiptipTask>) {
  return db.from("tiptip_tasks").update(patch).eq("id", id);
}

export async function updateMention(id: string, patch: Partial<TiptipMention>) {
  return db.from("tiptip_brand_mentions").update(patch).eq("id", id);
}

export async function deleteMention(id: string) {
  return db.from("tiptip_brand_mentions").delete().eq("id", id);
}

/** Generate content (article) or brand mentions via the owner-gated edge function. */
export async function generate(contentId: string, mode: "article" | "mentions" = "article") {
  const { data, error } = await supabase.functions.invoke("tiptip-generate", {
    body: { content_id: contentId, mode },
  });
  if (error) throw error;
  return data;
}

/** Publish a Ready piece into the live blog. */
export async function publishContent(contentId: string) {
  const { data, error } = await db.rpc("tiptip_publish", { _content_id: contentId });
  if (error) throw error;
  return data as { blog_post_id: string; slug: string };
}
