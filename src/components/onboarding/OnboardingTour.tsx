import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  BarChart3, 
  Send, 
  Settings,
  Sparkles
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: "center" | "top" | "bottom";
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Skryve! 🎉",
    description: "The freelance ecosystem where talent and clients meet. Let's take a quick tour to help you get started.",
    icon: <Sparkles className="w-8 h-8 text-primary" />,
    position: "center",
  },
  {
    id: "jobs",
    title: "Find Jobs",
    description: "Fresh remote jobs from across the web land in one feed every day. Apply directly, and let our AI write a tailored proposal for each one.",
    icon: <Search className="w-8 h-8 text-primary" />,
    position: "center",
  },
  {
    id: "marketplace",
    title: "Get Hired on the Marketplace",
    description: "Clients post projects and AI matches them with the right talent. Chat, accept offers, deliver work, and get paid securely.",
    icon: <Send className="w-8 h-8 text-primary" />,
    position: "center",
  },
  {
    id: "learn",
    title: "Learn & Grow",
    description: "Take courses with an AI coach, earn certificates, and explore events — then put your new skills straight to work.",
    icon: <BarChart3 className="w-8 h-8 text-primary" />,
    position: "center",
  },
  {
    id: "profile",
    title: "Set Up Your Profile",
    description: "Add your skills, portfolio, and CV so clients can find and hire you. A complete profile gets noticed first.",
    icon: <Settings className="w-8 h-8 text-primary" />,
    position: "center",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-sm"
        >
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-md mx-4"
          >
            <Card className="border-2 shadow-xl">
              <CardContent className="pt-6">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleSkip}
                >
                  <X className="w-4 h-4" />
                </Button>

                {/* Progress bar */}
                <div className="w-full h-1 bg-muted rounded-full mb-6">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Step content */}
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    {step.icon}
                  </motion.div>

                  <h2 className="text-xl font-bold">{step.title}</h2>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>

                {/* Step indicators */}
                <div className="flex justify-center gap-2 mt-6">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep
                          ? "bg-primary"
                          : index < currentStep
                          ? "bg-primary/50"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-3 mt-6">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="flex-1"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className={currentStep === 0 ? "w-full" : "flex-1"}
                  >
                    {currentStep === tourSteps.length - 1 ? (
                      "Get Started"
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Skip link */}
                {currentStep < tourSteps.length - 1 && (
                  <button
                    onClick={handleSkip}
                    className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip tour
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
