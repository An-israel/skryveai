import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSkryveRole } from "@/hooks/use-skryve-role";
import { TalentDashboard, DashboardSkeleton } from "@/components/dashboard/TalentDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { UIRefreshPopup } from "@/components/notifications/UIRefreshPopup";
import { FeatureUpdatePopup } from "@/components/notifications/FeatureUpdatePopup";
import { MotivationalPopup } from "@/components/notifications/MotivationalPopup";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useOnboarding } from "@/hooks/use-onboarding";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const role = useSkryveRole(user?.id);
  const { showTour, showWizard, markOnboardingComplete } = useOnboarding(user?.id);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) setUser(session.user);
        else navigate("/login");
        setAuthLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard getSession error:", err);
        setAuthLoading(false);
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) setUser(session.user);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (authLoading || !user || role === "loading") return <DashboardSkeleton />;

  return (
    <div>
      <UIRefreshPopup />
      <FeatureUpdatePopup />
      <MotivationalPopup />

      {showWizard && user && (
        <OnboardingWizard
          userId={user.id}
          userEmail={user.email || ""}
          userName={user.user_metadata?.full_name || "User"}
          onComplete={markOnboardingComplete}
        />
      )}
      {showTour && !showWizard && <OnboardingTour onComplete={markOnboardingComplete} />}

      {role === "client" ? (
        <ClientDashboard user={user} />
      ) : (
        <TalentDashboard user={user} />
      )}
    </div>
  );
}
