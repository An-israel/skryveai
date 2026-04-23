// Renders lesson resources INSIDE the product. Strict policy:
// - Inline-embeddable videos only (YouTube / Vimeo / Loom).
// - Anything else (articles, blocked sites, invalid URLs) → no external link is ever
//   shown to the learner. We show a single CTA that hands the topic to the AI coach,
//   which will teach the material directly in the chat.
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEmbedInfo } from "@/lib/learning/embed";

interface Props {
  url: string;
  title?: string;
  /** Called to hand this lesson over to the AI coach inside the chat. */
  onAskCoach?: () => void;
}

export function LessonContentEmbed({ url, title, onAskCoach }: Props) {
  const info = getEmbedInfo(url);

  // Only inline-embed actual videos. Everything else stays inside the chat.
  const canEmbedInline = info.kind === "video" && !!info.embedUrl;

  if (!canEmbedInline) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Learn this lesson with your AI coach</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tap below — the coach will teach{title ? ` "${title}"` : " this lesson"} step by step right inside the chat.
          </p>
          {onAskCoach && (
            <Button size="sm" className="mt-3" onClick={onAskCoach}>
              <Sparkles className="h-3 w-3 mr-1" /> Teach me in chat
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden border">
      <iframe
        src={info.embedUrl!}
        title={title || "Lesson video"}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}
