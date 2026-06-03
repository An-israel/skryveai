import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Check, Crown, Loader2, Users, Zap, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PlanPricing {
  amount: number;
  display: string;
  period: string;
  savings?: number;
}

interface PricingData {
  currency: string;
  symbol: string;
  currencyName: string;
  plans: {
    basic:      { monthly: PlanPricing };
    popular:    { monthly: PlanPricing; yearly: PlanPricing };
    unlimited:  { monthly: PlanPricing };
    team_basic: { monthly: PlanPricing; yearly: PlanPricing };
    team_pro:   { monthly: PlanPricing; yearly: PlanPricing };
  };
}

// ── Individual plan definitions ────────────────────────────────────────────────

const INDIVIDUAL_PLANS = [
  {
    id: "basic",
    name: "Basic",
    sub: "For freelancers just starting out",
    featured: false,
    credits: "50 credits/month · up to 250 emails/month",
    features: [
      "AI-powered business discovery",
      "Find Clients mode only",
      "Automated website analysis",
      "Personalized pitch generation",
      "Email sending & tracking",
    ],
    cta: "Get Started",
  },
  {
    id: "popular",
    name: "Popular",
    sub: "Full access to all tools",
    featured: true,
    badge: "Most Popular",
    credits: "100 credits/month · up to 500 emails/month",
    features: [
      "AI-powered business discovery",
      "All campaign modes",
      "Find Clients + Pitch a Client",
      "Find Investors mode",
      "Automated website analysis",
      "Personalized pitch generation",
      "Email sending & tracking",
      "Reply detection",
      "Campaign analytics",
      "Auto follow-up emails",
      "Auto-Pilot Mode",
    ],
    cta: "Subscribe Monthly",
    ctaYearly: "Subscribe Yearly",
  },
  {
    id: "unlimited",
    name: "Unlimited",
    sub: "No limits, ever",
    featured: false,
    badge: "Unlimited",
    credits: "Unlimited credits",
    features: [
      "Everything in Popular",
      "Unlimited credits",
      "Auto-Pilot Mode",
      "Priority support",
      "All future features",
      "No campaign limits",
    ],
    cta: "Go Unlimited",
  },
];

