import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Eye,
  CheckCircle,
} from "lucide-react";

const FORMAT_OPTIONS = ["webinar", "workshop", "conference", "meetup", "hackathon"] as const;
const NICHE_OPTIONS = [
  "Design", "Engineering", "Marketing", "Product", "Data Science",
  "DevOps", "Blockchain", "AI/ML", "Startup", "Finance", "Healthcare",
];
const TIMEZONES = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Africa/Lagos", "Asia/Kolkata"];

const STEPS = ["Basic Info", "Date & Location", "Pricing", "Preview"];

interface Speaker {
  name: string;
  title: string;
  bio: string;
}

interface AgendaItem {
  time: string;
  topic: string;
}

export default function PostEvent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const dirRef = useRef(1);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<string>("");
  const [niche, setNiche] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  // Step 2
  const [dateTime, setDateTime] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [eventLink, setEventLink] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  // Step 3
  const [priceType, setPriceType] = useState<"free" | "paid">("free");
  const [ticketPrice, setTicketPrice] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const goNext = () => {
    dirRef.current = 1;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goPrev = () => {
    dirRef.current = -1;
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleBannerUpload = async (file: File) => {
    setBannerUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split(".").pop();
      const path = `events/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("portfolio").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("portfolio").getPublicUrl(path);
      setBannerUrl(publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setBannerUploading(false);
    }
  };

  const addSpeaker = () => setSpeakers((p) => [...p, { name: "", title: "", bio: "" }]);
  const removeSpeaker = (i: number) => setSpeakers((p) => p.filter((_, idx) => idx !== i));
  const updateSpeaker = (i: number, field: keyof Speaker, value: string) =>
    setSpeakers((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const addAgendaItem = () => setAgenda((p) => [...p, { time: "", topic: "" }]);
  const removeAgendaItem = (i: number) => setAgenda((p) => p.filter((_, idx) => idx !== i));
  const updateAgendaItem = (i: number, field: keyof AgendaItem, value: string) =>
    setAgenda((p) => p.map((a, idx) => idx === i ? { ...a, [field]: value } : a));

  const canProceed = () => {
    if (step === 0) return title.trim() && format;
    if (step === 1) return dateTime;
    return true;
  };

  const handlePublish = async (status: "published" | "draft") => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { error } = await (supabase as any).from("events").insert({
        organizer_id: user.id,
        title,
        description: description || null,
        banner_url: bannerUrl || null,
        format,
        niche_category: niche || null,
        date_time: new Date(dateTime).toISOString(),
        timezone,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        platform_name: isOnline ? platformName || null : null,
        event_link: isOnline ? eventLink || null : null,
        location_address: !isOnline ? locationAddress || null : null,
        price_type: priceType,
        ticket_price: priceType === "paid" && ticketPrice ? parseFloat(ticketPrice) : null,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        status,
        is_featured: isFeatured,
        speakers: speakers.filter((s) => s.name.trim()),
        agenda: agenda.filter((a) => a.topic.trim()),
      });

      if (error) throw error;

      toast({
        title: status === "published" ? "Event published!" : "Draft saved",
        description: status === "published" ? "Your event is now live." : "You can publish it later.",
      });
      navigate("/events/my-events");
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate("/events")}
        >
          <ArrowLeft className="w-4 h-4" /> Events
        </button>
        <div className="flex-1">
          <h1 className="text-[14px] font-semibold text-foreground">Post an Event</h1>
          <p className="text-[12px] text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-border"}`} />
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <span className={`text-[11px] font-medium ${i === step ? "text-primary" : i < step ? "text-foreground" : "text-muted-foreground"}`}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={dirRef.current}>
        <motion.div
          key={step}
          custom={dirRef.current}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.18, ease: "easeInOut" }}
        >
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Basic Info</span>
              </div>
              <div className="px-5 py-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Event Title *</label>
                  <Input placeholder="e.g. React Summit 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Format *</label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Niche / Category</label>
                    <Select value={niche} onValueChange={setNiche}>
                      <SelectTrigger><SelectValue placeholder="Select niche" /></SelectTrigger>
                      <SelectContent>
                        {NICHE_OPTIONS.map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                  <Textarea
                    placeholder="Describe your event, what attendees will learn, who should attend..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="text-[13px]"
                  />
                </div>

                {/* Banner */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Event Banner</label>
                  {bannerUrl ? (
                    <div className="relative">
                      <img src={bannerUrl} alt="Banner" className="w-full h-40 object-cover rounded-xl" />
                      <button
                        className="absolute top-2 right-2 px-3 py-1 rounded-lg border border-border bg-card text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setBannerUrl("")}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                      {bannerUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground mb-2" />
                          <span className="text-[13px] text-muted-foreground">Upload banner image</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleBannerUpload(e.target.files[0])}
                      />
                    </label>
                  )}
                </div>

                {/* Speakers */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider block">Speakers (optional)</label>
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      onClick={addSpeaker}
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {speakers.map((sp, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-start">
                      <Input placeholder="Name" value={sp.name} onChange={(e) => updateSpeaker(i, "name", e.target.value)} className="text-[13px]" />
                      <Input placeholder="Title / Role" value={sp.title} onChange={(e) => updateSpeaker(i, "title", e.target.value)} className="text-[13px]" />
                      <div className="flex gap-1">
                        <Input placeholder="Bio (optional)" value={sp.bio} onChange={(e) => updateSpeaker(i, "bio", e.target.value)} className="text-[13px]" />
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
                          onClick={() => removeSpeaker(i)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agenda */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider block">Agenda (optional)</label>
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      onClick={addAgendaItem}
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {agenda.map((item, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input placeholder="Time (e.g. 10:00 AM)" value={item.time} onChange={(e) => updateAgendaItem(i, "time", e.target.value)} className="w-36 text-[13px]" />
                      <Input placeholder="Topic" value={item.topic} onChange={(e) => updateAgendaItem(i, "topic", e.target.value)} className="text-[13px]" />
                      <button
                        type="button"
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
                        onClick={() => removeAgendaItem(i)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Date & Location */}
          {step === 1 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Date & Location</span>
              </div>
              <div className="px-5 py-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Date & Time *</label>
                    <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Timezone</label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Duration (minutes)</label>
                  <Input type="number" placeholder="e.g. 90" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <Switch checked={isOnline} onCheckedChange={setIsOnline} />
                  <span className="text-[13px] text-foreground">{isOnline ? "Online Event" : "In-Person Event"}</span>
                </div>

                {isOnline ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Platform (e.g. Zoom, Google Meet)</label>
                      <Input placeholder="Zoom" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Event Link (shared after RSVP)</label>
                      <Input placeholder="https://..." value={eventLink} onChange={(e) => setEventLink(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Venue Address</label>
                    <Input placeholder="123 Street, City, Country" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Pricing */}
          {step === 2 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Pricing & Settings</span>
              </div>
              <div className="px-5 py-6 space-y-5">
                {/* Price type toggle */}
                <div className="flex rounded-xl border border-border p-1 bg-muted/30 gap-1">
                  {(["free", "paid"] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPriceType(pt)}
                      className={`flex-1 py-2 px-4 rounded-lg text-[13px] font-semibold transition-all capitalize ${
                        priceType === pt ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>

                {priceType === "paid" && (
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Ticket Price (USD)</label>
                    <Input type="number" placeholder="29.99" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Max Attendees (optional)</label>
                  <Input type="number" placeholder="Leave blank for unlimited" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} />
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">Feature this event</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Featured events appear in the banner spot at the top of the Events page</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 3 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-[13px] font-semibold text-foreground">Event Preview</span>
              </div>
              <div className="px-5 py-6 space-y-4">
                {bannerUrl && <img src={bannerUrl} alt="Banner" className="w-full h-40 object-cover rounded-xl" />}

                <div>
                  <div className="flex gap-2 mb-3">
                    <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md capitalize">{format}</span>
                    {niche && <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">{niche}</span>}
                    <span className={`text-[11px] px-2 py-0.5 rounded-md ${priceType === "free" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {priceType === "free" ? "Free" : `$${ticketPrice}`}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{title || "Event Title"}</h2>
                </div>

                <div className="space-y-1.5">
                  {dateTime && <p className="text-[13px] text-muted-foreground">📅 {new Date(dateTime).toLocaleString()} {timezone}</p>}
                  {durationMinutes && <p className="text-[13px] text-muted-foreground">⏱ {durationMinutes} minutes</p>}
                  {isOnline && platformName && <p className="text-[13px] text-muted-foreground">💻 {platformName}</p>}
                  {!isOnline && locationAddress && <p className="text-[13px] text-muted-foreground">📍 {locationAddress}</p>}
                  {maxAttendees && <p className="text-[13px] text-muted-foreground">👥 Max {maxAttendees} attendees</p>}
                </div>

                {description && <p className="text-[13px] text-muted-foreground line-clamp-4">{description}</p>}

                {speakers.filter((s) => s.name).length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium text-foreground mb-1">Speakers:</p>
                    {speakers.filter((s) => s.name).map((s, i) => (
                      <p key={i} className="text-[13px] text-muted-foreground">{s.name} {s.title && `· ${s.title}`}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          onClick={goPrev}
          disabled={step === 0}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            onClick={goNext}
            disabled={!canProceed()}
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50 transition-colors"
              onClick={() => handlePublish("draft")}
              disabled={saving}
            >
              Save as Draft
            </button>
            <button
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              onClick={() => handlePublish("published")}
              disabled={saving}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing...</> : <><CheckCircle className="w-4 h-4" />Publish Event</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
