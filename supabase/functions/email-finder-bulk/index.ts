import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { findEmail, type PersonInput } from "../_shared/email-finder-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ROWS = 100;

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

async function processJob(jobId: string, rows: PersonInput[], env: { firecrawlKey: string; supabaseUrl: string; serviceKey: string }) {
  const supabase = createClient(env.supabaseUrl, env.serviceKey);
  const results: unknown[] = [];
  let foundCount = 0;

  await supabase.from("email_finder_jobs").update({ status: "processing" }).eq("id", jobId);

  for (let i = 0; i < rows.length; i++) {
    try {
      const result = await findEmail(rows[i], env);
      results.push({ input: rows[i], result, success: !!result.email });
      if (result.email) foundCount++;
    } catch (e) {
      results.push({ input: rows[i], result: null, success: false, error: (e as Error).message });
    }

    const progress = Math.round(((i + 1) / rows.length) * 100);
    await supabase.from("email_finder_jobs").update({
      processed_rows: i + 1,
      found_count: foundCount,
      progress,
      results,
    }).eq("id", jobId);
  }

  await supabase.from("email_finder_jobs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    progress: 100,
  }).eq("id", jobId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_KEY) {
      return new Response(JSON.stringify({ error: "Email finder not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // GET-style status check
    if (body.jobId && body.action === "status") {
      const { data, error } = await supabase
        .from("email_finder_jobs")
        .select("*")
        .eq("id", body.jobId)
        .eq("user_id", user.id)
        .single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new job
    const rows: PersonInput[] = Array.isArray(body.searches) ? body.searches : [];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rows.length > MAX_ROWS) {
      return new Response(JSON.stringify({ error: `Max ${MAX_ROWS} rows per job` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error } = await supabase
      .from("email_finder_jobs")
      .insert({
        user_id: user.id,
        status: "pending",
        total_rows: rows.length,
        input_rows: rows,
      })
      .select()
      .single();

    if (error || !job) {
      return new Response(JSON.stringify({ error: error?.message || "Failed to create job" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process in background
    const env = { firecrawlKey: FIRECRAWL_KEY, supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY };
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processJob(job.id, rows, env));
    } else {
      processJob(job.id, rows, env).catch((e) => console.error("[bulk] background error:", e));
    }

    return new Response(JSON.stringify({
      jobId: job.id,
      status: "pending",
      totalSearches: rows.length,
      estimatedTime: `${Math.ceil(rows.length * 6 / 60)} minutes`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[email-finder-bulk] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Bulk job failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
