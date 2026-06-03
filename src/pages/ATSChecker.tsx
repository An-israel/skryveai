import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { motion } from "framer-motion";
import { NextStepsCard } from "@/components/shared/NextStepsCard";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Target, Loader2, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCredits } from "@/hooks/use-credits";
import { FeatureGuide } from "@/components/onboarding/FeatureGuide";
import { atsCheckerGuide } from "@/components/onboarding/guideConfigs";
import { extractTextFromPdf } from "@/lib/extract-pdf-text";
import { Link } from "react-router-dom";

interface ATSResult {
  overallScore: number;
  breakdown: Record<string, number>;
  strengths: string[];
  improvements: string[];
  missingKeywords?: string[];
  grade: string;
}

export default function ATSChecker() {
  const [cvContent, setCvContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { checkCredits, deductCredits } = useCredits();

  const handleCheck = async () => {
    if (cvContent.trim().length < 50) {
      toast({ title: "Too Short", description: "Please paste at least 50 characters of CV content.", variant: "destructive" });
      return;
    }

    // Check credits before running (costs 0.3 credits)
    const creditCheck = await checkCredits(0.3);
    if (!creditCheck.ok) return;

    setIsChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("check-ats-score", {
        body: { cvContent, jobDescription: jobDescription.trim() || undefined },
      });

      if (error) throw new Error(error.message);
      setResult(data);
      // Deduct 0.3 credits after success
      await deductCredits(0.3);
      toast({ title: "Score Ready!", description: `Your ATS score: ${data.overallScore}% (${data.grade})` });
      // Track usage
      if (user) {
        supabase.from("tool_usage").insert({ user_id: user.id, tool_name: "ats_checker", metadata: { score: data.overallScore, grade: data.grade } } as any).then(() => {});
      }
    } catch (error) {
      toast({
        title: "Check Failed",
        description: error instanceof Error ? error.message : "Failed to check ATS score",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
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
      if (extracted.trim().length > 50) {
        setCvContent(extracted);
        toast({ title: "CV loaded", description: `${extracted.trim().split(/\s+/).length} words extracted` });
      } else {
        toast({ title: "Could not extract text", description: "Please paste your CV text directly", variant: "destructive" });
        setUploadedFileName("");
      }
    } catch {
      toast({ title: "Failed to read file", description: "Please paste your CV text directly", variant: "destructive" });
      setUploadedFileName("");
    } finally {
      setIsParsingFile(false);
      e.target.value = "";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-primary";
    if (score >= 75) return "text-amber-500";
    if (score >= 50) return "text-orange-500";
    return "text-destructive";
  };

  const getGradeStyle = (grade: string) => {
    if (grade.startsWith("A")) return "bg-primary/10 text-primary";
    if (grade.startsWith("B")) return "bg-blue-500/10 text-blue-600";
    if (grade.startsWith("C")) return "bg-amber-500/10 text-amber-600";
    return "bg-destructive/10 text-destructive";
  };

  return (
    <div>
      <FeatureGuide featureKey="ats-checker" steps={atsCheckerGuide} />
      <SEOHead
        title="Free ATS Score Checker — Check Your Resume ATS Score Instantly | SkryveAI"
        description="Check your resume's ATS score instantly. SkryveAI's ATS Checker scores your CV against any job description, identifies keyword gaps, and tells you exactly what to fix to pass ATS filters."
        canonical="https://skryveai.com/ats-checker"
        keywords="ATS score checker, ATS resume checker, check ATS score, resume ATS score free, ATS compatibility checker, resume keyword checker, ATS friendly resume checker, resume scanner, CV ATS check, free ATS checker online, best ATS checker 2026"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "SkryveAI ATS Score Checker",
          url: "https://skryveai.com/ats-checker",
          applicationCategory: "BusinessApplication",
          description: "Free AI-powered ATS score checker that analyzes your resume against job descriptions and identifies keyword gaps.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free trial available" }
        }}
      />
      <main className="container mx-auto px-0 pb-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <button
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          {/* Page header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">ATS Score Checker</h1>
            <p className="text-[13px] text-muted-foreground">Upload any CV and get an instant ATS compatibility score</p>
            <span className="inline-block mt-2 text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">FREE</span>
          </div>

          {!result ? (
            /* ── Input panel ── */
            <div className="space-y-5">
              {/* CV panel */}
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <span className="text-[13px] font-semibold text-foreground">Your CV / Resume</span>
                </div>
                <div className="px-5 py-5 space-y-4">
                  {/* File upload */}
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    onClick={() => document.getElementById("ats-file-input")?.click()}
                  >
                    <input
                      id="ats-file-input"
                      type="file"
                      accept=".pdf,.txt,.docx,.doc"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    {isParsingFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <p className="text-[13px] text-muted-foreground">Reading your CV...</p>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-[13px] font-medium text-foreground">{uploadedFileName}</span>
                        <button
                          onClick={e => { e.stopPropagation(); setUploadedFileName(""); setCvContent(""); }}
                          className="ml-1 p-0.5 rounded hover:bg-muted/50"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <p className="text-[13px] font-medium text-foreground">Click to upload your CV</p>
                        <p className="text-[12px] text-muted-foreground">PDF, Word (.docx) or TXT — max 5MB</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    <div className="flex-1 border-t border-border" />
                    <span>or paste text directly</span>
                    <div className="flex-1 border-t border-border" />
                  </div>

                  <Textarea
                    value={cvContent}
                    onChange={e => setCvContent(e.target.value)}
                    placeholder="Paste your entire CV/resume text here..."
                    className="min-h-[160px] text-[13px]"
                  />
                  {cvContent.length > 0 && (
                    <p className="text-[12px] text-muted-foreground">{cvContent.trim().split(/\s+/).length} words · {cvContent.length} characters</p>
                  )}
                </div>
              </div>

              {/* Job description panel */}
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Job Description</span>
                  <span className="text-[12px] text-muted-foreground">optional — for keyword matching</span>
                </div>
                <div className="px-5 py-5">
                  <Textarea
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste the job description to check keyword alignment..."
                    className="min-h-[120px] text-[13px]"
                  />
                </div>
              </div>

              <button
                onClick={handleCheck}
                className="w-full px-5 py-3 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                disabled={isChecking || cvContent.trim().length < 50}
              >
                {isChecking ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Target className="w-4 h-4" /> Check ATS Score</>
                )}
              </button>
            </div>
          ) : (
            /* ── Results ── */
            <div className="space-y-4">
              {/* Score hero panel */}
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-10 text-center">
                  <div className={`text-7xl font-bold mb-3 ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore}%
                  </div>
                  <span className={`inline-block text-[12px] px-3 py-1 rounded-full font-semibold mb-3 ${getGradeStyle(result.grade)}`}>
                    Grade: {result.grade}
                  </span>
                  <p className="text-[13px] text-muted-foreground">
                    {result.overallScore >= 90 ? "Excellent! Your CV is well-optimized for ATS." :
                     result.overallScore >= 75 ? "Good, but there's room for improvement." :
                     result.overallScore >= 50 ? "Average. Consider optimizing with our CV Builder." :
                     "Needs significant improvement. Use our CV Builder to fix this."}
                  </p>
                </div>
              </div>

              {/* Breakdown panel */}
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <span className="text-[13px] font-semibold text-foreground">Score Breakdown</span>
                </div>
                <div className="px-5 py-5 space-y-4">
                  {Object.entries(result.breakdown || {}).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-[13px] mb-1.5">
                        <span className="text-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className={`font-semibold ${getScoreColor(value)}`}>{value}%</span>
                      </div>
                      <div className="h-1 bg-border rounded-full">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths panel */}
              {result.strengths?.length > 0 && (
                <div className="border border-border rounded-xl bg-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border">
                    <span className="text-[13px] font-semibold text-foreground">Strengths</span>
                  </div>
                  <div className="divide-y divide-border">
                    {result.strengths.map((s, i) => (
                      <div key={i} className="px-5 py-3 flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-[13px] text-foreground">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements panel */}
              {result.improvements?.length > 0 && (
                <div className="border border-border rounded-xl bg-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border">
                    <span className="text-[13px] font-semibold text-foreground">Improvements</span>
                  </div>
                  <div className="divide-y divide-border">
                    {result.improvements.map((s, i) => (
                      <div key={i} className="px-5 py-3 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-[13px] text-foreground">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Keywords panel */}
              {result.missingKeywords?.length ? (
                <div className="border border-border rounded-xl bg-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border">
                    <span className="text-[13px] font-semibold text-foreground">Missing Keywords</span>
                  </div>
                  <div className="px-5 py-5">
                    <div className="flex flex-wrap gap-2">
                      {result.missingKeywords.map((kw, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* CTA row */}
              <div className="flex gap-3">
                <button
                  className="flex-1 px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  onClick={() => setResult(null)}
                >
                  Check Another CV
                </button>
                {result.overallScore < 90 && (
                  <Link
                    to="/cv-builder"
                    className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Optimize with CV Builder
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              <NextStepsCard context="ats_checker" />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
