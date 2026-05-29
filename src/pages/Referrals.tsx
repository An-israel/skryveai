import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ReferralCard } from "@/components/dashboard/ReferralCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { FeatureGuide } from "@/components/onboarding/FeatureGuide";
import { referralsGuide } from "@/components/onboarding/guideConfigs";
import { supabase } from "@/integrations/supabase/client";

export default function Referrals() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/login");
      }
      setIsLoading(false);
    });
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <FeatureGuide featureKey="referrals" steps={referralsGuide} />
      <main className="container mx-auto px-0 pb-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Refer & Earn</h1>
              <p className="text-sm text-muted-foreground">
                Share your referral link and earn 40% commission on every subscription for 6 months!
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ReferralCard userId={user?.id} />
        </motion.div>
      </main>
    </div>
  );
}
