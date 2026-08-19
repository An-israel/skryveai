// Single source of truth for plan pricing. Used by both get-exchange-rates
// (what the pricing page displays) and initialize-payment (what Paystack
// actually charges). These used to be two separately hand-maintained
// tables that could drift — e.g. a USD user could be shown one price and
// charged another, since the displayed USD amount was derived by
// converting the NGN price at a rough exchange rate, while the actual
// charge used this fixed PRICING_USD table.
//
// All amounts are in the smallest currency unit (kobo for NGN, cents for USD).

export const PRICING_NGN: Record<string, number> = {
  basic: 500000,
  monthly: 700000,
  yearly: 7400000,
  unlimited: 1500000,
  business: 2500000,          // ₦25,000/mo — Business plan (unlocks Sonder)
  team_basic: 1800000,
  team_basic_yearly: 18400000,
  team_pro: 3000000,
  team_pro_yearly: 30000000,
};

// Non-African NGN prices (add ~5000 NGN equivalent on monthly, proportional on yearly)
export const PRICING_NGN_NONAF: Record<string, number> = {
  basic: 1000000,
  monthly: 1200000,
  yearly: 12600000,
  unlimited: 2000000,
  business: 3000000,          // ₦30,000/mo — Business plan (non-African)
  team_basic: 2300000,
  team_basic_yearly: 23500000,
  team_pro: 3500000,
  team_pro_yearly: 35000000,
};

// Paystack only ever charges non-African customers in NGN or USD (see
// initialize-payment), so this is the one price every non-NGN buyer
// actually pays, regardless of what currency their pricing page display
// is localized to.
export const PRICING_USD: Record<string, number> = {
  basic: 500,
  monthly: 800,
  yearly: 8400,
  unlimited: 1300,
  business: 1700,             // ~$17 — Business plan
  team_basic: 1500,
  team_basic_yearly: 15300,
  team_pro: 2500,
  team_pro_yearly: 25000,
};

export const PLAN_CREDITS: Record<string, number> = {
  basic: 50,
  monthly: 100,
  yearly: 1200,
  unlimited: -1,
  business: -1,
  team_basic: 300,
  team_basic_yearly: 3600,
  team_pro: -1,
  team_pro_yearly: -1,
};

export const AFRICAN_COUNTRIES = [
  "NG", "GH", "KE", "ZA", "UG", "TZ", "RW", "ET", "EG", "MA",
  "SN", "CI", "CM", "BJ", "BF", "ML", "NE", "TD", "CF", "CG",
  "CD", "AO", "MZ", "ZW", "BW", "NA", "SZ", "LS", "MW", "ZM",
];
