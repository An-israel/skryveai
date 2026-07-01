// Shared CV-tailoring logic: serialize a stored CV, call the build-cv edge
// function in "optimize" mode against a job, and save a NEW tailored CV record.
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/edge-function-error";

export interface StoredCv {
  id: string;
  title: string;
  template_name: string;
  personal_info: any;
  summary: string | null;
  experiences: any[];
  education: any[];
  skills: any[];
  certifications: any[];
  projects: any[];
  updated_at?: string | null;
}

export function serializeCv(cv: StoredCv): string {
  const pi = cv.personal_info || {};
  const lines: string[] = [];
  lines.push(`Name: ${pi.fullName || ""}`);
  lines.push(`Contact: ${[pi.email, pi.phone, pi.location, pi.linkedin].filter(Boolean).join(" | ")}`);
  if (cv.summary) lines.push(`\nProfessional Summary:\n${cv.summary}`);
  if (cv.skills?.length) lines.push(`\nSkills: ${cv.skills.join(", ")}`);
  if (cv.experiences?.length) {
    lines.push(`\nExperience:`);
    cv.experiences.forEach((e: any) => {
      const dur = [e.startDate, e.isPresent ? "Present" : e.endDate].filter(Boolean).join(" – ");
      lines.push(`- ${e.jobTitle || ""} at ${e.company || ""} (${dur})`);
      (e.bullets || []).filter(Boolean).forEach((b: string) => lines.push(`  • ${b}`));
    });
  }
  if (cv.education?.length) {
    lines.push(`\nEducation:`);
    cv.education.forEach((ed: any) =>
      lines.push(`- ${ed.degree || ""} at ${ed.school || ""} ${ed.year || ""}`.trim())
    );
  }
  if (cv.certifications?.length) {
    lines.push(`\nCertifications:`);
    cv.certifications.forEach((c: any) =>
      lines.push(`- ${c.name || ""} ${c.issuer ? `(${c.issuer})` : ""}`.trim())
    );
  }
  return lines.join("\n");
}

/** Map build-cv optimize output back onto skryve_cvs columns, preserving source data the AI omits. */
export function mapOptimizedToColumns(optimized: any, source: StoredCv) {
  const srcExp: any[] = source.experiences || [];
  const optExp: any[] = optimized.experience || [];

  const experiences = (optExp.length ? optExp : srcExp).map((e: any, i: number) => {
    const src = srcExp[i] || {};
    return {
      jobTitle: e.jobTitle || src.jobTitle || "",
      company: e.company || src.company || "",
      location: src.location || "",
      startDate: src.startDate || e.duration || "",
      endDate: src.endDate || "",
      isPresent: src.isPresent || false,
      bullets: e.bullets?.length ? e.bullets : src.bullets || [],
    };
  });

  const education = source.education?.length
    ? source.education
    : (optimized.education || []).map((ed: any) => ({
        degree: ed.course || "",
        school: ed.institution || "",
        year: "",
        grade: "",
      }));

  const certifications = source.certifications?.length
    ? source.certifications
    : (optimized.certifications || []).map((c: string) => ({ name: c, issuer: "", year: "" }));

  const skills = Array.from(
    new Set([...(optimized.keyCompetencies || []), ...(optimized.technicalTools || [])])
  );

  const personal_info = {
    ...(source.personal_info || {}),
    fullName: source.personal_info?.fullName || optimized.fullName || "",
  };

  return {
    template_name: source.template_name || "classic",
    personal_info,
    summary: optimized.professionalSummary || source.summary || "",
    experiences,
    education,
    skills,
    certifications,
    projects: source.projects || [],
  };
}

/** Extract a friendly message from a Supabase functions error (e.g. the 429 rate-limit body). */
export async function extractFnErrorMessage(e: any, fallback = "Please try again."): Promise<string> {
  return getEdgeFunctionErrorMessage(e, fallback);
}

/** Tailor a stored CV to a job and persist it as a NEW skryve_cvs row. Returns the new CV id. */
export async function tailorCvToJob(opts: {
  talentId: string;
  source: StoredCv;
  jobTitle: string;
  jobDescription: string;
  requiredSkills?: string[];
}): Promise<string> {
  const { talentId, source, jobTitle, jobDescription, requiredSkills = [] } = opts;
  const jobContext =
    `${jobTitle}\n\n${jobDescription}` +
    (requiredSkills.length ? `\n\nKey skills: ${requiredSkills.join(", ")}` : "");

  const { data, error } = await supabase.functions.invoke("build-cv", {
    body: { mode: "optimize", existingCv: serializeCv(source), jobDescription: jobContext },
  });
  if (error) throw error;
  const optimized = data?.cv;
  if (!optimized) throw new Error("No CV returned");

  const mapped = mapOptimizedToColumns(optimized, source);
  const { data: inserted, error: insErr } = await (supabase as any)
    .from("skryve_cvs")
    .insert({
      talent_id: talentId,
      title: `Tailored — ${jobTitle}`.slice(0, 80),
      ...mapped,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insErr || !inserted) throw insErr || new Error("Failed to save tailored CV");
  return inserted.id as string;
}
