import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Globe, Building2, Sparkles, Share2, Linkedin, Instagram, Facebook } from "lucide-react";

interface DirectClientStepProps {
  onSubmit: (businessName: string, website: string, socialOnly?: boolean, socialHandles?: { linkedin?: string; instagram?: string; facebook?: string }) => void;
  isLoading?: boolean;
}

export function DirectClientStep({ onSubmit, isLoading }: DirectClientStepProps) {
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [socialOnly, setSocialOnly] = useState(false);
  const [socialHandles, setSocialHandles] = useState({
    linkedin: "",
    instagram: "",
    facebook: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;

    if (socialOnly) {
      const handles = {
        linkedin: socialHandles.linkedin.trim() || undefined,
        instagram: socialHandles.instagram.trim() || undefined,
        facebook: socialHandles.facebook.trim() || undefined,
      };
      const hasAnyHandle = handles.linkedin || handles.instagram || handles.facebook;
      if (!hasAnyHandle) return;
      onSubmit(businessName.trim(), "", true, handles);
    } else {
      if (!website.trim()) return;
      onSubmit(businessName.trim(), website.trim());
    }
  };

  const hasValidInput = socialOnly
    ? businessName.trim() && (socialHandles.linkedin.trim() || socialHandles.instagram.trim() || socialHandles.facebook.trim())
    : businessName.trim() && website.trim();

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
            Enter your client's details. We'll analyze their online presence and craft the perfect pitch.
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

            {/* Social-only toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Social Media Only</p>
                  <p className="text-xs text-muted-foreground">Analyze only their social handles, skip website</p>
                </div>
              </div>
              <Switch checked={socialOnly} onCheckedChange={setSocialOnly} />
            </div>

            {!socialOnly ? (
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
            ) : (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
                <p className="text-sm font-medium text-muted-foreground">Enter at least one social handle</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-5 h-5 text-[#0077B5] shrink-0" />
                    <Input
                      placeholder="LinkedIn company page or username"
                      value={socialHandles.linkedin}
                      onChange={(e) => setSocialHandles(prev => ({ ...prev, linkedin: e.target.value }))}
                      className="h-10"
                      maxLength={200}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Instagram className="w-5 h-5 text-[#E4405F] shrink-0" />
                    <Input
                      placeholder="Instagram username (without @)"
                      value={socialHandles.instagram}
                      onChange={(e) => setSocialHandles(prev => ({ ...prev, instagram: e.target.value }))}
                      className="h-10"
                      maxLength={200}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-[#1877F2] shrink-0" />
                    <Input
                      placeholder="Facebook page name or URL"
                      value={socialHandles.facebook}
                      onChange={(e) => setSocialHandles(prev => ({ ...prev, facebook: e.target.value }))}
                      className="h-10"
                      maxLength={200}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={!hasValidInput || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {socialOnly ? "Analyze Social Profiles" : "Analyze & Generate Pitch"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
