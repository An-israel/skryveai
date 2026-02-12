import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All prices in smallest currency unit (kobo for NGN, cents for USD, etc.)
// African countries get base price; non-African pay +5000 NGN equivalent extra
const AFRICAN_PRICES_NGN = {
  basic: { monthly: 500000 },           // 5,000 NGN
  popular: { monthly: 700000, yearly: 7400000 },  // 7,000 / 74,000 NGN (save 12%)
  unlimited: { monthly: 1500000 },       // 15,000 NGN
  team_basic: { monthly: 1800000, yearly: 18400000 }, // 18,000 / 184,000 (save 15%)
  team_pro: { monthly: 3000000, yearly: 30000000 },   // 30,000 / 300,000 (save 17%)
};

const NON_AFRICAN_PRICES_NGN = {
  basic: { monthly: 1000000 },           // 10,000 NGN
  popular: { monthly: 1200000, yearly: 12600000 }, // 12,000 / 126,000
  unlimited: { monthly: 2000000 },       // 20,000 NGN
  team_basic: { monthly: 2300000, yearly: 23500000 },
  team_pro: { monthly: 3500000, yearly: 35000000 },
};

// Fixed prices for specific currencies
const CURRENCY_CONFIG: Record<string, { symbol: string; name: string; divisor: number }> = {
  NGN: { symbol: "₦", name: "Nigerian Naira", divisor: 100 },
  USD: { symbol: "$", name: "US Dollar", divisor: 100 },
  EUR: { symbol: "€", name: "Euro", divisor: 100 },
  GBP: { symbol: "£", name: "British Pound", divisor: 100 },
  GHS: { symbol: "₵", name: "Ghanaian Cedi", divisor: 100 },
  KES: { symbol: "KSh", name: "Kenyan Shilling", divisor: 100 },
  ZAR: { symbol: "R", name: "South African Rand", divisor: 100 },
};

const AFRICAN_COUNTRIES = [
  "NG", "GH", "KE", "ZA", "UG", "TZ", "RW", "ET", "EG", "MA",
  "SN", "CI", "CM", "BJ", "BF", "ML", "NE", "TD", "CF", "CG",
  "CD", "AO", "MZ", "ZW", "BW", "NA", "SZ", "LS", "MW", "ZM",
];

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: "NGN", GH: "GHS", KE: "KES", ZA: "ZAR",
  US: "USD", GB: "GBP",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
  SE: "EUR", DK: "EUR", NO: "EUR", CH: "EUR", PL: "EUR",
};

// Rough NGN to other currency conversion rates
const NGN_RATES: Record<string, number> = {
  NGN: 1,
  USD: 0.00063,
  EUR: 0.00058,
  GBP: 0.00050,
  GHS: 0.0095,
  KES: 0.082,
  ZAR: 0.0114,
};

function convertFromNGN(amountKobo: number, currency: string): number {
  const rate = NGN_RATES[currency] || NGN_RATES.USD;
  return Math.round(amountKobo * rate);
}

function formatPrice(amount: number, config: { symbol: string; divisor: number }): string {
  return `${config.symbol}${(amount / config.divisor).toLocaleString()}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const countryCode = url.searchParams.get("country")?.toUpperCase() || "US";
    const isAfrican = AFRICAN_COUNTRIES.includes(countryCode);
    const currency = COUNTRY_CURRENCY[countryCode] || "USD";
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
    const basePrices = isAfrican ? AFRICAN_PRICES_NGN : NON_AFRICAN_PRICES_NGN;

    const convert = (kobo: number) => currency === "NGN" ? kobo : convertFromNGN(kobo, currency);

    const popularMonthlyAnnual = basePrices.popular.monthly * 12;
    const popularYearlySavings = Math.round(((popularMonthlyAnnual - basePrices.popular.yearly) / popularMonthlyAnnual) * 100);

    const tbMonthlyAnnual = basePrices.team_basic.monthly * 12;
    const tbYearlySavings = Math.round(((tbMonthlyAnnual - basePrices.team_basic.yearly) / tbMonthlyAnnual) * 100);

    const tpMonthlyAnnual = basePrices.team_pro.monthly * 12;
    const tpYearlySavings = Math.round(((tpMonthlyAnnual - basePrices.team_pro.yearly) / tpMonthlyAnnual) * 100);

    const result = {
      currency,
      symbol: config.symbol,
      currencyName: config.name,
      countryCode,
      isAfrican,
      plans: {
        basic: {
          monthly: {
            amount: convert(basePrices.basic.monthly),
            display: formatPrice(convert(basePrices.basic.monthly), config),
            period: "month",
          },
        },
        popular: {
          monthly: {
            amount: convert(basePrices.popular.monthly),
            display: formatPrice(convert(basePrices.popular.monthly), config),
            period: "month",
          },
          yearly: {
            amount: convert(basePrices.popular.yearly),
            display: formatPrice(convert(basePrices.popular.yearly), config),
            period: "year",
            savings: popularYearlySavings,
          },
        },
        unlimited: {
          monthly: {
            amount: convert(basePrices.unlimited.monthly),
            display: formatPrice(convert(basePrices.unlimited.monthly), config),
            period: "month",
          },
        },
        team_basic: {
          monthly: {
            amount: convert(basePrices.team_basic.monthly),
            display: formatPrice(convert(basePrices.team_basic.monthly), config),
            period: "month",
          },
          yearly: {
            amount: convert(basePrices.team_basic.yearly),
            display: formatPrice(convert(basePrices.team_basic.yearly), config),
            period: "year",
            savings: tbYearlySavings,
          },
        },
        team_pro: {
          monthly: {
            amount: convert(basePrices.team_pro.monthly),
            display: formatPrice(convert(basePrices.team_pro.monthly), config),
            period: "month",
          },
          yearly: {
            amount: convert(basePrices.team_pro.yearly),
            display: formatPrice(convert(basePrices.team_pro.yearly), config),
            period: "year",
            savings: tpYearlySavings,
          },
        },
      },
    };

    return new Response(JSON.stringify(result), {
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
