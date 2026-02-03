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

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get("reference");
      const trxref = searchParams.get("trxref");
      
      const paymentRef = reference || trxref;

      if (!paymentRef) {
        setStatus("failed");
        return;
      }

      try {
        // Check payment status in our database
        // The webhook should have already updated this
        const { data: payment } = await supabase
          .from("payment_history")
          .select("status")
          .eq("paystack_reference", paymentRef)
          .single();

        if (payment?.status === "success") {
          setStatus("success");
        } else {
          // Wait a moment for webhook to process
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { data: retryPayment } = await supabase
            .from("payment_history")
            .select("status")
            .eq("paystack_reference", paymentRef)
            .single();

          setStatus(retryPayment?.status === "success" ? "success" : "failed");
        }
      } catch {
        setStatus("failed");
      }
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
                <CardTitle>Processing Payment</CardTitle>
                <CardDescription>Please wait while we confirm your payment...</CardDescription>
              </>
            )}
            {status === "success" && (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="w-16 h-16 text-primary" />
                </div>
                <CardTitle className="text-primary">Payment Successful!</CardTitle>
                <CardDescription>
                  Your subscription is now active. Welcome to OutreachPro!
                </CardDescription>
              </>
            )}
            {status === "failed" && (
              <>
                <div className="flex justify-center mb-4">
                  <XCircle className="w-16 h-16 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Payment Failed</CardTitle>
                <CardDescription>
                  Something went wrong with your payment. Please try again.
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
