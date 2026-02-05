import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  businessType: string;
  location: string;
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      throw new Error("Supabase environment variables not configured");
    }

    // Use service role key to validate the user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Extract the token and validate it
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error("Auth error:", authError.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!user) {
      console.error("No user found for token");
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      throw new Error("GOOGLE_PLACES_API_KEY is not configured");
    }

    const { businessType, location, limit = 20 }: SearchRequest = await req.json();

    // Input validation
    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ error: "businessType and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input lengths to prevent abuse
    if (businessType.length > 100 || location.length > 200) {
      return new Response(
        JSON.stringify({ error: "Input too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and validate limit
    const sanitizedLimit = Math.min(Math.max(1, Number(limit) || 20), 30);

    // Step 1: Text search to find places
    const query = `${businessType} in ${location}`;
    console.log(`Searching for: "${query}"`);
    
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const searchResponse = await fetch(textSearchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", searchData);
      throw new Error(`Google Places API error: ${searchData.status}`);
    }

    const places = searchData.results?.slice(0, sanitizedLimit) || [];
    console.log(`Found ${places.length} places from Google`);
    
    // Step 2: Get details for each place (website, phone, etc.)
    const businesses = await Promise.all(
      places.map(async (place: any) => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types&key=${GOOGLE_PLACES_API_KEY}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          const details = detailsData.result || {};
          
          return {
            id: crypto.randomUUID(),
            name: details.name || place.name,
            address: details.formatted_address || place.formatted_address,
            phone: details.formatted_phone_number || null,
            website: details.website || null,
            rating: details.rating || place.rating || null,
            reviewCount: details.user_ratings_total || place.user_ratings_total || null,
            category: (details.types || place.types || []).join(", "),
            placeId: place.place_id,
            selected: false,
          };
        } catch (error) {
          console.error("Error fetching place details:", error);
          return {
            id: crypto.randomUUID(),
            name: place.name,
            address: place.formatted_address,
            phone: null,
            website: null,
            rating: place.rating || null,
            reviewCount: place.user_ratings_total || null,
            category: (place.types || []).join(", "),
            placeId: place.place_id,
            selected: false,
          };
        }
      })
    );

    console.log(`Returning ${businesses.length} businesses for "${query}"`);

    return new Response(
      JSON.stringify({ businesses, total: businesses.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-businesses:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
