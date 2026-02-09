import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_COMPLETED_KEY = "skryveai_onboarding_completed";

export function useOnboarding(userId: string | undefined) {
  const [showTour, setShowTour] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    checkOnboardingStatus();
  }, [userId]);

  const checkOnboardingStatus = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Check local storage first
      const localCompleted = localStorage.getItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`);
      if (localCompleted === "true") {
        setShowTour(false);
        setShowWizard(false);
        setLoading(false);
        return;
      }

      // Check if profile is incomplete (needs wizard)
      const { data: profile } = await supabase
        .from("profiles")
        .select("bio, expertise, cv_url")
        .eq("user_id", userId)
        .single();

      const hasCompletedProfile = profile && (
        (profile.bio && profile.bio.length > 0) ||
        (profile.expertise && profile.expertise.length > 0) ||
        profile.cv_url
      );

      // Check if they have campaigns (experienced user)
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      const hasCampaigns = campaigns && campaigns.length > 0;

      if (hasCampaigns || hasCompletedProfile) {
        // Experienced user or profile already filled — no wizard needed
        markOnboardingComplete();
      } else {
        // New user with empty profile — show wizard
        setShowWizard(true);
      }
    } catch (error) {
      console.error("Error checking onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const markOnboardingComplete = () => {
    if (userId) {
      localStorage.setItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`, "true");
    }
    setShowTour(false);
    setShowWizard(false);
  };

  const resetOnboarding = () => {
    if (userId) {
      localStorage.removeItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`);
    }
    setShowWizard(true);
  };

  return {
    showTour,
    showWizard,
    loading,
    markOnboardingComplete,
    resetOnboarding,
  };
}
