import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Briefcase, FileText, DollarSign, Target, Sparkles } from "lucide-react";

interface InvestorSearchStepProps {
  onSubmit: (data: InvestorPitchData) => void;
  isLoading?: boolean;
}

export interface InvestorPitchData {
  industry: string;
  businessName: string;
  businessDescription: string;
  fundingAmount: string;
  traction: string;
  useOfFunds: string;
}

const popularIndustries = [
  "Technology",
  "Healthcare",
  "FinTech",
  "E-Commerce",
  "SaaS",
  "Clean Energy",
  "Real Estate",
  "Education",
];

export function InvestorSearchStep({ onSubmit, isLoading }: InvestorSearchStepProps) {
  const [formData, setFormData] = useState<InvestorPitchData>({
    industry: "",
    businessName: "",
    businessDescription: "",
    fundingAmount: "",
    traction: "",
    useOfFunds: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.industry.trim() && formData.businessName.trim() && formData.businessDescription.trim()) {
      onSubmit(formData);
    }
  };

  const updateField = (field: keyof InvestorPitchData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = formData.industry.trim() && formData.businessName.trim() && formData.businessDescription.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="border-0 shadow-xl bg-gradient-card">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow">
            <TrendingUp className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Find Investors</CardTitle>
          <CardDescription className="text-base">
            Tell us about your business and the kind of investors you're looking for. We'll find them and craft compelling pitch emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="industry" className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Investor Industry / Niche
              </Label>
              <Input
                id="industry"
                placeholder="e.g., Technology, Healthcare, FinTech"
                value={formData.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                className="h-12 text-base"
                maxLength={100}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {popularIndustries.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => updateField("industry", ind)}
                    className="px-3 py-1 text-xs rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bizName" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                Your Business / Startup Name
              </Label>
              <Input
                id="bizName"
                placeholder="e.g., SkryveAI"
                value={formData.businessName}
                onChange={(e) => updateField("businessName", e.target.value)}
                className="h-12 text-base"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bizDesc" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                What does your business do?
              </Label>
              <Textarea
                id="bizDesc"
                placeholder="Describe your business, what problem it solves, who your target customers are, and what makes you unique..."
                value={formData.businessDescription}
                onChange={(e) => updateField("businessDescription", e.target.value)}
                className="min-h-[100px] text-base"
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="funding" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  Funding Amount
                </Label>
                <Input
                  id="funding"
                  placeholder="e.g., $500K, $2M"
                  value={formData.fundingAmount}
                  onChange={(e) => updateField("fundingAmount", e.target.value)}
                  className="h-11"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="useOfFunds" className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  Use of Funds
                </Label>
                <Input
                  id="useOfFunds"
                  placeholder="e.g., Product dev, Marketing"
                  value={formData.useOfFunds}
                  onChange={(e) => updateField("useOfFunds", e.target.value)}
                  className="h-11"
                  maxLength={200}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="traction" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Traction & Proof Points
              </Label>
              <Textarea
                id="traction"
                placeholder="Revenue numbers, user count, growth rate, partnerships, awards, press coverage, letters of intent..."
                value={formData.traction}
                onChange={(e) => updateField("traction", e.target.value)}
                className="min-h-[80px] text-base"
                maxLength={2000}
              />
            </div>

            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Finding Investors...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Find Investors in {formData.industry || "Your Industry"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
