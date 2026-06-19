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
import { Loader2, Plus, Edit, Trash2, ArrowUp, ArrowDown, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function dbError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "object") {
    const e = err as any;
    return e.message || e.error_description || e.details || JSON.stringify(e);
  }
  return String(err);
}

const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"];
const CONTENT_TYPES = ["video", "article", "text", "quiz", "assignment"];

interface LearningPath {
  id: string;
  skill_name: string;
  display_name: string;
  description: string | null;
  short_description: string | null;
  difficulty_level: string | null;
  estimated_weeks: number | null;
  total_modules: number;
  total_lessons: number;
  is_active: boolean;
  popular_rank: number | null;
}

interface LearningModule {
  id: string;
  learning_path_id: string;
  module_number: number;
  title: string;
  order_index: number | null;
}

interface LearningLesson {
  id: string;
  learning_path_id: string;
  module_id: string;
  lesson_number: number;
  order_index: number | null;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  estimated_minutes: number | null;
  credits_cost: number | null;
  has_assignment: boolean | null;
  required_for_next: boolean | null;
}

const emptyPathForm = {
  skill_name: "",
  display_name: "",
  description: "",
  short_description: "",
  difficulty_level: "beginner",
  estimated_weeks: "",
  is_active: true,
  popular_rank: "",
};

const emptyLessonForm = {
  title: "",
  description: "",
  content_type: "video",
  content_url: "",
  order_index: "",
  lesson_number: "",
  module_id: "",   // UUID of a learning_module row
  estimated_minutes: "",
  required_for_next: false,
};

