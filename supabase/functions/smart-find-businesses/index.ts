import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ServiceDefinition {
  rawDescription: string;
  industryVertical: string;
  targetProfile: string;
  signalsToDetect: string[];
  signalWeights?: Record<string, number>;
}

interface SmartFindRequest {
  serviceDefinition: ServiceDefinition;
  location: string;
  campaignId?: string;
  limit?: number;
}

interface ScoredBusiness {
  id: string;
  name: string;
  address: string;
  website?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  placeId?: string;
  email?: string;
  needScore: number;
  signals: Record<string, boolean>;
  evidence: Record<string, string>;
  problemsFound: string[];
  selected?: boolean;
}

const DEFAULT_SIGNAL_WEIGHTS: Record<string, number> = {
  no_trust_badges: 15,
  slow_load: 15,
  not_mobile_responsive: 20,
  outdated_design: 15,
  no_clear_cta: 15,
  no_email_capture: 10,
  weak_copy: 12,
  no_blog_or_content: 8,
  no_social_links: 10,
  broken_links: 12,
  thin_content: 12,
  no_seo_meta: 10,
  no_https: 25,
  weak_brand: 12,
  generic_design: 12,
  no_video_content: 8,
  poor_navigation: 12,
  no_testimonials: 10,
  outdated_copyright: 10,
  no_about_page: 8,
};

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function buildServiceDefinition(
  apiKey: string,
  rawDescription: string,
  expertise: string,
): Promise<ServiceDefinition> {
  const systemPrompt =
    "You analyze a freelancer's service description and produce structured criteria for finding businesses that show signals of needing that service. Output ONLY via the structured tool call.";

  const userPrompt = `The freelancer is a ${expertise || "general digital service provider"}.\n\nThey described their service:\n"${rawDescription}"\n\nIdentify the optimal target market and the website pain signals that indicate a business needs this service. Be specific.`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_service_criteria",
              description: "Return structured criteria for smart business discovery",
              parameters: {
                type: "object",
                properties: {
                  industryVertical: { type: "string", description: "Single industry vertical to target (e.g. 'e-commerce', 'SaaS', 'restaurants')" },
                  targetProfile: { type: "string", description: "1-line description of the ideal target business" },
                  signalsToDetect: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: Object.keys(DEFAULT_SIGNAL_WEIGHTS),
                    },
                    description: "Pick 5-10 pain signals from the allowed list that indicate this service is needed",
                  },
                },
                required: ["industryVertical", "targetProfile", "signalsToDetect"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_service_criteria" } },
      }),
    });

    if (!resp.ok) {
      console.warn("AI service-criteria call failed:", resp.status);
      return {
        rawDescription,
        industryVertical: expertise || "small business",
        targetProfile: rawDescription.substring(0, 200),
        signalsToDetect: ["no_trust_badges", "outdated_design", "no_clear_cta", "weak_copy", "no_seo_meta"],
      };
    }
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No tool call");
    const parsed = JSON.parse(args);
    return {
      rawDescription,
      industryVertical: parsed.industryVertical,
      targetProfile: parsed.targetProfile,
      signalsToDetect: parsed.signalsToDetect,
    };
  } catch (err) {
    console.warn("buildServiceDefinition error:", err);
    return {
      rawDescription,
      industryVertical: expertise || "small business",
      targetProfile: rawDescription.substring(0, 200),
      signalsToDetect: ["no_trust_badges", "outdated_design", "no_clear_cta", "weak_copy", "no_seo_meta"],
    };
  }
}

async function detectSignalsForBusiness(
  firecrawlKey: string,
  lovableKey: string,
  business: { name: string; website?: string },
  signalsToCheck: string[],
): Promise<{ signals: Record<string, boolean>; evidence: Record<string, string>; screenshotUrl: string | null }> {
  if (!business.website) {
    return { signals: {}, evidence: {}, screenshotUrl: null };
  }

  let pageContent = "";
  let screenshotUrl: string | null = null;
  try {
    const scrapeResp = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: business.website,
        formats: ["markdown"],
        onlyMainContent: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (scrapeResp.ok) {
      const data = await scrapeResp.json();
      pageContent = (data.data?.markdown || data.markdown || "").substring(0, 5000);
    }
  } catch (err) {
    console.warn(`Scrape failed for ${business.website}:`, err);
  }

  if (!pageContent) {
    return { signals: {}, evidence: {}, screenshotUrl };
  }

  const signalsList = signalsToCheck.map((s) => `- ${s}`).join("\n");
  const prompt = `You are auditing the website of "${business.name}" (${business.website}) to detect specific pain signals from this checklist:\n\n${signalsList}\n\nBelow is the website content. For EACH signal above, decide if it is present (true = problem detected, false = no problem). Provide a 1-line evidence snippet for each signal you flag as true.\n\nWEBSITE CONTENT:\n${pageContent}`;

  try {
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a precise website auditor. Respond ONLY via the tool call." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_signals",
              description: "Report which pain signals are present on the website",
              parameters: {
                type: "object",
                properties: {
                  detectedSignals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        signal: { type: "string" },
                        present: { type: "boolean" },
                        evidence: { type: "string", description: "1-line proof or 'No issue detected'" },
                      },
                      required: ["signal", "present", "evidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["detectedSignals"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_signals" } },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!aiResp.ok) {
      console.warn(`AI signal detection failed: ${aiResp.status}`);
      return { signals: {}, evidence: {}, screenshotUrl };
    }

    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { signals: {}, evidence: {}, screenshotUrl };
    const parsed = JSON.parse(args);

    const signals: Record<string, boolean> = {};
    const evidence: Record<string, string> = {};
    for (const item of parsed.detectedSignals || []) {
      signals[item.signal] = !!item.present;
      if (item.present) evidence[item.signal] = item.evidence;
    }
    return { signals, evidence, screenshotUrl };
  } catch (err) {
    console.warn(`AI signal call error:`, err);
    return { signals: {}, evidence: {}, screenshotUrl };
  }
}

