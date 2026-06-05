import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PasswordInput } from "@/components/ui/password-input";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      }
      setCheckingSession(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true);
          setCheckingSession(false);
        }
      }
    );

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match. Please make sure both fields are the same.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      setIsSuccess(true);
      toast({
        title: "Password updated!",
        description: "Your password has been successfully reset.",
      });

      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Checking session — minimal spinner
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  // Invalid / expired link
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
              <span className="font-bold text-white text-base">Skryve</span>
            </div>

            <h1 className="text-[22px] font-bold text-white tracking-tight mb-1 text-center">
              Link expired
            </h1>
            <p className="text-[13px] text-white/40 mb-8 text-center">
              This password reset link is invalid or has expired. Request a new one.
            </p>

            <Link
              to="/forgot-password"
              className="w-full h-10 rounded-lg bg-white text-[#09090b] text-[13px] font-bold hover:bg-white/90 transition-all flex items-center justify-center"
            >
              Request New Link
            </Link>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1 text-[13px] text-white/40 hover:text-white/70 transition-colors mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
              <span className="font-bold text-white text-base">Skryve</span>
            </div>

            <div className="flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>

            <h1 className="text-[22px] font-bold text-white tracking-tight mb-1 text-center">
              Password updated!
            </h1>
            <p className="text-[13px] text-white/40 mb-8 text-center">
              Your password has been reset. Redirecting you to login…
            </p>

            <div className="flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
            <span className="font-bold text-white text-base">Skryve</span>
          </div>

          <h1 className="text-[22px] font-bold text-white tracking-tight mb-1 text-center">
            Set new password
          </h1>
          <p className="text-[13px] text-white/40 mb-8 text-center">
            Enter your new password below
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-[13px] mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="password" className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
                New Password
              </label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus-visible:border-white/30 focus-visible:ring-0 h-10"
                required
                minLength={6}
              />
            </div>

            <div className="flex flex-col gap-1.5 mb-6">
              <label htmlFor="confirmPassword" className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
                Confirm Password
              </label>
              <PasswordInput
                id="confirmPassword"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus-visible:border-white/30 focus-visible:ring-0 h-10"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-white text-[#09090b] text-[13px] font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Set Password"
              )}
            </button>
          </form>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1 text-[13px] text-white/40 hover:text-white/70 transition-colors mt-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
