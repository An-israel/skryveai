import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, AlertTriangle, ExternalLink, Globe, MapPin, Star, TrendingUp } from "lucide-react";
import type { SmartScoredBusiness } from "@/types/smartFind";

interface NeedScoredResultsStepProps {
  businesses: SmartScoredBusiness[];
  onSelect: (selected: SmartScoredBusiness[]) => void;
  onBack: () => void;
  maxSelect?: number;
}

function scoreLabel(score: number): { label: string; tone: string } {
  if (score >= 75) return { label: "HIGH NEED", tone: "bg-destructive/15 text-destructive border-destructive/40" };
  if (score >= 55) return { label: "MEDIUM NEED", tone: "bg-warning/15 text-warning border-warning/40" };
  return { label: "LOW NEED", tone: "bg-muted text-muted-foreground border-border" };
}

export function NeedScoredResultsStep({ businesses, onSelect, onBack, maxSelect = 10 }: NeedScoredResultsStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxSelect) next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const top = businesses.slice(0, maxSelect).map((b) => b.id);
    setSelectedIds(new Set(top));
  };
  const clearAll = () => setSelectedIds(new Set());

  const handleProceed = () => {
    const selected = businesses.filter((b) => selectedIds.has(b.id)).map((b) => ({ ...b, selected: true }));
    onSelect(selected);
  };

  if (businesses.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
            <CardTitle>No qualified leads found</CardTitle>
            <CardDescription>
              No businesses in this search showed strong signs of needing your service. Try a different location or rephrase your service description.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onBack} className="w-full">
              <ArrowLeft className="w-4 h-4" /> Try a different search
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-5xl mx-auto">
      <Card className="border-0 shadow-xl bg-gradient-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                {businesses.length} Qualified Leads Found
              </CardTitle>
              <CardDescription>
                Each scored 0–100 on how badly they need your service. Pick up to {maxSelect} for deep analysis.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select Top {maxSelect}</Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <Badge variant="secondary">{selectedIds.size} / {maxSelect} selected</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {businesses.map((biz) => {
            const checked = selectedIds.has(biz.id);
            const { label, tone } = scoreLabel(biz.needScore);
            return (
              <motion.div
                key={biz.id}
                whileHover={{ scale: 1.005 }}
                onClick={() => toggle(biz.id)}
                className={`group cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  checked ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox checked={checked} onCheckedChange={() => toggle(biz.id)} className="mt-1" onClick={(e) => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-base truncate">{biz.name}</h3>
                      <Badge className={`${tone} font-bold`}>
                        {biz.needScore}/100 · {label}
                      </Badge>
                      {biz.rating && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 fill-warning text-warning" /> {biz.rating} ({biz.reviewCount})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                      {biz.address && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {biz.address.length > 60 ? biz.address.substring(0, 60) + "…" : biz.address}
                        </span>
                      )}
                      {biz.website && (
                        <a
                          href={biz.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          <Globe className="w-3 h-3" /> Visit site <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {biz.problemsFound.length > 0 && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/40 border border-border-subtle">
                        <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-warning" /> Problems found:
                        </p>
                        <ul className="space-y-1">
                          {biz.problemsFound.slice(0, 4).map((p, i) => (
                            <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-background/95 backdrop-blur -mx-6 px-6 py-3 border-t">
            <Button variant="outline" size="lg" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={handleProceed} disabled={selectedIds.size === 0} size="lg" className="flex-1">
              Continue with {selectedIds.size} {selectedIds.size === 1 ? "lead" : "leads"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
