// CV import client API — uploads a CV to the private cv-uploads bucket, calls the
// parse-cv edge function to extract structured data, and (after the user reviews
// and edits) commits the result to talent_profiles + work_experience + education.
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/edge-function-error";

export interface CvWorkExperience {
  company: string;
  role: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface CvEducation {
  institution: string;
  qualification?: string;
  year?: string;
}

/** The structured shape the parser returns and the review screen edits. */
export interface ParsedCv {
  full_name?: string;
  headline?: string;
  bio?: string;
  location?: string;
  email?: string;
  phone?: string;
  years_experience?: number;
  links?: string[];
  skills?: string[];
  work_experience?: CvWorkExperience[];
  education?: CvEducation[];
}

export const MAX_CV_BYTES = 10 * 1024 * 1024; // 10MB

export function isSupportedCvFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".pdf") || n.endsWith(".docx");
}

/**
 * Upload the file to the user's folder in the private bucket, then parse it.
 * Returns the structured data for the review screen. Throws with a friendly
 * message on failure.
 */
export async function uploadAndParseCv(file: File): Promise<ParsedCv> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to continue.");

  if (!isSupportedCvFile(file)) throw new Error("Upload a PDF or DOCX file.");
  if (file.size > MAX_CV_BYTES) throw new Error("That file is over 10MB. Please upload a smaller file.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("cv-uploads")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) throw new Error("Upload failed. Please try again.");

  const { data, error } = await supabase.functions.invoke("parse-cv", {
    body: { path, fileName: file.name },
  });
  if (error) throw new Error(await getEdgeFunctionErrorMessage(error, "We couldn't read that CV."));
  const parsed = (data as { parsed?: ParsedCv } | null)?.parsed;
  if (!parsed) throw new Error("We couldn't extract anything from that CV.");
  return parsed;
}

/** Fetch the user's stored master CV (parsed data), if any. */
export async function fetchMasterCv(): Promise<ParsedCv | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("master_cvs" as never)
    .select("parsed_json")
    .eq("user_id", user.id)
    .maybeSingle();
  const row = data as { parsed_json?: ParsedCv } | null;
  return row?.parsed_json ?? null;
}

/**
 * Commit the reviewed profile. Writes talent_profiles (upsert), then replaces the
 * user's work_experience + education rows. Marks the talent profile as set up.
 */
export async function saveReviewedProfile(cv: ParsedCv): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to continue.");

  const skills = (cv.skills ?? []).map((s) => s.trim()).filter(Boolean);
  const links = (cv.links ?? []).map((s) => s.trim()).filter(Boolean);

  const profileRow = {
    user_id: user.id,
    full_name: cv.full_name?.trim() || null,
    headline: cv.headline?.trim() || null,
    tagline: cv.headline?.trim() || null, // tagline is the existing "headline" surface
    bio: cv.bio?.trim() || null,
    location: cv.location?.trim() || null,
    years_experience: cv.years_experience ?? null,
    primary_skill: skills[0] || null,
    secondary_skills: skills,
    social_links: links.length ? { urls: links } : {},
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: pErr } = await (supabase as any)
    .from("talent_profiles")
    .upsert(profileRow, { onConflict: "user_id" });
  if (pErr) throw new Error("Couldn't save your profile. Please try again.");

  // Replace work_experience with the reviewed list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("work_experience").delete().eq("user_id", user.id);
  const work = (cv.work_experience ?? [])
    .filter((w) => (w.company || w.role))
    .map((w, i) => ({
      user_id: user.id,
      company: w.company?.trim() || null,
      role: w.role?.trim() || null,
      start_date: w.start_date?.trim() || null,
      end_date: w.end_date?.trim() || null,
      description: w.description?.trim() || null,
      sort_order: i,
    }));
  if (work.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("work_experience").insert(work);
  }

  // Replace education with the reviewed list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("education").delete().eq("user_id", user.id);
  const edu = (cv.education ?? [])
    .filter((e) => e.institution || e.qualification)
    .map((e, i) => ({
      user_id: user.id,
      institution: e.institution?.trim() || null,
      qualification: e.qualification?.trim() || null,
      year: e.year?.trim() || null,
      sort_order: i,
    }));
  if (edu.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("education").insert(edu);
  }
}
