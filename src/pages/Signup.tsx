import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const defaultRole = searchParams.get("role") === "client" ? "client" : "talent";

  const [selectedRole, setSelectedRole] = useState<"talent" | "client">(defaultRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!referralCode) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("referral_code", referralCode.toUpperCase())
      .single()
      .then(({ data }) => {
        if (data) setReferrerName(data.full_name);
      });
  }, [referralCode]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/dashboard",
        queryParams: { role: selectedRole },
      },
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast({
        title: "Terms required",
        description: "Please agree to the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/login",
          data: {
            full_name: fullName,
            role: selectedRole,
            referral_code: referralCode ? referralCode.toUpperCase() : null,
          },
        },
      });
      if (error) throw error;
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Something went wrong";
      toast({ title: "Sign up failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] py-12"
      >
        {/* Card */}
        <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
            <span className="font-bold text-white text-base">Skryve</span>
          </div>

          {/* Referral banner */}
          {referrerName && (
            <div className="bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-white/70 flex items-start gap-2 mb-6">
              <Gift className="h-4 w-4 mt-0.5 shrink-0 text-white/50" />
              <span>
                You were referred by <strong className="text-white/90">{referrerName}</strong>! You both get rewards when you subscribe.
              </span>
            </div>
          )}

          {/* Heading */}
          <h1 className="text-[22px] font-bold text-white tracking-tight mb-1 text-center">Create your account</h1>
          <p className="text-[13px] text-white/40 mb-8 text-center">Join Skryve — it's free to get started</p>

          {/* Role toggle */}
          <div className="flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1 gap-1 mb-5">
            <button
              type="button"
              onClick={() => setSelectedRole("talent")}
              className={`flex-1 py-2 px-4 rounded-full text-[13px] font-semibold transition-all ${
                selectedRole === "talent"
                  ? "bg-white text-[#09090b]"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              I am a Talent
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("client")}
              className={`flex-1 py-2 px-4 rounded-full text-[13px] font-semibold transition-all ${
                selectedRole === "client"
                  ? "bg-white text-[#09090b]"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              I am a Client
            </button>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full h-10 rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/70 text-[13px] font-medium hover:bg-white/[0.07] transition-all flex items-center justify-center gap-2 mb-5"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-white/25">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="fullName" className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus-visible:border-white/30 focus-visible:ring-0 h-10"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="email" className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus-visible:border-white/30 focus-visible:ring-0 h-10"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 mb-1">
              <label htmlFor="password" className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
                Password
              </label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus-visible:border-white/30 focus-visible:ring-0 h-10"
                minLength={6}
                required
              />
            </div>
            <p className="text-[12px] text-white/25 mb-5">Must be at least 6 characters</p>

            <div className="flex items-start gap-3 mb-5">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5 border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-[#09090b]"
              />
              <label htmlFor="terms" className="text-[13px] text-white/40 leading-relaxed cursor-pointer">
                I agree to the{" "}
                <Link to="/terms" className="text-white/70 hover:text-white transition-colors">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link to="/privacy-policy" className="text-white/70 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-white text-[#09090b] text-[13px] font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[13px] text-white/35 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-white/70 hover:text-white transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
