import { BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface VettedBadgeProps {
  skill?: string;
  level?: string;          // "vetted" | "top_vetted"
  size?: "sm" | "md";
  linkToTrust?: boolean;   // link to the "how vetting works" page
  className?: string;
}

/**
 * The public trust marker a client sees. Kept visually distinct and premium —
 * "Vetted on Skryve" should read as skilled AND professional.
 */
export function VettedBadge({ skill, level = "vetted", size = "md", linkToTrust = false, className = "" }: VettedBadgeProps) {
  const isTop = level === "top_vetted";
  const label = skill ? `Vetted: ${skill}` : "Vetted";
  const dims = size === "sm" ? "text-[11px] px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5";
  const icon = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  const chip = (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${dims} ${
        isTop
          ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
      } ${className}`}
    >
      <BadgeCheck className={icon} />
      {isTop ? `Top ${label}` : label}
    </span>
  );

  return linkToTrust ? <Link to="/vetting/how-it-works" className="hover:opacity-90">{chip}</Link> : chip;
}
