import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send reset email";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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

            {/* Success icon */}
            <div className="flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>

            <h1 className="text-[22px] font-bold text-white tracking-tight mb-1 text-center">
              Check your email
            </h1>
            <p className="text-[13px] text-white/40 mb-8 text-center">
              We sent a reset link to{" "}
              <span className="text-white/70">{email}</span>
            </p>

            <p className="text-[13px] text-white/35 text-center mb-6">
              Didn't receive it? Check your spam folder or{" "}
              <button
                onClick={() => setEmailSent(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                try again
              </button>
            </p>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1 text-[13px] text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
            Forgot password?
          </h1>
          <p className="text-[13px] text-white/40 mb-8 text-center">
            Enter your email and we'll send you a reset link
          </p>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5 mb-5">
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-white text-[#09090b] text-[13px] font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
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
