import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require auth for all methods
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized — missing authorization header" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Missing environment variables" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace("Bearer ", "");

  // Validate user JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized — invalid token" }, 401);
  }

  const userId = user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    // ─── GET: return config + today's session ────────────────────────────────
    if (req.method === "GET") {
      const { data: config, error: configError } = await supabase
        .from("autopilot_configs")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (configError) throw configError;

      let session = null;
      if (config) {
        const { data: sessionData } = await supabase
          .from("autopilot_sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();
        session = sessionData;
      }

      return jsonResponse({ config, session });
    }

    // ─── POST: create/update config ──────────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json();

      const configData = {
        user_id: userId,
        is_active: true,
        expertise: body.expertise ?? {},
        target_businesses: body.target_businesses ?? {},
        locations: body.locations ?? [],
        daily_quota: body.daily_quota ?? {},
        email_style: body.email_style ?? {},
        compliance: body.compliance ?? {},
        updated_at: new Date().toISOString(),
      };

      const { data: upserted, error: upsertError } = await supabase
        .from("autopilot_configs")
        .upsert(configData, { onConflict: "user_id" })
        .select()
        .single();

      if (upsertError) throw new Error(upsertError.message || JSON.stringify(upsertError));

      // Create initial session for today if none exists
      await supabase
        .from("autopilot_sessions")
        .upsert(
          {
            user_id: userId,
            date: today,
            emails_sent: 0,
            emails_failed: 0,
            emails_skipped: 0,
            status: "idle",
            current_activity: "Ready to start",
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,date" }
        );

      return jsonResponse({ config: upserted });
    }

    // ─── PATCH: update is_active (pause/resume) ───────────────────────────────
    if (req.method === "PATCH") {
      const body = await req.json();

      if (typeof body.is_active !== "boolean") {
        return jsonResponse({ error: "PATCH requires is_active (boolean)" }, 400);
      }

      const { data: updated, error: updateError } = await supabase
        .from("autopilot_configs")
        .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Also update session status
      const newStatus = body.is_active ? "active" : "paused";
      await supabase
        .from("autopilot_sessions")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("date", today);

      return jsonResponse({ config: updated });
    }

    // ─── DELETE: remove config entirely ──────────────────────────────────────
    if (req.method === "DELETE") {
      const { error: deleteError } = await supabase
        .from("autopilot_configs")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;
      return jsonResponse({ deleted: true });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("autopilot-config error:", err);
    const errMsg = err instanceof Error
      ? err.message
      : (err as any)?.message || (err as any)?.details || JSON.stringify(err);
    return jsonResponse({ error: errMsg }, 500);
  }
});
