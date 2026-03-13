import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // Validate user token using service client
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`User ${user.id} searching for jobs`);

    // Credit check
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
      console.error("FIRECRAWL_API_KEY not configured");
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
        console.log("Searching:", query);
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: Math.min(limit, 30),
            tbs: "qdr:d",
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        const data = await response.json();
        console.log(`Search returned ${data.data?.length || 0} results`);

        if (data.success !== false && data.data) {
          for (const result of data.data) {
            if (seenUrls.has(result.url)) continue;
            seenUrls.add(result.url);

            let platform = "Other";
            if (result.url?.includes("linkedin.com")) platform = "LinkedIn";
            else if (result.url?.includes("indeed.com")) platform = "Indeed";
            else if (result.url?.includes("glassdoor.com")) platform = "Glassdoor";
            else if (result.url?.includes("wellfound.com")) platform = "Wellfound";
            else if (result.url?.includes("remote.co")) platform = "Remote.co";
            else if (result.url?.includes("weworkremotely.com")) platform = "WeWorkRemotely";
            else if (result.url?.includes("dice.com")) platform = "Dice";
            else if (result.url?.includes("ziprecruiter.com")) platform = "ZipRecruiter";

            const title = result.title || "Untitled Position";
            const description = result.description || "";
            
            const titleParts = title.split(/\s[-–|]\s/);
            const jobTitle = titleParts[0]?.trim() || title;
            const company = titleParts.length > 1 ? titleParts[titleParts.length - 1]?.trim() : "Company";

            // Try to extract email from the scraped content
            let email: string | null = null;
            const content = result.markdown || description;
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const emails = content.match(emailRegex) || [];
            const filteredEmails = emails.filter((e: string) => {
              const lower = e.toLowerCase();
              return !lower.includes("noreply") && !lower.includes("no-reply") && 
                     !lower.includes("example.com") && !lower.includes("support@") &&
                     !lower.includes("donotreply") && !lower.endsWith(".png") && !lower.endsWith(".jpg") &&
                     !lower.includes("careerguide@") && !lower.includes("@indeed.com") &&
                     !lower.includes("@linkedin.com") && !lower.includes("@glassdoor.com") &&
                     !lower.includes("@wellfound.com") && !lower.includes("@dice.com") &&
                     !lower.includes("@ziprecruiter.com") && !lower.includes("@weworkremotely.com") &&
                     !lower.includes("@remote.co") && !lower.includes("privacy@") &&
                     !lower.includes("info@indeed") && !lower.includes("feedback@") &&
                     !lower.includes("terms@") && !lower.includes("legal@");
            });
            if (filteredEmails.length > 0) {
              const priorityEmail = filteredEmails.find((e: string) => {
                const lower = e.toLowerCase();
                return lower.startsWith("hr@") || lower.startsWith("hiring@") || 
                       lower.startsWith("careers@") || lower.startsWith("jobs@") ||
                       lower.startsWith("recruit") || lower.startsWith("talent");
              });
              email = priorityEmail || filteredEmails[0];
            }

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
              email,
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
