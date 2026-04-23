// Renders lesson resources INSIDE the product (no external nav).
// - YouTube / Vimeo / Loom → iframe video (16:9)
// - Google Docs → iframe preview (4:3)
// - Generic articles → iframe attempt + readable fallback if the host blocks framing
import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmbedInfo } from "@/lib/learning/embed";

interface Props {
  url: string;
  title?: string;
  /** Shown when the resource is a fallback from the module (not lesson-native). */
  fallbackLabel?: string | null;
  /** Called if the user can't view it inside the app and we need the AI coach to fill in. */
  onAskCoach?: () => void;
}

export function LessonContentEmbed({ url, title, fallbackLabel, onAskCoach }: Props) {
  const info = getEmbedInfo(url);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    if (info.kind === "article" && info.iframeLikelyBlocked) return;
    const t = setTimeout(() => {
      if (!loaded) setTimedOut(true);
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!info.embedUrl) {
    return (
      <ResourceUnavailable hostname={info.hostname} url={url} onAskCoach={onAskCoach} reason="invalid" />
    );
  }

  // For known-blocking article hosts, skip the iframe attempt and surface the in-app fallback immediately.
  if (info.kind === "article" && info.iframeLikelyBlocked) {
    return (
      <div className="space-y-2">
        {fallbackLabel && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
            {fallbackLabel}
          </Badge>
        )}
        <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">This article can't be embedded inside SkryveAI.</p>
              <p className="text-xs text-muted-foreground">
                Source: <span className="font-mono">{info.hostname}</span>. Use the AI coach to learn the
                same material right here, or open the source in a new tab.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {onAskCoach && (
              <Button size="sm" onClick={onAskCoach}>
                Learn this with the AI coach
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" /> Open source
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const aspectClass =
    info.aspect === "16/9" ? "aspect-video" : info.aspect === "4/3" ? "aspect-[4/3]" : "h-[55vh] sm:h-[65vh] lg:h-[70vh]";

  return (
    <div className="space-y-2">
      {fallbackLabel && (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
          {fallbackLabel}
        </Badge>
      )}
      <div className={`relative w-full ${aspectClass} bg-muted rounded-md overflow-hidden border`}>
        {!loaded && !timedOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {timedOut && !loaded && info.kind === "article" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/80 p-4 text-center">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm font-medium">This source is taking too long to load inside SkryveAI.</p>
            <p className="text-xs text-muted-foreground">
              The site may block embedding. Ask the coach to teach this lesson instead.
            </p>
            {onAskCoach && (
              <Button size="sm" onClick={onAskCoach}>
                Learn this with the AI coach
              </Button>
            )}
          </div>
        )}
        <iframe
          src={info.embedUrl}
          title={title || "Lesson resource"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
}

function ResourceUnavailable({
  hostname,
  url,
  onAskCoach,
  reason,
}: {
  hostname: string;
  url: string;
  onAskCoach?: () => void;
  reason: "invalid" | "blocked";
}) {
  return (
    <div className="rounded-md border border-warning/30 bg-warning/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {reason === "invalid" ? "Resource link is invalid" : "Resource can't be embedded"}
          </p>
          <p className="text-xs text-muted-foreground">
            {hostname && <>Source: <span className="font-mono">{hostname}</span>. </>}
            Use the AI coach to learn this topic right inside SkryveAI.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onAskCoach && (
          <Button size="sm" onClick={onAskCoach}>
            Learn this with the AI coach
          </Button>
        )}
        {url && (
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" /> Open source
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
