import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Upload, Sparkles, ArrowLeft, ArrowRight, Plus, Trash2,
  CheckCircle2, Download, Loader2, Target, BookOpen, Award, Briefcase, FileDown, X
} from "lucide-react";
import { downloadCvAsPdf, downloadCvAsDocx, downloadGuideAsPdf, downloadGuideAsDocx } from "@/lib/cv-download";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf } from "@/lib/extract-pdf-text";
import { useAuth } from "@/hooks/use-auth";
import { useCredits } from "@/hooks/use-credits";

interface ExperienceEntry {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
}

interface EducationEntry {
  course: string;
  institution: string;
}

interface CertificationEntry {
  name: string;
  issuer: string;
}

interface CVData {
  fullName: string;
  contactInfo: string;
  professionalSummary: string;
  keyCompetencies: string[];
  experience: Array<{ jobTitle: string; company: string; duration: string; bullets: string[] }>;
  education: Array<{ course: string; institution: string }>;
  certifications?: string[];
  technicalTools?: string[];
}

interface ATSScore {
  overallScore: number;
  breakdown: Record<string, number>;
  suggestions: string[];
}

interface LinkedInGuide {
  userName: string;
  headline: string;
  aboutSection: string;
  sections: Array<{ title: string; whatItIs: string; whatToPut: string; example: string; proTip?: string }>;
}

