import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Check, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PricingData {
  currency: string;
  symbol: string;
  currencyName: string;
  prices: {
    monthly: { amount: number; display: string; period: string };
    yearly: { amount: number; display: string; period: string; savings: number };
    lifetime: { amount: number; display: string; period: string };
  };
}

const FEATURES = [
  "AI-powered business discovery",
  "Automated website analysis",
  "Personalized pitch generation",
  "Email sending & tracking",
  "Reply detection",
  "Campaign analytics",
  "Priority support",
];

export default function Pricing() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>("US");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Detect user's country
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
        const { data, error } = await supabase.functions.invoke("get-exchange-rates", {
          body: null,
          headers: {},
        });

        // Using query params approach
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-exchange-rates?country=${userCountry}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
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

    if (userCountry) {
      fetchPricing();
    }
  }, [userCountry]);

  const handleSubscribe = async (plan: "monthly" | "yearly" | "lifetime") => {
    setProcessingPlan(plan);

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to sign in before subscribing",
        });
        navigate("/login?redirect=/pricing");
        return;
      }

      // Initialize payment
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          plan,
          currency: pricing?.currency || "NGN",
          callbackUrl: `${window.location.origin}/payment/callback`,
        },
      });

      if (error) throw error;

      // Redirect to Paystack checkout
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to initialize payment";
      toast({
        title: "Payment error",
        description: message,
        variant: "destructive",
      });
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

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-2 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl">OutreachPro</span>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">
            Start with a free trial. No credit card required.
          </p>
          <Badge variant="secondary" className="mt-4">
            Showing prices in {pricing?.currencyName || "your currency"}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Monthly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative h-full">
              <CardHeader>
                <CardTitle className="text-xl">Monthly</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {pricing?.prices.monthly.display || "₦12,000"}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {FEATURES.slice(0, 5).map(feature => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe("monthly")}
                  className="w-full"
                  variant="outline"
                  disabled={!!processingPlan}
                >
                  {processingPlan === "monthly" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Yearly - Most Popular */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative h-full border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Most Popular - Save {pricing?.prices.yearly.savings || 6}%</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Yearly</CardTitle>
                <CardDescription>Best value for serious freelancers</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {pricing?.prices.yearly.display || "₦135,000"}
                  </span>
                  <span className="text-muted-foreground">/year</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {FEATURES.map(feature => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe("yearly")}
                  className="w-full"
                  disabled={!!processingPlan}
                >
                  {processingPlan === "yearly" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Subscribe Yearly
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Lifetime */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative h-full bg-gradient-to-br from-card to-accent/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="secondary" className="gap-1">
                  <Crown className="w-3 h-3" /> Lifetime Access
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Lifetime</CardTitle>
                <CardDescription>Pay once, use forever</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {pricing?.prices.lifetime.display || "₦250,000"}
                  </span>
                  <span className="text-muted-foreground"> one-time</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {FEATURES.map(feature => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">All future updates</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleSubscribe("lifetime")}
                  className="w-full bg-gradient-accent"
                  disabled={!!processingPlan}
                >
                  {processingPlan === "lifetime" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Get Lifetime Access
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="text-center mt-12 text-muted-foreground">
          <p>All plans include a free trial. No credit card required.</p>
          <p className="mt-2">
            First 30 users get <strong>14 days free</strong>, others get 3 days.
          </p>
        </div>
      </div>
    </div>
  );
}
