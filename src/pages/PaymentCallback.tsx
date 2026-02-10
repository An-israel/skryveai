import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get("reference");
      const trxref = searchParams.get("trxref");
      const paymentRef = reference || trxref;

      if (!paymentRef) {
        setStatus("failed");
        setMessage("No payment reference found.");
        return;
      }

      try {
        // Actively verify with Paystack via our edge function
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          setStatus("failed");
          setMessage("You need to be logged in to verify payment.");
          return;
        }

        const response = await supabase.functions.invoke("verify-payment", {
          body: { reference: paymentRef },
        });

        if (response.error) {
          console.error("Verify payment error:", response.error);
          // Fallback: check DB directly with retries
          await fallbackCheck(paymentRef);
          return;
        }

        const result = response.data;
        if (result?.status === "success") {
          setStatus("success");
        } else {
          setStatus("failed");
          setMessage(result?.message || "Payment could not be confirmed.");
        }
      } catch (err) {
        console.error("Payment verification error:", err);
        await fallbackCheck(paymentRef);
      }
    };

    const fallbackCheck = async (paymentRef: string) => {
      // Retry checking DB with exponential backoff
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        const { data: payment } = await supabase
          .from("payment_history")
          .select("status")
          .eq("paystack_reference", paymentRef)
          .single();

        if (payment?.status === "success") {
          setStatus("success");
          return;
        }
      }
      setStatus("failed");
      setMessage("Payment verification timed out. If you were charged, your subscription will be activated shortly.");
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-subtle">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </div>
                <CardTitle>Verifying Payment</CardTitle>
                <CardDescription>Please wait while we confirm your payment with Paystack...</CardDescription>
              </>
            )}
            {status === "success" && (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="w-16 h-16 text-primary" />
                </div>
                <CardTitle className="text-primary">Payment Successful!</CardTitle>
                <CardDescription>
                  Your subscription is now active. Welcome to SkryveAI!
                </CardDescription>
              </>
            )}
            {status === "failed" && (
              <>
                <div className="flex justify-center mb-4">
                  <XCircle className="w-16 h-16 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Payment Issue</CardTitle>
                <CardDescription>
                  {message || "Something went wrong with your payment. Please try again."}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {status !== "loading" && (
              <div className="flex gap-3">
                {status === "success" ? (
                  <Button onClick={() => navigate("/dashboard")} className="w-full">
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate("/pricing")} className="flex-1">
                      Try Again
                    </Button>
                    <Button onClick={() => navigate("/dashboard")} className="flex-1">
                      Dashboard
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
