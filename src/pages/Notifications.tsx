import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Briefcase,
  FileText,
  MessageSquare,
  DollarSign,
  FolderOpen,
  CalendarDays,
  BookOpen,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
  { value: "all",          label: "All"          },
  { value: "jobs",         label: "Jobs"         },
  { value: "applications", label: "Applications" },
  { value: "messages",     label: "Messages"     },
  { value: "offers",       label: "Offers"       },
  { value: "projects",     label: "Projects"     },
  { value: "events",       label: "Events"       },
  { value: "learning",     label: "Learning"     },
  { value: "system",       label: "System"       },
];

const PAGE_SIZE = 20;

// ── Icon helper ────────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case "jobs":
      return <Briefcase className="w-4 h-4 text-blue-500" />;
    case "applications":
      return <FileText className="w-4 h-4 text-purple-500" />;
    case "messages":
      return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    case "offers":
      return <DollarSign className="w-4 h-4 text-amber-500" />;
    case "projects":
      return <FolderOpen className="w-4 h-4 text-orange-500" />;
    case "events":
      return <CalendarDays className="w-4 h-4 text-pink-500" />;
    case "learning":
      return <BookOpen className="w-4 h-4 text-teal-500" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  // ── Auth ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      else navigate("/login");
    });
  }, [navigate]);

  // ── Fetch ──────────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(
    async (pageNum: number, tab: string, append = false) => {
      if (!userId) return;
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = (supabase as any)
        .from("notifications")
        .select("id, type, title, body, link, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (tab !== "all") query = query.eq("type", tab);

      const { data, error } = await query;

      if (error) {
        console.error(error);
      } else {
        const rows: Notification[] = data || [];
        setNotifications((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(rows.length === PAGE_SIZE);
      }

      if (!append) setLoading(false);
      else setLoadingMore(false);
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;
    setPage(0);
    fetchNotifications(0, activeTab);
  }, [userId, activeTab, fetchNotifications]);

  // ── Realtime ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (activeTab === "all" || newNotif.type === activeTab) {
            setNotifications((prev) => [newNotif, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeTab]);

  // ── Actions ────────────────────────────────────────────────────────────────────

  const markAsRead = async (notif: Notification) => {
    if (!notif.is_read) {
      await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.link) navigate(notif.link);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    setMarkingAll(true);
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(false);
    toast({ title: "All notifications marked as read" });
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, activeTab, true);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Stay up to date with your activity
          </p>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={markingAll || unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {markingAll ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCheck className="w-3.5 h-3.5" />
          )}
          Mark all read
        </button>
      </div>

      {/* Panel */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        {/* Tab bar */}
        <div className="px-4 pt-3 border-b border-border overflow-x-auto">
          <div className="flex items-center gap-0.5 pb-px min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3 py-2 rounded-t-md text-[12px] font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                  activeTab === tab.value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-foreground">No notifications yet</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                We'll let you know when something happens.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif)}
                className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors ${
                  !notif.is_read ? "bg-primary/[0.02]" : ""
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 shrink-0 w-1.5 h-1.5 flex items-center justify-center">
                  {!notif.is_read ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary block" />
                  ) : (
                    <span className="w-1.5 h-1.5 block" />
                  )}
                </div>

                {/* Icon */}
                <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <NotifIcon type={notif.type} />
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground leading-snug">
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                </div>

                {/* Time */}
                <p className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="px-5 py-3.5 border-t border-border flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
