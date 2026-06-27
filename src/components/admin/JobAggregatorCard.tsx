import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScrapeResult {
  scraped?: number;
  fresh?: number;
  inserted?: number;
  removed?: number;
  per_source?: Record<string, number>;
  errors?: string[];
}

/**
 * Admin control for the job aggregator: shows how many active jobs are in the
 * feed and lets an admin trigger a fresh scrape on demand (instead of waiting
 * for the cron). Calls the public `scrape-jobs` edge function.
 */
export function JobAggregatorCard() {
  const { toast } = useToast();
  const [count, setCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ScrapeResult | null>(null);

  const loadCount = useCallback(async () => {
    // aggregated_jobs isn't in the generated Supabase types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from("aggregated_jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    setCount(count ?? 0);
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  const refresh = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-jobs", { body: {} });
      if (error) throw error;
      const result = (data ?? {}) as ScrapeResult;
      setLastResult(result);
      await loadCount();
      toast({
        title: "Jobs refreshed",
        description: `Added/updated ${result.inserted ?? 0} listings${
          result.removed ? `, removed ${result.removed} stale` : ""
        }.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not run the scraper";
      toast({ title: "Refresh failed", description: msg, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-4 h-4" /> Job Aggregator
            </CardTitle>
            <CardDescription>
              {count === null
                ? "Loading feed status…"
                : `${count} active job${count === 1 ? "" : "s"} in the feed (posted within the last 7 days).`}
            </CardDescription>
          </div>
          <Button onClick={refresh} disabled={running} className="gap-2 shrink-0">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {running ? "Refreshing…" : "Refresh jobs now"}
          </Button>
        </div>
      </CardHeader>
      {lastResult && (
        <CardContent className="pt-0">
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              Scraped {lastResult.scraped ?? 0} · fresh {lastResult.fresh ?? 0} · added/updated{" "}
              {lastResult.inserted ?? 0} · removed {lastResult.removed ?? 0}
            </p>
            {lastResult.per_source && Object.keys(lastResult.per_source).length > 0 && (
              <p>
                {Object.entries(lastResult.per_source)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </p>
            )}
            {lastResult.errors && lastResult.errors.length > 0 && (
              <p className="text-destructive">
                {lastResult.errors.length} error(s): {lastResult.errors.slice(0, 3).join("; ")}
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
