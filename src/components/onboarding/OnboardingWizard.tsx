import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  Link as LinkIcon,
  Briefcase,
  User,
  Mail,
  ChevronRight,
  ChevronLeft,
  PartyPopper,
  Rocket,
  CheckCircle2,
  Loader2,
  X,
  Calendar,
  Star,
  Trophy,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";

import { ALL_SKILLS as EXPERTISE_OPTIONS } from "@/lib/skills";

interface OnboardingWizardProps {
  userId: string;
  userEmail: string;
  userName: string;
  onComplete: () => void;
}

const STEP_EMOJIS = ["📄", "🎯", "✍️", "🚀"];
const STEP_LABELS = ["Documents", "Expertise", "Bio", "Done!"];
const CELEBRATIONS = [
  "Great job! 🎉",
  "You're on fire! 🔥",
  "Almost there! ⚡",
  "Final step! 🏆",
  "You're all set! 🚀",
];

export function OnboardingWizard({ userId, userEmail, userName, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form data
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [uploadingCV, setUploadingCV] = useState(false);

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a PDF or Word document.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setUploadingCV(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/cv-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("cv-uploads").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("cv-uploads").getPublicUrl(fileName);
      setCvUrl(publicUrl);
      toast({ title: "CV uploaded! 📄", description: "Looking great!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingCV(false);
    }
  };

  const toggleExpertise = (skill: string) => {
    setExpertise((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      await supabase.from("profiles").upsert({
        user_id: userId,
        email: userEmail,
        full_name: userName,
        cv_url: cvUrl,
        portfolio_url: portfolioUrl || null,
        bio: bio || null,
        expertise,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      if (calendlyUrl) {
        await supabase.from("user_settings").upsert({
          user_id: userId,
          calendly_url: calendlyUrl || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    // Save progress at each step
    await saveProgress();

    if (step < 3) {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setStep(step + 1);
      }, 800);
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = async () => {
    await saveProgress();
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const progress = ((step + 1) / 4) * 100;

  const canProceed = () => {
    switch (step) {
      case 0: return true; // Documents optional
      case 1: return expertise.length > 0;
      case 2: return true; // Bio optional
      default: return true;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          {/* Celebration overlay */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 z-[101] flex items-center justify-center"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <PartyPopper className="w-16 h-16 text-primary mx-auto" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-primary-foreground mt-4"
                  >
                    {CELEBRATIONS[step]}
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-lg"
          >
            <Card className="border-2 shadow-2xl">
              <CardContent className="pt-6 pb-6">
                {/* Close / Skip */}
                <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleSkip}>
                  <X className="w-4 h-4" />
                </Button>

                {/* Step indicators */}
                <div className="flex items-center justify-between mb-2 px-2">
                  {STEP_LABELS.map((label, i) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                        i < step ? "bg-primary text-primary-foreground" :
                        i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i < step ? <CheckCircle2 className="w-4 h-4" /> : STEP_EMOJIS[i]}
                      </div>
                      <span className={`text-[10px] font-medium ${i === step ? "text-primary" : "text-muted-foreground"}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <Progress value={progress} className="h-1.5 mb-6" />

                {/* Step 0: Documents */}
                {step === 0 && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                          <FileText className="w-7 h-7 text-primary" />
                        </div>
                      </motion.div>
                      <h2 className="text-xl font-bold">Upload Your Documents</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your CV helps our AI craft better pitches for you
                      </p>
                    </div>

                    {/* CV Upload */}
                    <div className="border-2 border-dashed rounded-xl p-5 text-center transition-colors hover:border-primary/50">
                      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" />
                      {cvUrl ? (
                        <div className="space-y-2">
                          <CheckCircle2 className="w-10 h-10 mx-auto text-green-500" />
                          <p className="font-medium text-green-700 dark:text-green-400">CV uploaded ✓</p>
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingCV}>
                            Replace
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">PDF or Word, max 5MB</p>
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingCV}>
                            {uploadingCV ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload CV</>}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Portfolio URL */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Portfolio URL <span className="text-muted-foreground text-xs">(optional)</span>
                      </label>
                      <Input
                        type="url"
                        placeholder="https://yourportfolio.com"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                      />
                    </div>

                    {/* Calendly URL */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Calendly URL <span className="text-muted-foreground text-xs">(optional)</span>
                      </label>
                      <Input
                        type="url"
                        placeholder="https://calendly.com/you"
                        value={calendlyUrl}
                        onChange={(e) => setCalendlyUrl(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Step 1: Expertise */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                          <Briefcase className="w-7 h-7 text-primary" />
                        </div>
                      </motion.div>
                      <h2 className="text-xl font-bold">What Do You Do?</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Select the services you offer — this personalizes your job matches
                      </p>
                    </div>

                    <SearchableMultiSelect
                      options={EXPERTISE_OPTIONS}
                      selected={expertise}
                      onChange={setExpertise}
                      placeholder="Search for your skills..."
                      maxHeight="200px"
                    />
                  </div>
                )}

                {/* Step 2: Bio */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                          <User className="w-7 h-7 text-primary" />
                        </div>
                      </motion.div>
                      <h2 className="text-xl font-bold">Tell Us About You</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        A short bio helps clients and our AI matching get to know you
                      </p>
                    </div>

                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="I'm a web developer with 5 years of experience building modern websites and apps for small businesses..."
                      rows={5}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 Tip: Mention your experience, results you've achieved, and what makes you unique
                    </p>
                  </div>
                )}

                {/* Step 3: Done */}
                {step === 3 && (
                  <div className="space-y-5 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.6, type: "spring" }}
                    >
                      <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                        <Trophy className="w-10 h-10 text-primary" />
                      </div>
                    </motion.div>

                    <div>
                      <h2 className="text-2xl font-bold">You're All Set! 🎉</h2>
                      <p className="text-muted-foreground mt-2">
                        Your profile is ready. Start applying to jobs and let clients find you.
                      </p>
                    </div>

                    <div className="space-y-2 text-left">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className={`w-5 h-5 ${cvUrl ? "text-green-500" : "text-muted-foreground"}`} />
                        <span className="text-sm">{cvUrl ? "CV uploaded" : "CV — you can add later"}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className={`w-5 h-5 ${expertise.length > 0 ? "text-green-500" : "text-muted-foreground"}`} />
                        <span className="text-sm">{expertise.length > 0 ? `${expertise.length} skills selected` : "No skills — add in Settings"}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className={`w-5 h-5 ${bio ? "text-green-500" : "text-muted-foreground"}`} />
                        <span className="text-sm">{bio ? "Bio added" : "Bio — you can add later"}</span>
                      </div>
                    </div>

                    <Button onClick={handleFinish} size="lg" className="w-full gap-2" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                      Browse Jobs
                    </Button>
                  </div>
                )}

                {/* Navigation */}
                {step < 3 && (
                  <div className="flex gap-3 mt-6">
                    {step > 0 && (
                      <Button variant="outline" onClick={goBack} className="flex-1">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                    )}
                    <Button
                      onClick={goNext}
                      className={step === 0 ? "w-full" : "flex-1"}
                      disabled={!canProceed() || saving}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {step === 2 ? "Almost Done" : "Continue"}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Skip link */}
                {step < 3 && (
                  <button
                    onClick={handleSkip}
                    className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip for now — you can complete this in Settings
                  </button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
