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
  Gauge
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
  seo: Search,
  copywriting: FileText,
  design: Palette,
  social: Share2,
  cta: MousePointer,
  performance: Gauge,
};

const severityColors: Record<string, string> = {
  low: "bg-info/10 text-info border-info/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};

function IssueCard({ issue }: { issue: AnalysisIssue }) {
  const Icon = categoryIcons[issue.category] || AlertTriangle;
  
  return (
    <div className={`p-3 rounded-lg border ${severityColors[issue.severity]}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium text-sm">{issue.title}</div>
          <div className="text-xs mt-1 opacity-80">{issue.description}</div>
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
        <h2 className="text-2xl font-bold">Website Analysis</h2>
        <p className="text-muted-foreground mt-2">
          Our AI will analyze each business website to identify opportunities and craft personalized pitches.
        </p>
      </div>

      {!hasStarted ? (
        <Card className="p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
          <p className="text-muted-foreground text-sm mb-6">
            We'll scan {businesses.length} websites for SEO issues, copywriting problems, design flaws, and more.
          </p>
          <Button onClick={onStartAnalysis} size="lg">
            Start Analysis
          </Button>
        </Card>
      ) : (
        <>
          {isAnalyzing && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="font-medium">
                    Analyzing: {currentBusiness || "..."}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {analyzedCount} / {businesses.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {businesses.map((business) => {
              const analysis = analyses[business.id];
              const isAnalyzed = analysis?.analyzed;
              
              return (
                <Card key={business.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{business.name}</h3>
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Issues Found</span>
                        <Badge variant={analysis.issues.length > 3 ? "destructive" : analysis.issues.length > 1 ? "secondary" : "default"}>
                          {analysis.issues.length} issues
                        </Badge>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {analysis.issues.slice(0, 3).map((issue, i) => (
                          <IssueCard key={i} issue={issue} />
                        ))}
                        {analysis.issues.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            +{analysis.issues.length - 3} more issues
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

      <div className="flex items-center justify-between pt-4 border-t">
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
