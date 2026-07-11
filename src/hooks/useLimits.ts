// Reads the caller's AI-tool usage status (remaining credits per tool) without
// consuming one. Backed by the get_limits_status() RPC.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ToolStatus {
  tool: string;
  limit: number | null;      // null => unlimited
  used: number;
  remaining: number | null;  // null => unlimited
  unlimited: boolean;
}

export interface LimitsStatus {
  plan: string;
  period: string;
  resets_at: string;
  tools: ToolStatus[];
}

export function useLimits() {
  const [status, setStatus] = useState<LimitsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_limits_status");
    if (!error && data) setStatus(data as LimitsStatus);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const forTool = useCallback(
    (tool: string): ToolStatus | undefined => status?.tools.find((t) => t.tool === tool),
    [status],
  );

  return { status, loading, reload: load, forTool };
}
