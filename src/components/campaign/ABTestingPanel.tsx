import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  FlaskConical, 
  Shuffle, 
  BarChart3, 
  Lightbulb,
  Plus,
  Trash2,
  Eye,
  MessageSquare
} from "lucide-react";

export interface ABTestVariant {
  id: string;
  name: string;
  subject: string;
  openingLine?: string;
  weight: number;
}

export interface ABTestSettings {
  enabled: boolean;
  variants: ABTestVariant[];
  testSize: number; // percentage of recipients for testing
  winnerCriteria: "opens" | "replies" | "clicks";
  autoSelectWinner: boolean;
  testDuration: number; // hours before selecting winner
}

interface ABTestingPanelProps {
  settings: ABTestSettings;
  onChange: (settings: ABTestSettings) => void;
  baseSubject: string;
  baseBody: string;
}

const DEFAULT_VARIANT: Omit<ABTestVariant, "id"> = {
  name: "Variant",
  subject: "",
  openingLine: "",
  weight: 50,
};

export function ABTestingPanel({ 
  settings, 
  onChange, 
  baseSubject,
  baseBody 
}: ABTestingPanelProps) {
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  const updateSettings = (updates: Partial<ABTestSettings>) => {
    onChange({ ...settings, ...updates });
  };

  const addVariant = () => {
    const newVariant: ABTestVariant = {
      ...DEFAULT_VARIANT,
      id: `variant-${Date.now()}`,
      name: `Variant ${String.fromCharCode(65 + settings.variants.length)}`,
      subject: baseSubject,
    };
    
    // Redistribute weights evenly
    const newVariants = [...settings.variants, newVariant];
    const evenWeight = Math.floor(100 / newVariants.length);
    const updatedVariants = newVariants.map((v, i) => ({
      ...v,
      weight: i === newVariants.length - 1 
        ? 100 - (evenWeight * (newVariants.length - 1)) 
        : evenWeight
    }));
    
    updateSettings({ variants: updatedVariants });
  };

  const removeVariant = (id: string) => {
    const newVariants = settings.variants.filter(v => v.id !== id);
    
    // Redistribute weights
    if (newVariants.length > 0) {
      const evenWeight = Math.floor(100 / newVariants.length);
      const updatedVariants = newVariants.map((v, i) => ({
        ...v,
        weight: i === newVariants.length - 1 
          ? 100 - (evenWeight * (newVariants.length - 1)) 
          : evenWeight
      }));
      updateSettings({ variants: updatedVariants });
    } else {
      updateSettings({ variants: [] });
    }
  };

  const updateVariant = (id: string, updates: Partial<ABTestVariant>) => {
    const updatedVariants = settings.variants.map(v => 
      v.id === id ? { ...v, ...updates } : v
    );
    updateSettings({ variants: updatedVariants });
  };

  const generateVariation = (variantId: string) => {
    // Simple variation generator - in production, could use AI
    const variations = [
      { prefix: "Quick question about", suffix: "" },
      { prefix: "I noticed something about", suffix: " - can I help?" },
      { prefix: "Regarding", suffix: " - opportunity inside" },
      { prefix: "Your", suffix: " could be better" },
      { prefix: "A thought on", suffix: "" },
    ];
    
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    const basePart = baseSubject.replace(/^(Quick question about|I noticed|Regarding|Your|A thought on)\s*/i, "");
    const newSubject = `${randomVariation.prefix} ${basePart}${randomVariation.suffix}`;
    
    updateVariant(variantId, { subject: newSubject.trim() });
  };

  if (!settings.enabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <FlaskConical className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">A/B Testing</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Test different subject lines and opening messages to see what resonates best with your audience.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              const initialVariants: ABTestVariant[] = [
                { id: "control", name: "Control (A)", subject: baseSubject, weight: 50 },
                { id: "variant-b", name: "Variant B", subject: baseSubject, weight: 50 },
              ];
              updateSettings({ enabled: true, variants: initialVariants });
            }}
          >
            <FlaskConical className="w-4 h-4 mr-2" />
            Enable A/B Testing
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              A/B Testing
              <Badge variant="secondary" className="ml-2">Active</Badge>
            </CardTitle>
            <CardDescription>
              {settings.variants.length} variants competing for best performance
            </CardDescription>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => updateSettings({ enabled })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variants */}
        <div className="space-y-4">
          {settings.variants.map((variant, index) => (
            <div 
              key={variant.id}
              className={`p-4 rounded-lg border ${
                index === 0 ? "bg-primary/5 border-primary/30" : "bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    {variant.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {variant.weight}% of recipients
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateVariation(variant.id)}
                    title="Generate variation"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                  {settings.variants.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(variant.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Line</Label>
                  <Input
                    value={variant.subject}
                    onChange={(e) => updateVariant(variant.id, { subject: e.target.value })}
                    placeholder="Enter subject line..."
                    className="text-sm"
                  />
                </div>

                {expandedVariant === variant.id && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Opening Line (Optional)</Label>
                    <Textarea
                      value={variant.openingLine || ""}
                      onChange={(e) => updateVariant(variant.id, { openingLine: e.target.value })}
                      placeholder="Customize the opening line..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedVariant(
                    expandedVariant === variant.id ? null : variant.id
                  )}
                  className="text-xs"
                >
                  {expandedVariant === variant.id ? "Less options" : "More options"}
                </Button>
              </div>
            </div>
          ))}

          {settings.variants.length < 4 && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={addVariant}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Variant
            </Button>
          )}
        </div>

        {/* Test Configuration */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Test Size</Label>
              <span className="text-sm text-muted-foreground">{settings.testSize}%</span>
            </div>
            <Slider
              value={[settings.testSize]}
              onValueChange={([value]) => updateSettings({ testSize: value })}
              min={10}
              max={100}
              step={10}
            />
            <p className="text-xs text-muted-foreground">
              {settings.testSize}% of recipients will be part of the A/B test
            </p>
          </div>

          <div className="space-y-2">
            <Label>Winner Selection Criteria</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "opens", label: "Open Rate", icon: Eye },
                { value: "replies", label: "Reply Rate", icon: MessageSquare },
                { value: "clicks", label: "Click Rate", icon: BarChart3 },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.winnerCriteria === option.value ? "default" : "outline"}
                  size="sm"
                  className="flex-col h-auto py-3"
                  onClick={() => updateSettings({ 
                    winnerCriteria: option.value as ABTestSettings["winnerCriteria"] 
                  })}
                >
                  <option.icon className="w-4 h-4 mb-1" />
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-select Winner</Label>
              <p className="text-xs text-muted-foreground">
                Automatically send winning variant to remaining recipients
              </p>
            </div>
            <Switch
              checked={settings.autoSelectWinner}
              onCheckedChange={(checked) => updateSettings({ autoSelectWinner: checked })}
            />
          </div>

          {settings.autoSelectWinner && (
            <div className="space-y-2 pl-4">
              <Label className="text-xs">Test Duration (hours)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[settings.testDuration]}
                  onValueChange={([value]) => updateSettings({ testDuration: value })}
                  min={1}
                  max={48}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm w-12">{settings.testDuration}h</span>
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="p-4 rounded-lg bg-info/10 border border-info/30">
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 text-info shrink-0" />
            <div className="text-sm">
              <strong>Pro tips:</strong>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• Test one variable at a time for clearer results</li>
                <li>• Questions in subject lines often increase opens</li>
                <li>• Personalization (name, company) boosts engagement</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
