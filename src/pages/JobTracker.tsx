import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Briefcase, ExternalLink, Pencil, Trash2, ArrowLeft, Building2, DollarSign, Link } from "lucide-react";

type Status = "applied" | "replied" | "interview" | "offer" | "rejected";

interface JobApplication {
  id: string;
  company_name: string;
  role_title: string;
  status: Status;
  job_url?: string;
  notes?: string;
  salary_range?: string;
  source?: string;
  applied_at: string;
}

const COLUMNS: { key: Status; label: string; color: string; bg: string }[] = [
  { key: "applied",   label: "Applied",   color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  { key: "replied",   label: "Replied",   color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  { key: "interview", label: "Interview", color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  { key: "offer",     label: "Offer 🎉",  color: "text-green-600",  bg: "bg-green-50 border-green-200" },
  { key: "rejected",  label: "Rejected",  color: "text-red-500",    bg: "bg-red-50 border-red-200" },
];

const EMPTY: Omit<JobApplication, "id" | "applied_at"> = {
  company_name: "",
  role_title: "",
  status: "applied",
  job_url: "",
  notes: "",
  salary_range: "",
  source: "",
};

export default function JobTracker() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { navigate("/login"); return; }
      setUser(session.user);
      fetchApplications(session.user.id);
    });
  }, [navigate]);

  const fetchApplications = async (userId: string) => {
    const { data } = await supabase
      .from("job_applications")
      .select("*")
      .eq("user_id", userId)
      .order("applied_at", { ascending: false });
    setApplications((data as JobApplication[]) || []);
    setIsLoading(false);
  };

  const openNew = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (app: JobApplication) => {
    setEditing(app);
    setForm({ company_name: app.company_name, role_title: app.role_title, status: app.status,
      job_url: app.job_url || "", notes: app.notes || "", salary_range: app.salary_range || "", source: app.source || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim() || !form.role_title.trim()) {
      toast({ title: "Company and role are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("job_applications").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editing.id);
        if (error) throw error;
        setApplications(prev => prev.map(a => a.id === editing.id ? { ...a, ...form } : a));
        toast({ title: "Application updated" });
      } else {
        const { data, error } = await supabase.from("job_applications").insert({ ...form, user_id: user.id }).select().single();
        if (error) throw error;
        setApplications(prev => [data as JobApplication, ...prev]);
        toast({ title: "Application added!" });
      }
      setDialogOpen(false);
    } catch (e) {
      toast({ title: "Failed to save", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("job_applications").delete().eq("id", id);
    setApplications(prev => prev.filter(a => a.id !== id));
    toast({ title: "Application removed" });
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await supabase.from("job_applications").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const byStatus = (s: Status) => applications.filter(a => a.status === s);

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} onLogout={handleLogout} />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" /> Job Tracker</h1>
                <p className="text-sm text-muted-foreground">{applications.length} application{applications.length !== 1 ? "s" : ""} tracked</p>
              </div>
            </div>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Application</Button>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            {COLUMNS.map(col => (
              <div key={col.key} className={`rounded-xl border p-3 text-center ${col.bg}`}>
                <p className={`text-2xl font-bold ${col.color}`}>{byStatus(col.key).length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{col.label}</p>
              </div>
            ))}
          </div>

          {/* Kanban board */}
          {applications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No applications yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Track every job you apply to and never lose sight of an opportunity.</p>
                <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add your first application</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {COLUMNS.map(col => (
                <div key={col.key} className="space-y-3">
                  <div className={`rounded-lg px-3 py-2 border font-semibold text-sm ${col.bg} ${col.color}`}>
                    {col.label} <span className="ml-1 font-normal opacity-70">({byStatus(col.key).length})</span>
                  </div>
                  <AnimatePresence>
                    {byStatus(col.key).map(app => (
                      <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} layout>
                        <Card className="group hover:shadow-md transition-shadow">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{app.role_title}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                  <Building2 className="w-3 h-3 shrink-0" />{app.company_name}
                                </p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => openEdit(app)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3 h-3" /></button>
                                <button onClick={() => handleDelete(app.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                            {app.salary_range && (
                              <p className="text-xs text-green-600 flex items-center gap-1"><DollarSign className="w-3 h-3" />{app.salary_range}</p>
                            )}
                            {app.job_url && (
                              <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                                <Link className="w-3 h-3" />View job
                              </a>
                            )}
                            <Select value={app.status} onValueChange={v => handleStatusChange(app.id, v as Status)}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">{new Date(app.applied_at).toLocaleDateString()}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Application" : "Add Application"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Company *</Label>
                <Input placeholder="Acme Corp" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Input placeholder="UI/UX Designer" value={form.role_title} onChange={e => setForm(p => ({ ...p, role_title: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as Status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Salary / Rate</Label>
                <Input placeholder="₦500k/month" value={form.salary_range} onChange={e => setForm(p => ({ ...p, salary_range: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Job URL</Label>
              <Input placeholder="https://..." value={form.job_url} onChange={e => setForm(p => ({ ...p, job_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input placeholder="LinkedIn, Upwork, Referral..." value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Any notes about this application..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Add Application"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
