import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
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
      <SEOHead
        title="Skryve Pricing — Find Work, Get Hired, Grow Your Career"
        description="Simple, transparent pricing for Skryve, the freelance marketplace. Start free, then upgrade to Pro for more applications, visibility to clients, learning, and premium tools."
        canonical="https://skryveai.com/pricing"
        keywords="Skryve pricing, freelance marketplace, find jobs, get hired, CV builder, ATS checker, LinkedIn analyzer"
      />
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 sm:mb-12">
          <img src="/logo.png" alt="Skryve logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-2xl sm:text-3xl" style={{ color: '#0B162B' }}>Skryve</span>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-3">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-xl text-muted-foreground">
            Start free, no card required. Upgrade when you're ready to grow.
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Free */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="relative h-full">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Free</CardTitle>
                  <CardDescription>Explore everything, no card needed</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">{pricing?.symbol || "₦"}0</span>
                    <span className="text-muted-foreground">/forever</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Get started in seconds</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {["Browse & apply to jobs from 10+ platforms", "5 AI job proposals / month", "Create your talent profile", "1 AI CV build / month", "1 ATS scan / month", "Free courses & events"].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => navigate("/signup")} className="w-full" variant="outline">
                    Start Free
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Basic */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="relative h-full">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Basic</CardTitle>
                  <CardDescription>For active job seekers</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">{p?.basic.monthly.display || "₦5,000"}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">50 AI credits / month</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {["Everything in Free", "Unlimited AI job proposals", "Full AI CV builder + downloads", "Unlimited ATS scans", "LinkedIn profile analyzer", "Apply to marketplace projects"].map(f => (
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
                  <CardTitle className="text-lg sm:text-xl">Pro</CardTitle>
                  <CardDescription>Everything to get hired faster</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">{p?.popular.monthly.display || "₦7,000"}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">100 AI credits / month</p>
                  {p?.popular.yearly && (
                    <p className="text-xs text-primary font-medium mt-1">
                      or {p.popular.yearly.display}/year — save {p.popular.yearly.savings}%
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {["Everything in Basic", "Priority visibility to clients", "Full learning platform + AI coach", "Assignment reviews & certificates", "AI LinkedIn optimization guide", "Priority support"].map(f => (
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
                  <p className="text-xs text-muted-foreground mt-1">Unlimited AI credits</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {["Everything in Pro", "Unlimited AI credits", "Top placement in client searches", "Early access to new features", "Dedicated priority support"].map(f => (
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
                  <CardDescription>For small teams & agencies</CardDescription>
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
                      "Up to 7 team members",
                      "300 shared AI credits / month",
                      "5 team talent profiles",
                      "Apply to & manage projects together",
                      "Shared client messaging",
                      "Team analytics dashboard",
                      "Priority support",
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
                      "Up to 15 team members",
                      "500 shared AI credits / month",
                      "12 team talent profiles",
                      "Everything in Basic Team",
                      "Bulk proposals & applications",
                      "Advanced team analytics",
                      "Dedicated account manager",
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
          Free forever on the Free plan. Paid plans are billed monthly or yearly — cancel anytime.
        </p>
      </div>
    </div>
  );
}
