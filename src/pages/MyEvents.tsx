import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarDays,
  Plus,
  MoreVertical,
  Users,
  Eye,
  Edit2,
  Trash2,
  XCircle,
  Globe,
  Lock,
} from "lucide-react";

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  published: { color: "bg-green-500", label: "Published" },
  draft: { color: "bg-muted-foreground/40", label: "Draft" },
  cancelled: { color: "bg-red-500", label: "Cancelled" },
};

export default function MyEvents() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchEvents(user.id);
    });
  }, []);

  const fetchEvents = async (uid: string) => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("events")
        .select("*")
        .eq("organizer_id", uid)
        .order("date_time", { ascending: false });

      if (tab === "upcoming") query = query.gte("date_time", new Date().toISOString()).neq("status", "cancelled");
      else if (tab === "past") query = query.lt("date_time", new Date().toISOString());
      else if (tab === "draft") query = query.eq("status", "draft");
      else if (tab === "cancelled") query = query.eq("status", "cancelled");

      const { data } = await query;
      setEvents(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchEvents(user.id);
  }, [tab, user]);

  const handleCancel = async () => {
    if (!cancelId) return;
    setActing(true);
    try {
      await (supabase as any).from("events").update({ status: "cancelled" }).eq("id", cancelId);
      toast({ title: "Event cancelled" });
      setCancelId(null);
      if (user) fetchEvents(user.id);
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActing(true);
    try {
      await (supabase as any).from("events").delete().eq("id", deleteId);
      toast({ title: "Event deleted" });
      setDeleteId(null);
      if (user) fetchEvents(user.id);
    } finally {
      setActing(false);
    }
  };

  const handleTogglePublish = async (event: any) => {
    const newStatus = event.status === "published" ? "draft" : "published";
    await (supabase as any).from("events").update({ status: newStatus }).eq("id", event.id);
    toast({ title: newStatus === "published" ? "Event published!" : "Moved to draft" });
    if (user) fetchEvents(user.id);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Events</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage the events you've organized</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 flex items-center gap-2 transition-colors"
          onClick={() => navigate("/events/post")}
        >
          <Plus className="w-4 h-4" /> Post Event
        </button>
      </div>

      {/* Panel */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        {/* Tab bar */}
        <div className="px-5 py-3.5 border-b border-border">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-transparent gap-1 p-0">
              {["upcoming", "past", "draft", "cancelled"].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="text-[13px] capitalize data-[state=active]:bg-muted/60 data-[state=active]:text-foreground"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-14 w-full" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground/40 mb-4" />
            <p className="text-[14px] font-medium text-foreground mb-1">No events here</p>
            <p className="text-[13px] text-muted-foreground mb-6">
              {tab === "draft" ? "You have no draft events." : tab === "upcoming" ? "You haven't posted any upcoming events yet." : "Nothing to show."}
            </p>
            <button
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
              onClick={() => navigate("/events/post")}
            >
              Post an Event
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((event) => {
              const statusInfo = STATUS_DOT[event.status] || STATUS_DOT.draft;
              return (
                <div key={event.id} className="px-5 py-4 hover:bg-muted/30 transition-colors flex items-start gap-4">
                  {/* Banner thumb */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10">
                    {(event.banner_url || event.cover_image_url) && (
                      <img
                        src={event.banner_url || event.cover_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Title + status */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${statusInfo.color}`} />
                          <p className="text-[14px] font-medium text-foreground truncate">{event.title}</p>
                          {event.is_featured && (
                            <span className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-md shrink-0">Featured</span>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {format(new Date(event.date_time), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          <span className="capitalize">{event.format}</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {event.attendee_count || 0} attending
                            {event.max_attendees && ` / ${event.max_attendees} max`}
                          </span>
                          <span className={event.price_type === "free" ? "text-primary" : ""}>
                            {event.price_type === "free" ? "Free" : `$${event.ticket_price}`}
                          </span>
                        </div>
                      </div>

                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/events/${event.id}`)}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublish(event)}>
                            {event.status === "published" ? (
                              <><Lock className="w-4 h-4 mr-2" />Move to Draft</>
                            ) : (
                              <><Globe className="w-4 h-4 mr-2" />Publish</>
                            )}
                          </DropdownMenuItem>
                          {event.status !== "cancelled" && !isPast(new Date(event.date_time)) && (
                            <DropdownMenuItem
                              className="text-amber-600"
                              onClick={() => setCancelId(event.id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Cancel Event
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(event.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
            <AlertDialogDescription>
              Attendees who have RSVPed will be notified that the event has been cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Event</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={handleCancel} disabled={acting}>
              Cancel Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All RSVPs and event data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Event</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} disabled={acting}>
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
