import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Search, FileText, Linkedin, BarChart3, BookOpen, Zap } from "lucide-react";
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
    { icon: Search,    title: "Find clients with Smart Find",    description: "Use your skills to discover businesses that need exactly what you offer.",  to: "/campaigns/new" },
    { icon: Bot,       title: "Run AutoPilot",                   description: "Let AI find and pitch clients for you every day automatically.",           to: "/auto-pilot" },
    { icon: BarChart3, title: "Check your ATS score",            description: "See how well your CV passes automated screening systems.",                   to: "/ats-checker", variant: "outline" },
  ],
  cv_builder_scratch: [
    { icon: BarChart3, title: "Check your ATS score",            description: "See how recruiters and bots score your new CV.",                            to: "/ats-checker" },
    { icon: Linkedin,  title: "Optimise your LinkedIn profile",  description: "Make your profile match the strength of your new CV.",                      to: "/linkedin-analyzer" },
    { icon: Search,    title: "Find clients with Smart Find",    description: "Start landing clients using your newly documented skills.",                  to: "/campaigns/new", variant: "outline" },
  ],
  ats_checker: [
    { icon: FileText,  title: "Improve your CV",                 description: "Use the AI CV Builder to fix the issues and boost your score.",              to: "/cv-builder" },
    { icon: Search,    title: "Find clients with Smart Find",    description: "Even while polishing your CV, start discovering potential clients now.",    to: "/campaigns/new" },
    { icon: Bot,       title: "Run AutoPilot",                   description: "Set AI to find and reach out to clients on your behalf daily.",              to: "/auto-pilot", variant: "outline" },
  ],
  linkedin_analyzer: [
    { icon: Search,    title: "Find clients with Smart Find",    description: "Clients are out there — let AI find businesses that need your service.",    to: "/campaigns/new" },
    { icon: Bot,       title: "Run AutoPilot",                   description: "Automate your client outreach and never miss an opportunity.",               to: "/auto-pilot" },
    { icon: FileText,  title: "Build or improve your CV",        description: "A strong CV complements a great LinkedIn profile.",                          to: "/cv-builder", variant: "outline" },
  ],
  learn_hub: [
    { icon: FileText,  title: "Build your professional CV",      description: "Turn your new skills into a CV that impresses clients and employers.",       to: "/cv-builder" },
    { icon: Search,    title: "Find clients with Smart Find",    description: "Start finding businesses that need the skill you just learned.",             to: "/campaigns/new" },
    { icon: Bot,       title: "Run AutoPilot",                   description: "Put client acquisition on autopilot while you keep learning.",               to: "/auto-pilot", variant: "outline" },
  ],
  smart_find: [
    { icon: Bot,       title: "Run AutoPilot",                   description: "Let AI pitch to these businesses for you automatically every day.",          to: "/auto-pilot" },
    { icon: FileText,  title: "Build your CV",                   description: "A great CV helps when clients want to see your background.",                 to: "/cv-builder" },
    { icon: BookOpen,  title: "Learn a new skill",               description: "Add another skill to expand the clients you can serve.",                     to: "/tools/learn", variant: "outline" },
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
