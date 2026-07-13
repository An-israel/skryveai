import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, X, Sparkles, Lock, ArrowRight } from "lucide-react";
import { useEntitlements } from "@/hooks/use-entitlements";

// How often Sonder nudges the user. Free users get pestered more often (it's an
// upsell for them); paid users just get the occasional friendly reminder.
const NUDGE_MS_PAID = 8 * 60 * 1000;   // 8 min
const NUDGE_MS_FREE = 3 * 60 * 1000;   // 3 min
const FIRST_NUDGE_MS = 12 * 1000;      // first appearance after page settles

export function SonderWidget() {
  const navigate = useNavigate();
  const { user, canUseSonder, loading } = useEntitlements();
  const [open, setOpen] = useState(false);   // bubble visible
  const [panel, setPanel] = useState(false); // full mini-panel expanded

  const firstName =
    (user?.user_metadata?.full_name || "").split(" ")[0] ||
    (user?.email ? user.email.split("@")[0] : "there");

  // Periodically pop the greeting bubble.
  const scheduleNudges = useCallback(() => {
    const interval = canUseSonder ? NUDGE_MS_PAID : NUDGE_MS_FREE;
    const first = setTimeout(() => setOpen(true), FIRST_NUDGE_MS);
    // Don't interrupt a panel the user has actively opened; otherwise nudge.
    const timer = setInterval(() => setPanel((p) => { if (!p) setOpen(true); return p; }), interval);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [canUseSonder]);

  useEffect(() => {
    if (!user) return;
    return scheduleNudges();
  }, [user, scheduleNudges]);

  if (loading || !user) return null;

  const goToSonder = () => {
    setOpen(false); setPanel(false);
    navigate("/sonder");
  };
  const goUpgrade = () => {
    setOpen(false); setPanel(false);
    navigate("/pricing");
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* Greeting bubble / mini-panel */}
      <AnimatePresence>
        {(open || panel) && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[300px] rounded-2xl shadow-2xl border border-border bg-background overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Moon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm leading-none">Sonder</p>
                <p className="text-[11px] text-white/70 mt-0.5">Your job-application agent</p>
              </div>
              <button onClick={() => { setOpen(false); setPanel(false); }} className="p-1 rounded-md hover:bg-white/15 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                Hi <span className="font-semibold">{firstName}</span> 👋 I'm <span className="font-semibold">Sonder</span>. I can apply
                for jobs for you while you sleep — you just review and submit each one in the morning.
              </p>

              {canUseSonder ? (
                <>
                  <p className="text-xs text-muted-foreground">Tell me when to start and I'll get to work tonight.</p>
                  <button
                    onClick={goToSonder}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:bg-primary/90 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" /> Let's start
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-2 text-xs">
                    <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Sonder is a Pro feature. Upgrade and I'll start applying for you tonight.</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={goUpgrade}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:bg-primary/90 transition-colors"
                    >
                      Upgrade <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={goToSonder}
                      className="rounded-lg border border-border text-sm font-medium py-2.5 px-3 hover:bg-muted transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setPanel((p) => !p); setOpen(false); }}
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_4px_24px_rgba(99,102,241,0.5)] flex items-center justify-center"
        title="Sonder — apply while you sleep"
      >
        <Moon className="w-6 h-6" />
        {!canUseSonder && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center">
            <Lock className="w-2.5 h-2.5" />
          </span>
        )}
        {/* Gentle pulse to draw the eye */}
        <span className="absolute inset-0 rounded-full animate-ping bg-indigo-500 opacity-20" />
      </motion.button>
    </div>
  );
}
