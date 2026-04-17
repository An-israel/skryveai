import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, Loader2, Phone, Gift, CheckCircle2, Sparkles, Zap, Search, BarChart3, Bot, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const features = [
  { icon: Search, title: "Smart Business Discovery", desc: "Find ideal clients using AI-powered search across any industry and location" },
  { icon: BarChart3, title: "Website Audit & Scoring", desc: "Automatically analyze prospects' websites and identify improvement opportunities" },
  { icon: Sparkles, title: "AI-Generated Pitches", desc: "Personalized cold emails crafted by AI based on real website analysis" },
  { icon: Zap, title: "One-Click Send", desc: "Send verified emails directly from the platform with tracking built in" },
  { icon: Bot, title: "Auto-Pilot Mode", desc: "Set it and forget it — let AI find and pitch clients for you daily" },
];

export default function Signup() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    referralCode: referralCode,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setShowAnnouncement(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Check if referral code is valid
  useEffect(() => {
    if (referralCode) {
      const checkReferrer = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("referral_code", referralCode.toUpperCase())
          .single();
        
        if (data) {
          setReferrerName(data.full_name);
        }
      };
      checkReferrer();
    }
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use standard Supabase auth signup (no IP check)
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: formData.fullName,
            phone: formData.phone || null,
            referral_code: formData.referralCode ? formData.referralCode.toUpperCase() : null,
          },
        },
      });

      if (error) throw error;

      // Fire-and-forget welcome email (won't block signup if it fails)
      supabase.functions
        .invoke("send-welcome-email", {
          body: { email: formData.email, fullName: formData.fullName },
        })
        .catch((err) => console.warn("[welcome-email] dispatch failed:", err));

      setShowEmailConfirm(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast({
        title: "Sign up failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showEmailConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-subtle">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <Card className="border-0 shadow-xl text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Check Your Email ✉️</h2>
              <p className="text-muted-foreground">
                We've sent a confirmation link to <strong>{formData.email}</strong>. 
                Please check your inbox (and spam folder) and click the link to verify your account.
              </p>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Once verified, you can sign in and start using SkryveAI!
                </p>
              </div>
              <Button onClick={() => navigate("/login")} className="w-full" size="lg">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-subtle relative">
      {/* Welcome Announcement Overlay */}
      <AnimatePresence>
        {showAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAnnouncement(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
                <button
                  onClick={() => setShowAnnouncement(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Welcome to SkryveAI 🚀</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  The AI-powered outreach platform that helps freelancers & startups land more clients on autopilot.
                </p>
              </div>
              <div className="p-6 pt-4 space-y-3">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 shrink-0">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="px-6 pb-6">
                <Button
                  onClick={() => setShowAnnouncement(false)}
                  className="w-full"
                  size="lg"
                >
                  Let's Get Started
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-2">7-day free trial • No credit card required</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo.png" alt="SkryveAI logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-3xl" style={{ color: '#0B162B' }}>SkryveAI</span>
        </Link>

        <Card className="border-0 shadow-xl">
          {referrerName && (
            <Alert className="mx-6 mt-6 bg-primary/5 border-primary/20">
              <Gift className="h-4 w-4 text-primary" />
              <AlertDescription>
                You were referred by <strong>{referrerName}</strong>! You both get rewards when you subscribe.
              </AlertDescription>
            </Alert>
          )}
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Start landing more clients with AI-powered outreach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
