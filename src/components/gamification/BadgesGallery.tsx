// Badges gallery — earned (bright) + locked (greyed with their unlock criteria).
// Works from the owner's full stats or from a public-profile badge list.
import { BadgeIcon } from "./BadgeIcon";
import type { GamBadge, BadgeTier } from "@/lib/gamification/api";

export function BadgesGallery({
  badges, title = "Badges",
}: {
  badges: GamBadge[];
  title?: string;
}) {
  if (!badges || badges.length === 0) return null;
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="border border-border rounded-xl bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <span className="text-[11px] text-muted-foreground">{earnedCount}/{badges.length} earned</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {badges.map((b) => (
          <div key={b.code} className="flex flex-col items-center text-center gap-1.5">
            <BadgeIcon icon={b.icon} tier={b.tier} earned={b.earned} />
            <span className={`text-[12px] font-medium leading-tight ${b.earned ? "text-foreground" : "text-muted-foreground"}`}>
              {b.name}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {b.earned ? "Earned" : b.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact earned-only strip for public profiles. */
export function EarnedBadgeStrip({
  badges,
}: {
  badges: { code: string; name: string; icon: string | null; tier: BadgeTier }[];
}) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((b) => (
        <div key={b.code} className="flex items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-2.5 py-1">
          <BadgeIcon icon={b.icon} tier={b.tier} size="sm" />
          <span className="text-[11px] font-medium text-foreground">{b.name}</span>
        </div>
      ))}
    </div>
  );
}
