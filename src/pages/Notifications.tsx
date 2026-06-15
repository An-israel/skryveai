import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type NotifType =
  | "jobs"
  | "applications"
  | "messages"
  | "offers"
  | "projects"
  | "events"
  | "learning"
  | "system";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "jobs", label: "Jobs" },
  { value: "applications", label: "Applications" },
  { value: "messages", label: "Messages" },
  { value: "offers", label: "Offers" },
  { value: "projects", label: "Projects" },
  { value: "events", label: "Events" },
  { value: "learning", label: "Learning" },
  { value: "system", label: "System" },
];

function notifIcon(type: string) {
  switch (type) {
    case "jobs":
      return <Briefcase className="w-5 h-5 text-blue-600" />;
    case "applications":
      return <FileText className="w-5 h-5 text-purple-600" />;
    case "messages":
      return <MessageSquare className="w-5 h-5 text-green-600" />;
    case "offers":
      return <DollarSign className="w-5 h-5 text-yellow-600" />;
    case "projects":
      return <FolderOpen className="w-5 h-5 text-orange-600" />;
    case "events":
      return <CalendarDays className="w-5 h-5 text-pink-600" />;
    case "learning":
      return <BookOpen className="w-5 h-5 text-teal-600" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
}

const PAGE_SIZE = 20;

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      else navigate("/login");
    });
  }, [navigate]);

  const fetchNotifications = useCallback(
    async (pageNum: number, tab: string, append = false) => {
      if (!userId) return;
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = (supabase as any)
        .from("notifications")
        .select("id, type, title, message, is_read:read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (tab !== "all") {
        query = query.eq("type", tab);
      }

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

  // Realtime subscription
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

  const markAsRead = async (notif: Notification) => {
    if (!notif.is_read) {
      await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    setMarkingAll(true);
    await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 text-white">{unreadCount}</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="gap-2"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Mark all as read
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              We'll let you know when something happens.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif)}
                className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notif.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  {notifIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground leading-snug">
                    {notif.title}
                  </p>
                  {notif.message && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="mt-2 shrink-0 w-2.5 h-2.5 rounded-full bg-blue-600" />
                )}
              </div>
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Load more
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
