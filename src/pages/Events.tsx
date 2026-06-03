import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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
import {
  CalendarDays,
  Search,
  MapPin,
  Users,
  Star,
  Plus,
  Video,
  Filter,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FORMAT_OPTIONS = ["webinar", "workshop", "conference", "meetup", "hackathon"] as const;
const NICHE_OPTIONS = [
  "Design", "Engineering", "Marketing", "Product", "Data Science",
  "DevOps", "Blockchain", "AI/ML", "Startup", "Finance", "Healthcare",
];

const FORMAT_TEXT_COLORS: Record<string, string> = {
  webinar:    "text-blue-600",
  workshop:   "text-purple-600",
  conference: "text-orange-600",
  meetup:     "text-green-600",
  hackathon:  "text-rose-600",
};

function EventCard({ event, onRsvp }: { event: any; onRsvp: (id: string) => void }) {
  const navigate = useNavigate();
  const past = isPast(new Date(event.date_time));
  const monthStr = format(new Date(event.date_time), "MMM").toUpperCase();
  const dayStr   = format(new Date(event.date_time), "d");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div
        className="border border-border rounded-xl bg-card overflow-hidden hover:border-primary/30 transition-colors group cursor-pointer flex flex-col"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        {/* Image or gradient header */}
        {event.banner_url || event.cover_image_url ? (
          <div className="h-36 overflow-hidden bg-muted">
            <img
              src={event.banner_url || event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="h-36 bg-gradient-to-br from-primary/8 to-primary/4 flex items-center justify-center">
            <CalendarDays className="w-10 h-10 text-primary/20" />
          </div>
        )}

        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Date widget + title */}
          <div className="flex items-start gap-3">
            {/* Stacked calendar widget */}
            <div className="flex flex-col items-center w-10 border border-border rounded-lg overflow-hidden shrink-0">
              <span className="text-[9px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground w-full text-center py-0.5 leading-none">
                {monthStr}
              </span>
              <span className="text-[17px] font-bold text-foreground leading-tight py-0.5">
                {dayStr}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              {event.niche_category && (
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{event.niche_category}</p>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            <span className={`capitalize font-medium ${FORMAT_TEXT_COLORS[event.format] || "text-muted-foreground"}`}>
              {event.format}
            </span>
            <span className="opacity-40">·</span>
            {event.location_address ? (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {event.location_address}
              </span>
            ) : event.platform_name ? (
              <span className="flex items-center gap-1">
                <Video className="w-3 h-3 shrink-0" />
                {event.platform_name}
              </span>
            ) : (
              <span>{format(new Date(event.date_time), "h:mm a")}</span>
            )}
            <span className="opacity-40">·</span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 shrink-0" />
              {event.attendee_count}
            </span>
          </div>

          {/* Bottom row: price + action */}
          <div className="flex items-center justify-between mt-auto pt-1 border-t border-border">
            <span className={`text-[13px] font-semibold ${event.price_type === "free" ? "text-green-600" : "text-foreground"}`}>
              {event.price_type === "free" ? "Free" : event.ticket_price ? `$${event.ticket_price}` : "Paid"}
            </span>
            <div className="flex items-center gap-2">
              {past ? (
                <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">Ended</span>
              ) : event.user_rsvped ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRsvp(event.id); }}
                  className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  Attending
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onRsvp(event.id); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
                >
                  RSVP
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeaturedBanner({ event, onRsvp }: { event: any; onRsvp: (id: string) => void }) {
  const navigate = useNavigate();
  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group mb-6 border border-border"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <div className="h-56 md:h-72 bg-gradient-to-br from-[#1E3A5F] to-primary">
        {(event.banner_url || event.cover_image_url) && (
          <img
            src={event.banner_url || event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
          />
        )}
      </div>
      <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/70 via-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 text-[13px] font-medium">Featured Event</span>
          <span className="text-[11px] px-2 py-0.5 bg-white/10 text-white rounded-md capitalize">{event.format}</span>
        </div>
        <h2 className="text-white text-2xl font-semibold mb-1 line-clamp-2 tracking-tight">{event.title}</h2>
        <div className="flex items-center gap-4 text-white/70 text-[13px] mb-4">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            {format(new Date(event.date_time), "EEE, MMM d 'at' h:mm a")}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {event.attendee_count} attending
          </span>
        </div>
        <button
          className="w-fit px-4 py-2 rounded-lg bg-white text-[#1E3A5F] text-[13px] font-medium hover:bg-white/90 transition-colors"
          onClick={(e) => { e.stopPropagation(); onRsvp(event.id); }}
        >
          {event.user_rsvped ? "Attending ✓" : "RSVP Now"}
        </button>
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
  const activeFilterCount = formats.length + (price !== "all" ? 1 : 0) + (niche !== "all" ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Events Hub</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Webinars, workshops, conferences &amp; more</p>
        </div>
        <button
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          onClick={() => navigate("/events/post")}
        >
          <Plus className="w-4 h-4" />
          Post Event
        </button>
      </div>

      {/* Featured banner */}
      {featured && !loading && tab === "upcoming" && (
        <FeaturedBanner event={featured} onRsvp={handleRsvp} />
      )}

      {/* Tabs + Search bar */}
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
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-medium transition-colors ${
              hasFilters
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && (
              <span className="ml-0.5 bg-primary text-primary-foreground text-[11px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
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
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Filters</span>
                {hasFilters && (
                  <button
                    onClick={() => { setFormats([]); setPrice("all"); setNiche("all"); }}
                    className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clear all
                  </button>
                )}
              </div>
              <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Format</p>
                  <div className="space-y-2">
                    {FORMAT_OPTIONS.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Checkbox
                          id={f}
                          checked={formats.includes(f)}
                          onCheckedChange={() => toggleFormat(f)}
                        />
                        <label htmlFor={f} className="text-[13px] capitalize cursor-pointer text-foreground">{f}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Price</p>
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
                  <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Niche / Category</p>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border rounded-xl bg-card overflow-hidden">
              <Skeleton className="h-36 w-full" />
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-8 w-20 mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CalendarDays className="w-10 h-10 opacity-20 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-foreground mb-1">No events found</p>
          <p className="text-[13px] text-muted-foreground mb-4">
            {tab === "mine" ? "You haven't posted any events yet." : "Try adjusting your filters or check back later."}
          </p>
          <button
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
            onClick={() => navigate("/events/post")}
          >
            Post an Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} onRsvp={handleRsvp} />
          ))}
        </div>
      )}
    </div>
  );
}
