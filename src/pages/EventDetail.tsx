import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";

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
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <Skeleton className="h-5 w-28 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const past = isPast(new Date(event.date_time));
  const spotsLeft = event.max_attendees ? event.max_attendees - event.attendee_count : null;
  const speakers = Array.isArray(event.speakers) ? event.speakers : [];
  const agenda = Array.isArray(event.agenda) ? event.agenda : [];

  const durationLabel = event.duration_minutes
    ? `${Math.floor(event.duration_minutes / 60)}h${event.duration_minutes % 60 ? ` ${event.duration_minutes % 60}m` : ""}`
    : null;

  const organizerInitials = (organizer?.full_name || "O")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Back link */}
      <button
        onClick={() => navigate("/events")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Events
      </button>

      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-xl overflow-hidden"
      >
        {event.banner_url || event.cover_image_url ? (
          <img
            src={event.banner_url || event.cover_image_url}
            alt={event.title}
            className="w-full h-56 md:h-72 object-cover"
          />
        ) : (
          <div className="w-full h-56 md:h-72 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
            <CalendarDays className="w-20 h-20 text-white/20" />
          </div>
        )}
        {past && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-[13px] font-semibold text-white px-4 py-2 rounded-lg bg-black/60 border border-white/20">
              Event Ended
            </span>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title + meta panel */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-5">
              {/* Chips row */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md capitalize">
                  {event.format}
                </span>
                {event.niche_category && (
                  <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    {event.niche_category}
                  </span>
                )}
                {event.price_type === "free" ? (
                  <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                    Free
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                    ${event.ticket_price}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-[22px] font-bold text-foreground leading-snug mb-3">
                {event.title}
              </h1>

              {/* Date / time meta */}
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{format(new Date(event.date_time), "EEEE, MMMM d, yyyy")}</span>
                <span className="text-border">·</span>
                <Clock className="w-3.5 h-3.5" />
                <span>{format(new Date(event.date_time), "h:mm a")}</span>
                {event.timezone && (
                  <>
                    <span className="text-border">·</span>
                    <Globe className="w-3.5 h-3.5" />
                    <span>{event.timezone}</span>
                  </>
                )}
                {durationLabel && (
                  <>
                    <span className="text-border">·</span>
                    <span>{durationLabel}</span>
                  </>
                )}
              </div>

              {/* Format / location meta */}
              {(event.location_address || event.platform_name) && (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground mt-2">
                  {event.location_address ? (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{event.location_address}</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5" />
                      <span>Online</span>
                      {event.platform_name && (
                        <>
                          <span className="text-border">·</span>
                          <span>{event.platform_name}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Organizer row */}
            {organizer && (
              <div className="px-5 py-3.5 border-t border-border flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {organizer.profile_photo_url ? (
                    <img src={organizer.profile_photo_url} alt={organizer.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-semibold text-muted-foreground">{organizerInitials}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span>Organized by</span>
                  <span className="font-semibold text-foreground">{organizer.full_name}</span>
                  {(organizer.primary_skill || organizer.bio) && (
                    <>
                      <span className="text-border">·</span>
                      <span>{organizer.primary_skill || organizer.bio}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description panel */}
          {event.description && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-[13px] font-semibold text-foreground">About this event</p>
              </div>
              <div className="px-5 py-5">
                <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>
          )}

          {/* Speakers panel */}
          {speakers.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-[13px] font-semibold text-foreground">Speakers</p>
              </div>
              <div className="px-5 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {speakers.map((speaker: any, i: number) => {
                    const initials = (speaker.name || "S")
                      .split(" ")
                      .map((w: string) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {speaker.avatar_url ? (
                            <img src={speaker.avatar_url} alt={speaker.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[11px] font-semibold text-muted-foreground">{initials}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">{speaker.name}</p>
                          {speaker.title && (
                            <p className="text-[12px] text-muted-foreground">{speaker.title}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Agenda panel */}
          {agenda.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-[13px] font-semibold text-foreground">Agenda</p>
              </div>
              <div className="divide-y divide-border">
                {agenda.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                    <span className="text-[12px] text-muted-foreground w-14 shrink-0 pt-0.5 font-mono">
                      {item.time}
                    </span>
                    <span className="text-[13px] text-foreground">{item.topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky sidebar */}
        <div>
          <div className="sticky top-4 border border-border rounded-xl bg-card overflow-hidden">
            {/* Attendee count */}
            <div className="px-5 py-5 text-center border-b border-border">
              <p className="font-mono text-lg font-bold text-foreground">{event.attendee_count}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">attending</p>
              {spotsLeft !== null && spotsLeft > 0 && (
                <p className="text-[11px] text-amber-600 mt-1.5">{spotsLeft} spots left</p>
              )}
              {spotsLeft !== null && spotsLeft <= 0 && (
                <p className="text-[11px] text-destructive mt-1.5">Fully booked</p>
              )}
            </div>

            {/* Price */}
            <div className="px-5 py-3.5 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Ticket</span>
                <span className="text-[13px] font-semibold text-foreground">
                  {event.price_type === "free" ? "Free" : `$${event.ticket_price}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 space-y-2.5">
              {!past && (
                <>
                  {rsvped && event.event_link && (
                    <button
                      onClick={() => window.open(event.event_link, "_blank")}
                      className="w-full px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Join Event
                    </button>
                  )}
                  <button
                    onClick={handleRsvp}
                    disabled={rsvpLoading || (spotsLeft !== null && spotsLeft <= 0 && !rsvped)}
                    className={`w-full px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      rsvped
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    {rsvpLoading ? (
                      "Loading..."
                    ) : rsvped ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Attending
                      </>
                    ) : event.price_type === "paid" ? (
                      `Buy Ticket — $${event.ticket_price}`
                    ) : (
                      "RSVP — Free"
                    )}
                  </button>
                </>
              )}

              <button
                onClick={handleShare}
                className="w-full px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
