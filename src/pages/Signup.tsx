import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, User, Loader2, Gift } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo.png" alt="Skryve" className="w-8 h-8 object-contain" />
          <span className="font-bold text-2xl text-[#1E3A5F]">Skryve</span>
        </Link>

        <Card className="border-0 shadow-xl">
          {referrerName && (
            <Alert className="mx-6 mt-6 bg-blue-50 border-blue-200">
              <Gift className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                You were referred by <strong>{referrerName}</strong>! You both get rewards when you subscribe.
              </AlertDescription>
            </Alert>
          )}
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Join Skryve — it's free to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex rounded-full border border-gray-200 p-1 bg-gray-100 gap-1">
              <button
                type="button"
                onClick={() => setSelectedRole("talent")}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all ${
                  selectedRole === "talent"
                    ? "bg-[#2563EB] text-white shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                I am a Talent
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("client")}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all ${
                  selectedRole === "client"
                    ? "bg-[#2563EB] text-white shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                I am a Client
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center gap-3 font-medium"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
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
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-400">Must be at least 6 characters</p>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <Link to="/terms" className="text-[#2563EB] hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link to="/privacy-policy" className="text-[#2563EB] hover:underline">Privacy Policy</Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
                size="lg"
                disabled={isLoading}
              >
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

            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-[#2563EB] hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
