import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit check
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);
    
    const { data: sub } = await serviceClient
      .from("subscriptions")
      .select("credits, plan")
      .eq("user_id", user.id)
      .single();

    if (sub && sub.plan !== "lifetime" && (sub.credits || 0) < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits. Please upgrade your plan." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { expertise, location, limit = 50 } = await req.json();

    if (!expertise || expertise.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Expertise/skill is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Search service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search across multiple job platforms
    const locationFilter = location ? ` ${location}` : "";
    const searchQueries = [
      `${expertise} jobs hiring${locationFilter} site:linkedin.com/jobs OR site:indeed.com OR site:glassdoor.com`,
      `${expertise} job openings${locationFilter} site:wellfound.com OR site:remote.co OR site:weworkremotely.com OR site:dice.com`,
    ];

    const allJobs: any[] = [];
    const seenUrls = new Set<string>();

    for (const query of searchQueries) {
      try {
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: Math.min(limit, 30),
            tbs: "qdr:d", // Last 24 hours
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        const data = await response.json();

        if (data.success !== false && data.data) {
          for (const result of data.data) {
            if (seenUrls.has(result.url)) continue;
            seenUrls.add(result.url);

            // Extract platform name from URL
            let platform = "Other";
            if (result.url?.includes("linkedin.com")) platform = "LinkedIn";
            else if (result.url?.includes("indeed.com")) platform = "Indeed";
            else if (result.url?.includes("glassdoor.com")) platform = "Glassdoor";
            else if (result.url?.includes("wellfound.com")) platform = "Wellfound";
            else if (result.url?.includes("remote.co")) platform = "Remote.co";
            else if (result.url?.includes("weworkremotely.com")) platform = "WeWorkRemotely";
            else if (result.url?.includes("dice.com")) platform = "Dice";
            else if (result.url?.includes("ziprecruiter.com")) platform = "ZipRecruiter";

            // Parse job info from search result
            const title = result.title || "Untitled Position";
            const description = result.description || "";
            
            // Try to extract company name from title (often "Job Title - Company Name")
            const titleParts = title.split(/\s[-–|]\s/);
            const jobTitle = titleParts[0]?.trim() || title;
            const company = titleParts.length > 1 ? titleParts[titleParts.length - 1]?.trim() : "Company";

            allJobs.push({
              id: crypto.randomUUID(),
              jobTitle,
              company,
              platform,
              url: result.url,
              description: description.substring(0, 500),
              fullContent: result.markdown?.substring(0, 3000) || description,
              location: locationFilter.trim() || "Remote/Not specified",
              postedDate: "Within 24 hours",
              selected: false,
            });
          }
        }
      } catch (searchErr) {
        console.error("Search query failed:", searchErr);
      }
    }

    // Deduct 1 credit for search
    if (sub && sub.plan !== "lifetime") {
      await serviceClient
        .from("subscriptions")
        .update({ credits: Math.max(0, (sub.credits || 0) - 1) })
        .eq("user_id", user.id);
    }

    console.log(`Found ${allJobs.length} jobs for "${expertise}" search`);

    return new Response(
      JSON.stringify({
        jobs: allJobs.slice(0, limit),
        total: allJobs.length,
        expertise,
        location: locationFilter.trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-jobs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to search jobs" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
