import { useCallback, useState } from "react";
import { LimitReachedDialog } from "@/components/limits/LimitsUI";
import { ToolLimitError } from "@/lib/edge-function-error";

/**
 * Shared handling for "you hit your plan's monthly cap" across AI tool calls.
 *
 * Call `handle(e)` from a catch block: if `e` is a ToolLimitError it opens the
 * upgrade dialog and returns true (skip your own failure toast); otherwise it
 * returns false so the caller falls back to its normal error handling.
 *
 * Render `dialog` once, anywhere in the component tree.
 */
export function useToolLimitDialog() {
  const [info, setInfo] = useState<ToolLimitError["info"] | null>(null);

  const handle = useCallback((e: unknown): boolean => {
    if (e instanceof ToolLimitError) {
      setInfo(e.info);
      return true;
    }
    return false;
  }, []);

  const dialog = (
    <LimitReachedDialog info={info} onOpenChange={(open) => { if (!open) setInfo(null); }} />
  );

  return { handle, dialog };
}
