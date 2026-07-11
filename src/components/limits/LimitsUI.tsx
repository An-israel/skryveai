// Generous, never-punishing limits UX (Build Spec Part 1, Prompt 3).
//  • RemainingCredits: a calm indicator that only appears when running low.
//  • LimitReachedCard: a warm nudge (never a wall) with a free "wait" path.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLimits, type ToolStatus } from "@/hooks/useLimits";

const LABEL: Record<string, string> = {
  proposals: "AI proposals",
  cv_builder: "AI CV rewrites",
  ats_checker: "ATS checks",
  learning_coach: "AI coach messages",
  linkedin: "LinkedIn analyses",
  applications: "applications",
};
const labelFor = (tool: string) => LABEL[tool] || tool.replace(/_/g, " ");

/** Subtle "N left today" text — shown only at 2-or-fewer remaining, never below 3. */
export function RemainingCredits({ tool }: { tool: string }) {
  const { forTool } = useLimits();
  const s = forTool(tool);
  if (!s || s.unlimited || s.remaining === null) return null;
  if (s.remaining > 2) return null;               // don't manufacture scarcity
  if (s.remaining <= 0) return null;              // 0 is handled by LimitReachedCard

  return (
    <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
      <Sparkles className="w-3 h-3" />
      {s.remaining} {labelFor(tool)} left today
    </p>
  );
}

function useCountdown(iso?: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!iso) return;
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) { setLabel("any moment"); return; }
      const h = Math.floor(ms / 3.6e6);
      const m = Math.floor((ms % 3.6e6) / 6e4);
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);
  return label;
}

/**
 * Friendly limit-reached state. Render when a tool action returns 0 remaining
 * (or a 429). Always keeps the free path — the user is never trapped.
 */
export function LimitReachedCard({
  tool, resetsAt, onWait,
}: {
  tool: string;
  resetsAt?: string;
  onWait?: () => void;
}) {
  const { status } = useLimits();
  const s: ToolStatus | undefined = status?.tools.find((t) => t.tool === tool);
  const countdown = useCountdown(resetsAt || status?.resets_at);
  const n = s?.limit ?? undefined;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
      <div className="mx-auto mb-3 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
        <Clock className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        You’ve used your{n ? ` ${n}` : ""} {labelFor(tool)} for now
      </h3>
      <p className="text-[13px] text-muted-foreground mt-1.5">
        They refill in <span className="font-medium text-foreground">{countdown || "a little while"}</span>.
        Or go unlimited with Pro — apply to more jobs and get hired faster.
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
        <Button asChild>
          <Link to="/billing">Upgrade to Pro</Link>
        </Button>
        <Button variant="ghost" onClick={onWait}>I’ll wait</Button>
      </div>
    </div>
  );
}
