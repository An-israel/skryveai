import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Sparkles, Download, Save, ChevronUp, ChevronDown,
  Loader2, X, Check, AlertCircle, FileDown, ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CVPreview, { CVData } from "@/components/cv/CVPreview";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExperienceEntry {
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isPresent: boolean;
  bullets: string[];
}

interface EducationEntry {
  degree: string;
  school: string;
  year: string;
  grade: string;
}

interface CertificationEntry {
  name: string;
  issuer: string;
  year: string;
}

interface ProjectEntry {
  name: string;
  description: string;
  url: string;
}

interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  photoUrl: string;
}

interface CVFormData {
  title: string;
  template_name: string;
  personal_info: PersonalInfo;
  summary: string;
  experiences: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
}

const defaultPersonalInfo: PersonalInfo = {
  fullName: "", title: "", email: "", phone: "",
  location: "", linkedin: "", github: "", website: "", photoUrl: "",
};

const defaultExperience = (): ExperienceEntry => ({
  jobTitle: "", company: "", location: "", startDate: "", endDate: "",
  isPresent: false, bullets: [""],
});

const defaultEducation = (): EducationEntry => ({
  degree: "", school: "", year: "", grade: "",
});

const defaultCertification = (): CertificationEntry => ({
  name: "", issuer: "", year: "",
});

const defaultProject = (): ProjectEntry => ({
  name: "", description: "", url: "",
});

const defaultFormData: CVFormData = {
  title: "My CV",
  template_name: "classic",
  personal_info: defaultPersonalInfo,
  summary: "",
  experiences: [defaultExperience()],
  education: [defaultEducation()],
  skills: [],
  certifications: [],
  projects: [],
};

// ─── ATS Score Calculator ─────────────────────────────────────────────────────

function calcATSScore(data: CVFormData) {
  const criteria: { label: string; points: number; met: boolean; tip?: string }[] = [
    {
      label: "Has contact info (name + email + phone)",
      points: 20,
      met: !!(data.personal_info.fullName && data.personal_info.email && data.personal_info.phone),
      tip: "Add your full name, email, and phone number.",
    },
    {
      label: "Has professional summary",
      points: 15,
      met: data.summary.trim().length > 30,
      tip: "Write at least one sentence professional summary.",
    },
    {
      label: "Has work experience",
      points: 20,
      met: data.experiences.some(e => e.jobTitle.trim().length > 0),
      tip: "Add at least one work experience entry.",
    },
    {
      label: "Skills (5+)",
      points: 15,
      met: data.skills.length >= 5,
      tip: "Add at least 5 skills to pass ATS keyword filters.",
    },
    {
      label: "Plain text format (no tables/images)",
      points: 10,
      met: true,
    },
    {
      label: "Consistent dates on experience",
      points: 10,
      met: data.experiences.every(e => !e.jobTitle || e.startDate),
      tip: "Ensure each experience entry has a start date.",
    },
    {
      label: "Multiple sections filled",
      points: 10,
      met:
        (data.summary.trim().length > 0 ? 1 : 0) +
          (data.experiences.some(e => e.jobTitle) ? 1 : 0) +
          (data.education.some(e => e.degree) ? 1 : 0) +
          (data.skills.length > 0 ? 1 : 0) >=
        3,
      tip: "Fill in summary, experience, education, and skills sections.",
    },
  ];

  const total = criteria.reduce((s, c) => s + (c.met ? c.points : 0), 0);
  return { total, criteria };
}

