import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
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
const TIMEZONES = [
  { value: "Africa/Lagos", label: "WAT — West Africa (Lagos)" },
  { value: "Africa/Nairobi", label: "EAT — East Africa (Nairobi)" },
  { value: "Africa/Johannesburg", label: "SAST — South Africa" },
  { value: "Africa/Cairo", label: "EET — Egypt" },
  { value: "UTC", label: "UTC / GMT" },
  { value: "Europe/London", label: "GMT/BST — London" },
  { value: "Europe/Paris", label: "CET — Central Europe" },
  { value: "America/New_York", label: "EST/EDT — US Eastern" },
  { value: "America/Chicago", label: "CST/CDT — US Central" },
  { value: "America/Denver", label: "MST/MDT — US Mountain" },
  { value: "America/Los_Angeles", label: "PST/PDT — US Pacific" },
  { value: "America/Sao_Paulo", label: "BRT — Brazil" },
  { value: "Asia/Dubai", label: "GST — Gulf (Dubai)" },
  { value: "Asia/Kolkata", label: "IST — India" },
  { value: "Asia/Singapore", label: "SGT — Singapore" },
  { value: "Asia/Shanghai", label: "CST — China" },
  { value: "Asia/Tokyo", label: "JST — Japan" },
  { value: "Australia/Sydney", label: "AEST — Sydney" },
];

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
  const [isHost, setIsHost] = useState(true);
  const [hostName, setHostName] = useState("");

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
        is_host: isHost,
        host_name: isHost ? null : (hostName || null),
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
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/events")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Events
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1E3A5F]">Post an Event</h1>
          <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />

      <AnimatePresence mode="wait" custom={dirRef.current}>
        <motion.div
          key={step}
          custom={dirRef.current}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                  <Label>Event Title <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. React Summit 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Format <span className="text-red-500">*</span></Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Niche / Category</Label>
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

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe your event, what attendees will learn, who should attend..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Banner */}
                <div className="space-y-2">
                  <Label>Event Banner</Label>
                  {bannerUrl ? (
                    <div className="relative">
                      <img src={bannerUrl} alt="Banner" className="w-full h-40 object-cover rounded-lg" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 bg-white"
                        onClick={() => setBannerUrl("")}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      {bannerUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Upload banner image</span>
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
                  <div className="flex items-center justify-between mb-2">
                    <Label>Speakers (optional)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addSpeaker}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {speakers.map((sp, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-start">
                      <Input placeholder="Name" value={sp.name} onChange={(e) => updateSpeaker(i, "name", e.target.value)} />
                      <Input placeholder="Title / Role" value={sp.title} onChange={(e) => updateSpeaker(i, "title", e.target.value)} />
                      <div className="flex gap-1">
                        <Input placeholder="Bio (optional)" value={sp.bio} onChange={(e) => updateSpeaker(i, "bio", e.target.value)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSpeaker(i)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agenda */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Agenda (optional)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addAgendaItem}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {agenda.map((item, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input placeholder="Time (e.g. 10:00 AM)" value={item.time} onChange={(e) => updateAgendaItem(i, "time", e.target.value)} className="w-36" />
                      <Input placeholder="Topic" value={item.topic} onChange={(e) => updateAgendaItem(i, "topic", e.target.value)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAgendaItem(i)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Date & Location */}
          {step === 1 && (
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date & Time <span className="text-red-500">*</span></Label>
                    <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" placeholder="e.g. 90" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <Switch checked={isOnline} onCheckedChange={setIsOnline} />
                  <Label>{isOnline ? "Online Event" : "In-Person Event"}</Label>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={isHost} onCheckedChange={setIsHost} />
                    <Label>{isHost ? "I'm hosting this event" : "Someone else is hosting"}</Label>
                  </div>
                  {!isHost && (
                    <Input
                      placeholder="Host / organizer name (e.g. AIESEC Enugu)"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                    />
                  )}
                </div>

                {isOnline ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Platform (e.g. Zoom, Google Meet)</Label>
                      <Input placeholder="Zoom" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Event Link (shared after RSVP)</Label>
                      <Input placeholder="https://..." value={eventLink} onChange={(e) => setEventLink(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Venue Address</Label>
                    <Input placeholder="123 Street, City, Country" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Pricing */}
          {step === 2 && (
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="flex rounded-full border border-gray-200 p-1 bg-gray-100 gap-1">
                  {(["free", "paid"] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPriceType(pt)}
                      className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all capitalize ${priceType === pt ? "bg-[#2563EB] text-white shadow" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>

                {priceType === "paid" && (
                  <div className="space-y-2">
                    <Label>Ticket Price (USD)</Label>
                    <Input type="number" placeholder="29.99" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Max Attendees (optional)</Label>
                  <Input type="number" placeholder="Leave blank for unlimited" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                  <div>
                    <Label>Feature this event</Label>
                    <p className="text-xs text-muted-foreground">Featured events appear in the banner spot at the top of the Events page</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Preview */}
          {step === 3 && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">Event Preview</span>
                </div>

                {bannerUrl && <img src={bannerUrl} alt="Banner" className="w-full h-40 object-cover rounded-lg" />}

                <div>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline" className="capitalize">{format}</Badge>
                    {niche && <Badge variant="outline">{niche}</Badge>}
                    <Badge variant="outline" className={priceType === "free" ? "text-green-700" : "text-blue-700"}>
                      {priceType === "free" ? "Free" : `$${ticketPrice}`}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3A5F]">{title || "Event Title"}</h2>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  {dateTime && <p>📅 {new Date(dateTime).toLocaleString()} {timezone}</p>}
                  {durationMinutes && <p>⏱ {durationMinutes} minutes</p>}
                  {isOnline && platformName && <p>💻 {platformName}</p>}
                  {!isOnline && locationAddress && <p>📍 {locationAddress}</p>}
                  {maxAttendees && <p>👥 Max {maxAttendees} attendees</p>}
                </div>

                {description && <p className="text-sm text-muted-foreground line-clamp-4">{description}</p>}

                {speakers.filter((s) => s.name).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Speakers:</p>
                    {speakers.filter((s) => s.name).map((s, i) => (
                      <p key={i} className="text-sm text-muted-foreground">{s.name} {s.title && `· ${s.title}`}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={goNext} disabled={!canProceed()}>
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handlePublish("draft")} disabled={saving}>
              Save as Draft
            </Button>
            <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => handlePublish("published")} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing...</> : <><CheckCircle className="w-4 h-4 mr-2" />Publish Event</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
