import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutoPilotConfig {
  id: string;
  user_id: string;
  is_active: boolean;
  expertise: {
    industry: string;
    services: string[];
    valueProp: string;
  };
  target_businesses: {
    types: string[];
    sizeRange: string;
    mustHaveWebsite: boolean;
    mustHaveInstagram: boolean;
  };
  locations: Array<{
    country: string;
    cities: string[];
  }>;
  daily_quota: {
    emailsPerDay: number;
    sendingSchedule: {
      startHour: number;
      endHour: number;
      spreadThroughoutDay: boolean;
    };
  };
  email_style: {
    tone: string;
    length: string;
    ctaType: string;
  };
  compliance: Record<string, unknown>;
}

interface AutoPilotSession {
  id: string;
  user_id: string;
  date: string;
  emails_sent: number;
  emails_failed: number;
  emails_skipped: number;
  status: string;
  current_location: string | null;
  current_activity: string | null;
  started_at: string;
  updated_at: string;
}

interface Business {
  name: string;
  website?: string;
  email?: string;
  location?: string;
  instagram?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentHour(): number {
  return new Date().getUTCHours();
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

// ─── Core per-user processor ──────────────────────────────────────────────────

async function processUser(
  supabase: any,
  config: AutoPilotConfig,
  supabaseUrl: string,
  serviceKey: string,
  force = false
): Promise<{ sent: number; skipped: number; failed: number }> {
  const today = getTodayDate();
  const nowHour = getCurrentHour();

  // 1. Get or create today's session
  let session: AutoPilotSession;
  const { data: existingSession, error: sessionFetchError } = await supabase
    .from("autopilot_sessions")
    .select("*")
    .eq("user_id", config.user_id)
    .eq("date", today)
    .maybeSingle();

  if (sessionFetchError) {
    console.error(`[${config.user_id}] Session fetch error:`, sessionFetchError.message);
    throw sessionFetchError;
  }

  if (!existingSession) {
    const { data: newSession, error: createError } = await supabase
      .from("autopilot_sessions")
      .insert({
        user_id: config.user_id,
        date: today,
        emails_sent: 0,
        emails_failed: 0,
        emails_skipped: 0,
        status: "active",
        current_activity: "Initializing...",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error(`[${config.user_id}] Session create error:`, createError.message);
      throw createError;
    }
    session = newSession;
  } else {
    session = existingSession;
  }

  // 2. Check daily quota
  const dailyLimit = config.daily_quota?.emailsPerDay ?? 500;
  if (session.emails_sent >= dailyLimit) {
    await supabase
      .from("autopilot_sessions")
      .update({ status: "quota_reached", updated_at: new Date().toISOString() })
      .eq("id", session.id);
    console.log(`[${config.user_id}] Quota reached (${session.emails_sent}/${dailyLimit})`);
    return { sent: 0, skipped: 1, failed: 0 };
  }

  // 3. Check sending hours (skip check if force=true, e.g. on immediate launch)
  const startHour = config.daily_quota?.sendingSchedule?.startHour ?? 8;
  const endHour = config.daily_quota?.sendingSchedule?.endHour ?? 20;
  if (!force && (nowHour < startHour || nowHour > endHour)) {
    console.log(`[${config.user_id}] Outside sending hours (current: ${nowHour}, window: ${startHour}-${endHour})`);
    return { sent: 0, skipped: 1, failed: 0 };
  }

  // 4. Pick a location to process
  const locations = config.locations ?? [];
  if (locations.length === 0) {
    console.log(`[${config.user_id}] No locations configured`);
    return { sent: 0, skipped: 1, failed: 0 };
  }

  const locationIndex = session.emails_sent % locations.length;
  const currentLocation = locations[locationIndex];
  const locationStr = `${currentLocation.country}${currentLocation.cities?.length ? " → " + currentLocation.cities[0] : ""}`;

  // 5. Pick a business type
  const businessTypes = config.target_businesses?.types ?? ["small business"];
  const businessType = businessTypes[session.emails_sent % businessTypes.length];

  // 6. Search for businesses via the search-businesses function
  const functionsBase = `${supabaseUrl}/functions/v1`;
  let businesses: Business[] = [];

  try {
    const searchRes = await fetch(`${functionsBase}/search-businesses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        businessType,
        location: currentLocation.cities?.[0]
          ? `${currentLocation.cities[0]}, ${currentLocation.country}`
          : currentLocation.country,
        limit: 10,
      }),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      businesses = Array.isArray(searchData.businesses)
        ? searchData.businesses
        : Array.isArray(searchData)
        ? searchData
        : [];
    } else {
      const errText = await searchRes.text();
      console.warn(`[${config.user_id}] search-businesses non-OK (${searchRes.status}): ${errText}`);
    }
  } catch (err) {
    console.error(`[${config.user_id}] search-businesses fetch error:`, err);
  }

  if (businesses.length === 0) {
    await supabase
      .from("autopilot_sessions")
      .update({
        current_location: locationStr,
        current_activity: `Searching: ${locationStr} — no results found`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    return { sent: 0, skipped: 1, failed: 0 };
  }

  // 7. Filter already-contacted businesses
  const domains = businesses
    .filter((b) => b.website)
    .map((b) => extractDomain(b.website!));

  const { data: alreadyContacted } = await supabase
    .from("contacted_businesses")
    .select("domain")
    .eq("user_id", config.user_id)
    .in("domain", domains);

  const contactedSet = new Set((alreadyContacted ?? []).map((r: { domain: string }) => r.domain));

  const freshBusinesses = businesses.filter((b) => {
    if (!b.website) return config.target_businesses?.mustHaveWebsite !== true;
    const domain = extractDomain(b.website);
    return !contactedSet.has(domain);
  });

  if (freshBusinesses.length === 0) {
    console.log(`[${config.user_id}] All businesses already contacted`);
    return { sent: 0, skipped: businesses.length, failed: 0 };
  }

  // 8. Process up to 3 businesses per invocation
  const toProcess = freshBusinesses.slice(0, 3);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const business of toProcess) {
    const domain = business.website ? extractDomain(business.website) : null;

    try {
      // Update session activity
      await supabase
        .from("autopilot_sessions")
        .update({
          current_location: locationStr,
          current_activity: `Processing: ${locationStr} — ${business.name}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      // 8a. Analyze website
      let analysisIssues: unknown[] = [];
      if (business.website) {
        try {
          const analyzeRes = await fetch(`${functionsBase}/analyze-website`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
            body: JSON.stringify({
              url: business.website,
              businessName: business.name,
            }),
          });
          if (analyzeRes.ok) {
            const analyzeData = await analyzeRes.json();
            analysisIssues = analyzeData.issues ?? [];
          }
        } catch (err) {
          console.warn(`[${config.user_id}] analyze-website error for ${business.name}:`, err);
        }
      }

      // 8b. Generate pitch
      let emailSubject = `Helping ${business.name} grow with ${config.expertise?.services?.[0] ?? config.expertise?.industry ?? "our services"}`;
      let emailBody = "";

      try {
        const pitchRes = await fetch(`${functionsBase}/generate-pitch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            businessName: business.name,
            website: business.website ?? "",
            issues: analysisIssues,
            freelancerService: `${config.expertise?.services?.join(", ") ?? ""} — ${config.expertise?.valueProp ?? ""}`.trim(),
            tone: config.email_style?.tone ?? "professional",
            length: config.email_style?.length ?? "medium",
            ctaType: config.email_style?.ctaType ?? "Book a Call",
          }),
        });

        if (pitchRes.ok) {
          const pitchData = await pitchRes.json();
          emailBody = pitchData.emailBody ?? pitchData.pitch ?? pitchData.body ?? "";
          emailSubject = pitchData.subject ?? emailSubject;
        } else {
          const errText = await pitchRes.text();
          console.warn(`[${config.user_id}] generate-pitch non-OK (${pitchRes.status}): ${errText}`);
        }
      } catch (err) {
        console.warn(`[${config.user_id}] generate-pitch error for ${business.name}:`, err);
      }

      if (!emailBody) {
        // Fallback minimal pitch
        emailBody = `Hi ${business.name} team,\n\nI came across your business and noticed some opportunities to help you grow.\n\n${config.expertise?.valueProp ?? ""}\n\nWould love to connect — ${config.email_style?.ctaType ?? "book a quick call"}?\n\nBest regards`;
      }

      // 8c. Send email
      const contactEmail = business.email;
      let emailStatus: "sent" | "failed" | "skipped" = "skipped";

      if (!contactEmail) {
        skipped++;
        emailStatus = "skipped";
      } else {
        try {
          const sendRes = await fetch(`${functionsBase}/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
            body: JSON.stringify({
              toEmail: contactEmail,
              subject: emailSubject,
              body: emailBody,
              campaignId: `autopilot-${session.id}`,
              businessId: domain ?? business.name,
              pitchId: `autopilot-${Date.now()}`,
            }),
          });

          if (sendRes.ok) {
            emailStatus = "sent";
            sent++;
          } else {
            const errText = await sendRes.text();
            console.warn(`[${config.user_id}] send-email non-OK (${sendRes.status}): ${errText}`);
            emailStatus = "failed";
            failed++;
          }
        } catch (err) {
          console.error(`[${config.user_id}] send-email error for ${business.name}:`, err);
          emailStatus = "failed";
          failed++;
        }
      }

      // 8d. Insert into autopilot_activity
      await supabase.from("autopilot_activity").insert({
        user_id: config.user_id,
        session_id: session.id,
        business_name: business.name,
        business_location: business.location ?? locationStr,
        contact_email: contactEmail ?? null,
        email_subject: emailSubject,
        email_body: emailBody,
        status: emailStatus,
        opened: false,
        clicked: false,
        replied: false,
        created_at: new Date().toISOString(),
      });

      // 8e. Mark domain as contacted
      if (domain && emailStatus === "sent") {
        await supabase
          .from("contacted_businesses")
          .upsert(
            { user_id: config.user_id, domain, contacted_at: new Date().toISOString() },
            { onConflict: "user_id,domain" }
          );
      }

      // 8f. Update session counters
      const { data: freshSession } = await supabase
        .from("autopilot_sessions")
        .select("emails_sent, emails_failed, emails_skipped")
        .eq("id", session.id)
        .single();

      await supabase
        .from("autopilot_sessions")
        .update({
          emails_sent: (freshSession?.emails_sent ?? session.emails_sent) + (emailStatus === "sent" ? 1 : 0),
          emails_failed: (freshSession?.emails_failed ?? session.emails_failed) + (emailStatus === "failed" ? 1 : 0),
          emails_skipped: (freshSession?.emails_skipped ?? session.emails_skipped) + (emailStatus === "skipped" ? 1 : 0),
          current_location: locationStr,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      // Update local session counts for quota check continuity
      if (emailStatus === "sent") session.emails_sent++;
      if (emailStatus === "failed") session.emails_failed++;
      if (emailStatus === "skipped") session.emails_skipped++;

      // Re-check quota after each send
      if (session.emails_sent >= dailyLimit) {
        await supabase
          .from("autopilot_sessions")
          .update({ status: "quota_reached", updated_at: new Date().toISOString() })
          .eq("id", session.id);
        break;
      }
    } catch (err) {
      console.error(`[${config.user_id}] Error processing ${business.name}:`, err);
      failed++;

      await supabase.from("autopilot_activity").insert({
        user_id: config.user_id,
        session_id: session.id,
        business_name: business.name,
        business_location: business.location ?? locationStr,
        contact_email: business.email ?? null,
        email_subject: null,
        email_body: null,
        status: "failed",
        opened: false,
        clicked: false,
        replied: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Final session update
  await supabase
    .from("autopilot_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", session.id);

  return { sent, skipped, failed };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let targetUserId: string | null = null;
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    targetUserId = body?.userId ?? null;
    force = body?.force === true; // bypass sending-hours check for immediate first run
  } catch {
    // No body — process all users
  }

  try {
    // Load configs
    let query = supabase.from("autopilot_configs").select("*").eq("is_active", true);
    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: configs, error: configsError } = await query;
    if (configsError) throw configsError;

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active autopilot configs found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, unknown>[] = [];

    for (const config of configs as AutoPilotConfig[]) {
      try {
        const result = await processUser(supabase, config, SUPABASE_URL, SERVICE_KEY, force);
        results.push({ userId: config.user_id, ...result });
      } catch (err) {
        console.error(`Failed to process user ${config.user_id}:`, err);
        results.push({
          userId: config.user_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("autopilot-run fatal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
