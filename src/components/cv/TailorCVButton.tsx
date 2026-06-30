import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, FileText, Wand2 } from "lucide-react";

interface TailorCVButtonProps {
  jobTitle: string;
  jobDescription: string;
  /** Optional: extra skills/keywords to fold into the job context. */
  requiredSkills?: string[];
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

interface CVRow {
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
  updated_at: string | null;
}

function serializeCv(cv: CVRow): string {
  const pi = cv.personal_info || {};
  const lines: string[] = [];
  lines.push(`Name: ${pi.fullName || ""}`);
  lines.push(
    `Contact: ${[pi.email, pi.phone, pi.location, pi.linkedin].filter(Boolean).join(" | ")}`
  );
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

/** Map build-cv "optimize" output back onto skryve_cvs columns, preserving source data where the AI omits it. */
function mapOptimizedToColumns(optimized: any, source: CVRow) {
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

export function TailorCVButton({
  jobTitle,
  jobDescription,
  requiredSkills = [],
  variant = "outline",
  size = "default",
  className,
}: TailorCVButtonProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loadingCvs, setLoadingCvs] = useState(false);
  const [cvs, setCvs] = useState<CVRow[]>([]);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [tailoring, setTailoring] = useState(false);

  const openDialog = async () => {
    setOpen(true);
    setLoadingCvs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const { data: profile } = await (supabase as any)
        .from("talent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) {
        setCvs([]);
        return;
      }
      setTalentId(profile.id);

      const { data } = await (supabase as any)
        .from("skryve_cvs")
        .select(
          "id, title, template_name, personal_info, summary, experiences, education, skills, certifications, projects, updated_at"
        )
        .eq("talent_id", profile.id)
        .order("updated_at", { ascending: false });

      const rows = (data as CVRow[]) || [];
      setCvs(rows);
      if (rows.length) setSelectedCvId(rows[0].id);
    } catch {
      toast({ title: "Failed to load your CVs", variant: "destructive" });
    } finally {
      setLoadingCvs(false);
    }
  };

  const handleTailor = async () => {
    const source = cvs.find((c) => c.id === selectedCvId);
    if (!source || !talentId) return;
    setTailoring(true);
    try {
      const jobContext =
        `${jobTitle}\n\n${jobDescription}` +
        (requiredSkills.length ? `\n\nKey skills: ${requiredSkills.join(", ")}` : "");

      const { data, error } = await supabase.functions.invoke("build-cv", {
        body: {
          mode: "optimize",
          existingCv: serializeCv(source),
          jobDescription: jobContext,
        },
      });
      if (error) throw error;
      const optimized = data?.cv;
      if (!optimized) throw new Error("No CV returned");

      const mapped = mapOptimizedToColumns(optimized, source);
      const title = `Tailored — ${jobTitle}`.slice(0, 80);

      const { data: inserted, error: insErr } = await (supabase as any)
        .from("skryve_cvs")
        .insert({
          talent_id: talentId,
          title,
          ...mapped,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr || !inserted) throw insErr || new Error("Failed to save tailored CV");

      toast({
        title: "CV tailored! ✨",
        description: `Your CV has been optimized for "${jobTitle}".`,
      });
      setOpen(false);
      navigate(`/cv-builder/${inserted.id}`);
    } catch (e: any) {
      toast({
        title: "Tailoring failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setTailoring(false);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={openDialog}>
        <Sparkles className="w-4 h-4 mr-1.5" />
        Tailor my CV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Tailor your CV to this job
            </DialogTitle>
            <DialogDescription>
              We'll rewrite a copy of your CV to match{" "}
              <span className="font-medium text-foreground">{jobTitle}</span> — highlighting the
              right keywords and experience for ATS systems. Your original CV stays untouched.
            </DialogDescription>
          </DialogHeader>

          {loadingCvs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : cvs.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You don't have a CV yet. Build one first, then come back to tailor it.
              </p>
              <Button onClick={() => navigate("/cv-builder/new")}>Create a CV</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Choose a CV to tailor</label>
                <Select value={selectedCvId} onValueChange={setSelectedCvId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a CV" />
                  </SelectTrigger>
                  <SelectContent>
                    {cvs.map((cv) => (
                      <SelectItem key={cv.id} value={cv.id}>
                        {cv.title || "Untitled CV"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleTailor} disabled={tailoring || !selectedCvId}>
                {tailoring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tailoring your CV…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Tailor my CV
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
