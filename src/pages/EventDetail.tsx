import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Video,
  Share2,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Tag,
} from "lucide-react";
import { motion } from "framer-motion";

const FORMAT_COLORS: Record<string, string> = {
  webinar: "bg-blue-50 text-blue-700 border-blue-200",
  workshop: "bg-purple-50 text-purple-700 border-purple-200",
  conference: "bg-orange-50 text-orange-700 border-orange-200",
  meetup: "bg-green-50 text-green-700 border-green-200",
  hackathon: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [rsvped, setRsvped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    if (!eventId) return;
    fetchEvent();
  }, [eventId, user]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const { data: ev } = await (supabase as any)
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (!ev) { navigate("/events"); return; }
      setEvent(ev);

      const { data: orgProfile } = await (supabase as any)
        .from("talent_profiles")
        .select("full_name, profile_photo_url, primary_skill")
        .eq("user_id", ev.organizer_id)
        .single();

      if (!orgProfile) {
        const { data: clientProf } = await (supabase as any)
          .from("client_profiles")
          .select("company_name, logo_url, industry")
          .eq("user_id", ev.organizer_id)
          .single();
        setOrganizer(clientProf ? { full_name: clientProf.company_name, profile_photo_url: clientProf.logo_url, bio: clientProf.industry } : null);
      } else {
        setOrganizer(orgProfile);
      }

      if (user) {
        const { data: rsvpData } = await (supabase as any)
          .from("event_rsvps")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .maybeSingle();
        setRsvped(!!rsvpData);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async () => {
    if (!user) { navigate("/login"); return; }
    setRsvpLoading(true);
    try {
      if (rsvped) {
        await (supabase as any)
          .from("event_rsvps")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        setRsvped(false);
        setEvent((e: any) => ({ ...e, attendee_count: Math.max(0, e.attendee_count - 1) }));
        toast({ title: "RSVP cancelled" });
      } else {
        await (supabase as any)
          .from("event_rsvps")
          .insert({ event_id: eventId, user_id: user.id, payment_status: "pending" });
        setRsvped(true);
        setEvent((e: any) => ({ ...e, attendee_count: e.attendee_count + 1 }));
        toast({ title: "You're attending!", description: "We'll remind you before the event." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const past = isPast(new Date(event.date_time));
  const spotsLeft = event.max_attendees ? event.max_attendees - event.attendee_count : null;
  const speakers = Array.isArray(event.speakers) ? event.speakers : [];
  const agenda = Array.isArray(event.agenda) ? event.agenda : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/events")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
      </Button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-xl overflow-hidden">
        {event.banner_url || event.cover_image_url ? (
          <img src={event.banner_url || event.cover_image_url} alt={event.title} className="w-full h-56 md:h-72 object-cover" />
        ) : (
          <div className="w-full h-56 md:h-72 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
            <CalendarDays className="w-20 h-20 text-white/20" />
          </div>
        )}
        {past && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge className="text-base px-4 py-2 bg-black/60 border-white/20 text-white">Event Ended</Badge>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline" className={`capitalize ${FORMAT_COLORS[event.format] || ""}`}>{event.format}</Badge>
              {event.niche_category && (
                <Badge variant="outline" className="bg-gray-50 text-gray-600">
                  <Tag className="w-3 h-3 mr-1" />{event.niche_category}
                </Badge>
              )}
              {event.price_type === "free" ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Free</Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">${event.ticket_price}</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {format(new Date(event.date_time), "EEEE, MMMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {format(new Date(event.date_time), "h:mm a")} {event.timezone}
                {event.duration_minutes && ` · ${Math.floor(event.duration_minutes / 60)}h${event.duration_minutes % 60 ? ` ${event.duration_minutes % 60}m` : ""}`}
              </span>
            </div>
          </div>

          <Separator />

          {event.description && (
            <div>
              <h2 className="font-semibold mb-3">About this event</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{event.description}</p>
            </div>
          )}

          {speakers.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Speakers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {speakers.map((speaker: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={speaker.avatar_url} />
                      <AvatarFallback>{speaker.name?.[0] || "S"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{speaker.name}</p>
                      {speaker.title && <p className="text-xs text-muted-foreground">{speaker.title}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {agenda.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Agenda</h2>
              <div className="space-y-2">
                {agenda.map((item: any, i: number) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="text-muted-foreground w-16 flex-shrink-0">{item.time}</span>
                    <span>{item.topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {organizer && (
            <div>
              <h2 className="font-semibold mb-3">Organizer</h2>
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={organizer.profile_photo_url} />
                  <AvatarFallback>{(organizer.full_name || "O")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{organizer.full_name}</p>
                  {(organizer.primary_skill || organizer.bio) && (
                    <p className="text-xs text-muted-foreground">{organizer.primary_skill || organizer.bio}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky sidebar */}
        <div>
          <Card className="sticky top-4">
            <CardContent className="pt-5 space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#1E3A5F]">{event.attendee_count}</p>
                <p className="text-sm text-muted-foreground">attending</p>
                {spotsLeft !== null && spotsLeft > 0 && (
                  <p className="text-xs text-amber-600 mt-1">{spotsLeft} spots left</p>
                )}
                {spotsLeft !== null && spotsLeft <= 0 && (
                  <p className="text-xs text-red-600 mt-1">Fully booked</p>
                )}
              </div>

              <Separator />

              {event.location_address ? (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{event.location_address}</span>
                </div>
              ) : event.platform_name ? (
                <div className="flex items-center gap-2 text-sm">
                  <Video className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{event.platform_name}</span>
                </div>
              ) : null}

              {!past && (
                <>
                  {rsvped && event.event_link && (
                    <Button variant="outline" className="w-full" onClick={() => window.open(event.event_link, "_blank")}>
                      <ExternalLink className="w-4 h-4 mr-2" />Join Event
                    </Button>
                  )}
                  <Button
                    className={`w-full ${rsvped ? "bg-green-600 hover:bg-green-700" : "bg-[#2563EB] hover:bg-[#1d4ed8]"}`}
                    onClick={handleRsvp}
                    disabled={rsvpLoading || (spotsLeft !== null && spotsLeft <= 0 && !rsvped)}
                  >
                    {rsvpLoading ? "Loading..." : rsvped ? (
                      <><CheckCircle className="w-4 h-4 mr-2" />Attending</>
                    ) : event.price_type === "paid" ? `Buy Ticket — $${event.ticket_price}` : "RSVP — Free"}
                  </Button>
                </>
              )}

              <Button variant="outline" className="w-full" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />Share Event
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
