import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Linkedin,
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
  User,
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

interface AnalysisResult {
  overallScore: number;
  grade: string;
  profileStrength: string;
  breakdown: SectionBreakdown;
  sectionFeedback: Record<keyof SectionBreakdown, string>;
  quickWins: string[];
  biggerImprovements: string[];
  missingElements: string[];
  headlineSuggestion: string;
  aboutSuggestion: string;
  profileName?: string;
  profileHeadline?: string;
  profilePicUrl?: string;
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return "text-green-500";
  if (s >= 60) return "text-yellow-500";
  if (s >= 40) return "text-orange-500";
  return "text-red-500";
}
function barColor(s: number) {
  if (s >= 80) return "bg-green-500";
  if (s >= 60) return "bg-yellow-500";
  if (s >= 40) return "bg-orange-500";
  return "bg-red-500";
}
function gradeColor(g: string) {
  if (g.startsWith("A")) return "text-green-500";
  if (g.startsWith("B")) return "text-blue-500";
  if (g.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LinkedInAnalyzer() {
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!session) {
      toast({ title: "Please log in first", variant: "destructive" });
      return;
    }
    const url = linkedinUrl.trim();
    if (!url || !url.includes("linkedin.com/in/")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a LinkedIn profile URL (e.g. https://linkedin.com/in/yourname)",
        variant: "destructive",
      });
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-linkedin", {
        body: { linkedinUrl: url, targetRole: targetRole.trim() || undefined },
      });
      if (error) throw new Error(error.message || "Analysis failed");
      if (data?.error) throw new Error(data.error);
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

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ─── Input form ─────────────────────────────────────────────────────────────
  const InputForm = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyze a LinkedIn Profile</CardTitle>
          <CardDescription>
            Paste any public LinkedIn profile URL. We'll fetch the profile data and give you a full score with specific improvements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* LinkedIn URL */}
          <div className="space-y-1.5">
            <Label>LinkedIn Profile URL <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0A66C2]" />
              <Input
                className="pl-9"
                placeholder="https://linkedin.com/in/yourname"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
              />
            </div>
            <p className="text-xs text-muted-foreground">The profile must be set to public on LinkedIn</p>
          </div>

          {/* Target role (optional) */}
          <div className="space-y-1.5">
            <Label>
              Target Role <span className="text-muted-foreground text-xs">(optional — makes the analysis more specific)</span>
            </Label>
            <Input
              placeholder="e.g. Senior UX Designer, Freelance Copywriter, Marketing Manager"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
            />
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !linkedinUrl.trim()}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Fetching & analyzing profile…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Analyze Profile
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* How it works note */}
      <div className="flex gap-3 bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <p>
          This tool reads the profile data directly from LinkedIn. Make sure the profile is set to <strong>public</strong> —
          otherwise it won't be accessible.
        </p>
      </div>
    </motion.div>
  );

  // ─── Results ─────────────────────────────────────────────────────────────────
  const ResultsView = ({ data }: { data: AnalysisResult }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Profile + score header */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              {data.profilePicUrl ? (
                <img src={data.profilePicUrl} alt={data.profileName ?? ""} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            <ScoreRing score={data.overallScore} />

            <div className="text-center sm:text-left space-y-2 flex-1">
              {data.profileName && (
                <p className="font-semibold text-lg leading-tight">{data.profileName}</p>
              )}
              {data.profileHeadline && (
                <p className="text-sm text-muted-foreground leading-snug">{data.profileHeadline}</p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                <span className={cn("text-2xl font-bold", gradeColor(data.grade))}>{data.grade}</span>
                <Badge variant={data.profileStrength === "All-Star" || data.profileStrength === "Expert" ? "default" : "secondary"}>
                  {data.profileStrength}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                {data.overallScore < 60 && "Several key improvements can significantly boost visibility."}
                {data.overallScore >= 60 && data.overallScore < 80 && "On the right track — targeted improvements will make a real difference."}
                {data.overallScore >= 80 && "Strong profile! A few final tweaks to reach All-Star status."}
              </p>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setResult(null)}>
                <ArrowLeft className="w-4 h-4" /> Analyze another
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Section Scores</CardTitle>
          <CardDescription>Click any section to see detailed feedback</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(data.breakdown) as (keyof SectionBreakdown)[]).map((key) => {
            const score = data.breakdown[key];
            const open = expandedSection === key;
            return (
              <div key={key} className="space-y-1">
                <button className="w-full flex items-center gap-3 group" onClick={() => setExpandedSection(open ? null : key)}>
                  <span className="text-sm font-medium w-44 text-left shrink-0 group-hover:text-primary transition-colors">
                    {SECTION_LABELS[key]}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", barColor(score))}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className={cn("text-sm font-bold w-8 text-right shrink-0", scoreColor(score))}>{score}</span>
                  {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden text-sm text-muted-foreground pl-[11.5rem] pb-2 pr-8"
                    >
                      {data.sectionFeedback[key]}
                    </motion.p>
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
                  <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />{item}
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
            <span className="text-xs font-normal text-muted-foreground">Under 10 mins each</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.quickWins.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />{item}
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
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Suggested Headline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium leading-snug">{data.headlineSuggestion}</p>
            <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => copyText(data.headlineSuggestion, "headline")}>
              {copiedField === "headline" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copiedField === "headline" ? "Copied!" : "Copy headline"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Suggested About Opening
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed">{data.aboutSuggestion}</p>
            <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => copyText(data.aboutSuggestion, "about")}>
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

  // ─── Page ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">LinkedIn Profile Analyzer</h1>
              <p className="text-sm text-muted-foreground">Score your profile and get AI-powered, specific improvements</p>
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
