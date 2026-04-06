import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Briefcase, Phone, MessageSquare, ImageIcon, Gift, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const FREELANCING_SKILLS: { group: string; skills: string[] }[] = [
  {
    group: "Writing & Copywriting",
    skills: [
      "Copywriter", "Sales Copywriter", "Email Copywriter", "Ad Copywriter",
      "SEO Copywriter", "Content Writer", "Blog Writer", "Technical Writer",
      "Ghostwriter", "Scriptwriter", "Proofreader & Editor", "Translator",
    ],
  },
  {
    group: "Design & Visual",
    skills: [
      "Graphic Designer", "Logo Designer", "Brand Identity Designer", "Illustrator",
      "Infographic Designer", "UI/UX Designer", "Web Designer", "Mobile App Designer",
      "Social Media Designer", "Print Designer", "Packaging Designer",
      "Presentation Designer",
    ],
  },
  {
    group: "Video & Media",
    skills: [
      "Video Editor", "Videographer", "Motion Graphics Designer", "2D Animator",
      "3D Animator", "YouTube Manager", "Podcast Editor", "Voice-over Artist",
      "Photographer", "Photo Editor", "Product Photographer", "Real Estate Photographer",
    ],
  },
  {
    group: "Social Media & Content",
    skills: [
      "Social Media Manager", "Instagram Manager", "TikTok Manager",
      "LinkedIn Specialist", "Facebook Ads Manager", "Community Manager",
      "Influencer Marketing Manager", "Content Strategist", "Pinterest Manager",
      "YouTube Channel Manager",
    ],
  },
  {
    group: "Marketing & Growth",
    skills: [
      "Digital Marketer", "Email Marketing Specialist", "Marketing Strategist",
      "Google Ads Specialist", "Media Buyer", "PPC Specialist", "Funnel Builder",
      "Conversion Rate Optimizer", "Growth Hacker", "Affiliate Marketer",
      "PR Specialist", "Press Release Writer",
    ],
  },
  {
    group: "SEO & Analytics",
    skills: [
      "SEO Specialist", "Technical SEO", "Link Building Specialist",
      "Local SEO Expert", "Data Analyst", "Market Researcher",
      "Business Intelligence Analyst", "Google Analytics Specialist",
    ],
  },
  {
    group: "Web & Tech",
    skills: [
      "Web Developer", "Frontend Developer", "Backend Developer",
      "Full-Stack Developer", "WordPress Developer", "Shopify Developer",
      "Webflow Developer", "No-Code Developer", "Mobile App Developer",
      "React Developer", "API Developer", "Automation Specialist",
    ],
  },
  {
    group: "Business & Consulting",
    skills: [
      "Business Consultant", "Startup Consultant", "Strategy Consultant",
      "Project Manager", "Operations Manager", "Virtual Assistant",
      "Executive Assistant", "Sales Consultant", "Lead Generation Specialist",
      "CRM Specialist", "HR Consultant", "Recruiter", "Talent Acquisition Specialist",
      "Financial Analyst", "Bookkeeper", "Accountant",
    ],
  },
  {
    group: "E-commerce",
    skills: [
      "E-commerce Manager", "Amazon FBA Consultant", "Dropshipping Consultant",
      "Shopify Store Manager", "Product Listing Specialist",
    ],
  },
];

const CTA_OPTIONS = [
  {
    value: "reply",
    label: "Reply to this message",
    icon: MessageSquare,
    description: "Ask a simple yes/no question they can answer easily",
  },
  {
    value: "book_call",
    label: "Book a call",
    icon: Phone,
    description: "Ask them to schedule a short call with you",
  },
  {
    value: "portfolio",
    label: "Check out my portfolio",
    icon: ImageIcon,
    description: "Send them to your work samples or case studies",
  },
  {
    value: "free_audit",
    label: "Offer a free audit or mockup",
    icon: Gift,
    description: "Give them a no-strings sample of your work",
  },
  {
    value: "custom",
    label: "Custom CTA",
    icon: Sparkles,
    description: "Write your own call-to-action",
  },
];

interface ExpertiseStepProps {
  onProceed: (expertise: string, cta: string) => void;
  onBack: () => void;
}

export function ExpertiseStep({ onProceed, onBack }: ExpertiseStepProps) {
  const [selectedSkill, setSelectedSkill] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [selectedCta, setSelectedCta] = useState("reply");
  const [customCta, setCustomCta] = useState("");

  const expertise = selectedSkill === "custom" ? customSkill.trim() : selectedSkill;
  const ctaLabel =
    selectedCta === "custom"
      ? customCta.trim()
      : CTA_OPTIONS.find((o) => o.value === selectedCta)?.label || "Reply to this message";

  const isReady =
    expertise.length > 0 &&
    (selectedCta !== "custom" || customCta.trim().length > 0);

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
            <Briefcase className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">What's your expertise?</CardTitle>
          <CardDescription className="text-base">
            Be specific — the analysis and email pitch will be tailored entirely to your skill set.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-7">
          {/* Skill Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Your skill / expertise for this campaign</Label>
            <Select value={selectedSkill} onValueChange={setSelectedSkill}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select your skill..." />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {FREELANCING_SKILLS.map((group) => (
                  <SelectGroup key={group.group}>
                    <SelectLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-wide py-1.5">
                      {group.group}
                    </SelectLabel>
                    {group.skills.map((skill) => (
                      <SelectItem key={skill} value={skill}>
                        {skill}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-wide py-1.5">
                    Other
                  </SelectLabel>
                  <SelectItem value="custom">Other / Custom skill...</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {selectedSkill === "custom" && (
              <Input
                placeholder="e.g., Brand Strategist, Notion Consultant, E-learning Developer..."
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                className="h-11"
                maxLength={100}
                autoFocus
              />
            )}
          </div>

          {/* CTA Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              What do you want the reader to do after reading the email?
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {CTA_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedCta(option.value)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                      selectedCta === option.value
                        ? "border-primary bg-primary/8 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:bg-muted/40"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        selectedCta === option.value ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium leading-none text-foreground">
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCta === "custom" && (
              <Input
                placeholder="e.g., DM me on Instagram, Download my rate card..."
                value={customCta}
                onChange={(e) => setCustomCta(e.target.value)}
                className="h-11"
                maxLength={200}
                autoFocus
              />
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" size="lg" onClick={onBack} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!isReady}
              onClick={() => onProceed(expertise, ctaLabel)}
            >
              <Sparkles className="w-5 h-5" />
              Proceed with Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
