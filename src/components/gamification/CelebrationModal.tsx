// The celebration moment: confetti, a big headline, points animating up,
// a shareable card, and a momentum-chain CTA into the next valuable action.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Share2, X } from "lucide-react";
import { Confetti } from "./Confetti";
import { BadgeIcon } from "./BadgeIcon";
import { Button } from "@/components/ui/button";
import type { GamAchievement, BadgeTier } from "@/lib/gamification/api";

/** Every celebration points at the next valuable step (never dead-end a high). */
function momentumFor(a: GamAchievement): { label: string; to: string } {
  const t = a.type;
  if (t === "level_up") return { label: "See jobs that match your new status", to: "/jobs" };
  if (t === "streak_milestone") return { label: "Keep it going — apply to a job", to: "/jobs" };
  const code = (a.metadata?.code as string) || "";
  if (code === "course_complete") return { label: "You can now apply to these jobs", to: "/jobs" };
  if (code === "first_client") return { label: "Keep the momentum — new jobs match you", to: "/jobs" };
  if (code === "five_star") return { label: "Your profile just got stronger — see matches", to: "/jobs" };
  if (code === "profile_complete") return { label: "Start applying — clients can see you now", to: "/jobs" };
  return { label: "Keep the momentum going", to: "/dashboard" };
}

function useCountUp(target: number, run: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run || target <= 0) { setN(target); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

export function CelebrationModal({
  achievement, onClose,
}: {
  achievement: GamAchievement | null;
  onClose: () => void;
}) {
  const points = useCountUp(achievement?.points_awarded ?? 0, !!achievement);
  const open = !!achievement;

  async function share() {
    if (!achievement) return;
    const text = `${achievement.title} on Skryve! 🎉`;
    const url = "https://skryve.io";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "Skryve", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch { /* user cancelled */ }
  }

  if (!achievement) return null;
  const tier = (achievement.metadata?.tier as BadgeTier) || "gold";
  const icon = (achievement.metadata?.icon as string) || null;
  const momentum = momentumFor(achievement);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Confetti fire />
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl"
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              className="mx-auto mb-5"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 12 }}
            >
              <BadgeIcon icon={icon} tier={tier} size="lg" className="mx-auto" />
            </motion.div>

            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1">
              {achievement.type === "level_up" ? "Level up" :
               achievement.type === "streak_milestone" ? "Streak milestone" :
               achievement.type === "badge" ? "Badge unlocked" : "Achievement"}
            </p>
            <h2 className="text-xl font-bold text-foreground leading-tight">{achievement.title}</h2>
            {achievement.description && (
              <p className="mt-2 text-[13px] text-muted-foreground">{achievement.description}</p>
            )}

            {achievement.points_awarded > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-mono text-sm font-semibold text-primary">
                +{points} pts
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <Button asChild className="w-full" onClick={onClose}>
                <Link to={momentum.to}>
                  {momentum.label} <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={share}>
                  <Share2 className="w-4 h-4 mr-1.5" /> Share this
                </Button>
                <Button variant="ghost" className="flex-1" onClick={onClose}>
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
