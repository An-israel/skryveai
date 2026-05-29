import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Loader2 } from "lucide-react";
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
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-[#2563EB]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#1E3A5F]">Check your email</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                We sent a link to{" "}
                {email ? (
                  <strong className="text-gray-700">{email}</strong>
                ) : (
                  "your email address"
                )}
                . Click it to activate your account.
              </p>
            </div>

            <Button
              onClick={handleResend}
              disabled={isResending || !email}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
              size="lg"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                "Resend Email"
              )}
            </Button>

            <p className="text-sm text-gray-500">
              Wrong email?{" "}
              <Link to="/signup" className="text-[#2563EB] hover:underline font-medium">
                Go back
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
