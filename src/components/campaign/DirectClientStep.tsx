import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Globe, Building2, Sparkles } from "lucide-react";

interface DirectClientStepProps {
  onSubmit: (businessName: string, website: string) => void;
  isLoading?: boolean;
}

export function DirectClientStep({ onSubmit, isLoading }: DirectClientStepProps) {
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName.trim() && website.trim()) {
      onSubmit(businessName.trim(), website.trim());
    }
  };

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
            <UserPlus className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Pitch a Specific Client</CardTitle>
          <CardDescription className="text-base">
            Enter your client's business name and website. We'll analyze their online presence and craft the perfect pitch.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Client's Business Name
              </Label>
              <Input
                id="clientName"
                placeholder="e.g., Acme Corp, Joe's Bakery"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="h-12 text-base"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientWebsite" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Client's Website
              </Label>
              <Input
                id="clientWebsite"
                placeholder="e.g., acmecorp.com or https://acmecorp.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-12 text-base"
                maxLength={500}
              />
            </div>

            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={!businessName.trim() || !website.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze & Generate Pitch
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
