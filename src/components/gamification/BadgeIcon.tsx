// Maps a badge's stored icon name (see the badges seed) to a lucide icon.
import {
  Footprints, CircleCheck, GraduationCap, Star, Flame, Zap, Handshake, Trophy,
  Award, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BadgeTier } from "@/lib/gamification/api";

const ICONS: Record<string, LucideIcon> = {
  Footprints, CircleCheck, GraduationCap, Star, Flame, Zap, Handshake, Trophy, Award,
};

export const TIER_RING: Record<BadgeTier, string> = {
  bronze: "text-amber-700 bg-amber-500/10 ring-amber-500/30",
  silver: "text-slate-400 bg-slate-400/10 ring-slate-400/30",
  gold:   "text-yellow-500 bg-yellow-500/10 ring-yellow-500/40",
};

export function BadgeIcon({
  icon, tier, earned = true, className, size = "md",
}: {
  icon: string | null;
  tier: BadgeTier;
  earned?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = (icon && ICONS[icon]) || Award;
  const box = size === "lg" ? "w-14 h-14" : size === "sm" ? "w-8 h-8" : "w-11 h-11";
  const ic  = size === "lg" ? "w-7 h-7"  : size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div
      className={cn(
        "rounded-full ring-1 flex items-center justify-center shrink-0 transition-all",
        box,
        earned ? TIER_RING[tier] : "text-muted-foreground/30 bg-muted/40 ring-border grayscale",
        className,
      )}
    >
      <Icon className={ic} />
    </div>
  );
}
