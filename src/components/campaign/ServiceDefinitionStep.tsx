import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Target, MapPin, ArrowLeft, ArrowRight, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SIGNAL_LABELS, ALL_SIGNALS, type ServiceDefinition } from "@/types/smartFind";
import { LocationsInput } from "@/components/ui/locations-input";

interface ServiceDefinitionStepProps {
  expertise: string;
  onProceed: (definition: ServiceDefinition, locations: string[]) => void;
  onBack: () => void;
}

export function ServiceDefinitionStep({ expertise, onProceed, onBack }: ServiceDefinitionStepProps) {
  const { toast } = useToast();
  const [rawDescription, setRawDescription] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [definition, setDefinition] = useState<ServiceDefinition | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeService = async () => {
    if (!rawDescription.trim() || rawDescription.trim().length < 20) {
      toast({ title: "Tell us more", description: "Describe your service in at least 20 characters.", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("build-service-definition", {
        body: { rawDescription: rawDescription.trim(), expertise },
      });
      if (error) throw error;
      if (!data) throw new Error("No response");

      setDefinition({
        rawDescription: data.rawDescription,
        industryVertical: data.industryVertical,
        targetProfile: data.targetProfile,
        signalsToDetect: data.signalsToDetect || [],
      });
      toast({ title: "Analyzed!", description: "Review and adjust the criteria below, then run smart search." });
    } catch (err) {
      toast({
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Try rephrasing your service description.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSignal = (signal: string) => {
    if (!definition) return;
    const has = definition.signalsToDetect.includes(signal);
    setDefinition({
      ...definition,
      signalsToDetect: has
        ? definition.signalsToDetect.filter((s) => s !== signal)
        : [...definition.signalsToDetect, signal],
    });
  };

  const handleSubmit = () => {
    if (!definition) return;
    if (locations.length === 0) {
      toast({ title: "Add at least one location", description: "Where should we look for businesses?", variant: "destructive" });
      return;
    }
    if (definition.signalsToDetect.length === 0) {
      toast({ title: "Pick at least one signal", description: "We need criteria to score need.", variant: "destructive" });
      return;
    }
    onProceed(definition, locations);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto">
      <Card className="border-0 shadow-xl bg-gradient-card">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow">
            <Target className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Smart Find: Describe What You Solve</CardTitle>
          <CardDescription className="text-base">
            We'll find businesses showing pain signals that match your service — no more random outreach.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="service-desc" className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 text-primary" /> What problem do you solve, and for whom?
            </Label>
            <Textarea
              id="service-desc"
              value={rawDescription}
              onChange={(e) => setRawDescription(e.target.value)}
              placeholder="e.g. I help Shopify e-commerce stores fix their checkout conversion rates. I rebuild slow, multi-step checkouts into one-page flows with trust badges and clear shipping costs."
              rows={4}
              maxLength={1000}
              className="resize-none text-base"
            />
            <p className="text-xs text-muted-foreground">{rawDescription.length}/1000 — be specific about the problem and the type of business</p>
          </div>

          {!definition && (
            <Button onClick={analyzeService} disabled={isAnalyzing || !rawDescription.trim()} size="lg" className="w-full">
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing your service...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Analyze with AI
                </>
              )}
            </Button>
          )}

          {definition && (
            <>
              <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Target Industry</p>
                  <p className="font-medium">{definition.industryVertical}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Ideal Profile</p>
                  <p className="text-sm text-foreground/80">{definition.targetProfile}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locations" className="flex items-center gap-2 font-semibold">
                  <MapPin className="w-4 h-4 text-primary" /> Where to look
                </Label>
                <LocationsInput
                  id="locations"
                  values={locations}
                  onChange={setLocations}
                  placeholder="e.g., Lagos, Nigeria"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Pain signals to detect</Label>
                  <Badge variant="secondary">{definition.signalsToDetect.length} selected</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI will scan each business's website for these signs of need. Toggle any to refine.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-3 rounded-xl border bg-muted/30">
                  {ALL_SIGNALS.map((signal) => {
                    const checked = definition.signalsToDetect.includes(signal);
                    return (
                      <label
                        key={signal}
                        className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          checked ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/60"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSignal(signal)}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-tight">{SIGNAL_LABELS[signal]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="lg" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={handleSubmit} size="lg" className="flex-1" disabled={locations.length === 0 || definition.signalsToDetect.length === 0}>
                  <Sparkles className="w-5 h-5" /> Find Qualified Leads
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {!definition && (
            <Button variant="ghost" onClick={onBack} className="w-full">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
