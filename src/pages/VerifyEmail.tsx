import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setIsResending(false);
    if (error) {
      toast({ title: "Could not resend", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent!", description: "Check your inbox for the verification link." });
    }
  };

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

          {/* Mail icon */}
          <div className="flex items-center justify-center mb-6">
            <Mail className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>

          <h1 className="text-[22px] font-bold text-white tracking-tight mb-1 text-center">
            Check your email
          </h1>
          <p className="text-[13px] text-white/40 mb-8 text-center">
            We sent a verification link to{" "}
            {email ? (
              <span className="text-white/70">{email}</span>
            ) : (
              "your email address"
            )}
            . Click it to activate your account.
          </p>

          <button
            onClick={handleResend}
            disabled={isResending || !email}
            className="w-full h-10 rounded-lg bg-white text-[#09090b] text-[13px] font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mb-4"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Resend Email"
            )}
          </button>

          <p className="text-center text-[13px] text-white/35 mb-2">
            Wrong email?{" "}
            <Link to="/signup" className="text-white/70 hover:text-white transition-colors">
              Go back
            </Link>
          </p>

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
