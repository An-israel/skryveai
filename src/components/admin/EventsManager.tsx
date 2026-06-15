import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Edit, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EVENT_FORMATS = ["webinar", "workshop", "conference", "meetup", "hackathon"] as const;
const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
const PRICE_TYPES = ["free", "paid"] as const;

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  duration_minutes: number | null;
  format: string;
  location_address: string | null;
  banner_url: string | null;
  status: string;
  price_type: string;
  ticket_price: number | null;
  max_attendees: number | null;
  attendee_count: number;
  event_link: string | null;
  niche_category: string | null;
  is_highlighted: boolean;
}

const emptyForm = {
  title: "",
  description: "",
  date_time: "",
  duration_minutes: "",
  format: "webinar",
  location_address: "",
  banner_url: "",
  status: "draft",
  price_type: "free",
  ticket_price: "",
  max_attendees: "",
  event_link: "",
  niche_category: "",
  is_highlighted: false,
};

export function EventsManager() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("events")
        .select("*")
        .order("date_time", { ascending: true });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Failed to load events:", error);
      toast({ title: "Failed to load events", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (event: EventRow) => {
    setEditing(event);
    setForm({
      title: event.title || "",
      description: event.description || "",
      date_time: event.date_time ? toLocalDateTimeInput(event.date_time) : "",
      duration_minutes: event.duration_minutes?.toString() || "",
      format: event.format || "webinar",
      location_address: event.location_address || "",
      banner_url: event.banner_url || "",
      status: event.status || "draft",
      price_type: event.price_type || "free",
      ticket_price: event.ticket_price?.toString() || "",
      max_attendees: event.max_attendees?.toString() || "",
      event_link: event.event_link || "",
      niche_category: event.niche_category || "",
      is_highlighted: !!event.is_highlighted,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date_time) {
      toast({ title: "Title and date/time are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        date_time: new Date(form.date_time).toISOString(),
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        format: form.format,
        location_address: form.location_address.trim() || null,
        banner_url: form.banner_url.trim() || null,
        status: form.status,
        price_type: form.price_type,
        ticket_price: form.ticket_price ? Number(form.ticket_price) : null,
        max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
        event_link: form.event_link.trim() || null,
        niche_category: form.niche_category.trim() || null,
        is_highlighted: form.is_highlighted,
      };

      if (editing) {
        const { error } = await (supabase as any).from("events").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Event updated" });
      } else {
        const { data: userData } = await supabase.auth.getUser();
        payload.organizer_id = userData.user?.id;
        const { error } = await (supabase as any).from("events").insert(payload);
        if (error) throw error;
        toast({ title: "Event created" });
      }
      setShowDialog(false);
      loadEvents();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save event";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const { error } = await (supabase as any).from("events").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Event deleted" });
      loadEvents();
    } catch {
      toast({ title: "Failed to delete event", variant: "destructive" });
    }
  };

  const toggleHighlight = async (event: EventRow) => {
    try {
      const { error } = await (supabase as any)
        .from("events")
        .update({ is_highlighted: !event.is_highlighted })
        .eq("id", event.id);
      if (error) throw error;
      loadEvents();
    } catch {
      toast({ title: "Failed to update highlight", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Events</CardTitle>
          <CardDescription>Manage platform events (webinars, workshops, meetups, etc.)</CardDescription>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Event" : "Create Event"}</DialogTitle>
              <DialogDescription>Fill in the event details below.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Event description" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={form.date_time} onChange={(e) => setForm({ ...form, date_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="60" />
              </div>
              <div className="space-y-1.5">
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Location Address</Label>
                <Input value={form.location_address} onChange={(e) => setForm({ ...form, location_address: e.target.value })} placeholder="Physical address or 'Online'" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Banner Image URL</Label>
                <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Price Type</Label>
                <Select value={form.price_type} onValueChange={(v) => setForm({ ...form, price_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICE_TYPES.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ticket Price</Label>
                <Input type="number" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: e.target.value })} placeholder="0" disabled={form.price_type === "free"} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Attendees</Label>
                <Input type="number" value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: e.target.value })} placeholder="100" />
              </div>
              <div className="space-y-1.5">
                <Label>Niche Category</Label>
                <Input value={form.niche_category} onChange={(e) => setForm({ ...form, niche_category: e.target.value })} placeholder="e.g. Design, Web Dev" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Event Link</Label>
                <Input value={form.event_link} onChange={(e) => setForm({ ...form, event_link: e.target.value })} placeholder="https://..." />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch checked={form.is_highlighted} onCheckedChange={(v) => setForm({ ...form, is_highlighted: v })} />
                <Label className="!mb-0">Highlight this event</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editing ? "Save Changes" : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No events created yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Highlighted</TableHead>
                <TableHead>Attendees</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell className="text-xs">{new Date(event.date_time).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{event.format}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={event.status === "published" ? "default" : event.status === "cancelled" ? "destructive" : "secondary"}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => toggleHighlight(event)} title="Toggle highlight">
                      <Star className={`w-4 h-4 ${event.is_highlighted ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </Button>
                  </TableCell>
                  <TableCell>{event.attendee_count}{event.max_attendees ? ` / ${event.max_attendees}` : ""}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function toLocalDateTimeInput(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
