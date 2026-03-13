import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle,
  Search,
  FileText,
  Palette,
  Share2,
  MousePointer,
  Gauge,
  Linkedin,
  Instagram,
  Facebook,
  PenLine
} from "lucide-react";
import type { Business, WebsiteAnalysis, AnalysisIssue } from "@/types/campaign";

interface AnalyzeStepProps {
  businesses: Business[];
  analyses: Record<string, WebsiteAnalysis>;
  isAnalyzing: boolean;
  progress: number;
  currentBusiness?: string;
  onStartAnalysis: () => void;
  onContinue: () => void;
  onBack: () => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  website_copy: PenLine,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  branding: Palette,
  cta: MousePointer,
  seo: Search,
  copywriting: FileText,
  design: Palette,
  social: Share2,
  performance: Gauge,
};

const severityConfig: Record<string, { border: string; bg: string; text: string; label: string }> = {
  low: { border: "border-l-info", bg: "bg-info/5", text: "text-info", label: "Low" },
  medium: { border: "border-l-warning", bg: "bg-warning/5", text: "text-warning", label: "Medium" },
  high: { border: "border-l-destructive", bg: "bg-destructive/5", text: "text-destructive", label: "High" },
};

function IssueCard({ issue }: { issue: AnalysisIssue }) {
  const Icon = categoryIcons[issue.category] || AlertTriangle;
  const config = severityConfig[issue.severity] || severityConfig.medium;
  
  return (
    <div className={`p-3 rounded-lg border border-border-subtle ${config.border} border-l-[3px] ${config.bg} transition-all duration-200 hover:shadow-sm`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm">{issue.title}</div>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.text} border-current/20 shrink-0`}>
              {config.label}
            </Badge>
          </div>
          <div className="text-xs mt-1 text-muted-foreground leading-relaxed">{issue.description}</div>
        </div>
      </div>
    </div>
  );
}

export function AnalyzeStep({
  businesses,
  analyses,
  isAnalyzing,
  progress,
  currentBusiness,
  onStartAnalysis,
  onContinue,
  onBack,
}: AnalyzeStepProps) {
  const analyzedCount = Object.values(analyses).filter((a) => a.analyzed).length;
  const hasStarted = isAnalyzing || analyzedCount > 0;
  const isComplete = analyzedCount === businesses.length && !isAnalyzing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center max-w-xl mx-auto">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Full Online Presence Audit</h2>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          Our AI will audit each business's website copy, LinkedIn, Instagram, Facebook, and branding to find high-impact pain points.
        </p>
      </div>

      {!hasStarted ? (
        <Card className="p-8 text-center max-w-md mx-auto border-border-subtle">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/8 flex items-center justify-center">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display text-lg font-bold mb-2">Ready to Audit</h3>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            We'll analyze {businesses.length} businesses — their website copy, LinkedIn, Instagram, Facebook, and overall branding to find real problems costing them money.
          </p>
          <Button onClick={onStartAnalysis} size="lg">
            Start Analysis
          </Button>
        </Card>
      ) : (
        <>
          {isAnalyzing && (
            <Card className="p-6 border-border-subtle">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                  <span className="font-semibold text-sm">
                    Analyzing: {currentBusiness || "..."}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">
                  {analyzedCount}/{businesses.length}
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {businesses.map((business) => {
              const analysis = analyses[business.id];
              const isAnalyzed = analysis?.analyzed;
              const highCount = isAnalyzed ? analysis.issues.filter(i => i.severity === 'high').length : 0;
              
              return (
                <Card key={business.id} className="p-5 border-border-subtle transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display font-bold">{business.name}</h3>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {business.website || "No website"}
                      </p>
                    </div>
                    {isAnalyzed ? (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    ) : currentBusiness === business.name ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted shrink-0" />
                    )}
                  </div>
                  
                  {isAnalyzed && analysis && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant={highCount > 0 ? "destructive" : analysis.issues.length > 1 ? "secondary" : "default"} className="text-xs">
                          {analysis.issues.length} issues
                        </Badge>
                        {highCount > 0 && (
                          <span className="text-xs text-destructive font-medium">{highCount} critical</span>
                        )}
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {analysis.issues.slice(0, 4).map((issue, i) => (
                          <IssueCard key={i} issue={issue} />
                        ))}
                        {analysis.issues.length > 4 && (
                          <p className="text-xs text-muted-foreground text-center py-1.5 font-medium">
                            +{analysis.issues.length - 4} more issues
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <Button variant="outline" onClick={onBack} disabled={isAnalyzing}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!isComplete} size="lg">
          Generate Pitches
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
