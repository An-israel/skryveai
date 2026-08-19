import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PRICING_NGN, PRICING_USD, AFRICAN_COUNTRIES } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fixed prices for specific currencies
const CURRENCY_CONFIG: Record<string, { symbol: string; name: string; divisor: number }> = {
  NGN: { symbol: "₦", name: "Nigerian Naira", divisor: 100 },
  USD: { symbol: "$", name: "US Dollar", divisor: 100 },
};

// initialize-payment only ever charges a customer in NGN (African country or
// NGN currency) or USD (everyone else) — it has no EUR/GBP/GHS/KES/ZAR
// pricing of its own. Displaying a localized price in one of those other
// currencies here used to be pure fiction: the buyer would see e.g. "£12"
// on this page but their card would actually be charged in USD. So this
// only ever resolves to NGN or USD — the two currencies a buyer can
// actually be charged in — sourced from the same tables initialize-payment
// charges from, so display and charge amount always agree.
function resolveCurrency(countryCode: string): string {
  return countryCode === "NG" ? "NGN" : "USD";
}

function formatPrice(amount: number, config: { symbol: string; divisor: number }): string {
  const value = Math.ceil(amount / config.divisor);
  return `${config.symbol}${value.toLocaleString()}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const countryCode = url.searchParams.get("country")?.toUpperCase() || "US";
    const isAfrican = AFRICAN_COUNTRIES.includes(countryCode);
    const currency = resolveCurrency(countryCode);
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
    // Same tables initialize-payment charges from (see resolveCurrency above),
    // so whatever is shown here is exactly what Paystack will bill.
    const prices = currency === "NGN" ? PRICING_NGN : PRICING_USD;

    const popularMonthlyAnnual = prices.monthly * 12;
    const popularYearlySavings = Math.round(((popularMonthlyAnnual - prices.yearly) / popularMonthlyAnnual) * 100);

    const tbMonthlyAnnual = prices.team_basic * 12;
    const tbYearlySavings = Math.round(((tbMonthlyAnnual - prices.team_basic_yearly) / tbMonthlyAnnual) * 100);

    const tpMonthlyAnnual = prices.team_pro * 12;
    const tpYearlySavings = Math.round(((tpMonthlyAnnual - prices.team_pro_yearly) / tpMonthlyAnnual) * 100);

    const result = {
      currency,
      symbol: config.symbol,
      currencyName: config.name,
      countryCode,
      isAfrican,
      plans: {
        basic: {
          monthly: {
            amount: prices.basic,
            display: formatPrice(prices.basic, config),
            period: "month",
          },
        },
        popular: {
          monthly: {
            amount: prices.monthly,
            display: formatPrice(prices.monthly, config),
            period: "month",
          },
          yearly: {
            amount: prices.yearly,
            display: formatPrice(prices.yearly, config),
            period: "year",
            savings: popularYearlySavings,
          },
        },
        unlimited: {
          monthly: {
            amount: prices.unlimited,
            display: formatPrice(prices.unlimited, config),
            period: "month",
          },
        },
        team_basic: {
          monthly: {
            amount: prices.team_basic,
            display: formatPrice(prices.team_basic, config),
            period: "month",
          },
          yearly: {
            amount: prices.team_basic_yearly,
            display: formatPrice(prices.team_basic_yearly, config),
            period: "year",
            savings: tbYearlySavings,
          },
        },
        team_pro: {
          monthly: {
            amount: prices.team_pro,
            display: formatPrice(prices.team_pro, config),
            period: "month",
          },
          yearly: {
            amount: prices.team_pro_yearly,
            display: formatPrice(prices.team_pro_yearly, config),
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
