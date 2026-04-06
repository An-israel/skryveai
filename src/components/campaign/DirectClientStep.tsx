import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Globe, Building2, Sparkles, ChevronDown, ChevronUp, Linkedin, Instagram, Facebook } from "lucide-react";

export interface SocialHandles {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
}

interface DirectClientStepProps {
  onSubmit: (businessName: string, website: string, socialHandles?: SocialHandles) => void;
  isLoading?: boolean;
}

// TikTok and X/Twitter SVG icons (inline since not in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function DirectClientStep({ onSubmit, isLoading }: DirectClientStepProps) {
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [showSocial, setShowSocial] = useState(false);
  const [socialHandles, setSocialHandles] = useState<SocialHandles>({
    linkedin: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    twitter: "",
  });

  const hasAnySocial = Object.values(socialHandles).some((v) => v?.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    if (!website.trim() && !hasAnySocial) return;

    const handles: SocialHandles = {
      linkedin: socialHandles.linkedin?.trim() || undefined,
      instagram: socialHandles.instagram?.trim() || undefined,
      facebook: socialHandles.facebook?.trim() || undefined,
      tiktok: socialHandles.tiktok?.trim() || undefined,
      twitter: socialHandles.twitter?.trim() || undefined,
    };

    onSubmit(
      businessName.trim(),
      website.trim(),
      hasAnySocial ? handles : undefined
    );
  };

  const hasValidInput = businessName.trim() && (website.trim() || hasAnySocial);

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
            Enter the client's website and/or social profiles. We'll analyze everything together and craft a tailored pitch.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Business Name */}
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

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="clientWebsite" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Website URL
                <span className="text-xs text-muted-foreground font-normal">(optional if adding social profiles)</span>
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

            {/* Social Profiles Toggle */}
            <button
              type="button"
              onClick={() => setShowSocial((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-primary" />
                {hasAnySocial
                  ? `${Object.values(socialHandles).filter((v) => v?.trim()).length} social profile(s) added`
                  : "Add social profiles to analyze"}
                <span className="text-xs opacity-60">(LinkedIn, Instagram, TikTok, X...)</span>
              </span>
              {showSocial ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showSocial && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 p-4 rounded-xl border bg-muted/20"
              >
                <p className="text-xs text-muted-foreground">
                  Enter handles or full URLs. These will be scraped alongside the website for a combined analysis.
                </p>

                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-[#0077B5] shrink-0" />
                  <Input
                    placeholder="LinkedIn company page or /in/username"
                    value={socialHandles.linkedin}
                    onChange={(e) => setSocialHandles((p) => ({ ...p, linkedin: e.target.value }))}
                    className="h-10"
                    maxLength={200}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5 text-[#E4405F] shrink-0" />
                  <Input
                    placeholder="Instagram username (without @)"
                    value={socialHandles.instagram}
                    onChange={(e) => setSocialHandles((p) => ({ ...p, instagram: e.target.value }))}
                    className="h-10"
                    maxLength={200}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Facebook className="w-5 h-5 text-[#1877F2] shrink-0" />
                  <Input
                    placeholder="Facebook page name or URL"
                    value={socialHandles.facebook}
                    onChange={(e) => setSocialHandles((p) => ({ ...p, facebook: e.target.value }))}
                    className="h-10"
                    maxLength={200}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <TikTokIcon className="w-5 h-5 text-foreground shrink-0" />
                  <Input
                    placeholder="TikTok username (without @)"
                    value={socialHandles.tiktok}
                    onChange={(e) => setSocialHandles((p) => ({ ...p, tiktok: e.target.value }))}
                    className="h-10"
                    maxLength={200}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <XIcon className="w-5 h-5 text-foreground shrink-0" />
                  <Input
                    placeholder="X (Twitter) username (without @)"
                    value={socialHandles.twitter}
                    onChange={(e) => setSocialHandles((p) => ({ ...p, twitter: e.target.value }))}
                    className="h-10"
                    maxLength={200}
                  />
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              size="lg"
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
