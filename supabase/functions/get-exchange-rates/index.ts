import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base prices in USD cents
const BASE_PRICES_USD = {
  monthly: 800, // $8
  yearly: 9000, // $90 (save ~6%)
  lifetime: 16700, // $167
};

// Fixed prices for specific currencies (in smallest unit)
const FIXED_PRICES: Record<string, { monthly: number; yearly: number; lifetime: number; symbol: string; name: string }> = {
  NGN: { monthly: 1200000, yearly: 13500000, lifetime: 25000000, symbol: "₦", name: "Nigerian Naira" },
  GHS: { monthly: 12000, yearly: 135000, lifetime: 250000, symbol: "₵", name: "Ghanaian Cedi" },
  KES: { monthly: 100000, yearly: 1125000, lifetime: 2100000, symbol: "KSh", name: "Kenyan Shilling" },
  ZAR: { monthly: 15000, yearly: 168750, lifetime: 315000, symbol: "R", name: "South African Rand" },
  USD: { monthly: 800, yearly: 9000, lifetime: 16700, symbol: "$", name: "US Dollar" },
  EUR: { monthly: 750, yearly: 8500, lifetime: 15500, symbol: "€", name: "Euro" },
  GBP: { monthly: 650, yearly: 7300, lifetime: 13500, symbol: "£", name: "British Pound" },
};

// Country to currency mapping
const COUNTRY_CURRENCY: Record<string, string> = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  US: "USD",
  GB: "GBP",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const countryCode = url.searchParams.get("country")?.toUpperCase() || "US";

    // Get currency for country
    const currency = COUNTRY_CURRENCY[countryCode] || "USD";
    const prices = FIXED_PRICES[currency] || FIXED_PRICES.USD;

    // Calculate savings percentage for yearly
    const monthlyAnnual = prices.monthly * 12;
    const yearlySavings = Math.round(((monthlyAnnual - prices.yearly) / monthlyAnnual) * 100);

    return new Response(JSON.stringify({
      currency,
      symbol: prices.symbol,
      currencyName: prices.name,
      countryCode,
      prices: {
        monthly: {
          amount: prices.monthly,
          display: `${prices.symbol}${(prices.monthly / 100).toLocaleString()}`,
          period: "month",
        },
        yearly: {
          amount: prices.yearly,
          display: `${prices.symbol}${(prices.yearly / 100).toLocaleString()}`,
          period: "year",
          savings: yearlySavings,
        },
        lifetime: {
          amount: prices.lifetime,
          display: `${prices.symbol}${(prices.lifetime / 100).toLocaleString()}`,
          period: "one-time",
        },
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get exchange rates error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
