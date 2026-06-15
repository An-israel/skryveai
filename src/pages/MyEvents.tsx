import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-50 text-green-700 border-green-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">My Events</h1>
          <p className="text-sm text-muted-foreground">Manage the events you've organized</p>
        </div>
        <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => navigate("/events/post")}>
          <Plus className="w-4 h-4 mr-2" /> Post Event
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">No events here</p>
          <p className="text-sm mb-6">
            {tab === "draft" ? "You have no draft events." : tab === "upcoming" ? "You haven't posted any upcoming events yet." : "Nothing to show."}
          </p>
          <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => navigate("/events/post")}>
            Post an Event
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-4">
                  {/* Banner thumb */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#2563EB]/10 to-purple-100">
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
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{event.title}</h3>
                          <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[event.status] || ""}`}>
                            {event.status}
                          </Badge>
                          {event.is_featured && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">Featured</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {format(new Date(event.date_time), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          <span className="flex items-center gap-1 capitalize">
                            {event.format}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {event.attendee_count} attending
                            {event.max_attendees && ` / ${event.max_attendees} max`}
                          </span>
                          <span className={event.price_type === "free" ? "text-green-600" : "text-blue-600"}>
                            {event.price_type === "free" ? "Free" : `$${event.ticket_price}`}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
