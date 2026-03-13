import { motion } from "framer-motion";
import { Check, Search, Users, BarChart3, FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignStep } from "@/types/campaign";
import type { CampaignType } from "@/components/campaign/CampaignTypeSelector";

interface StepIndicatorProps {
  currentStep: CampaignStep;
  completedSteps: CampaignStep[];
  campaignType?: CampaignType | null;
}

const allSteps: { id: CampaignStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "search", label: "Search", icon: Search },
  { id: "select", label: "Select", icon: Users },
  { id: "analyze", label: "Analyze", icon: BarChart3 },
  { id: "pitch", label: "Pitch", icon: FileText },
  { id: "send", label: "Send", icon: Send },
];

export function StepIndicator({ currentStep, completedSteps, campaignType }: StepIndicatorProps) {
  // Investor flow skips the analyze step; job_application flow relabels steps
  const steps = campaignType === "investor"
    ? allSteps.filter(s => s.id !== "analyze")
    : campaignType === "job_application"
    ? allSteps.filter(s => s.id !== "analyze").map(s => {
        if (s.id === "search") return { ...s, label: "Search Jobs" };
        if (s.id === "select") return { ...s, label: "Select" };
        if (s.id === "pitch") return { ...s, label: "Applications" };
        if (s.id === "send") return { ...s, label: "Send" };
        return s;
      })
    : allSteps;
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-3xl mx-auto px-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                    backgroundColor: isCompleted
                      ? "hsl(var(--success))"
                      : isCurrent
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted))",
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isCompleted || isCurrent ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </motion.div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isCurrent ? "text-primary" : isCompleted ? "text-success" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 bg-muted relative">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width: index < currentIndex || isCompleted ? "100%" : "0%",
                    }}
                    className="absolute inset-y-0 left-0 bg-success"
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
