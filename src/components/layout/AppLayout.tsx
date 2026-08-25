import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import { PageGuard } from "@/components/PageGuard";
import { useSkryveRole } from "@/hooks/use-skryve-role";
import { supabase } from "@/integrations/supabase/client";

export function AppLayout() {
  const [user, setUser]           = useState<any>(null);
  const [authLoading, setLoading] = useState(true);
  const [mobileOpen, setMobile]   = useState(false);
  const [unreadCount, setUnread]  = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const role = useSkryveRole(user?.id);
  const navigate = useNavigate();

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

  // ── Onboarding gate: users with no completed profile go to onboarding ──
  useEffect(() => {
    if (!user?.id) return;
    if (sessionStorage.getItem("skryve_onboarded") === user.id) return;
    (async () => {
      const [{ data: tp }, { data: cp }, { data: roles }] = await Promise.all([
        (supabase as any).from("talent_profiles").select("onboarding_completed").eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("client_profiles").select("onboarding_completed").eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const isStaff = (roles || []).some((r: any) =>
        ["super_admin", "content_editor", "support_agent", "staff"].includes(r.role)
      );
      if (isStaff || tp?.onboarding_completed || cp?.onboarding_completed) {
        sessionStorage.setItem("skryve_onboarded", user.id);
      } else {
        navigate("/onboarding", { replace: true });
      }
    })();
  }, [user?.id, navigate]);

  // ── Unread notifications count ────────────────────────────────
  // Excludes message-type rows (message/comment/reply) — those are counted
  // separately below via the real messaging tables, so a new DM doesn't
  // also bump the Notifications bell.
  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = () =>
      (supabase as any)
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .not("type", "in", '("message","comment","reply")')
        .then(({ count }: { count: number | null }) => setUnread(count ?? 0));

    fetchUnread();

    const channel = supabase
      .channel("notifications-count")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Unread messages count (separate from notifications) ────────
  useEffect(() => {
    if (!user?.id) return;
    const fetchUnreadMessages = () =>
      (supabase as any).rpc("unread_message_count")
        .then(({ data }: { data: number | null }) => setUnreadMessages(data ?? 0));

    fetchUnreadMessages();

    const channel = supabase
      .channel("messages-unread-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_messages" }, fetchUnreadMessages)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, fetchUnreadMessages)
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

  const userName   = user.user_metadata?.full_name || user.email || "";
  const userAvatar = user.user_metadata?.avatar_url;

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar
        role={role}
        userName={userName}
        userAvatar={userAvatar}
        unreadCount={unreadCount}
        unreadMessages={unreadMessages}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobile(false)}
      />

      {/* Main content — offset for fixed desktop sidebar */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[220px]">
        <AppTopBar
          userName={userName}
          userAvatar={userAvatar}
          unreadCount={unreadCount}
          unreadMessages={unreadMessages}
          onMenuClick={() => setMobile(true)}
          userId={user?.id}
          role={role}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <PageGuard>
            <Outlet context={{ user, role }} />
          </PageGuard>
        </main>
      </div>
    </div>
  );
}
