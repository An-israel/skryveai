import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSkryveRole } from "@/hooks/use-skryve-role";
import { TalentDashboard, DashboardSkeleton } from "@/components/dashboard/TalentDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { UIRefreshPopup } from "@/components/notifications/UIRefreshPopup";
import { FeatureUpdatePopup } from "@/components/notifications/FeatureUpdatePopup";
import { MotivationalPopup } from "@/components/notifications/MotivationalPopup";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const navigate = useNavigate();
  const role = useSkryveRole(user?.id);

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

  // New users who haven't finished the talent/client onboarding go there first.
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [{ data: tp }, { data: cp }] = await Promise.all([
        (supabase as any)
          .from("talent_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("client_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (!tp?.onboarding_completed && !cp?.onboarding_completed) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setOnboardingChecked(true);
    })();
  }, [user?.id, navigate]);

  if (authLoading || !user || role === "loading" || !onboardingChecked) return <DashboardSkeleton />;

  return (
    <div>
      <UIRefreshPopup />
      <FeatureUpdatePopup />
      <MotivationalPopup />

      {role === "client" ? (
        <ClientDashboard user={user} />
      ) : (
        <TalentDashboard user={user} />
      )}
    </div>
  );
}
