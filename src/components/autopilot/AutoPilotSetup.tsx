import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  Target,
  MapPin,
  Clock,
  Palette,
  Rocket,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location {
  country: string;
  cities: string[];
}

interface SetupData {
  expertise: {
    industry: string;
    services: string[];
    valueProp: string;
  };
  target_businesses: {
    types: string[];
    sizeRange: string;
    mustHaveWebsite: boolean;
    mustHaveInstagram: boolean;
  };
  locations: Location[];
  daily_quota: {
    emailsPerDay: number;
    sendingSchedule: {
      startHour: number;
      endHour: number;
      spreadThroughoutDay: boolean;
    };
  };
  email_style: {
    tone: string;
    length: string;
    ctaType: string;
  };
  compliance: Record<string, unknown>;
}

interface AutoPilotSetupProps {
  onComplete: () => void;
  onCancel?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Expertise", icon: Briefcase },
  { id: 2, label: "Targets", icon: Target },
  { id: 3, label: "Locations", icon: MapPin },
  { id: 4, label: "Limits", icon: Clock },
  { id: 5, label: "Email Style", icon: Palette },
  { id: 6, label: "Launch", icon: Rocket },
];

const COMMON_SERVICES = [
  "Web Design",
  "Copywriting",
  "SEO",
  "Social Media",
  "Photography",
  "Video Editing",
  "Branding",
  "Consulting",
  "Marketing",
  "Email Marketing",
  "Content Creation",
  "Graphic Design",
  "Logo Design",
  "UI/UX Design",
  "App Development",
];

const COMMON_BUSINESS_TYPES = [
  "Skincare brand",
  "Restaurant",
  "E-commerce store",
  "Salon",
  "Fitness studio",
  "Real estate agency",
  "Law firm",
  "Dental practice",
  "Accounting firm",
  "Tech startup",
  "Retail shop",
  "Coaching business",
  "Photography studio",
  "Event planner",
  "Non-profit",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Ghana",
  "Germany",
  "France",
  "Netherlands",
  "India",
  "Singapore",
  "UAE",
  "New Zealand",
];