export function SkillsManager() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loadingPaths, setLoadingPaths] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);

  const [showPathDialog, setShowPathDialog] = useState(false);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [pathForm, setPathForm] = useState(emptyPathForm);
  const [savingPath, setSavingPath] = useState(false);

  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LearningLesson | null>(null);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);
  const [savingLesson, setSavingLesson] = useState(false);

  const { toast } = useToast();

  const loadPaths = async () => {
    setLoadingPaths(true);
    try {
      const { data, error } = await (supabase as any)
        .from("learning_paths")
        .select("*")
        .order("popular_rank", { ascending: true, nullsFirst: false });
      if (error) throw error;
      setPaths(data || []);
      if (data && data.length > 0 && !selectedPath) {
        setSelectedPath(data[0]);
      }
    } catch (error) {
      console.error("Failed to load learning paths:", error);
      toast({ title: "Failed to load learning paths", variant: "destructive" });
    } finally {
      setLoadingPaths(false);
    }
  };

  const loadModules = async (pathId: string): Promise<LearningModule[]> => {
    const { data, error } = await (supabase as any)
      .from("learning_modules")
      .select("id, learning_path_id, module_number, title, order_index")
      .eq("learning_path_id", pathId)
      .order("order_index", { ascending: true });
    if (error) {
      console.error("Failed to load modules:", error);
      return [];
    }
    const mods: LearningModule[] = data || [];
    setModules(mods);
    return mods;
  };

  const ensureDefaultModule = async (pathId: string, mods: LearningModule[]): Promise<string> => {
    if (mods.length > 0) return mods[0].id;
    // Auto-create "Module 1" if none exist
    const { data, error } = await (supabase as any)
      .from("learning_modules")
      .insert({ learning_path_id: pathId, module_number: 1, title: "Module 1", order_index: 1 })
      .select("id")
      .single();
    if (error) throw new Error("Could not create default module: " + dbError(error));
    const newMods = await loadModules(pathId);
    setModules(newMods);
    return data.id;
  };

  const loadLessons = async (pathId: string) => {
    setLoadingLessons(true);
    try {
      const [{ data, error }] = await Promise.all([
        (supabase as any)
          .from("learning_lessons")
          .select("*")
          .eq("learning_path_id", pathId)
          .order("order_index", { ascending: true }),
        loadModules(pathId),
      ]);
      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error("Failed to load lessons:", error);
      toast({ title: "Failed to load lessons", variant: "destructive" });
    } finally {
      setLoadingLessons(false);
    }
  };

  useEffect(() => {
    loadPaths();
  }, []);

  useEffect(() => {
    if (selectedPath) loadLessons(selectedPath.id);
    else { setLessons([]); setModules([]); }
  }, [selectedPath?.id]);

  // Path dialog handlers
  const openCreatePath = () => {
    setEditingPath(null);
    setPathForm(emptyPathForm);
    setShowPathDialog(true);
  };

  const openEditPath = (path: LearningPath) => {
    setEditingPath(path);
    setPathForm({
      skill_name: path.skill_name || "",
      display_name: path.display_name || "",
      description: path.description || "",
      short_description: path.short_description || "",
      difficulty_level: path.difficulty_level || "beginner",
      estimated_weeks: path.estimated_weeks?.toString() || "",
      is_active: path.is_active,
      popular_rank: path.popular_rank?.toString() || "",
    });
    setShowPathDialog(true);
  };

  const handleSavePath = async () => {
    if (!pathForm.display_name.trim() || !pathForm.skill_name.trim()) {
      toast({ title: "Skill name and display name are required", variant: "destructive" });
      return;
    }
    setSavingPath(true);
    try {
      const payload: any = {
        skill_name: pathForm.skill_name.trim(),
        display_name: pathForm.display_name.trim(),
        description: pathForm.description.trim() || null,
        short_description: pathForm.short_description.trim() || null,
        difficulty_level: pathForm.difficulty_level,
        estimated_weeks: pathForm.estimated_weeks ? Number(pathForm.estimated_weeks) : null,
        is_active: pathForm.is_active,
        popular_rank: pathForm.popular_rank ? Number(pathForm.popular_rank) : null,
      };
      if (editingPath) {
        const { error } = await (supabase as any).from("learning_paths").update(payload).eq("id", editingPath.id);
        if (error) throw error;
        toast({ title: "Learning path updated" });
      } else {
        const { error } = await (supabase as any).from("learning_paths").insert(payload);
        if (error) throw error;
        toast({ title: "Learning path created" });
      }
      setShowPathDialog(false);
      loadPaths();
    } catch (error: unknown) {
      toast({ title: dbError(error), variant: "destructive" });
    } finally {
      setSavingPath(false);
    }
  };

  const handleDeletePath = async (path: LearningPath) => {
    if (!confirm(`Delete the "${path.display_name}" learning path and all its lessons?`)) return;
    try {
      await (supabase as any).from("learning_lessons").delete().eq("learning_path_id", path.id);
      const { error } = await (supabase as any).from("learning_paths").delete().eq("id", path.id);
      if (error) throw error;
      toast({ title: "Learning path deleted" });
      if (selectedPath?.id === path.id) setSelectedPath(null);
      loadPaths();
    } catch {
      toast({ title: "Failed to delete learning path", variant: "destructive" });
    }
  };

  // Lesson dialog handlers
  const openCreateLesson = () => {
    setEditingLesson(null);
    setLessonForm({
      ...emptyLessonForm,
      module_id: modules[0]?.id || "",
      order_index: ((lessons[lessons.length - 1]?.order_index ?? lessons.length - 1) + 1).toString(),
      lesson_number: ((lessons.length) + 1).toString(),
    });
    setShowLessonDialog(true);
  };

  const openEditLesson = (lesson: LearningLesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title || "",
      description: lesson.description || "",
      content_type: lesson.content_type || "video",
      content_url: lesson.content_url || "",
      order_index: lesson.order_index?.toString() || "",
      lesson_number: lesson.lesson_number?.toString() || "",
      module_id: lesson.module_id || "",
      estimated_minutes: lesson.estimated_minutes?.toString() || "",
      required_for_next: !!lesson.required_for_next,
    });
    setShowLessonDialog(true);
  };

  const handleSaveLesson = async () => {
    if (!selectedPath) return;
    if (!lessonForm.title.trim()) {
      toast({ title: "Lesson title is required", variant: "destructive" });
      return;
    }
    setSavingLesson(true);
    try {
      // Resolve module_id — use selected, fall back to auto-creating a default
      const moduleId = lessonForm.module_id.trim()
        || await ensureDefaultModule(selectedPath.id, modules);

      const payload: any = {
        learning_path_id: selectedPath.id,
        module_id: moduleId,
        title: lessonForm.title.trim(),
        description: lessonForm.description.trim() || null,
        content_type: lessonForm.content_type,
        content_url: lessonForm.content_url.trim() || null,
        order_index: lessonForm.order_index ? Number(lessonForm.order_index) : 0,
        lesson_number: lessonForm.lesson_number ? Number(lessonForm.lesson_number) : 1,
        estimated_minutes: lessonForm.estimated_minutes ? Number(lessonForm.estimated_minutes) : null,
        required_for_next: lessonForm.required_for_next,
      };
      if (editingLesson) {
        const { error } = await (supabase as any).from("learning_lessons").update(payload).eq("id", editingLesson.id);
        if (error) throw error;
        toast({ title: "Lesson updated" });
      } else {
        const { error } = await (supabase as any).from("learning_lessons").insert(payload);
        if (error) throw error;
        toast({ title: "Lesson created" });
      }
      setShowLessonDialog(false);
      loadLessons(selectedPath.id);
    } catch (error: unknown) {
      toast({ title: dbError(error), variant: "destructive" });
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (lesson: LearningLesson) => {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    try {
      const { error } = await (supabase as any).from("learning_lessons").delete().eq("id", lesson.id);
      if (error) throw error;
      toast({ title: "Lesson deleted" });
      if (selectedPath) loadLessons(selectedPath.id);
    } catch {
      toast({ title: "Failed to delete lesson", variant: "destructive" });
    }
  };

  const moveLesson = async (lesson: LearningLesson, direction: "up" | "down") => {
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= lessons.length) return;
    const other = lessons[swapIdx];
    const lessonOrder = lesson.order_index ?? idx;
    const otherOrder = other.order_index ?? swapIdx;
    try {
      await Promise.all([
        (supabase as any).from("learning_lessons").update({ order_index: otherOrder }).eq("id", lesson.id),
        (supabase as any).from("learning_lessons").update({ order_index: lessonOrder }).eq("id", other.id),
      ]);
      if (selectedPath) loadLessons(selectedPath.id);
    } catch {
      toast({ title: "Failed to reorder lessons", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Learning Paths (Skills)</CardTitle>
            <CardDescription>Manage the skills available in the Learn section</CardDescription>
          </div>
          <Dialog open={showPathDialog} onOpenChange={setShowPathDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openCreatePath}>
                <Plus className="w-4 h-4" /> Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPath ? "Edit Skill" : "Create Skill"}</DialogTitle>
                <DialogDescription>Define a learning path / skill.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input value={pathForm.display_name} onChange={(e) => setPathForm({ ...pathForm, display_name: e.target.value })} placeholder="e.g. UI/UX Design" />
                </div>
                <div className="space-y-1.5">
                  <Label>Skill Name (slug/key)</Label>
                  <Input value={pathForm.skill_name} onChange={(e) => setPathForm({ ...pathForm, skill_name: e.target.value })} placeholder="e.g. ui_ux_design" />
                </div>
                <div className="space-y-1.5">
                  <Label>Short Description</Label>
                  <Input value={pathForm.short_description} onChange={(e) => setPathForm({ ...pathForm, short_description: e.target.value })} placeholder="One-line summary" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={pathForm.description} onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })} rows={3} placeholder="Full description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select value={pathForm.difficulty_level} onValueChange={(v) => setPathForm({ ...pathForm, difficulty_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_LEVELS.map((d) => (
                          <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estimated Weeks</Label>
                    <Input type="number" value={pathForm.estimated_weeks} onChange={(e) => setPathForm({ ...pathForm, estimated_weeks: e.target.value })} placeholder="4" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Popular Rank</Label>
                  <Input type="number" value={pathForm.popular_rank} onChange={(e) => setPathForm({ ...pathForm, popular_rank: e.target.value })} placeholder="Lower = more prominent" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={pathForm.is_active} onCheckedChange={(v) => setPathForm({ ...pathForm, is_active: v })} />
                  <Label className="!mb-0">Active (visible to learners)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPathDialog(false)} disabled={savingPath}>Cancel</Button>
                <Button onClick={handleSavePath} disabled={savingPath}>
                  {savingPath ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {editingPath ? "Save Changes" : "Create Skill"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingPaths ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : paths.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No learning paths created yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {paths.map((path) => (
                <div
                  key={path.id}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${selectedPath?.id === path.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                  onClick={() => setSelectedPath(path)}
                >
                  <div>
                    <p className="font-medium text-sm">{path.display_name}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant={path.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {path.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {path.difficulty_level && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{path.difficulty_level}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditPath(path); }}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDeletePath(path); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPath && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lessons — {selectedPath.display_name}</CardTitle>
              <CardDescription>Ordered curriculum for this skill</CardDescription>
            </div>
            <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openCreateLesson}>
                  <Plus className="w-4 h-4" /> Add Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLesson ? "Edit Lesson" : "Create Lesson"}</DialogTitle>
                  <DialogDescription>Define a lesson for {selectedPath.display_name}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Lesson title" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} rows={2} placeholder="What this lesson covers" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Content Type</Label>
                      <Select value={lessonForm.content_type} onValueChange={(v) => setLessonForm({ ...lessonForm, content_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTENT_TYPES.map((c) => (
                            <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estimated Minutes</Label>
                      <Input type="number" value={lessonForm.estimated_minutes} onChange={(e) => setLessonForm({ ...lessonForm, estimated_minutes: e.target.value })} placeholder="15" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Content URL (YouTube link)</Label>
                    <Input value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Module</Label>
                    {modules.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No modules yet — a default "Module 1" will be created automatically.</p>
                    ) : (
                      <Select value={lessonForm.module_id} onValueChange={(v) => setLessonForm({ ...lessonForm, module_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                        <SelectContent>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Lesson #</Label>
                      <Input type="number" value={lessonForm.lesson_number} onChange={(e) => setLessonForm({ ...lessonForm, lesson_number: e.target.value })} placeholder="1" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Order Index</Label>
                      <Input type="number" value={lessonForm.order_index} onChange={(e) => setLessonForm({ ...lessonForm, order_index: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={lessonForm.required_for_next} onCheckedChange={(v) => setLessonForm({ ...lessonForm, required_for_next: v })} />
                    <Label className="!mb-0">Required to unlock next lesson</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowLessonDialog(false)} disabled={savingLesson}>Cancel</Button>
                  <Button onClick={handleSaveLesson} disabled={savingLesson}>
                    {savingLesson ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {editingLesson ? "Save Changes" : "Create Lesson"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingLessons ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : lessons.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No lessons created yet for this skill.</p>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson, idx) => (
                  <div key={lesson.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col">
                        <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onClick={() => moveLesson(lesson, "up")}>
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === lessons.length - 1} onClick={() => moveLesson(lesson, "down")}>
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{lesson.title}</p>
                        <div className="flex gap-1 mt-1 items-center text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{lesson.content_type}</Badge>
                          {lesson.estimated_minutes != null && <span>{lesson.estimated_minutes} min</span>}
                          {lesson.content_url && (
                            <a href={lesson.content_url} target="_blank" rel="noreferrer" className="truncate max-w-[200px] underline">
                              {lesson.content_url}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditLesson(lesson)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(lesson)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