export default function CVBuilder() {
  const [mode, setMode] = useState<"select" | "optimize" | "scratch">("select");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [cvResult, setCvResult] = useState<CVData | null>(null);
  const [atsScore, setAtsScore] = useState<ATSScore | null>(null);
  const [linkedInGuide, setLinkedInGuide] = useState<LinkedInGuide | null>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);

  // Mode A state
  const [existingCv, setExistingCv] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [cvPreviewMode, setCvPreviewMode] = useState<"preview" | "edit">("preview");

  const handleCvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Please upload a file under 5MB", variant: "destructive" });
      return;
    }

    setIsParsingFile(true);
    setUploadedFileName(file.name);

    try {
      let extracted = "";

      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        extracted = await file.text();
      } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        extracted = await extractTextFromPdf(file);
      } else if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        const raw = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(await file.arrayBuffer()));
        const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
        extracted = matches.map(t => t.replace(/<[^>]+>/g, "")).join(" ").replace(/\s{2,}/g, " ").trim();
      } else {
        toast({ title: "Unsupported format", description: "Please upload PDF, Word (.docx), or TXT", variant: "destructive" });
        setUploadedFileName("");
        return;
      }

      if (extracted.trim().length > 100) {
        setExistingCv(extracted);
        setCvPreviewMode("preview");
        toast({ title: "CV loaded", description: `${extracted.trim().split(/\s+/).length} words extracted from ${file.name}` });
      } else {
        toast({ title: "Could not extract text", description: "Please paste your CV text directly in the box below", variant: "destructive" });
        setUploadedFileName("");
      }
    } catch (err) {
      console.error("File extraction error:", err);
      toast({ title: "Failed to read file", description: "Please paste your CV text directly", variant: "destructive" });
      setUploadedFileName("");
    } finally {
      setIsParsingFile(false);
      e.target.value = "";
    }
  };

  // Mode B state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    linkedin: "",
    location: "",
    skills: "",
    experience: [{ jobTitle: "", company: "", startDate: "", endDate: "", responsibilities: "" }] as ExperienceEntry[],
    education: [{ course: "", institution: "" }] as EducationEntry[],
    certifications: [{ name: "", issuer: "" }] as CertificationEntry[],
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { checkCredits, deductCredits } = useCredits();

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, { jobTitle: "", company: "", startDate: "", endDate: "", responsibilities: "" }],
    }));
  };

  const removeExperience = (index: number) => {
    if (formData.experience.length <= 1) return;
    setFormData(prev => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }));
  };

  const updateExperience = (index: number, field: keyof ExperienceEntry, value: string) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => i === index ? { ...exp, [field]: value } : exp),
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({ ...prev, education: [...prev.education, { course: "", institution: "" }] }));
  };

  const addCertification = () => {
    setFormData(prev => ({ ...prev, certifications: [...prev.certifications, { name: "", issuer: "" }] }));
  };

  const handleGenerate = async () => {
    // Check credits before generating (costs 0.5 credits)
    const creditCheck = await checkCredits(0.5);
    if (!creditCheck.ok) return;

    setIsGenerating(true);
    setCvResult(null);
    setAtsScore(null);
    setLinkedInGuide(null);

    try {
      setGenerationStep("Building your professional CV...");

      const body = mode === "optimize"
        ? { mode: "optimize", existingCv, jobDescription }
        : { mode: "scratch", formData };

      const { data, error } = await supabase.functions.invoke("build-cv", { body });

      if (error) throw new Error(error.message);
      if (!data?.cv) throw new Error("No CV data returned");

      setCvResult(data.cv);
      setAtsScore(data.atsScore);
      // Deduct 0.5 credits for CV generation
      await deductCredits(0.5);
      // Track usage
      if (user) {
        supabase.from("tool_usage").insert({ user_id: user.id, tool_name: "cv_builder", metadata: { mode, ats_score: data.atsScore } } as any).then(() => {});
      }

      // Auto-generate LinkedIn guide
      setGenerationStep("Generating LinkedIn Optimization Guide...");
      setIsGeneratingGuide(true);

      const { data: guideData, error: guideError } = await supabase.functions.invoke("generate-linkedin-guide", {
        body: { cvData: data.cv, userName: data.cv.fullName },
      });

      if (!guideError && guideData) {
        setLinkedInGuide(guideData);
      }

      setIsGeneratingGuide(false);
      toast({ title: "CV Generated!", description: `ATS Score: ${data.atsScore?.overallScore || "N/A"}%` });
    } catch (error) {
      console.error("CV generation error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate CV",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const downloadCvAsText = () => {
    if (!cvResult) return;
    let text = `${cvResult.fullName}\n${cvResult.contactInfo}\n\n`;
    text += `PROFESSIONAL SUMMARY\n${cvResult.professionalSummary}\n\n`;
    if (cvResult.keyCompetencies?.length) {
      text += `KEY COMPETENCIES\n${cvResult.keyCompetencies.join(" • ")}\n\n`;
    }
    text += "PROFESSIONAL EXPERIENCE\n";
    cvResult.experience?.forEach(exp => {
      text += `\n${exp.jobTitle} | ${exp.company}\n${exp.duration}\n`;
      exp.bullets?.forEach(b => { text += `• ${b}\n`; });
    });
    if (cvResult.education?.length) {
      text += "\nEDUCATION\n";
      cvResult.education.forEach(edu => { text += `• ${edu.course} — ${edu.institution}\n`; });
    }
    if (cvResult.certifications?.length) {
      text += "\nCERTIFICATIONS\n";
      cvResult.certifications.forEach(c => { text += `• ${c}\n`; });
    }
    if (cvResult.technicalTools?.length) {
      text += "\nTECHNICAL TOOLS\n";
      text += cvResult.technicalTools.join(" • ") + "\n";
    }
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cvResult.fullName?.replace(/\s+/g, "_")}_CV.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadGuideAsText = () => {
    if (!linkedInGuide) return;
    let text = `LINKEDIN OPTIMIZATION GUIDE\nFor: ${linkedInGuide.userName}\n\n`;
    text += `RECOMMENDED HEADLINE:\n${linkedInGuide.headline}\n\n`;
    text += `ABOUT SECTION:\n${linkedInGuide.aboutSection}\n\n`;
    linkedInGuide.sections?.forEach(section => {
      text += `${"=".repeat(50)}\n${section.title.toUpperCase()}\n${"=".repeat(50)}\n\n`;
      text += `What It Is:\n${section.whatItIs}\n\n`;
      text += `What To Put:\n${section.whatToPut}\n\n`;
      text += `Example:\n${section.example}\n\n`;
      if (section.proTip) text += `Pro Tip: ${section.proTip}\n\n`;
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LinkedIn_Guide_${linkedInGuide.userName?.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Mode Selection
  if (mode === "select") {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={!!user} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">CV / Resume Builder</h1>
              <p className="text-muted-foreground">Build or optimize a professional CV that scores 95-100% on ATS systems</p>
              <Badge variant="secondary" className="mt-2">FREE</Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:border-primary transition-colors group" onClick={() => setMode("optimize")}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>I Have a CV Already</CardTitle>
                  <CardDescription>Optimize your existing CV for a specific job description. AI will rewrite it to maximize ATS score and relevance.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors group" onClick={() => setMode("scratch")}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Start from Scratch</CardTitle>
                  <CardDescription>Fill in your details and our AI will craft a professional, ATS-optimized CV from the ground up.</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Results view
  if (cvResult) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={!!user} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Your Generated CV</h1>
                <p className="text-muted-foreground">Review, download, and get your LinkedIn guide</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCvResult(null); setAtsScore(null); setLinkedInGuide(null); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Build Another
                </Button>
              </div>
            </div>

            <Tabs defaultValue="cv" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cv">
                  <FileText className="w-4 h-4 mr-2" /> CV Preview
                </TabsTrigger>
                <TabsTrigger value="ats">
                  <Target className="w-4 h-4 mr-2" /> ATS Score
                </TabsTrigger>
                <TabsTrigger value="linkedin">
                  <BookOpen className="w-4 h-4 mr-2" /> LinkedIn Guide
                  {isGeneratingGuide && <Loader2 className="w-3 h-3 ml-1 animate-spin" />}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cv">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                    <CardTitle>CV Preview</CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={() => downloadCvAsPdf(cvResult)} size="sm" variant="default">
                        <FileDown className="w-4 h-4 mr-1" /> PDF
                      </Button>
                      <Button onClick={() => downloadCvAsDocx(cvResult)} size="sm" variant="outline">
                        <FileDown className="w-4 h-4 mr-1" /> DOCX
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white text-black p-8 rounded-lg shadow-inner max-w-[800px] mx-auto font-serif" style={{ lineHeight: 1.6 }}>
                      <h1 className="text-2xl font-bold text-center mb-1">{cvResult.fullName}</h1>
                      <p className="text-center text-sm text-gray-600 mb-4">{cvResult.contactInfo}</p>
                      <hr className="border-gray-300 mb-4" />

                      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2">Professional Summary</h2>
                      <p className="text-sm mb-4">{cvResult.professionalSummary}</p>

                      {cvResult.keyCompetencies?.length > 0 && (
                        <>
                          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2">Key Competencies</h2>
                          <div className="flex flex-wrap gap-1 mb-4">
                            {cvResult.keyCompetencies.map((skill, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{skill}</span>
                            ))}
                          </div>
                        </>
                      )}

                      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2">Professional Experience</h2>
                      {cvResult.experience?.map((exp, i) => (
                        <div key={i} className="mb-4">
                          <div className="flex justify-between items-baseline">
                            <h3 className="text-sm font-bold">{exp.jobTitle}</h3>
                            <span className="text-xs text-gray-500">{exp.duration}</span>
                          </div>
                          <p className="text-xs text-gray-600 italic mb-1">{exp.company}</p>
                          <ul className="list-disc list-inside text-sm space-y-0.5">
                            {exp.bullets?.map((bullet, j) => (
                              <li key={j} className="text-xs">{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      ))}

                      {cvResult.education?.length > 0 && (
                        <>
                          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2">Education</h2>
                          {cvResult.education.map((edu, i) => (
                            <p key={i} className="text-sm mb-1">{edu.course} — <span className="text-gray-600">{edu.institution}</span></p>
                          ))}
                        </>
                      )}

                      {cvResult.certifications?.length ? (
                        <>
                          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mt-4 mb-2">Certifications</h2>
                          <ul className="list-disc list-inside text-sm">
                            {cvResult.certifications.map((cert, i) => <li key={i} className="text-xs">{cert}</li>)}
                          </ul>
                        </>
                      ) : null}

                      {cvResult.technicalTools?.length ? (
                        <>
                          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mt-4 mb-2">Technical Tools & Software</h2>
                          <p className="text-xs">{cvResult.technicalTools.join(" • ")}</p>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ats">
                {atsScore && (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-8 text-center">
                        <div className="text-6xl font-bold text-primary mb-2">{atsScore.overallScore}%</div>
                        <p className="text-muted-foreground">ATS Compatibility Score</p>
                        <Badge className="mt-2" variant={atsScore.overallScore >= 95 ? "default" : "destructive"}>
                          {atsScore.overallScore >= 95 ? "Excellent" : atsScore.overallScore >= 80 ? "Good" : "Needs Improvement"}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle className="text-lg">Score Breakdown</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {Object.entries(atsScore.breakdown || {}).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                              <span className="font-medium">{value}%</span>
                            </div>
                            <Progress value={value} className="h-2" />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {atsScore.suggestions?.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle className="text-lg">Suggestions</CardTitle></CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {atsScore.suggestions.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="linkedin">
                {isGeneratingGuide ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                      <p className="text-muted-foreground">Generating your personalized LinkedIn guide...</p>
                    </CardContent>
                  </Card>
                ) : linkedInGuide ? (
                  <div className="space-y-6">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => downloadGuideAsPdf(linkedInGuide)} size="sm" variant="default">
                        <FileDown className="w-4 h-4 mr-1" /> Download PDF
                      </Button>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recommended Headline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-muted rounded-lg text-sm font-medium">{linkedInGuide.headline}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>About Section (Copy & Paste)</CardTitle></CardHeader>
                      <CardContent>
                        <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">{linkedInGuide.aboutSection}</div>
                      </CardContent>
                    </Card>

                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4">
                        {linkedInGuide.sections?.map((section, i) => (
                          <Card key={i}>
                            <CardHeader>
                              <CardTitle className="text-base">{section.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <Label className="text-xs font-bold uppercase text-muted-foreground">What It Is</Label>
                                <p className="text-sm mt-1">{section.whatItIs}</p>
                              </div>
                              <div>
                                <Label className="text-xs font-bold uppercase text-muted-foreground">What To Put</Label>
                                <p className="text-sm mt-1">{section.whatToPut}</p>
                              </div>
                              <div>
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Your Example</Label>
                                <div className="p-3 bg-muted rounded-lg text-sm mt-1 whitespace-pre-wrap">{section.example}</div>
                              </div>
                              {section.proTip && (
                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                  <p className="text-xs font-bold text-primary mb-1">PRO TIP</p>
                                  <p className="text-sm">{section.proTip}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">LinkedIn guide will be generated with your CV</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>
    );
  }

  // Generation loading
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={!!user} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-bold mb-2">Building Your CV</h2>
              <p className="text-muted-foreground mb-6">{generationStep}</p>
              <div className="max-w-xs mx-auto">
                <Progress value={generationStep.includes("LinkedIn") ? 75 : 40} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">This typically takes 30-60 seconds</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Mode A: Optimize existing CV
  if (mode === "optimize") {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={!!user} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Button variant="ghost" size="sm" onClick={() => setMode("select")} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Optimize Your CV</CardTitle>
                    <CardDescription>Paste your existing CV and the job description — AI will tailor it perfectly</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Your Existing CV</Label>

                  {/* File upload area */}
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors relative"
                    onClick={() => document.getElementById("cv-file-input")?.click()}
                  >
                    <input
                      id="cv-file-input"
                      type="file"
                      accept=".pdf,.txt,.docx,.doc"
                      className="hidden"
                      onChange={handleCvFileUpload}
                    />
                    {isParsingFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Reading your CV...</p>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-green-600">{uploadedFileName}</span>
                        <button
                          onClick={e => { e.stopPropagation(); setUploadedFileName(""); setExistingCv(""); }}
                          className="ml-1 p-0.5 rounded-full hover:bg-red-100"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to upload your CV</p>
                        <p className="text-xs text-muted-foreground">PDF, Word (.docx) or TXT — max 5MB</p>
                      </div>
                    )}
                  </div>

                  {/* CV content: preview panel or editable textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        {uploadedFileName ? "CV Content" : "Or paste CV text directly"}
                      </Label>
                      <div className="flex items-center gap-3">
                        {existingCv.trim().length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {existingCv.trim().split(/\s+/).length} words
                          </span>
                        )}
                        {uploadedFileName && existingCv.trim().length > 0 && (
                          <div className="flex rounded-lg border overflow-hidden text-xs">
                            <button
                              type="button"
                              onClick={() => setCvPreviewMode("preview")}
                              className={`px-3 py-1 font-medium transition-colors ${cvPreviewMode === "preview" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => setCvPreviewMode("edit")}
                              className={`px-3 py-1 font-medium transition-colors ${cvPreviewMode === "edit" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {uploadedFileName && existingCv.trim().length > 0 && cvPreviewMode === "preview" ? (
                      <div className="border rounded-xl bg-card p-5 max-h-[420px] overflow-y-auto text-sm leading-7 whitespace-pre-wrap text-foreground shadow-inner">
                        {existingCv}
                      </div>
                    ) : (
                      <Textarea
                        value={existingCv}
                        onChange={e => setExistingCv(e.target.value)}
                        placeholder="CV text will appear here after upload, or paste it directly..."
                        className="text-sm resize-y"
                        style={{ minHeight: "200px" }}
                      />
                    )}

                    {uploadedFileName && existingCv.trim().length > 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Content loaded — click Edit to modify before optimizing
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Job Description</Label>
                  <Textarea
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description you're applying for..."
                    className="min-h-[150px]"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  className="w-full"
                  size="lg"
                  disabled={existingCv.trim().length < 50 || jobDescription.trim().length < 20}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Optimize CV + Generate LinkedIn Guide
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  // Mode B: Build from scratch
  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={!!user} onLogout={handleLogout} />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => setMode("select")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Build CV from Scratch</CardTitle>
                  <CardDescription>Fill in your details — AI will craft a professional CV</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4" /> Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Full Name *</Label>
                        <Input value={formData.fullName} onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))} placeholder="John Doe" />
                      </div>
                      <div className="space-y-1">
                        <Label>Phone *</Label>
                        <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+1-234-567-8900" />
                      </div>
                      <div className="space-y-1">
                        <Label>Email *</Label>
                        <Input value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
                      </div>
                      <div className="space-y-1">
                        <Label>Location *</Label>
                        <Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="City, State" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>LinkedIn URL</Label>
                      <Input value={formData.linkedin} onChange={e => setFormData(p => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/in/yourprofile" />
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2"><Award className="w-4 h-4" /> Work Experience</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addExperience}><Plus className="w-3 h-3 mr-1" /> Add Role</Button>
                    </div>
                    {formData.experience.map((exp, i) => (
                      <Card key={i} className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <Badge variant="secondary">Role {i + 1}</Badge>
                          {formData.experience.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeExperience(i)}><Trash2 className="w-3 h-3" /></Button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>Job Title *</Label>
                              <Input value={exp.jobTitle} onChange={e => updateExperience(i, "jobTitle", e.target.value)} placeholder="Senior Designer" />
                            </div>
                            <div className="space-y-1">
                              <Label>Company *</Label>
                              <Input value={exp.company} onChange={e => updateExperience(i, "company", e.target.value)} placeholder="Acme Inc." />
                            </div>
                            <div className="space-y-1">
                              <Label>Start Date</Label>
                              <Input value={exp.startDate} onChange={e => updateExperience(i, "startDate", e.target.value)} placeholder="Jan 2022" />
                            </div>
                            <div className="space-y-1">
                              <Label>End Date</Label>
                              <Input value={exp.endDate} onChange={e => updateExperience(i, "endDate", e.target.value)} placeholder="Present" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label>Key Responsibilities (describe what you did)</Label>
                            <Textarea value={exp.responsibilities} onChange={e => updateExperience(i, "responsibilities", e.target.value)} placeholder="Describe 5-6 key things you did in this role..." className="min-h-[100px]" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Education */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Education</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addEducation}><Plus className="w-3 h-3 mr-1" /> Add</Button>
                    </div>
                    {formData.education.map((edu, i) => (
                      <div key={i} className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Course / Degree</Label>
                          <Input value={edu.course} onChange={e => {
                            const updated = [...formData.education];
                            updated[i] = { ...updated[i], course: e.target.value };
                            setFormData(p => ({ ...p, education: updated }));
                          }} placeholder="B.Sc. Computer Science" />
                        </div>
                        <div className="space-y-1">
                          <Label>Institution</Label>
                          <Input value={edu.institution} onChange={e => {
                            const updated = [...formData.education];
                            updated[i] = { ...updated[i], institution: e.target.value };
                            setFormData(p => ({ ...p, education: updated }));
                          }} placeholder="University of Lagos" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Certifications */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Certifications</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addCertification}><Plus className="w-3 h-3 mr-1" /> Add</Button>
                    </div>
                    {formData.certifications.map((cert, i) => (
                      <div key={i} className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Certification Name</Label>
                          <Input value={cert.name} onChange={e => {
                            const updated = [...formData.certifications];
                            updated[i] = { ...updated[i], name: e.target.value };
                            setFormData(p => ({ ...p, certifications: updated }));
                          }} placeholder="Google UX Design" />
                        </div>
                        <div className="space-y-1">
                          <Label>Issuing Body</Label>
                          <Input value={cert.issuer} onChange={e => {
                            const updated = [...formData.certifications];
                            updated[i] = { ...updated[i], issuer: e.target.value };
                            setFormData(p => ({ ...p, certifications: updated }));
                          }} placeholder="Google" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    <Label>Additional Skills / Expertise</Label>
                    <Textarea
                      value={formData.skills}
                      onChange={e => setFormData(p => ({ ...p, skills: e.target.value }))}
                      placeholder="List your key skills, tools, and software..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </ScrollArea>

              <Button
                onClick={handleGenerate}
                className="w-full mt-6"
                size="lg"
                disabled={!formData.fullName.trim() || !formData.email.trim() || formData.experience[0]?.jobTitle.trim() === ""}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Professional CV + LinkedIn Guide
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