// ─── Template Cards ───────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "classic", label: "Classic", desc: "Navy left border, serif fonts", color: "#1E3A5F" },
  { id: "modern", label: "Modern", desc: "Blue accent line header", color: "#2563EB" },
  { id: "creative", label: "Creative", desc: "Gradient header, two-column", color: "#7c3aed" },
  { id: "minimal", label: "Minimal", desc: "Lots of whitespace, thin lines", color: "#6b7280" },
  { id: "professional", label: "Professional", desc: "Traditional corporate, centered", color: "#374151" },
  { id: "bold", label: "Bold", desc: "Dark header, strong typography", color: "#1E3A5F" },
];

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 block">
      {children}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CVEditor() {
  const { cvId } = useParams<{ cvId: string }>();
  const isNew = cvId === "new" || !cvId;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cvData, setCvData] = useState<CVFormData>(defaultFormData);
  const [dbId, setDbId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [talentProfile, setTalentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showATSModal, setShowATSModal] = useState(false);
  const [showAISummarySheet, setShowAISummarySheet] = useState(false);
  const [showAIBulletsSheet, setShowAIBulletsSheet] = useState(false);
  const [showSkryveImportDialog, setShowSkryveImportDialog] = useState(false);

  // AI state
  const [aiSummaryText, setAiSummaryText] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiBulletsText, setAiBulletsText] = useState("");
  const [aiBulletsExpIndex, setAiBulletsExpIndex] = useState(0);

  // Skryve cert import
  const [skryveCerts, setSkryveCerts] = useState<Array<{ id: string; name: string; issuer: string; checked: boolean }>>([]);

  // Skill input
  const [skillInput, setSkillInput] = useState("");

  // ─── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    init();
  }, [cvId]);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profile } = await (supabase as any)
        .from("talent_profiles")
        .select("id, full_name, primary_skill, secondary_skills, bio, certifications")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setProfileId(profile.id);
        setTalentProfile(profile);
      }

      if (isNew) {
        setShowImportModal(true);
      } else {
        const { data: cv, error } = await (supabase as any)
          .from("skryve_cvs")
          .select("*")
          .eq("id", cvId)
          .maybeSingle();

        if (error || !cv) { navigate("/cv-builder"); return; }
        setDbId(cv.id);
        setCvData({
          title: cv.title || "My CV",
          template_name: cv.template_name || "classic",
          personal_info: cv.personal_info || defaultPersonalInfo,
          summary: cv.summary || "",
          experiences: cv.experiences?.length ? cv.experiences : [defaultExperience()],
          education: cv.education?.length ? cv.education : [defaultEducation()],
          skills: cv.skills || [],
          certifications: cv.certifications || [],
          projects: cv.projects || [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Auto-save debounce ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!dbId || loading) return;
    const timer = setTimeout(() => saveDraft(false), 2000);
    return () => clearTimeout(timer);
  }, [cvData, dbId]);

  // ─── Save ───────────────────────────────────────────────────────────────────

  const saveDraft = useCallback(async (showToast = true) => {
    if (!dbId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("skryve_cvs")
        .update({
          title: cvData.title,
          template_name: cvData.template_name,
          personal_info: cvData.personal_info,
          summary: cvData.summary,
          experiences: cvData.experiences,
          education: cvData.education,
          skills: cvData.skills,
          certifications: cvData.certifications,
          projects: cvData.projects,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dbId);

      if (error) throw error;
      if (showToast) toast({ title: "CV saved" });
    } catch {
      if (showToast) toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [dbId, cvData]);

  // ─── Import from profile ────────────────────────────────────────────────────

  const handleImportProfile = async (doImport: boolean) => {
    setShowImportModal(false);

    let newData = { ...defaultFormData };

    if (doImport && talentProfile) {
      newData = {
        ...newData,
        personal_info: {
          ...defaultPersonalInfo,
          fullName: talentProfile.full_name || "",
          title: talentProfile.primary_skill || "",
        },
        skills: [
          ...(talentProfile.primary_skill ? [talentProfile.primary_skill] : []),
          ...(talentProfile.secondary_skills || []),
        ],
        certifications: (talentProfile.certifications || []).map((c: any) => ({
          name: c.name || c,
          issuer: c.issuer || "",
          year: c.year || "",
        })),
      };
    }

    if (!profileId) return;

    const { data: cv, error } = await (supabase as any)
      .from("skryve_cvs")
      .insert({
        talent_id: profileId,
        title: newData.title,
        template_name: newData.template_name,
        personal_info: newData.personal_info,
        summary: newData.summary,
        experiences: newData.experiences,
        education: newData.education,
        skills: newData.skills,
        certifications: newData.certifications,
        projects: newData.projects,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !cv) {
      toast({ title: "Failed to create CV", variant: "destructive" });
      return;
    }

    setDbId(cv.id);
    setCvData(newData);
    navigate(`/cv-builder/${cv.id}`, { replace: true });
  };

  // ─── AI Summary ─────────────────────────────────────────────────────────────

  const generateAISummary = async (action: "generate_summary" | "regenerate_summary") => {
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv-summary", {
        body: {
          action,
          jobTitle: cvData.personal_info.title || cvData.experiences[0]?.jobTitle || "Professional",
          skills: cvData.skills,
          experience: cvData.experiences.length,
        },
      });
      if (error) throw error;
      setAiSummaryText(data?.text || "");
    } catch {
      toast({ title: "AI generation failed", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const openAISummary = () => {
    setAiSummaryText("");
    setShowAISummarySheet(true);
    generateAISummary("generate_summary");
  };

  // ─── AI Bullets ─────────────────────────────────────────────────────────────

  const openAIBullets = (expIndex: number) => {
    setAiBulletsExpIndex(expIndex);
    setAiBulletsText("");
    setShowAIBulletsSheet(true);
    improveBullets(expIndex);
  };

  const improveBullets = async (expIndex: number) => {
    setAiGenerating(true);
    try {
      const bullets = cvData.experiences[expIndex]?.bullets.filter(Boolean).join("\n");
      const { data, error } = await supabase.functions.invoke("generate-cv-summary", {
        body: {
          action: "improve_bullets",
          bullets: bullets || `Worked as ${cvData.experiences[expIndex]?.jobTitle} at ${cvData.experiences[expIndex]?.company}`,
        },
      });
      if (error) throw error;
      setAiBulletsText(data?.text || "");
    } catch {
      toast({ title: "AI generation failed", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const useAIBullets = () => {
    const lines = aiBulletsText.split("\n").map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
    updateExperience(aiBulletsExpIndex, "bullets", lines);
    setShowAIBulletsSheet(false);
    toast({ title: "Bullets updated" });
  };

  // ─── Skryve Certs Import ─────────────────────────────────────────────────────

  const openSkryveImport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await (supabase as any)
        .from("certificates")
        .select("id, courses(title, skill_category)")
        .eq("talent_id", profileId)
        .limit(20);

      setSkryveCerts(
        (data || []).map((c: any) => ({
          id: c.id,
          name: c.courses?.title || "Certificate",
          issuer: "Skryve",
          checked: false,
        }))
      );
      setShowSkryveImportDialog(true);
    } catch {
      toast({ title: "Failed to load certificates", variant: "destructive" });
    }
  };

  const importSkryveCerts = () => {
    const selected = skryveCerts.filter(c => c.checked).map(c => ({
      name: c.name, issuer: c.issuer, year: new Date().getFullYear().toString(),
    }));
    setCvData(prev => ({
      ...prev,
      certifications: [...prev.certifications, ...selected],
    }));
    setShowSkryveImportDialog(false);
    toast({ title: `${selected.length} certification(s) imported` });
  };

  // ─── Experience helpers ──────────────────────────────────────────────────────

  const updateExperience = (idx: number, field: string, value: any) => {
    setCvData(prev => ({
      ...prev,
      experiences: prev.experiences.map((e, i) => i === idx ? { ...e, [field]: value } : e),
    }));
  };

  const moveExperience = (idx: number, dir: "up" | "down") => {
    const arr = [...cvData.experiences];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    setCvData(prev => ({ ...prev, experiences: arr }));
  };

  // ─── PDF Download ────────────────────────────────────────────────────────────

  const downloadPDF = () => {
    const previewData: CVData = {
      personal_info: cvData.personal_info,
      summary: cvData.summary,
      experiences: cvData.experiences,
      education: cvData.education,
      skills: cvData.skills,
      certifications: cvData.certifications,
      projects: cvData.projects,
    };

    const html = renderToStaticMarkup(
      <CVPreview data={previewData} template={cvData.template_name} />
    );

    const win = window.open("", "_blank");
    if (!win) {
      toast({ title: "Please allow popups to download PDF", variant: "destructive" });
      return;
    }

    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <script src="https://cdn.tailwindcss.com"><\/script>
      <style>@page{margin:0.5in}body{margin:0}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
    </head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 800);

    // Track download
    if (dbId) {
      (supabase as any)
        .from("skryve_cvs")
        .update({ last_downloaded_at: new Date().toISOString() })
        .eq("id", dbId)
        .then(() => {});
    }
  };

  // ─── Skill input ─────────────────────────────────────────────────────────────

  const addSkill = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || cvData.skills.includes(trimmed)) return;
    setCvData(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setCvData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const importProfileSkills = () => {
    if (!talentProfile) return;
    const newSkills = [
      ...(talentProfile.primary_skill ? [talentProfile.primary_skill] : []),
      ...(talentProfile.secondary_skills || []),
    ].filter((s: string) => !cvData.skills.includes(s));
    setCvData(prev => ({ ...prev, skills: [...prev.skills, ...newSkills] }));
    toast({ title: `${newSkills.length} skill(s) imported` });
  };

  // ─── ATS Score ───────────────────────────────────────────────────────────────

  const atsResult = calcATSScore(cvData);

  // ─── Preview data ─────────────────────────────────────────────────────────────

  const previewData: CVData = {
    personal_info: cvData.personal_info,
    summary: cvData.summary,
    experiences: cvData.experiences,
    education: cvData.education,
    skills: cvData.skills,
    certifications: cvData.certifications,
    projects: cvData.projects,
  };

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shrink-0 flex-wrap">
        <button
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/cv-builder")}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Inline title */}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className="text-[14px] font-semibold border-b border-primary outline-none bg-transparent min-w-[120px] max-w-[220px] text-foreground"
            value={cvData.title}
            onChange={e => setCvData(prev => ({ ...prev, title: e.target.value }))}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => { if (e.key === "Enter") setEditingTitle(false); }}
            autoFocus
          />
        ) : (
          <span
            className="text-[14px] font-semibold cursor-pointer hover:text-primary transition-colors text-foreground"
            onClick={() => { setEditingTitle(true); setTimeout(() => titleInputRef.current?.select(), 0); }}
            title="Click to rename"
          >
            {cvData.title}
          </span>
        )}

        <div className="flex-1" />

        <button
          className="px-3 py-1.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          onClick={() => setShowTemplateModal(true)}
        >
          Template
        </button>
        <button
          className="px-3 py-1.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          onClick={() => setShowATSModal(true)}
        >
          ATS: <span className={`ml-1 font-bold ${atsResult.total >= 70 ? "text-primary" : "text-amber-500"}`}>{atsResult.total}</span>
        </button>
        <button
          className="px-3 py-1.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          disabled={saving || !dbId}
          onClick={() => saveDraft(true)}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
        <button
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          onClick={downloadPDF}
          disabled={!dbId}
        >
          <Download className="w-3 h-3" />
          PDF
        </button>
        <button
          className="px-3 py-1.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 transition-colors"
          onClick={() => toast({ title: "DOCX download coming soon!" })}
        >
          <FileDown className="w-3 h-3" />
          DOCX
        </button>
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 overflow-hidden">

        {/* ── Left: Form ──────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto p-6 space-y-8 border-r border-border">

          {/* Section 1: Personal Info */}
          <section>
            <SectionLabel>Personal Info</SectionLabel>
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-5 grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name</label>
                  <Input
                    value={cvData.personal_info.fullName}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, fullName: e.target.value } }))}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Professional Title</label>
                  <Input
                    value={cvData.personal_info.title}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, title: e.target.value } }))}
                    placeholder="Senior Product Designer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    value={cvData.personal_info.email}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, email: e.target.value } }))}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</label>
                  <Input
                    value={cvData.personal_info.phone}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, phone: e.target.value } }))}
                    placeholder="+1-234-567-8900"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Location</label>
                  <Input
                    value={cvData.personal_info.location}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, location: e.target.value } }))}
                    placeholder="Lagos, Nigeria"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">LinkedIn URL</label>
                  <Input
                    value={cvData.personal_info.linkedin}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, linkedin: e.target.value } }))}
                    placeholder="linkedin.com/in/janedoe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">GitHub URL</label>
                  <Input
                    value={cvData.personal_info.github}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, github: e.target.value } }))}
                    placeholder="github.com/janedoe"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Website</label>
                  <Input
                    value={cvData.personal_info.website}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, website: e.target.value } }))}
                    placeholder="https://janedoe.com"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Profile Photo URL</label>
                  <Input
                    value={cvData.personal_info.photoUrl}
                    onChange={e => setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, photoUrl: e.target.value } }))}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Professional Summary */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Professional Summary</SectionLabel>
              <button
                className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={openAISummary}
              >
                <Sparkles className="w-3 h-3 text-primary" />
                AI Write
              </button>
            </div>
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-5">
                <Textarea
                  value={cvData.summary}
                  onChange={e => {
                    if (e.target.value.length <= 400) {
                      setCvData(prev => ({ ...prev, summary: e.target.value }));
                    }
                  }}
                  placeholder="Write a compelling professional summary..."
                  className="min-h-[120px] resize-none text-[13px]"
                />
                <p className="text-[12px] text-muted-foreground mt-2 text-right">{cvData.summary.length}/400</p>
              </div>
            </div>
          </section>

          {/* Section 3: Work Experience */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Work Experience</SectionLabel>
              <button
                className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={() => setCvData(prev => ({ ...prev, experiences: [...prev.experiences, defaultExperience()] }))}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {cvData.experiences.map((exp, i) => (
              <div key={i} className="border border-border rounded-xl bg-card overflow-hidden mb-4">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Experience {i + 1}</span>
                  <div className="flex gap-1">
                    <button
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
                      disabled={i === 0}
                      onClick={() => moveExperience(i, "up")}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
                      disabled={i === cvData.experiences.length - 1}
                      onClick={() => moveExperience(i, "down")}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {cvData.experiences.length > 1 && (
                      <button
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
                        onClick={() => setCvData(prev => ({ ...prev, experiences: prev.experiences.filter((_, j) => j !== i) }))}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-5 py-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Job Title *</label>
                      <Input value={exp.jobTitle} onChange={e => updateExperience(i, "jobTitle", e.target.value)} placeholder="Senior Designer" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Company *</label>
                      <Input value={exp.company} onChange={e => updateExperience(i, "company", e.target.value)} placeholder="Acme Inc." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Location</label>
                      <Input value={exp.location} onChange={e => updateExperience(i, "location", e.target.value)} placeholder="Lagos, Nigeria" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Date</label>
                      <Input value={exp.startDate} onChange={e => updateExperience(i, "startDate", e.target.value)} placeholder="Jan 2022" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">End Date</label>
                      <Input value={exp.endDate} disabled={exp.isPresent} onChange={e => updateExperience(i, "endDate", e.target.value)} placeholder="Dec 2023" />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Checkbox
                        id={`present-${i}`}
                        checked={exp.isPresent}
                        onCheckedChange={checked => updateExperience(i, "isPresent", !!checked)}
                      />
                      <Label htmlFor={`present-${i}`} className="cursor-pointer text-[13px]">Currently working here</Label>
                    </div>
                  </div>

                  {/* Bullets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider block">Description (bullets)</label>
                      <button
                        className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        onClick={() => openAIBullets(i)}
                      >
                        <Sparkles className="w-3 h-3 text-primary" />
                        AI Improve
                      </button>
                    </div>
                    {exp.bullets.map((bullet, bi) => (
                      <div key={bi} className="flex gap-2">
                        <span className="text-muted-foreground pt-2 text-xs">•</span>
                        <Input
                          value={bullet}
                          onChange={e => {
                            const newBullets = [...exp.bullets];
                            newBullets[bi] = e.target.value;
                            updateExperience(i, "bullets", newBullets);
                          }}
                          placeholder="Led a team of 5 engineers to deliver..."
                          className="flex-1 text-[13px]"
                        />
                        {exp.bullets.length > 1 && (
                          <button
                            className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => updateExperience(i, "bullets", exp.bullets.filter((_, j) => j !== bi))}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      onClick={() => updateExperience(i, "bullets", [...exp.bullets, ""])}
                    >
                      <Plus className="w-3 h-3" /> Add bullet
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Section 4: Education */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Education</SectionLabel>
              <button
                className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={() => setCvData(prev => ({ ...prev, education: [...prev.education, defaultEducation()] }))}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {cvData.education.map((edu, i) => (
              <div key={i} className="border border-border rounded-xl bg-card overflow-hidden mb-4">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Education {i + 1}</span>
                  {cvData.education.length > 1 && (
                    <button
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
                      onClick={() => setCvData(prev => ({ ...prev, education: prev.education.filter((_, j) => j !== i) }))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="px-5 py-5 grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Degree *</label>
                    <Input value={edu.degree} onChange={e => setCvData(prev => ({ ...prev, education: prev.education.map((x, j) => j === i ? { ...x, degree: e.target.value } : x) }))} placeholder="B.Sc. Computer Science" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">School / University *</label>
                    <Input value={edu.school} onChange={e => setCvData(prev => ({ ...prev, education: prev.education.map((x, j) => j === i ? { ...x, school: e.target.value } : x) }))} placeholder="University of Lagos" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Year Graduated</label>
                    <Input value={edu.year} onChange={e => setCvData(prev => ({ ...prev, education: prev.education.map((x, j) => j === i ? { ...x, year: e.target.value } : x) }))} placeholder="2020" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Grade / GPA</label>
                    <Input value={edu.grade} onChange={e => setCvData(prev => ({ ...prev, education: prev.education.map((x, j) => j === i ? { ...x, grade: e.target.value } : x) }))} placeholder="3.8 / 4.0" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Section 5: Skills */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Skills</SectionLabel>
              <button
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={importProfileSkills}
              >
                Import from Profile
              </button>
            </div>
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-5">
                <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
                  {cvData.skills.map(skill => (
                    <span key={skill} className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-destructive transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
                    placeholder="Type a skill and press Enter"
                    className="text-[13px]"
                  />
                  <button
                    className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    onClick={() => addSkill(skillInput)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Certifications */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Certifications</SectionLabel>
              <div className="flex gap-3">
                <button
                  className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={openSkryveImport}
                >
                  Import from Skryve
                </button>
                <button
                  className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  onClick={() => setCvData(prev => ({ ...prev, certifications: [...prev.certifications, defaultCertification()] }))}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>

            {cvData.certifications.map((cert, i) => (
              <div key={i} className="border border-border rounded-xl bg-card overflow-hidden mb-3">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Cert {i + 1}</span>
                  <button
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => setCvData(prev => ({ ...prev, certifications: prev.certifications.filter((_, j) => j !== i) }))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-5 py-4 grid grid-cols-3 gap-3">
                  <div className="col-span-3 space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Name *</label>
                    <Input value={cert.name} onChange={e => setCvData(prev => ({ ...prev, certifications: prev.certifications.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="Google UX Design Certificate" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Issuer</label>
                    <Input value={cert.issuer} onChange={e => setCvData(prev => ({ ...prev, certifications: prev.certifications.map((x, j) => j === i ? { ...x, issuer: e.target.value } : x) }))} placeholder="Google / Coursera" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Year</label>
                    <Input value={cert.year} onChange={e => setCvData(prev => ({ ...prev, certifications: prev.certifications.map((x, j) => j === i ? { ...x, year: e.target.value } : x) }))} placeholder="2023" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Section 7: Projects */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Projects</SectionLabel>
              <button
                className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={() => setCvData(prev => ({ ...prev, projects: [...prev.projects, defaultProject()] }))}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {cvData.projects.length === 0 && (
              <p className="text-[13px] text-muted-foreground text-center py-4">No projects added yet.</p>
            )}

            {cvData.projects.map((proj, i) => (
              <div key={i} className="border border-border rounded-xl bg-card overflow-hidden mb-3">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Project {i + 1}</span>
                  <button
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => setCvData(prev => ({ ...prev, projects: prev.projects.filter((_, j) => j !== i) }))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Project Name *</label>
                    <Input value={proj.name} onChange={e => setCvData(prev => ({ ...prev, projects: prev.projects.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="E-commerce Platform" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                    <Textarea value={proj.description} onChange={e => setCvData(prev => ({ ...prev, projects: prev.projects.map((x, j) => j === i ? { ...x, description: e.target.value } : x) }))} placeholder="Built a full-stack e-commerce platform with React and Node.js..." className="min-h-[70px] resize-none text-[13px]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">URL</label>
                    <Input value={proj.url} onChange={e => setCvData(prev => ({ ...prev, projects: prev.projects.map((x, j) => j === i ? { ...x, url: e.target.value } : x) }))} placeholder="https://github.com/janedoe/project" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* ── Right: Preview ───────────────────────────────────────────────── */}
        <div className="overflow-y-auto bg-muted/30 hidden lg:block">
          <div className="p-6">
            <p className="text-[12px] text-muted-foreground text-center mb-4">Live Preview — {cvData.template_name} template</p>
            <div className="max-w-[680px] mx-auto shadow-xl rounded-lg overflow-hidden">
              <CVPreview data={previewData} template={cvData.template_name} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Import Profile Modal ─────────────────────────────────────────────── */}
      <Dialog open={showImportModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Import from your Skryve profile?</DialogTitle>
            <DialogDescription>
              We can pre-fill your personal info, skills, and certifications from your Skryve profile.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <button
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              onClick={() => handleImportProfile(true)}
              disabled={!talentProfile}
            >
              <Check className="w-4 h-4" />
              Yes, Import from Profile
            </button>
            <button
              className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              onClick={() => handleImportProfile(false)}
            >
              Start from Scratch
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Template Selector Modal ──────────────────────────────────────────── */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>Select a template for your CV. Preview updates live.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => {
                  setCvData(prev => ({ ...prev, template_name: tpl.id }));
                  setShowTemplateModal(false);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  cvData.template_name === tpl.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="h-16 rounded-lg mb-3 overflow-hidden" style={{ backgroundColor: tpl.color + "15" }}>
                  <div className="p-2">
                    <div className="h-2 rounded mb-1" style={{ backgroundColor: tpl.color, width: "60%" }} />
                    <div className="h-1.5 rounded mb-2" style={{ backgroundColor: tpl.color, width: "40%", opacity: 0.6 }} />
                    <div className="h-1 bg-border rounded mb-1 w-full" />
                    <div className="h-1 bg-border rounded w-5/6" />
                  </div>
                </div>
                <p className="text-[13px] font-semibold text-foreground">{tpl.label}</p>
                <p className="text-[12px] text-muted-foreground">{tpl.desc}</p>
                {cvData.template_name === tpl.id && (
                  <span className="text-[12px] text-primary font-medium">Selected</span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── ATS Score Modal ──────────────────────────────────────────────────── */}
      <Dialog open={showATSModal} onOpenChange={setShowATSModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ATS Score</DialogTitle>
            <DialogDescription>How well your CV will perform with Applicant Tracking Systems.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke={atsResult.total >= 70 ? "#059669" : atsResult.total >= 50 ? "#f59e0b" : "#ef4444"}
                strokeWidth="10"
                strokeDasharray={`${(atsResult.total / 100) * 314} 314`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="65" textAnchor="middle" style={{ fontSize: "24px", fontWeight: "bold", fill: atsResult.total >= 70 ? "#059669" : "#f59e0b" }}>
                {atsResult.total}
              </text>
            </svg>
            <p className="text-[12px] text-muted-foreground mt-1">out of 100</p>
            <span className={`mt-2 text-[12px] px-3 py-1 rounded-full font-semibold ${atsResult.total >= 70 ? "bg-primary/10 text-primary" : atsResult.total >= 50 ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"}`}>
              {atsResult.total >= 70 ? "ATS Ready" : atsResult.total >= 50 ? "Needs Work" : "Poor"}
            </span>
          </div>
          <div className="space-y-2 mt-2">
            {atsResult.criteria.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                {c.met
                  ? <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-[13px] text-foreground">{c.label}</p>
                  {!c.met && c.tip && <p className="text-[12px] text-muted-foreground">{c.tip}</p>}
                </div>
                <span className="ml-auto text-[12px] font-medium text-muted-foreground">+{c.points}pts</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AI Summary Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={showAISummarySheet} onOpenChange={setShowAISummarySheet}>
        <SheetContent side="right" className="w-full sm:w-[480px]">
          <SheetHeader>
            <SheetTitle>AI-Generated Summary</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {aiGenerating ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[13px]">Generating with AI...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea value={aiSummaryText} onChange={e => setAiSummaryText(e.target.value)} className="min-h-[150px] resize-none text-[13px]" />
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
                    onClick={() => {
                      setCvData(prev => ({ ...prev, summary: aiSummaryText }));
                      setShowAISummarySheet(false);
                      toast({ title: "Summary applied" });
                    }}
                  >
                    Use This
                  </button>
                  <button
                    className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50 transition-colors"
                    onClick={() => generateAISummary("regenerate_summary")}
                    disabled={aiGenerating}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── AI Bullets Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={showAIBulletsSheet} onOpenChange={setShowAIBulletsSheet}>
        <SheetContent side="right" className="w-full sm:w-[480px]">
          <SheetHeader>
            <SheetTitle>AI-Improved Bullets</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {aiGenerating ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[13px]">Improving your bullets with AI...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[12px] text-muted-foreground">Review and edit the improved bullets below:</p>
                <Textarea value={aiBulletsText} onChange={e => setAiBulletsText(e.target.value)} className="min-h-[200px] resize-none font-mono text-[12px]" />
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
                    onClick={useAIBullets}
                  >
                    Use These
                  </button>
                  <button
                    className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50 transition-colors"
                    onClick={() => improveBullets(aiBulletsExpIndex)}
                    disabled={aiGenerating}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Skryve Certs Import Dialog ───────────────────────────────────────── */}
      <Dialog open={showSkryveImportDialog} onOpenChange={setShowSkryveImportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Import Skryve Certificates</DialogTitle>
            <DialogDescription>Select certificates from your Skryve learning history.</DialogDescription>
          </DialogHeader>
          {skryveCerts.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-4 text-center">No certificates found on your account.</p>
          ) : (
            <div className="space-y-1 mt-2 max-h-60 overflow-y-auto">
              {skryveCerts.map((cert, i) => (
                <label key={cert.id} className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={cert.checked}
                    onCheckedChange={checked => {
                      setSkryveCerts(prev => prev.map((c, j) => j === i ? { ...c, checked: !!checked } : c));
                    }}
                  />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{cert.name}</p>
                    <p className="text-[12px] text-muted-foreground">{cert.issuer}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              onClick={importSkryveCerts}
              disabled={!skryveCerts.some(c => c.checked)}
            >
              Import Selected
            </button>
            <button
              className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              onClick={() => setShowSkryveImportDialog(false)}
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