function calculateNeedScore(
  signals: Record<string, boolean>,
  weights: Record<string, number>,
): number {
  let score = 0;
  let maxPossible = 0;
  for (const [signal, weight] of Object.entries(weights)) {
    maxPossible += weight;
    if (signals[signal]) score += weight;
  }
  if (maxPossible === 0) return 0;
  return Math.round((score / maxPossible) * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not configured");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    let user: { id: string } | null = null;

    if (!isServiceRole) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      user = authUser;

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("credits, plan")
        .eq("user_id", user.id)
        .single();

      if (!subscription) {
        return new Response(
          JSON.stringify({ error: "No active subscription found" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (subscription.plan !== "lifetime" && subscription.credits < 2) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Smart Find requires 2 credits per search." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (subscription.plan !== "lifetime") {
        await supabase
          .from("subscriptions")
          .update({ credits: subscription.credits - 2 })
          .eq("user_id", user.id);
      }
    }

    const body: SmartFindRequest = await req.json();
    const { serviceDefinition, location, campaignId, limit = 30 } = body;

    if (!serviceDefinition || !location) {
      return new Response(
        JSON.stringify({ error: "serviceDefinition and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const searchQuery = `${serviceDefinition.industryVertical} in ${location}`;
    console.log(`[SmartFind] Searching: ${searchQuery}`);

    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();

    if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places error: ${searchData.status}`);
    }

    const places = searchData.results?.slice(0, Math.min(40, limit * 2)) || [];
    console.log(`[SmartFind] Google returned ${places.length} candidates`);

    const candidates = await Promise.all(
      places.map(async (place: { place_id: string; name?: string; formatted_address?: string; rating?: number; user_ratings_total?: number; types?: string[] }) => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types&key=${GOOGLE_PLACES_API_KEY}`;
          const detailsResp = await fetch(detailsUrl);
          const detailsData = await detailsResp.json();
          const d = detailsData.result || {};
          return {
            id: crypto.randomUUID(),
            name: d.name || place.name || "Unknown",
            address: d.formatted_address || place.formatted_address || "",
            phone: d.formatted_phone_number || null,
            website: d.website || null,
            rating: d.rating || place.rating,
            reviewCount: d.user_ratings_total || place.user_ratings_total,
            category: (d.types || place.types || []).join(", "),
            placeId: place.place_id,
          };
        } catch {
          return null;
        }
      }),
    );

    const withWebsites = candidates.filter((c) => c && c.website) as NonNullable<typeof candidates[0]>[];
    console.log(`[SmartFind] ${withWebsites.length} candidates have websites`);

    const signalsToCheck = serviceDefinition.signalsToDetect.length > 0
      ? serviceDefinition.signalsToDetect
      : Object.keys(DEFAULT_SIGNAL_WEIGHTS);

    const weights: Record<string, number> = {};
    for (const sig of signalsToCheck) {
      weights[sig] = serviceDefinition.signalWeights?.[sig] ?? DEFAULT_SIGNAL_WEIGHTS[sig] ?? 10;
    }

    const BATCH = 5;
    const scored: ScoredBusiness[] = [];

    for (let i = 0; i < withWebsites.length; i += BATCH) {
      const batch = withWebsites.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(async (c) => {
          const { signals, evidence, screenshotUrl } = await detectSignalsForBusiness(
            FIRECRAWL_API_KEY,
            LOVABLE_API_KEY,
            { name: c!.name, website: c!.website || undefined },
            signalsToCheck,
          );
          const score = calculateNeedScore(signals, weights);
          const problemsFound = Object.entries(signals)
            .filter(([_, present]) => present)
            .map(([sig]) => evidence[sig] || sig.replace(/_/g, " "));

          const sb: ScoredBusiness = {
            id: c!.id,
            name: c!.name,
            address: c!.address,
            phone: c!.phone || undefined,
            website: c!.website || undefined,
            rating: c!.rating,
            reviewCount: c!.reviewCount,
            category: c!.category,
            placeId: c!.placeId,
            needScore: score,
            signals,
            evidence,
            problemsFound,
          };
          return sb;
        }),
      );
      scored.push(...batchResults);
    }

    const qualified = scored
      .filter((s) => s.needScore >= 40)
      .sort((a, b) => b.needScore - a.needScore)
      .slice(0, limit);

    console.log(`[SmartFind] ${qualified.length}/${scored.length} businesses qualified (score >= 40)`);

    if (campaignId && qualified.length > 0) {
      const signalRows = qualified.map((q) => ({
        campaign_id: campaignId,
        business_id: q.id,
        service_definition: serviceDefinition as unknown as Record<string, unknown>,
        signals: q.signals,
        evidence: q.evidence,
        score: q.needScore,
        screenshot_url: null,
      }));
      await supabase.from("smart_find_signals").insert(signalRows);
    }

    return new Response(
      JSON.stringify({
        businesses: qualified,
        total: qualified.length,
        analyzedTotal: scored.length,
        serviceDefinition,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("smart-find-businesses error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
