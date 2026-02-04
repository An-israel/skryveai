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
// Africa gets ₦5,000 discount on monthly/yearly (NOT lifetime)
const FIXED_PRICES: Record<string, { monthly: number; yearly: number; lifetime: number; symbol: string; name: string }> = {
  // African countries - discounted by 5000 NGN equivalent
  NGN: { monthly: 700000, yearly: 8500000, lifetime: 25000000, symbol: "₦", name: "Nigerian Naira" }, // 7,000 / 85,000 / 250,000
  GHS: { monthly: 7000, yearly: 85000, lifetime: 250000, symbol: "₵", name: "Ghanaian Cedi" }, // ~5000 NGN discount
  KES: { monthly: 60000, yearly: 680000, lifetime: 2100000, symbol: "KSh", name: "Kenyan Shilling" },
  ZAR: { monthly: 9000, yearly: 100000, lifetime: 315000, symbol: "R", name: "South African Rand" },
  UGX: { monthly: 2000000, yearly: 22500000, lifetime: 55000000, symbol: "USh", name: "Ugandan Shilling" },
  TZS: { monthly: 1500000, yearly: 17000000, lifetime: 42000000, symbol: "TSh", name: "Tanzanian Shilling" },
  RWF: { monthly: 700000, yearly: 7900000, lifetime: 20000000, symbol: "FRw", name: "Rwandan Franc" },
  // US and Europe - original prices
  USD: { monthly: 800, yearly: 9000, lifetime: 16700, symbol: "$", name: "US Dollar" },
  EUR: { monthly: 750, yearly: 8500, lifetime: 15500, symbol: "€", name: "Euro" },
  GBP: { monthly: 650, yearly: 7300, lifetime: 13500, symbol: "£", name: "British Pound" },
};

// Country to currency mapping
const COUNTRY_CURRENCY: Record<string, string> = {
  // African countries
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  UG: "UGX",
  TZ: "TZS",
  RW: "RWF",
  ET: "NGN", // Ethiopia - use NGN pricing
  EG: "NGN", // Egypt - use NGN pricing
  MA: "NGN", // Morocco - use NGN pricing
  SN: "NGN", // Senegal - use NGN pricing
  CI: "NGN", // Ivory Coast - use NGN pricing
  CM: "NGN", // Cameroon - use NGN pricing
  // US
  US: "USD",
  // UK
  GB: "GBP",
  // Europe
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
  SE: "EUR",
  DK: "EUR",
  NO: "EUR",
  CH: "EUR",
  PL: "EUR",
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