const LOCATION_PRESETS: Record<string, Location[]> = {
  "US Only": [{ country: "United States", cities: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"] }],
  "Africa Focus": [
    { country: "South Africa", cities: ["Johannesburg", "Cape Town", "Durban"] },
    { country: "Nigeria", cities: ["Lagos", "Abuja"] },
    { country: "Kenya", cities: ["Nairobi", "Mombasa"] },
    { country: "Ghana", cities: ["Accra", "Kumasi"] },
  ],
  "Global English": [
    { country: "United States", cities: ["New York", "Los Angeles"] },
    { country: "United Kingdom", cities: ["London", "Manchester"] },
    { country: "Canada", cities: ["Toronto", "Vancouver"] },
    { country: "Australia", cities: ["Sydney", "Melbourne"] },
  ],
};

const START_HOURS = [6, 7, 8, 9, 10, 11, 12];
const END_HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AutoPilotSetup({ onComplete, onCancel }: AutoPilotSetupProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [campaignName, setCampaignName] = useState("Campaign 1");

  const [data, setData] = useState<SetupData>({
    expertise: { industry: "", services: [], valueProp: "" },
    target_businesses: {
      types: [],
      sizeRange: "Any",
      mustHaveWebsite: false,
      mustHaveInstagram: false,
    },
    locations: [],
    daily_quota: {
      emailsPerDay: 500,
      sendingSchedule: { startHour: 8, endHour: 20, spreadThroughoutDay: true },
    },
    email_style: { tone: "Professional", length: "Medium", ctaType: "Book a Call" },
    compliance: {},
  });

  // ── Tag input helpers ──────────────────────────────────────────────────────
  const [customService, setCustomService] = useState("");
  const [customBizType, setCustomBizType] = useState("");

  const toggleTag = (field: "services" | "types", value: string) => {
    if (field === "services") {
      setData((d) => ({
        ...d,
        expertise: {
          ...d.expertise,
          services: d.expertise.services.includes(value)
            ? d.expertise.services.filter((s) => s !== value)
            : [...d.expertise.services, value],
        },
      }));
    } else {
      setData((d) => ({
        ...d,
        target_businesses: {
          ...d.target_businesses,
          types: d.target_businesses.types.includes(value)
            ? d.target_businesses.types.filter((s) => s !== value)
            : [...d.target_businesses.types, value],
        },
      }));
    }
  };

  const addCustomTag = (field: "services" | "types") => {
    const val = field === "services" ? customService.trim() : customBizType.trim();
    if (!val) return;
    toggleTag(field, val);
    if (field === "services") setCustomService("");
    else setCustomBizType("");
  };

  // ── Location helpers ───────────────────────────────────────────────────────
  const [newCountry, setNewCountry] = useState("");
  const [newCity, setNewCity] = useState("");

  const addLocation = () => {
    if (!newCountry) return;
    const cities = newCity ? newCity.split(",").map((c) => c.trim()).filter(Boolean) : [];
    setData((d) => ({
      ...d,
      locations: [...d.locations, { country: newCountry, cities }],
    }));
    setNewCountry("");
    setNewCity("");
  };

  const removeLocation = (idx: number) => {
    setData((d) => ({
      ...d,
      locations: d.locations.filter((_, i) => i !== idx),
    }));
  };

  const applyPreset = (preset: string) => {
    setData((d) => ({ ...d, locations: LOCATION_PRESETS[preset] ?? d.locations }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleLaunch = async () => {
    if (!session) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("autopilot_configs")
        .insert({
          user_id: session.user.id,
          name: campaignName.trim() || "Campaign 1",
          is_active: true,
          expertise: data.expertise,
          target_businesses: data.target_businesses,
          locations: data.locations,
          daily_quota: data.daily_quota,
          email_style: data.email_style,
          compliance: data.compliance,
          updated_at: new Date().toISOString(),
        });

      if (error) throw new Error(error.message || "Failed to save config");

      toast({ title: "Auto-Pilot launched!", description: "Your campaign is now active." });
      onComplete();
    } catch (err) {
      console.error(err);
      toast({
        title: "Launch failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return data.expertise.industry.trim().length > 0;
      case 2:
        return data.target_businesses.types.length > 0;
      case 3:
        return data.locations.length > 0;
      case 4:
        return data.daily_quota.emailsPerDay >= 10;
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
          <Rocket className="w-4 h-4" />
          Auto-Pilot Setup
        </div>
        <h1 className="text-3xl font-bold text-foreground">Set Up Your Auto-Pilot Agent</h1>
        <p className="text-muted-foreground">
          Configure your autonomous email outreach engine — it runs 24/7 while you focus on the work.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="w-full">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <motion.div
                    animate={{
                      backgroundColor: isCompleted
                        ? "hsl(var(--primary))"
                        : isCurrent
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted))",
                      scale: isCurrent ? 1.1 : 1,
                    }}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      isCurrent || isCompleted ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </motion.div>
                  <span
                    className={cn(
                      "text-xs font-medium hidden sm:block",
                      isCurrent ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="flex-1 mx-1 h-0.5 bg-muted relative overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: isCompleted ? "100%" : "0%" }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-y-0 left-0 bg-primary"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── Step 1: Expertise ─────────────────────────────────────────── */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Your Expertise
                </CardTitle>
                <CardDescription>Tell the agent what you do and who you help.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Industry / Niche *</Label>
                  <Input
                    placeholder="e.g. skincare, fitness, SaaS, e-commerce..."
                    value={data.expertise.industry}
                    onChange={(e) =>
                      setData((d) => ({ ...d, expertise: { ...d.expertise, industry: e.target.value } }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Services You Offer</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_SERVICES.map((s) => (
                      <Badge
                        key={s}
                        variant={data.expertise.services.includes(s) ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleTag("services", s)}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom service..."
                      value={customService}
                      onChange={(e) => setCustomService(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTag("services")}
                    />
                    <Button variant="outline" size="sm" onClick={() => addCustomTag("services")}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {data.expertise.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.expertise.services.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => toggleTag("services", s)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Value Proposition</Label>
                  <Textarea
                    placeholder="What unique value do you bring? e.g. 'I help skincare brands get 3x more sales with high-converting website copy.'"
                    rows={3}
                    value={data.expertise.valueProp}
                    onChange={(e) =>
                      setData((d) => ({ ...d, expertise: { ...d.expertise, valueProp: e.target.value } }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Target Businesses ─────────────────────────────────── */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Target Businesses
                </CardTitle>
                <CardDescription>Who should the agent reach out to?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Business Types *</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_BUSINESS_TYPES.map((b) => (
                      <Badge
                        key={b}
                        variant={data.target_businesses.types.includes(b) ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleTag("types", b)}
                      >
                        {b}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom business type..."
                      value={customBizType}
                      onChange={(e) => setCustomBizType(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTag("types")}
                    />
                    <Button variant="outline" size="sm" onClick={() => addCustomTag("types")}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {data.target_businesses.types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.target_businesses.types.map((t) => (
                        <Badge key={t} variant="secondary" className="gap-1">
                          {t}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => toggleTag("types", t)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Business Size Range</Label>
                  <Select
                    value={data.target_businesses.sizeRange}
                    onValueChange={(v) =>
                      setData((d) => ({
                        ...d,
                        target_businesses: { ...d.target_businesses, sizeRange: v },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1–10 employees (micro)</SelectItem>
                      <SelectItem value="1-50">1–50 employees (small)</SelectItem>
                      <SelectItem value="1-200">1–200 employees (medium)</SelectItem>
                      <SelectItem value="Any">Any size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Must have a website</Label>
                      <p className="text-xs text-muted-foreground">
                        Only target businesses with an active website
                      </p>
                    </div>
                    <Switch
                      checked={data.target_businesses.mustHaveWebsite}
                      onCheckedChange={(v) =>
                        setData((d) => ({
                          ...d,
                          target_businesses: { ...d.target_businesses, mustHaveWebsite: v },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Must have Instagram</Label>
                      <p className="text-xs text-muted-foreground">
                        Only target businesses with an Instagram account
                      </p>
                    </div>
                    <Switch
                      checked={data.target_businesses.mustHaveInstagram}
                      onCheckedChange={(v) =>
                        setData((d) => ({
                          ...d,
                          target_businesses: { ...d.target_businesses, mustHaveInstagram: v },
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Locations ─────────────────────────────────────────── */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Target Locations
                </CardTitle>
                <CardDescription>Where should the agent look for clients?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Presets */}
                <div className="space-y-2">
                  <Label>Quick Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(LOCATION_PRESETS).map((preset) => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Add location */}
                <div className="space-y-2">
                  <Label>Add a Location</Label>
                  <div className="flex gap-2">
                    <Select value={newCountry} onValueChange={setNewCountry}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select country..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="flex-1"
                      placeholder="Cities (comma-separated)"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                    />
                    <Button variant="outline" onClick={addLocation} disabled={!newCountry}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Location list */}
                {data.locations.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Selected Locations</Label>
                    {data.locations.map((loc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{loc.country}</p>
                          {loc.cities.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {loc.cities.join(", ")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLocation(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No locations added yet. Use a preset or add one above.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Step 4: Daily Limits ──────────────────────────────────────── */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Daily Sending Limits
                </CardTitle>
                <CardDescription>Control how many emails the agent sends and when.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Emails per day</Label>
                    <span className="text-2xl font-bold text-primary">
                      {data.daily_quota.emailsPerDay.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    min={10}
                    max={2000}
                    step={10}
                    value={[data.daily_quota.emailsPerDay]}
                    onValueChange={([v]) =>
                      setData((d) => ({
                        ...d,
                        daily_quota: { ...d.daily_quota, emailsPerDay: v },
                      }))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10</span>
                    <span>500</span>
                    <span>1,000</span>
                    <span>2,000</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start sending at</Label>
                    <Select
                      value={String(data.daily_quota.sendingSchedule.startHour)}
                      onValueChange={(v) =>
                        setData((d) => ({
                          ...d,
                          daily_quota: {
                            ...d.daily_quota,
                            sendingSchedule: {
                              ...d.daily_quota.sendingSchedule,
                              startHour: Number(v),
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {START_HOURS.map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            {formatHour(h)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Stop sending at</Label>
                    <Select
                      value={String(data.daily_quota.sendingSchedule.endHour)}
                      onValueChange={(v) =>
                        setData((d) => ({
                          ...d,
                          daily_quota: {
                            ...d.daily_quota,
                            sendingSchedule: {
                              ...d.daily_quota.sendingSchedule,
                              endHour: Number(v),
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {END_HOURS.filter((h) => h > data.daily_quota.sendingSchedule.startHour).map(
                          (h) => (
                            <SelectItem key={h} value={String(h)}>
                              {formatHour(h)}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Spread throughout the day</Label>
                    <p className="text-xs text-muted-foreground">
                      Distribute emails evenly instead of sending all at once
                    </p>
                  </div>
                  <Switch
                    checked={data.daily_quota.sendingSchedule.spreadThroughoutDay}
                    onCheckedChange={(v) =>
                      setData((d) => ({
                        ...d,
                        daily_quota: {
                          ...d.daily_quota,
                          sendingSchedule: {
                            ...d.daily_quota.sendingSchedule,
                            spreadThroughoutDay: v,
                          },
                        },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 5: Email Style ───────────────────────────────────────── */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Email Style
                </CardTitle>
                <CardDescription>
                  How should the agent write your outreach emails?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {["Professional", "Friendly", "Casual", "Formal"].map((tone) => (
                      <Button
                        key={tone}
                        variant={data.email_style.tone === tone ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setData((d) => ({ ...d, email_style: { ...d.email_style, tone } }))
                        }
                      >
                        {tone}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email Length</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "Short", desc: "~100 words, punchy" },
                      { id: "Medium", desc: "~200 words, balanced" },
                      { id: "Long", desc: "~350 words, detailed" },
                    ].map(({ id, desc }) => (
                      <button
                        key={id}
                        onClick={() =>
                          setData((d) => ({ ...d, email_style: { ...d.email_style, length: id } }))
                        }
                        className={cn(
                          "flex flex-col items-center p-3 rounded-lg border text-sm transition-all",
                          data.email_style.length === id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="font-medium">{id}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Call to Action</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Book a Call", "Reply Email", "Visit Website"].map((cta) => (
                      <button
                        key={cta}
                        onClick={() =>
                          setData((d) => ({ ...d, email_style: { ...d.email_style, ctaType: cta } }))
                        }
                        className={cn(
                          "p-3 rounded-lg border text-sm font-medium transition-all",
                          data.email_style.ctaType === cta
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {cta}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 6: Review & Launch ───────────────────────────────────── */}
          {currentStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Review & Launch
                </CardTitle>
                <CardDescription>
                  Review your configuration and launch your auto-pilot agent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SummaryCard
                    icon={<Briefcase className="w-4 h-4" />}
                    title="Expertise"
                    items={[
                      `Industry: ${data.expertise.industry || "—"}`,
                      `Services: ${data.expertise.services.join(", ") || "—"}`,
                    ]}
                  />
                  <SummaryCard
                    icon={<Target className="w-4 h-4" />}
                    title="Target Businesses"
                    items={[
                      `Types: ${data.target_businesses.types.slice(0, 3).join(", ") || "—"}${data.target_businesses.types.length > 3 ? ` +${data.target_businesses.types.length - 3} more` : ""}`,
                      `Size: ${data.target_businesses.sizeRange}`,
                    ]}
                  />
                  <SummaryCard
                    icon={<MapPin className="w-4 h-4" />}
                    title="Locations"
                    items={data.locations.map((l) => `${l.country}${l.cities.length ? ` (${l.cities.slice(0, 2).join(", ")})` : ""}`).slice(0, 4)}
                  />
                  <SummaryCard
                    icon={<Clock className="w-4 h-4" />}
                    title="Daily Limits"
                    items={[
                      `${data.daily_quota.emailsPerDay.toLocaleString()} emails/day`,
                      `${formatHour(data.daily_quota.sendingSchedule.startHour)} – ${formatHour(data.daily_quota.sendingSchedule.endHour)}`,
                    ]}
                  />
                  <SummaryCard
                    icon={<Palette className="w-4 h-4" />}
                    title="Email Style"
                    items={[
                      `Tone: ${data.email_style.tone}`,
                      `Length: ${data.email_style.length}`,
                      `CTA: ${data.email_style.ctaType}`,
                    ]}
                  />
                </div>

                {/* Campaign name */}
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g. Skincare Brands UK"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">Give this campaign a name so you can identify it in the list.</p>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Before you launch:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Make sure your email settings are configured in Settings.</li>
                    <li>The agent runs every minute via a scheduled cron job.</li>
                    <li>You can pause anytime from the dashboard.</li>
                  </ul>
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleLaunch}
                  disabled={saving}
                >
                  {saving ? (
                    "Launching..."
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      Launch Auto-Pilot
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          {onCancel && currentStep === 1 && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
              Cancel
            </Button>
          )}
        </div>

        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {STEPS.length}
        </span>

        {currentStep < STEPS.length && (
          <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={!canProceed()}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
        {currentStep === STEPS.length && <div className="w-20" />}
      </div>
    </div>
  );
}

// ─── Summary Card sub-component ───────────────────────────────────────────────

function SummaryCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="border rounded-lg p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground truncate">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
