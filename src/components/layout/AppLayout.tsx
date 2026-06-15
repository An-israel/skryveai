import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import { useSkryveRole } from "@/hooks/use-skryve-role";
import { supabase } from "@/integrations/supabase/client";

export function AppLayout() {
  const [user, setUser]           = useState<any>(null);
  const [authLoading, setLoading] = useState(true);
  const [mobileOpen, setMobile]   = useState(false);
  const [unreadCount, setUnread]  = useState(0);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const role = useSkryveRole(user?.id);
  const location = useLocation();

  // ── Auth listener ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("AppLayout getSession error:", err);
        setLoading(false);
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    // Safety net: never trap the user on the spinner if auth hangs
    const failsafe = setTimeout(() => setLoading(false), 8000);
    return () => { subscription.unsubscribe(); clearTimeout(failsafe); };
  }, []);

  // ── Onboarding check ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || role === "loading") return;
    if (location.pathname.startsWith('/onboarding')) return;
    if (role === "none") {
      setNeedsOnboarding(true);
      return;
    }
    const table = role === "client" ? "client_profiles" : "talent_profiles";
    (supabase as any).from(table)
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data && data.onboarding_completed === false) {
          setNeedsOnboarding(true);
        }
      })
      .catch((err: unknown) => {
        console.error("Onboarding check error:", err);
      });
  }, [user?.id, role, location.pathname]);

  // ── Unread notifications count ────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count }: { count: number | null }) => setUnread(count ?? 0));

    const channel = supabase
      .channel("notifications-count")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        (supabase as any)
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false)
          .then(({ count }: { count: number | null }) => setUnread(count ?? 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (needsOnboarding && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }

  const userName   = user.user_metadata?.full_name || user.email || "";
  const userAvatar = user.user_metadata?.avatar_url;

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar
        role={role}
        userName={userName}
        userAvatar={userAvatar}
        unreadCount={unreadCount}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobile(false)}
      />

      {/* Main content — offset for fixed desktop sidebar */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[220px]">
        <AppTopBar
          userName={userName}
          userAvatar={userAvatar}
          unreadCount={unreadCount}
          onMenuClick={() => setMobile(true)}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
