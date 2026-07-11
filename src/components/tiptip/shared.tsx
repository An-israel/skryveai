// Shared labels + status styling for tiptip modules.
import type { ContentStatus, AutoType } from "@/lib/tiptip/api";

export const STATUS_STYLE: Record<ContentStatus, string> = {
  idea:      "bg-muted text-muted-foreground",
  drafting:  "bg-blue-500/10 text-blue-500",
  ready:     "bg-amber-500/10 text-amber-600",
  published: "bg-green-500/10 text-green-600",
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  idea: "Idea", drafting: "Drafting", ready: "Ready", published: "Published",
};

export const CONTENT_STATUSES: ContentStatus[] = ["idea", "drafting", "ready", "published"];

export const AUTO_LABEL: Record<AutoType, string> = {
  auto: "AUTO", prep_send: "PREP + SEND", human: "HUMAN NEEDED",
};

export const AUTO_STYLE: Record<AutoType, string> = {
  auto:      "bg-green-500/10 text-green-600 border-green-500/20",
  prep_send: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  human:     "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export const TIER_LABEL: Record<number, string> = {
  1: "Tier 1 · High-Intent", 2: "Tier 2 · Problem-Aware", 3: "Tier 3 · Top-of-Funnel",
};

export function StatusPill({ status }: { status: ContentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
