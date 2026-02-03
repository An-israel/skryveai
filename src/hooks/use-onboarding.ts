import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_COMPLETED_KEY = "skryveai_onboarding_completed";

export function useOnboarding(userId: string | undefined) {
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    checkOnboardingStatus();
  }, [userId]);

  const checkOnboardingStatus = async () => {
    try {
      // Check local storage first for quick response
      const localCompleted = localStorage.getItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`);
      
      if (localCompleted === "true") {
        setShowTour(false);
        setLoading(false);
        return;
      }

      // Check if user has completed any campaigns (indicating they're not new)
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (campaigns && campaigns.length > 0) {
        // User has campaigns, mark as completed and don't show tour
        markOnboardingComplete();
        setShowTour(false);
      } else {
        // New user, show the tour
        setShowTour(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setShowTour(false);
    } finally {
      setLoading(false);
    }
  };

  const markOnboardingComplete = () => {
    if (userId) {
      localStorage.setItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`, "true");
    }
    setShowTour(false);
  };

  const resetOnboarding = () => {
    if (userId) {
      localStorage.removeItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`);
    }
    setShowTour(true);
  };

  return {
    showTour,
    loading,
    markOnboardingComplete,
    resetOnboarding,
  };
}
