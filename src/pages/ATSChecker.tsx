import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 75) return "text-yellow-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-500/10 text-green-600 border-green-200";
    if (grade.startsWith("B")) return "bg-blue-500/10 text-blue-600 border-blue-200";
    if (grade.startsWith("C")) return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    return "bg-red-500/10 text-red-600 border-red-200";
  };

  return (
    <div className="min-h-screen bg-background">
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
      <Header isAuthenticated={!!user} onLogout={handleLogout} />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">ATS Score Checker</h1>
            <p className="text-muted-foreground">Upload any CV and get an instant ATS compatibility score</p>
            <Badge variant="secondary" className="mt-2">FREE</Badge>
          </div>

          {!result ? (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <Label>Your CV / Resume *</Label>

                  {/* File upload */}
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
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
                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Reading your CV...</p>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-green-600">{uploadedFileName}</span>
                        <button
                          onClick={e => { e.stopPropagation(); setUploadedFileName(""); setCvContent(""); }}
                          className="ml-1 p-0.5 rounded-full hover:bg-red-100"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <Upload className="w-7 h-7 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to upload your CV</p>
                        <p className="text-xs text-muted-foreground">PDF, Word (.docx) or TXT — max 5MB</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex-1 border-t" />
                    <span>or paste text directly</span>
                    <div className="flex-1 border-t" />
                  </div>

                  <Textarea
                    value={cvContent}
                    onChange={e => setCvContent(e.target.value)}
                    placeholder="Paste your entire CV/resume text here..."
                    className="min-h-[180px]"
                  />
                  {cvContent.length > 0 && (
                    <p className="text-xs text-muted-foreground">{cvContent.trim().split(/\s+/).length} words · {cvContent.length} characters</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Job Description <span className="text-muted-foreground text-xs">(optional — for keyword matching)</span></Label>
                  <Textarea
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste the job description to check keyword alignment..."
                    className="min-h-[120px]"
                  />
                </div>

                <Button onClick={handleCheck} className="w-full" size="lg" disabled={isChecking || cvContent.trim().length < 50}>
                  {isChecking ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Target className="w-5 h-5 mr-2" /> Check ATS Score</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Score hero */}
              <Card>
                <CardContent className="p-8 text-center">
                  <div className={`text-7xl font-bold mb-2 ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore}%
                  </div>
                  <Badge variant="outline" className={getGradeColor(result.grade)}>
                    Grade: {result.grade}
                  </Badge>
                  <p className="text-muted-foreground mt-2">
                    {result.overallScore >= 90 ? "Excellent! Your CV is well-optimized for ATS." :
                     result.overallScore >= 75 ? "Good, but there's room for improvement." :
                     result.overallScore >= 50 ? "Average. Consider optimizing with our CV Builder." :
                     "Needs significant improvement. Use our CV Builder to fix this."}
                  </p>
                </CardContent>
              </Card>

              {/* Breakdown */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Score Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(result.breakdown || {}).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className={`font-medium ${getScoreColor(value)}`}>{value}%</span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Strengths */}
              {result.strengths?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg text-green-600">✦ Strengths</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Improvements */}
              {result.improvements?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg text-orange-600">⚡ Improvements</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.improvements.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Missing Keywords */}
              {result.missingKeywords?.length ? (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Missing Keywords</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.missingKeywords.map((kw, i) => (
                        <Badge key={i} variant="outline" className="bg-red-500/5 text-red-600 border-red-200">{kw}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* CTA */}
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setResult(null)} className="flex-1">
                  Check Another CV
                </Button>
                {result.overallScore < 90 && (
                  <Button asChild className="flex-1">
                    <Link to="/cv-builder">
                      <Sparkles className="w-4 h-4 mr-2" /> Optimize with CV Builder
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