const TEAM_PLANS = [
  {
    id: "team_basic",
    name: "Basic Team",
    sub: "For small agencies",
    featured: false,
    features: [
      "Team of up to 7 members",
      "300 credits/month shared",
      "Up to 1,500 emails/month",
      "5 expertise profiles",
      "All campaign modes",
      "Invite team via email",
      "Shared campaign analytics",
      "Auto follow-up emails",
    ],
  },
  {
    id: "team_pro",
    name: "Pro Team",
    sub: "For growing agencies",
    featured: true,
    badge: "Best for Agencies",
    features: [
      "Team of up to 15 members",
      "500 credits/month shared",
      "Up to 2,500 emails/month",
      "12 expertise profiles",
      "All campaign modes",
      "Invite team via email",
      "Shared campaign analytics",
      "Priority support",
      "Auto follow-up emails",
    ],
  },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Pricing() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>("US");
  const [tab, setTab] = useState<"individual" | "teams">("individual");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/country/");
        const country = await response.text();
        setUserCountry(country.trim());
      } catch {
        setUserCountry("US");
      }
    };
    detectCountry();
  }, []);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-exchange-rates?country=${userCountry}`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (response.ok) {
          const pricingData = await response.json();
          setPricing(pricingData);
        }
      } catch (error) {
        console.error("Failed to fetch pricing:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userCountry) fetchPricing();
  }, [userCountry]);

  const handleSubscribe = async (plan: string) => {
    setProcessingPlan(plan);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in", description: "You need to sign in before subscribing" });
        navigate("/login?redirect=/pricing");
        return;
      }
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          plan,
          currency: pricing?.currency || "NGN",
          callbackUrl: `${window.location.origin}/payment/callback`,
          country: userCountry || "NG",
        },
      });
      if (error) throw error;
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to initialize payment";
      toast({ title: "Payment error", description: message, variant: "destructive" });
    } finally {
      setProcessingPlan(null);
    }
  };

  const p = pricing?.plans;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] py-20 px-4">
      <SEOHead
        title="SkryveAI Pricing — Affordable AI Outreach, CV Builder & LinkedIn Tools"
        description="Simple, transparent pricing for SkryveAI. Start with a free 7-day trial. AI cold outreach, CV builder, ATS checker, and LinkedIn analyzer — all in one affordable plan."
        canonical="https://skryveai.com/pricing"
        keywords="SkryveAI pricing, AI outreach pricing, cold email tool pricing, CV builder pricing, ATS checker free trial"
      />

      <div className="max-w-6xl mx-auto">

        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-16">
          <img src="/logo.png" alt="SkryveAI logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-2xl text-white">SkryveAI</span>
        </Link>

        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/50 text-[12px] font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block" />
            Showing prices in {pricing?.currencyName || "your local currency"}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
            Simple, transparent<br className="hidden sm:block" /> pricing
          </h1>
          <p className="text-[16px] text-white/50 max-w-md mx-auto">
            Start with a 7-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <button
              onClick={() => setTab("individual")}
              className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                tab === "individual"
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setTab("teams")}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                tab === "teams"
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Teams
            </button>
          </div>
        </div>

        {/* ── Individual Plans ── */}
        {tab === "individual" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Basic */}
            <div className="border border-white/[0.08] rounded-2xl bg-white/[0.03] p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-[15px] font-semibold text-white mb-1">
                  {INDIVIDUAL_PLANS[0].name}
                </p>
                <p className="text-[13px] text-white/40">{INDIVIDUAL_PLANS[0].sub}</p>
              </div>
              <div className="mb-2">
                <span className="text-4xl font-bold text-white">
                  {p?.basic.monthly.display || "₦5,000"}
                </span>
                <span className="text-white/40 text-[14px] ml-1">/month</span>
              </div>
              <p className="text-[12px] text-white/30 mb-8">{INDIVIDUAL_PLANS[0].credits}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {INDIVIDUAL_PLANS[0].features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                    <span className="text-[14px] text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("basic")}
                disabled={!!processingPlan}
                className="w-full py-3 rounded-xl border border-white/[0.1] text-white/70 text-[14px] font-medium hover:bg-white/[0.05] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {processingPlan === "basic" && <Loader2 className="w-4 h-4 animate-spin" />}
                {INDIVIDUAL_PLANS[0].cta}
              </button>
            </div>

            {/* Popular (featured) */}
            <div className="border border-[#2563EB]/40 rounded-2xl bg-[#2563EB]/5 p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563EB] text-white text-[11px] font-semibold">
                  <Star className="w-3 h-3" />
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <p className="text-[15px] font-semibold text-white mb-1">
                  {INDIVIDUAL_PLANS[1].name}
                </p>
                <p className="text-[13px] text-white/40">{INDIVIDUAL_PLANS[1].sub}</p>
              </div>
              <div className="mb-2">
                <span className="text-4xl font-bold text-white">
                  {p?.popular.monthly.display || "₦7,000"}
                </span>
                <span className="text-white/40 text-[14px] ml-1">/month</span>
              </div>
              <p className="text-[12px] text-white/30 mb-1">{INDIVIDUAL_PLANS[1].credits}</p>
              {p?.popular.yearly && (
                <p className="text-[12px] text-[#60a5fa] mb-8">
                  or {p.popular.yearly.display}/year — save {p.popular.yearly.savings}%
                </p>
              )}
              {!p?.popular.yearly && <div className="mb-8" />}
              <ul className="space-y-3 mb-8 flex-1">
                {INDIVIDUAL_PLANS[1].features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span className="text-[14px] text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <button
                  onClick={() => handleSubscribe("monthly")}
                  disabled={!!processingPlan}
                  className="w-full py-3 rounded-xl bg-white text-[#09090b] font-bold text-[14px] hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {processingPlan === "monthly" && <Loader2 className="w-4 h-4 animate-spin" />}
                  Subscribe Monthly
                </button>
                <button
                  onClick={() => handleSubscribe("yearly")}
                  disabled={!!processingPlan}
                  className="w-full py-3 rounded-xl border border-white/[0.1] text-white/70 text-[14px] font-medium hover:bg-white/[0.05] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {processingPlan === "yearly" && <Loader2 className="w-4 h-4 animate-spin" />}
                  Subscribe Yearly (Save {p?.popular.yearly?.savings || 12}%)
                </button>
              </div>
            </div>

            {/* Unlimited */}
            <div className="border border-white/[0.08] rounded-2xl bg-white/[0.03] p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.12] bg-white/[0.06] text-white/70 text-[11px] font-semibold">
                  <Zap className="w-3 h-3" />
                  Unlimited
                </span>
              </div>
              <div className="mb-6">
                <p className="text-[15px] font-semibold text-white mb-1">
                  {INDIVIDUAL_PLANS[2].name}
                </p>
                <p className="text-[13px] text-white/40">{INDIVIDUAL_PLANS[2].sub}</p>
              </div>
              <div className="mb-2">
                <span className="text-4xl font-bold text-white">
                  {p?.unlimited.monthly.display || "₦15,000"}
                </span>
                <span className="text-white/40 text-[14px] ml-1">/month</span>
              </div>
              <p className="text-[12px] text-white/30 mb-8">{INDIVIDUAL_PLANS[2].credits}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {INDIVIDUAL_PLANS[2].features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                    <span className="text-[14px] text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("unlimited")}
                disabled={!!processingPlan}
                className="w-full py-3 rounded-xl border border-white/[0.1] text-white/70 text-[14px] font-medium hover:bg-white/[0.05] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {processingPlan === "unlimited" && <Loader2 className="w-4 h-4 animate-spin" />}
                Go Unlimited
              </button>
            </div>
          </div>
        )}

        {/* ── Team Plans ── */}
        {tab === "teams" && (
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Team Basic */}
            <div className="border border-white/[0.08] rounded-2xl bg-white/[0.03] p-8 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-white/50" />
                  <p className="text-[15px] font-semibold text-white">{TEAM_PLANS[0].name}</p>
                </div>
                <p className="text-[13px] text-white/40">{TEAM_PLANS[0].sub}</p>
              </div>
              <div className="mb-2">
                <span className="text-4xl font-bold text-white">
                  {p?.team_basic.monthly.display || "₦18,000"}
                </span>
                <span className="text-white/40 text-[14px] ml-1">/month</span>
              </div>
              {p?.team_basic.yearly && (
                <p className="text-[12px] text-[#60a5fa] mb-8">
                  or {p.team_basic.yearly.display}/year — save {p.team_basic.yearly.savings}%
                </p>
              )}
              {!p?.team_basic.yearly && <div className="mb-8" />}
              <ul className="space-y-3 mb-8 flex-1">
                {TEAM_PLANS[0].features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                    <span className="text-[14px] text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <button
                  onClick={() => handleSubscribe("team_basic")}
                  disabled={!!processingPlan}
                  className="w-full py-3 rounded-xl border border-white/[0.1] text-white/70 text-[14px] font-medium hover:bg-white/[0.05] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {processingPlan === "team_basic" && <Loader2 className="w-4 h-4 animate-spin" />}
                  Subscribe Monthly
                </button>
                <button
                  onClick={() => handleSubscribe("team_basic")}
                  disabled={!!processingPlan}
                  className="w-full py-3 rounded-xl border border-white/[0.06] text-white/40 text-[14px] font-medium hover:bg-white/[0.05] hover:text-white/70 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  Subscribe Yearly (Save {p?.team_basic.yearly?.savings || 15}%)
                </button>
              </div>
            </div>

            {/* Team Pro (featured) */}
            <div className="border border-[#2563EB]/40 rounded-2xl bg-[#2563EB]/5 p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563EB] text-white text-[11px] font-semibold">
                  <Crown className="w-3 h-3" />
                  Best for Agencies
                </span>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-white/50" />
                  <p className="text-[15px] font-semibold text-white">{TEAM_PLANS[1].name}</p>
                </div>
                <p className="text-[13px] text-white/40">{TEAM_PLANS[1].sub}</p>
              </div>
              <div className="mb-2">
                <span className="text-4xl font-bold text-white">
                  {p?.team_pro.monthly.display || "₦30,000"}
                </span>
                <span className="text-white/40 text-[14px] ml-1">/month</span>
              </div>
              {p?.team_pro.yearly && (
                <p className="text-[12px] text-[#60a5fa] mb-8">
                  or {p.team_pro.yearly.display}/year — save {p.team_pro.yearly.savings}%
                </p>
              )}
              {!p?.team_pro.yearly && <div className="mb-8" />}
              <ul className="space-y-3 mb-8 flex-1">
                {TEAM_PLANS[1].features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span className="text-[14px] text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <button
                  onClick={() => handleSubscribe("team_pro")}
                  disabled={!!processingPlan}
                  className="w-full py-3 rounded-xl bg-white text-[#09090b] font-bold text-[14px] hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {processingPlan === "team_pro" && <Loader2 className="w-4 h-4 animate-spin" />}
                  Subscribe Monthly
                </button>
                <button
                  onClick={() => handleSubscribe("team_pro")}
                  disabled={!!processingPlan}
                  className="w-full py-3 rounded-xl border border-white/[0.1] text-white/70 text-[14px] font-medium hover:bg-white/[0.05] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  Subscribe Yearly (Save {p?.team_pro.yearly?.savings || 17}%)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-[13px] text-white/30 mt-12">
          All plans include a 7-day free trial. Cancel anytime. No credit card required.
        </p>
      </div>
    </div>
  );
}
