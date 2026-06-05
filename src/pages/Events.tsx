import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays,
  Search,
  MapPin,
  Users,
  Clock,
  Star,
  Plus,
  Video,
  Globe,
  Filter,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FORMAT_OPTIONS = ["webinar", "workshop", "conference", "meetup", "hackathon"] as const;
const NICHE_OPTIONS = [
  "Design", "Engineering", "Marketing", "Product", "Data Science",
  "DevOps", "Blockchain", "AI/ML", "Startup", "Finance", "Healthcare",
];

const FORMAT_COLORS: Record<string, string> = {
  webinar: "bg-blue-50 text-blue-700 border-blue-200",
  workshop: "bg-purple-50 text-purple-700 border-purple-200",
  conference: "bg-orange-50 text-orange-700 border-orange-200",
  meetup: "bg-green-50 text-green-700 border-green-200",
  hackathon: "bg-rose-50 text-rose-700 border-rose-200",
};

function EventCard({ event, onRsvp }: { event: any; onRsvp: (id: string) => void }) {
  const navigate = useNavigate();
  const past = isPast(new Date(event.date_time));
  const soon = isFuture(new Date(event.date_time));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card
        className="overflow-hidden cursor-pointer hover:shadow-md transition-all border border-border/60 group"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        {event.banner_url || event.cover_image_url ? (
          <div className="h-40 overflow-hidden bg-gray-100">
            <img
              src={event.banner_url || event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-[#2563EB]/10 to-purple-100 flex items-center justify-center">
            <CalendarDays className="w-12 h-12 text-[#2563EB]/40" />
          </div>
        )}

        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="outline" className={`text-xs capitalize ${FORMAT_COLORS[event.format] || ""}`}>
              {event.format}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {past ? "Ended" : formatDistanceToNow(new Date(event.date_time), { addSuffix: true })}
            </span>
          </div>

          <div>
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors">
              {event.title}
            </h3>
            {event.niche_category && (
              <span className="text-xs text-muted-foreground">{event.niche_category}</span>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{format(new Date(event.date_time), "EEE, MMM d 'at' h:mm a")}</span>
            </div>
            {event.location_address ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{event.location_address}</span>
              </div>
            ) : event.platform_name ? (
              <div className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{event.platform_name}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{event.attendee_count} attending</span>
              {event.max_attendees && (
                <span className="text-muted-foreground/60">/ {event.max_attendees} max</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className={`text-sm font-semibold ${event.price_type === "free" ? "text-green-600" : "text-[#1E3A5F]"}`}>
              {event.price_type === "free" ? "Free" : event.ticket_price ? `$${event.ticket_price}` : "Paid"}
            </span>
            {!past && (
              <Button
                size="sm"
                variant={event.user_rsvped ? "outline" : "default"}
                className={event.user_rsvped ? "" : "bg-[#2563EB] hover:bg-[#1d4ed8]"}
                onClick={(e) => { e.stopPropagation(); onRsvp(event.id); }}
              >
                {event.user_rsvped ? "Attending" : "RSVP"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FeaturedBanner({ event, onRsvp }: { event: any; onRsvp: (id: string) => void }) {
  const navigate = useNavigate();
  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group mb-6"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <div className="h-56 md:h-72 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]">
        {(event.banner_url || event.cover_image_url) && (
          <img
            src={event.banner_url || event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
          />
        )}
      </div>
      <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 via-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">Featured Event</span>
          <Badge variant="outline" className={`text-xs capitalize border-white/30 text-white ${FORMAT_COLORS[event.format] || ""}`}>
            {event.format}
          </Badge>
        </div>
        <h2 className="text-white text-2xl font-bold mb-1 line-clamp-2">{event.title}</h2>
        <div className="flex items-center gap-4 text-white/80 text-sm mb-4">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            {format(new Date(event.date_time), "EEE, MMM d 'at' h:mm a")}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {event.attendee_count} attending
          </span>
        </div>
        <Button
          className="w-fit bg-white text-[#1E3A5F] hover:bg-white/90"
          onClick={(e) => { e.stopPropagation(); onRsvp(event.id); }}
        >
          {event.user_rsvped ? "Attending ✓" : "RSVP Now"}
        </Button>
      </div>
    </div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("upcoming");
  const [formats, setFormats] = useState<string[]>([]);
  const [price, setPrice] = useState<string>("all");
  const [niche, setNiche] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [tab, formats, price, niche, user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("date_time", { ascending: true });

      if (tab === "upcoming") query = query.gte("date_time", new Date().toISOString());
      if (tab === "past") query = query.lt("date_time", new Date().toISOString()).order("date_time", { ascending: false });
      if (tab === "mine" && user) query = query.eq("organizer_id", user.id);

      if (formats.length > 0) query = query.in("format", formats);
      if (price !== "all") query = query.eq("price_type", price);
      if (niche !== "all") query = query.eq("niche_category", niche);

      const { data: eventsData } = await query.limit(30);

      let userRsvps: string[] = [];
      if (user) {
        const { data: rsvpData } = await (supabase as any)
          .from("event_rsvps")
          .select("event_id")
          .eq("user_id", user.id);
        userRsvps = (rsvpData || []).map((r: any) => r.event_id);
      }

      const tagged = (eventsData || []).map((e: any) => ({
        ...e,
        user_rsvped: userRsvps.includes(e.id),
      }));

      // Find featured event
      const feat = tagged.find((e: any) => e.is_featured && isFuture(new Date(e.date_time)));
      setFeatured(feat || null);
      setEvents(tagged);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (eventId: string) => {
    if (!user) { navigate("/login"); return; }
    const existing = events.find((e) => e.id === eventId)?.user_rsvped;
    if (existing) {
      await (supabase as any)
        .from("event_rsvps")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);
    } else {
      await (supabase as any)
        .from("event_rsvps")
        .insert({ event_id: eventId, user_id: user.id, payment_status: "pending" });
    }
    fetchEvents();
  };

  const filtered = events.filter((e) =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleFormat = (f: string) =>
    setFormats((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const hasFilters = formats.length > 0 || price !== "all" || niche !== "all";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Events Hub</h1>
          <p className="text-muted-foreground text-sm">Webinars, workshops, conferences & more</p>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          onClick={() => navigate("/events/post")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Post Event
        </Button>
      </div>

      {/* Featured banner */}
      {featured && !loading && tab === "upcoming" && (
        <FeaturedBanner event={featured} onRsvp={handleRsvp} />
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={tab} onValueChange={setTab} className="flex-shrink-0">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="mine">My Events</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={hasFilters ? "border-[#2563EB] text-[#2563EB]" : ""}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasFilters && <span className="ml-1 bg-[#2563EB] text-white text-xs rounded-full px-1.5">{formats.length + (price !== "all" ? 1 : 0) + (niche !== "all" ? 1 : 0)}</span>}
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Format</Label>
                  <div className="space-y-2">
                    {FORMAT_OPTIONS.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Checkbox
                          id={f}
                          checked={formats.includes(f)}
                          onCheckedChange={() => toggleFormat(f)}
                        />
                        <label htmlFor={f} className="text-sm capitalize cursor-pointer">{f}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Price</Label>
                  <Select value={price} onValueChange={setPrice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Niche / Category</Label>
                  <Select value={niche} onValueChange={setNiche}>
                    <SelectTrigger><SelectValue placeholder="All niches" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All niches</SelectItem>
                      {NICHE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasFilters && (
                <div className="flex justify-end mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFormats([]); setPrice("all"); setNiche("all"); }}
                  >
                    <X className="w-4 h-4 mr-1" /> Clear filters
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">No events found</p>
          <p className="text-sm mb-6">
            {tab === "mine" ? "You haven't posted any events yet." : "Try adjusting your filters or check back later."}
          </p>
          <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => navigate("/events/post")}>
            Post an Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} onRsvp={handleRsvp} />
          ))}
        </div>
      )}
    </div>
  );
}
