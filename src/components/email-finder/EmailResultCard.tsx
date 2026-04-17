import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Sparkles, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddToCampaignDialog } from "./AddToCampaignDialog";

export interface EmailFinderResult {
  email: string | null;
  confidence: number;
  status: string;
  emailVerified: boolean;
  emailConfidence: "high" | "medium" | "low";
  emailSource: "scrape" | "pattern" | "generic" | "cache" | "none";
  employerDomain: string | null;
  sources: { type: string; url?: string; pattern?: string; found_at: string }[];
  jobTitle?: string;
  patternUsed?: string;
}

const sourceLabel: Record<string, string> = {
  scrape: "Website scrape",
  pattern: "Pattern match",
  generic: "Generic guess",
  cache: "Cached pattern",
};

interface Props {
  result: EmailFinderResult;
  onAddToCampaign?: (email: string) => void;
}

export function EmailResultCard({ result, onAddToCampaign }: Props) {
  const [copied, setCopied] = useState(false);

  if (!result.email) {
    return (
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <p className="font-semibold">No email found</p>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn't discover a valid email for{" "}
                <span className="font-mono">{result.employerDomain || "this domain"}</span>.
                Try providing a different website, exact domain, or person's name.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidenceColor =
    result.confidence >= 85
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
      : result.confidence >= 65
      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
      : "bg-orange-500/10 text-orange-500 border-orange-500/30";

  const handleCopy = async () => {
    if (!result.email) return;
    await navigator.clipboard.writeText(result.email);
    setCopied(true);
    toast.success("Email copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6 space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Email Found
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-mono text-lg sm:text-xl font-semibold break-all">{result.email}</p>
              {result.emailVerified ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>
            {result.jobTitle && (
              <p className="text-sm text-muted-foreground">{result.jobTitle}</p>
            )}
          </div>
          <Badge variant="outline" className={cn("font-semibold", confidenceColor)}>
            {result.confidence}% confidence
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1">
            <p className="text-muted-foreground">Confidence</p>
            <p className="font-medium capitalize">{result.emailConfidence}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Source</p>
            <p className="font-medium">{sourceLabel[result.emailSource] || result.emailSource}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Verified</p>
            <p className="font-medium">{result.emailVerified ? "Yes" : "No"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Domain</p>
            <p className="font-medium font-mono truncate">{result.employerDomain}</p>
          </div>
        </div>

        {result.sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sources</p>
            <div className="flex flex-wrap gap-2">
              {result.sources.map((s, idx) => (
                <Badge key={idx} variant="secondary" className="font-normal">
                  {sourceLabel[s.type] || s.type}
                  {s.pattern && <span className="ml-1 font-mono opacity-70">({s.pattern})</span>}
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleCopy} variant="default" className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            {copied ? "Copied!" : "Copy Email"}
          </Button>
          {onAddToCampaign && (
            <Button onClick={() => onAddToCampaign(result.email!)} variant="outline" className="flex-1">
              Add to Campaign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
