import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Step {
  key: string;
  label: string;
  description: string;
  to: string;
  cta: string;
}

const STEPS: Step[] = [
  { key: "cv",        label: "Build your CV",               description: "Create a professional ATS-ready CV",             to: "/cv-builder",       cta: "Build CV" },
  { key: "ats",       label: "Check your ATS score",        description: "See how your CV scores on recruiting systems",    to: "/ats-checker",      cta: "Check Score" },
  { key: "linkedin",  label: "Optimise your LinkedIn",      description: "Get a detailed LinkedIn profile analysis",         to: "/linkedin-analyzer", cta: "Analyse Profile" },
  { key: "campaign",  label: "Create your first campaign",  description: "Find businesses and send your first pitch",        to: "/campaigns/new",    cta: "Start Campaign" },
  { key: "autopilot", label: "Set up AutoPilot",            description: "Let AI find and pitch clients for you daily",      to: "/auto-pilot",       cta: "Set Up AutoPilot" },
];

interface SetupChecklistProps {
  userId: string;
}

export function SetupChecklist({ userId }: SetupChecklistProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const key = `setup_checklist_dismissed_${userId}`;
    if (localStorage.getItem(key) === "true") { setDismissed(true); setLoading(false); return; }

    async function check() {
      const [toolUsage, campaigns, autopilot] = await Promise.all([
        supabase.from("tool_usage").select("tool_name").eq("user_id", userId),
        supabase.from("campaigns").select("id").eq("user_id", userId).limit(1),
        supabase.from("autopilot_configs").select("id").eq("user_id", userId).limit(1),
      ]);

      const tools = new Set((toolUsage.data || []).map((t: any) => t.tool_name));
      setCompleted({
        cv:        tools.has("cv_builder"),
        ats:       tools.has("ats_checker"),
        linkedin:  tools.has("linkedin_analyzer"),
        campaign:  (campaigns.data?.length || 0) > 0,
        autopilot: (autopilot.data?.length || 0) > 0,
      });
      setLoading(false);
    }
    check();
  }, [userId]);

  const dismiss = () => {
    localStorage.setItem(`setup_checklist_dismissed_${userId}`, "true");
    setDismissed(true);
  };

  if (loading || dismissed) return null;

  const doneCount = Object.values(completed).filter(Boolean).length;
  const total = STEPS.length;
  if (doneCount === total) return null; // all done, hide

  const pct = Math.round((doneCount / total) * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-base">Get started with SkryveAI</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{doneCount} of {total} steps complete</p>
          </div>
          <button onClick={dismiss} className="p-1 rounded-full hover:bg-muted transition-colors ml-4">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <Progress value={pct} className="h-1.5 mb-4" />

        <div className="space-y-2">
          {STEPS.map((step) => {
            const done = completed[step.key];
            return (
              <div key={step.key} className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${done ? "opacity-50" : "bg-background border border-border hover:border-primary/40"}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>{step.label}</p>
                    {!done && <p className="text-xs text-muted-foreground truncate">{step.description}</p>}
                  </div>
                </div>
                {!done && (
                  <Button size="sm" variant="outline" className="shrink-0 ml-3 h-7 text-xs" onClick={() => navigate(step.to)}>
                    {step.cta} <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
