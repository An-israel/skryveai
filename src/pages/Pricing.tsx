import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, Users, Zap, Star } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    basic: { monthly: PlanPricing };
    popular: { monthly: PlanPricing; yearly: PlanPricing };
    unlimited: { monthly: PlanPricing };
    team_basic: { monthly: PlanPricing; yearly: PlanPricing };
    team_pro: { monthly: PlanPricing; yearly: PlanPricing };
  };
}

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const p = pricing?.plans;

  return (
    <div className="min-h-screen bg-gradient-subtle py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 sm:mb-12">
          <img src="/logo.png" alt="SkryveAI logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-2xl sm:text-3xl" style={{ color: '#0B162B' }}>SkryveAI</span>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-3">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-xl text-muted-foreground">
            Start with a free trial. No credit card required.
          </p>
          <Badge variant="secondary" className="mt-3">
            Showing prices in {pricing?.currencyName || "your currency"}
          </Badge>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center mb-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-64">
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="teams" className="gap-1">
                <Users className="w-3.5 h-3.5" />
                Teams
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tab === "individual" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Basic */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="relative h-full">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Basic</CardTitle>
                  <CardDescription>For freelancers just starting out</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">{p?.basic.monthly.display || "₦5,000"}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">50 credits/month • Up to 250 emails/month</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {["AI-powered business discovery", "Find Clients mode only", "Automated website analysis", "Personalized pitch generation", "Email sending & tracking"].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => handleSubscribe("basic")} className="w-full" variant="outline" disabled={!!processingPlan}>
                    {processingPlan === "basic" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Popular (Monthly/Yearly) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="relative h-full border-primary shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary gap-1"><Star className="w-3 h-3" /> Most Popular</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Popular</CardTitle>
                  <CardDescription>Full access to all tools</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">{p?.popular.monthly.display || "₦7,000"}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">100 credits/month • Up to 500 emails/month</p>
                  {p?.popular.yearly && (
                    <p className="text-xs text-primary font-medium mt-1">
                      or {p.popular.yearly.display}/year — save {p.popular.yearly.savings}%
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {["AI-powered business discovery", "All campaign modes", "Find Clients + Pitch a Client", "Find Investors mode", "Automated website analysis", "Personalized pitch generation", "Email sending & tracking", "Reply detection", "Campaign analytics", "Auto follow-up emails", "⚡ Auto-Pilot Mode"].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    <Button onClick={() => handleSubscribe("monthly")} className="w-full" disabled={!!processingPlan}>
                      {processingPlan === "monthly" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Subscribe Monthly
                    </Button>
                    <Button onClick={() => handleSubscribe("yearly")} className="w-full" variant="outline" disabled={!!processingPlan}>
                      {processingPlan === "yearly" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Subscribe Yearly (Save {p?.popular.yearly?.savings || 12}%)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Unlimited */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="relative h-full bg-gradient-to-br from-card to-accent/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary" className="gap-1"><Zap className="w-3 h-3" /> Unlimited</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Unlimited</CardTitle>
                  <CardDescription>No limits, ever</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">{p?.unlimited.monthly.display || "₦15,000"}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Unlimited credits</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {["Everything in Popular", "Unlimited credits", "⚡ Auto-Pilot Mode", "Priority support", "All future features", "No campaign limits"].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => handleSubscribe("unlimited")} className="w-full bg-gradient-accent" disabled={!!processingPlan}>
                    {processingPlan === "unlimited" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Go Unlimited
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ) : (
          /* Teams Tab */
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {/* Team Basic */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="relative h-full">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Users className="w-5 h-5" /> Basic Team
                  </CardTitle>
                  <CardDescription>For small agencies</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">{p?.team_basic.monthly.display || "₦18,000"}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {p?.team_basic.yearly && (
                    <p className="text-xs text-primary font-medium mt-1">
                      or {p.team_basic.yearly.display}/year — save {p.team_basic.yearly.savings}%
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {[
                      "Team of up to 7 members",
                      "300 credits/month shared",
                      "Up to 1,500 emails/month",
                      "5 expertise profiles",
                      "All campaign modes",
                      "Invite team via email",
                      "Shared campaign analytics",
                      "Auto follow-up emails",
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    <Button onClick={() => handleSubscribe("team_basic")} className="w-full" disabled={!!processingPlan}>
                      {processingPlan === "team_basic" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Subscribe Monthly
                    </Button>
                    <Button onClick={() => handleSubscribe("team_basic")} className="w-full" variant="outline" disabled={!!processingPlan}>
                      Subscribe Yearly (Save {p?.team_basic.yearly?.savings || 15}%)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Team Pro */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="relative h-full border-primary shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary gap-1"><Crown className="w-3 h-3" /> Best for Agencies</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Users className="w-5 h-5" /> Pro Team
                  </CardTitle>
                  <CardDescription>For growing agencies</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">{p?.team_pro.monthly.display || "₦30,000"}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {p?.team_pro.yearly && (
                    <p className="text-xs text-primary font-medium mt-1">
                      or {p.team_pro.yearly.display}/year — save {p.team_pro.yearly.savings}%
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {[
                      "Team of up to 15 members",
                      "500 credits/month shared",
                      "Up to 2,500 emails/month",
                      "12 expertise profiles",
                      "All campaign modes",
                      "Invite team via email",
                      "Shared campaign analytics",
                      "Priority support",
                      "Auto follow-up emails",
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    <Button onClick={() => handleSubscribe("team_pro")} className="w-full" disabled={!!processingPlan}>
                      {processingPlan === "team_pro" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Subscribe Monthly
                    </Button>
                    <Button onClick={() => handleSubscribe("team_pro")} className="w-full" variant="outline" disabled={!!processingPlan}>
                      Subscribe Yearly (Save {p?.team_pro.yearly?.savings || 17}%)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include a 7-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
