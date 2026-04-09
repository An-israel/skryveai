import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Linkedin,
  Upload,
  FileText,
  Loader2,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Copy,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionBreakdown {
  headline: number;
  about: number;
  experience: number;
  skills: number;
  education: number;
  profileCompleteness: number;
  keywordsVisibility: number;
  socialProof: number;
}

interface SectionFeedback {
  headline: string;
  about: string;
  experience: string;
  skills: string;
  education: string;
  profileCompleteness: string;
  keywordsVisibility: string;
  socialProof: string;
}

interface AnalysisResult {
  overallScore: number;
  grade: string;
  profileStrength: string;
  breakdown: SectionBreakdown;
  sectionFeedback: SectionFeedback;
  quickWins: string[];
  biggerImprovements: string[];
  missingElements: string[];
  headlineSuggestion: string;
  aboutSuggestion: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<keyof SectionBreakdown, string> = {
  headline: "Headline",
  about: "About / Summary",
  experience: "Experience",
  skills: "Skills",
  education: "Education",
  profileCompleteness: "Profile Completeness",
  keywordsVisibility: "Keyword Visibility",
  socialProof: "Social Proof",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-green-500";
  if (grade.startsWith("B")) return "text-blue-500";
  if (grade.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
}

function strengthBadgeVariant(strength: string): "default" | "secondary" | "outline" {
  if (strength === "All-Star" || strength === "Expert") return "default";
  if (strength === "Advanced") return "secondary";
  return "outline";
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
        <circle
          cx="64" cy="64" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LinkedInAnalyzer() {
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [profileContent, setProfileContent] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }

    setIsParsingFile(true);
    setUploadedFileName(file.name);

    try {
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setProfileContent(text);
        toast({ title: "Profile loaded", description: `${text.length} characters extracted` });
      } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const arrayBuffer = await file.arrayBuffer();
        const raw = new TextDecoder("latin1").decode(new Uint8Array(arrayBuffer));
        const chunks: string[] = [];
        const btEtReg = /BT\s([\s\S]*?)ET/g;
        let m: RegExpExecArray | null;
        while ((m = btEtReg.exec(raw)) !== null) {
          const tjReg = /\(([^)]{1,300})\)\s*(?:Tj|TJ)/g;
          let tj: RegExpExecArray | null;
          while ((tj = tjReg.exec(m[1])) !== null) {
            const decoded = tj[1]
              .replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\t/g, " ")
              .replace(/\\\(/g, "(").replace(/\\\)/g, ")")
              .replace(/\\([0-9]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
            if (decoded.trim()) chunks.push(decoded.trim());
          }
        }
        if (chunks.length === 0) {
          const printable = raw.match(/[\x20-\x7E]{4,}/g) || [];
          chunks.push(...printable.filter(s => !s.startsWith("/") && !s.startsWith("<<") && s.split(" ").length > 1));
        }
        const extracted = chunks.join(" ").replace(/\s{3,}/g, " ").trim();
        if (extracted.length > 100) {
          setProfileContent(extracted);
          toast({ title: "LinkedIn PDF loaded", description: `${extracted.length} characters extracted` });
        } else {
          toast({ title: "Could not extract text from PDF", description: "Please paste your profile content below", variant: "destructive" });
          setUploadedFileName("");
        }
      } else if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const raw = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(arrayBuffer));
        const textMatches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
        const extracted = textMatches.map(t => t.replace(/<[^>]+>/g, "")).join(" ").replace(/\s{2,}/g, " ").trim();
        if (extracted.length > 100) {
          setProfileContent(extracted);
          toast({ title: "Profile loaded from Word doc", description: `${extracted.length} characters extracted` });
        } else {
          toast({ title: "Could not read document", description: "Please paste your profile text below", variant: "destructive" });
          setUploadedFileName("");
        }
      }
    } catch {
      toast({ title: "Upload failed", description: "Please paste your profile text below", variant: "destructive" });
      setUploadedFileName("");
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Analyze ─────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!session) {
      toast({ title: "Please log in first", variant: "destructive" });
      return;
    }
    if (profileContent.trim().length < 50) {
      toast({ title: "Not enough content", description: "Add more profile content to analyze", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-linkedin", {
        body: { profileContent, linkedinUrl: linkedinUrl.trim() || undefined, targetRole: targetRole.trim() || undefined },
      });
      if (error) throw new Error(error.message || "Analysis failed");
      setResult(data as AnalysisResult);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast({
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── Input form ──────────────────────────────────────────────────────────────
  const InputForm = () => (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* How-to hint */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex gap-3">
          <Linkedin className="w-5 h-5 text-[#0A66C2] mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium">How to get your LinkedIn content</p>
            <p className="text-muted-foreground">
              Go to your LinkedIn profile → click <strong>More</strong> → <strong>Save to PDF</strong>, then upload that PDF below.
              Or simply copy-paste the text from your profile sections.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* URL + target role row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>LinkedIn URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            placeholder="https://linkedin.com/in/yourname"
            value={linkedinUrl}
            onChange={e => setLinkedinUrl(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Target Role <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            placeholder="e.g. UX Designer, Freelance Copywriter"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
          />
        </div>
      </div>

      {/* File upload */}
      <div className="space-y-2">
        <Label>Upload LinkedIn PDF Export</Label>
        <div
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={handleFileUpload} />
          {isParsingFile ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Reading profile...</p>
            </div>
          ) : uploadedFileName ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">{uploadedFileName}</span>
              <button
                onClick={e => { e.stopPropagation(); setUploadedFileName(""); setProfileContent(""); }}
                className="ml-1 p-0.5 rounded-full hover:bg-red-100"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">Upload LinkedIn PDF, Word doc, or TXT</p>
              <p className="text-xs text-muted-foreground">Max 5MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual paste */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>
            {uploadedFileName ? "Extracted profile text (edit if needed)" : "Or paste your profile content"}
          </Label>
          {profileContent.trim().length > 0 && (
            <span className="text-xs text-muted-foreground">
              {profileContent.trim().split(/\s+/).length} words
            </span>
          )}
        </div>
        <Textarea
          value={profileContent}
          onChange={e => setProfileContent(e.target.value)}
          placeholder={`Paste your LinkedIn sections here — headline, about, experience, skills, education…\n\nExample:\nHeadline: Brand Strategist | Helping consumer brands grow through story-driven content\n\nAbout: I help growing brands tell stories that convert…`}
          className="text-sm resize-y"
          style={{ minHeight: profileContent.trim().length > 200 ? "320px" : "160px" }}
        />
      </div>

      <Button
        className="w-full h-12 text-base font-semibold"
        onClick={handleAnalyze}
        disabled={isAnalyzing || profileContent.trim().length < 50}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Analyzing your profile...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Analyze My LinkedIn Profile
          </>
        )}
      </Button>
    </motion.div>
  );

  // ── Results view ────────────────────────────────────────────────────────────
  const ResultsView = ({ data }: { data: AnalysisResult }) => (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Score header */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={data.overallScore} />
            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className={cn("text-4xl font-bold", gradeColor(data.grade))}>{data.grade}</span>
                <Badge variant={strengthBadgeVariant(data.profileStrength)} className="text-sm px-3">
                  {data.profileStrength}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm max-w-md">
                Your LinkedIn profile scores <strong>{data.overallScore}/100</strong>.
                {data.overallScore < 60 && " There are several key improvements that can significantly boost your visibility."}
                {data.overallScore >= 60 && data.overallScore < 80 && " You're on the right track — a few targeted improvements will make a real difference."}
                {data.overallScore >= 80 && " Strong profile! Focus on the remaining gaps to reach All-Star status."}
              </p>
              <Button variant="outline" size="sm" onClick={() => setResult(null)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Analyze another profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Section Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(data.breakdown) as (keyof SectionBreakdown)[]).map((key) => {
            const score = data.breakdown[key];
            const isExpanded = expandedSection === key;
            return (
              <div key={key} className="space-y-1">
                <button
                  className="w-full flex items-center gap-3 group"
                  onClick={() => setExpandedSection(isExpanded ? null : key)}
                >
                  <span className="text-sm font-medium w-40 text-left group-hover:text-primary transition-colors">
                    {SECTION_LABELS[key]}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", scoreBarColor(score))}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className={cn("text-sm font-bold w-8 text-right", scoreColor(score))}>{score}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-muted-foreground pl-[11.5rem] pb-2 pr-8">
                        {data.sectionFeedback[key]}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Missing elements */}
      {data.missingElements.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" /> Missing from your profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.missingElements.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quick wins */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-green-600">
            <Zap className="w-4 h-4" /> Quick Wins
            <span className="text-xs font-normal text-muted-foreground ml-1">Under 10 mins each</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.quickWins.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Bigger improvements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Deeper Improvements
          </CardTitle>
          <CardDescription>More effort, much bigger impact on visibility and inbound leads</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.biggerImprovements.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* AI suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Headline suggestion */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Suggested Headline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium leading-snug">{data.headlineSuggestion}</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 w-full"
              onClick={() => copyToClipboard(data.headlineSuggestion, "headline")}
            >
              {copiedField === "headline" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copiedField === "headline" ? "Copied!" : "Copy headline"}
            </Button>
          </CardContent>
        </Card>

        {/* About suggestion */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Suggested About Opening
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed">{data.aboutSuggestion}</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 w-full"
              onClick={() => copyToClipboard(data.aboutSuggestion, "about")}
            >
              {copiedField === "about" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copiedField === "about" ? "Copied!" : "Copy opening"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={() => setResult(null)}>
        <ArrowLeft className="w-4 h-4" /> Analyze another profile
      </Button>
    </motion.div>
  );

  // ── Page ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">LinkedIn Profile Analyzer</h1>
              <p className="text-sm text-muted-foreground">Score your profile and get specific, AI-powered improvements</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {result ? (
            <ResultsView key="results" data={result} />
          ) : (
            <InputForm key="form" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
