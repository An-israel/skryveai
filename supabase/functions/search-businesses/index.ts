import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error("GOOGLE_PLACES_API_KEY is not configured");
    }

    const { businessType, location, limit = 20 }: SearchRequest = await req.json();

    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ error: "businessType and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Text search to find places
    const query = `${businessType} in ${location}`;
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const searchResponse = await fetch(textSearchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", searchData);
      throw new Error(`Google Places API error: ${searchData.status}`);
    }

    const places = searchData.results?.slice(0, limit) || [];
    
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

    console.log(`Found ${businesses.length} businesses for "${query}"`);

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
