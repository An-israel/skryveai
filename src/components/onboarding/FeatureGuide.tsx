import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";

export interface GuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface FeatureGuideProps {
  featureKey: string;
  steps: GuideStep[];
  /** If true, always show the trigger button even after completion */
  alwaysShowTrigger?: boolean;
}

const GUIDE_PREFIX = "skryve_guide_seen_";

export function FeatureGuide({ featureKey, steps, alwaysShowTrigger = true }: FeatureGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeen, setHasSeen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`${GUIDE_PREFIX}${featureKey}`);
    if (seen === "true") {
      setHasSeen(true);
    } else {
      // Auto-open on first visit
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [featureKey]);

  const markSeen = () => {
    localStorage.setItem(`${GUIDE_PREFIX}${featureKey}`, "true");
    setHasSeen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentStep(0);
    markSeen();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleOpen = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Floating help button */}
      {alwaysShowTrigger && !isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-20 right-6 z-[90]"
        >
          <Button
            size="icon"
            variant="outline"
            className="rounded-full w-10 h-10 shadow-lg bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
            onClick={handleOpen}
            title="How to use this feature"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        </motion.div>
      )}

      {/* Guide modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-foreground/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md mx-4 mb-4 sm:mb-0"
            >
              <Card className="border-2 border-primary/30 shadow-2xl">
                <CardContent className="pt-6 pb-5 px-6">
                  {/* Close */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={handleClose}
                  >
                    <X className="w-4 h-4" />
                  </Button>

                  {/* Progress */}
                  <div className="w-full h-1 bg-muted rounded-full mb-5">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Step counter */}
                  <div className="text-xs text-muted-foreground mb-4 font-medium">
                    Step {currentStep + 1} of {steps.length}
                  </div>

                  {/* Content */}
                  <div className="flex items-start gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                      className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
                    >
                      {step.icon}
                    </motion.div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-base leading-tight mb-1.5">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Dots */}
                  <div className="flex justify-center gap-1.5 mt-5">
                    {steps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentStep(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentStep
                            ? "bg-primary w-5"
                            : i < currentStep
                            ? "bg-primary/40"
                            : "bg-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Nav */}
                  <div className="flex gap-2 mt-5">
                    {currentStep > 0 && (
                      <Button variant="outline" size="sm" onClick={handlePrev} className="flex-1">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                    )}
                    <Button size="sm" onClick={handleNext} className={currentStep === 0 ? "w-full" : "flex-1"}>
                      {currentStep === steps.length - 1 ? "Got it!" : (
                        <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
                      )}
                    </Button>
                  </div>

                  {currentStep === 0 && steps.length > 1 && (
                    <button
                      onClick={handleClose}
                      className="w-full mt-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Skip guide
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
