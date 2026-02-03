import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: {
    status: string;
    plan?: string;
    trialEndsAt?: string;
  } | null;
}

export function useAuth(requireAuth: boolean = true) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    subscription: null,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
        }));

        if (session?.user) {
          // Fetch subscription data
          setTimeout(async () => {
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("status, plan, trial_ends_at")
              .eq("user_id", session.user.id)
              .single();

            setAuthState(prev => ({
              ...prev,
              subscription: sub ? {
                status: sub.status,
                plan: sub.plan,
                trialEndsAt: sub.trial_ends_at,
              } : null,
              loading: false,
            }));
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            subscription: null,
            loading: false,
          }));
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: !session,
      }));
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authState.loading && requireAuth && !authState.user) {
      navigate("/login");
    }
  }, [authState.loading, authState.user, requireAuth, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/");
  };

  const isTrialExpired = () => {
    if (!authState.subscription) return false;
    if (authState.subscription.status !== "trial") return false;
    if (!authState.subscription.trialEndsAt) return false;
    return new Date(authState.subscription.trialEndsAt) < new Date();
  };

  const hasActiveSubscription = () => {
    if (!authState.subscription) return false;
    if (authState.subscription.status === "active") return true;
    if (authState.subscription.status === "trial" && !isTrialExpired()) return true;
    return false;
  };

  return {
    ...authState,
    signOut,
    isTrialExpired,
    hasActiveSubscription,
  };
}
