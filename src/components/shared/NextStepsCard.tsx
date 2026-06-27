import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Search, FileText, Linkedin, BarChart3, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
  to: string;
  variant?: "default" | "outline";
}

const STEPS: Record<string, Step[]> = {
  cv_builder_optimize: [
    { icon: Search,    title: "Browse remote jobs",             description: "Find fresh roles matched to your skills and apply directly.",               to: "/jobs" },
    { icon: Briefcase, title: "Complete your profile",          description: "A complete profile helps clients find and hire you.",                       to: "/profile" },
    { icon: BarChart3, title: "Check your ATS score",           description: "See how well your CV passes automated screening systems.",                  to: "/ats-checker", variant: "outline" },
  ],
  cv_builder_scratch: [
    { icon: BarChart3, title: "Check your ATS score",           description: "See how recruiters and bots score your new CV.",                            to: "/ats-checker" },
    { icon: Linkedin,  title: "Optimise your LinkedIn profile", description: "Make your profile match the strength of your new CV.",                      to: "/linkedin-analyzer" },
    { icon: Search,    title: "Browse remote jobs",             description: "Put your new CV to work — apply to fresh roles today.",                     to: "/jobs", variant: "outline" },
  ],
  ats_checker: [
    { icon: FileText,  title: "Improve your CV",                description: "Use the AI CV Builder to fix the issues and boost your score.",             to: "/cv-builder" },
    { icon: Search,    title: "Browse remote jobs",             description: "Start applying to fresh roles matched to your skills.",                     to: "/jobs" },
    { icon: Briefcase, title: "Complete your profile",          description: "Stand out to clients browsing for talent like you.",                        to: "/profile", variant: "outline" },
  ],
  linkedin_analyzer: [
    { icon: Search,    title: "Browse remote jobs",             description: "Fresh roles from across the web, matched to your skills.",                  to: "/jobs" },
    { icon: Briefcase, title: "Complete your profile",          description: "A strong profile helps clients find and hire you.",                         to: "/profile" },
    { icon: FileText,  title: "Build or improve your CV",       description: "A strong CV complements a great LinkedIn profile.",                         to: "/cv-builder", variant: "outline" },
  ],
  learn_hub: [
    { icon: FileText,  title: "Build your professional CV",     description: "Turn your new skills into a CV that impresses clients and employers.",      to: "/cv-builder" },
    { icon: Search,    title: "Browse remote jobs",             description: "Find roles that need the skill you just learned.",                          to: "/jobs" },
    { icon: Briefcase, title: "Complete your profile",          description: "Showcase your new skills so clients can find you.",                         to: "/profile", variant: "outline" },
  ],
  smart_find: [
    { icon: Search,    title: "Browse remote jobs",             description: "Apply directly to fresh remote roles from across the web.",                 to: "/jobs" },
    { icon: FileText,  title: "Build your CV",                  description: "A great CV helps when clients want to see your background.",                to: "/cv-builder" },
    { icon: BookOpen,  title: "Learn a new skill",              description: "Add another skill to widen the jobs you can land.",                         to: "/learn", variant: "outline" },
  ],
};

interface NextStepsCardProps {
  context: keyof typeof STEPS;
}

export function NextStepsCard({ context }: NextStepsCardProps) {
  const navigate = useNavigate();
  const steps = STEPS[context];
  if (!steps) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-8 rounded-2xl border border-border bg-muted/30 p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">What's next?</p>
      <h3 className="text-lg font-semibold mb-4">Keep the momentum going</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <button
            key={step.to}
            onClick={() => navigate(step.to)}
            className="group text-left rounded-xl border border-border bg-background p-4 hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2 group-hover:bg-primary/15 transition-colors">
              <step.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-semibold leading-snug mb-1">{step.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            <span className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Go <ArrowRight className="w-3 h-3" />
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
