import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { evaluateAchievements } from "@/lib/learning/achievements";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { SEOHead } from "@/components/SEOHead";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ReminderSettingsButton } from "@/components/learning/ReminderSettingsButton";
import { NextBadgeCard } from "@/components/learning/NextBadgeCard";
import { LessonContentEmbed } from "@/components/learning/LessonContentEmbed";
import { validateUrl, parseUrl, type UrlStatus } from "@/lib/learning/url-validation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };

interface Lesson {
  id: string;
  module_id: string;
  lesson_number: number;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  estimated_minutes: number | null;
  has_assignment: boolean;
  order_index: number | null;
}

interface Module {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  content_url: string | null;
}

interface UserLearning {
  id: string;
  user_id: string;
  current_level: number;
  current_module: number;
  current_lesson: number;
  completed_lessons: number;
  completed_lesson_ids: string[] | null;
  total_lessons: number;
  streak_days: number;
  total_time_minutes: number;
  coach_tone: string;
  learning_path_id: string;
  reminders_enabled: boolean;
  reminder_inactivity_days: number;
  learning_paths: { skill_name: string; display_name: string };
}

export default function LearnPath() {
  const { userLearningId } = useParams<{ userLearningId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ul, setUl] = useState<UserLearning | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [completingModuleId, setCompletingModuleId] = useState<string | null>(null);
  const [justCompletedModuleId, setJustCompletedModuleId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const taughtLessonsRef = useRef<Set<string>>(new Set());
  const pendingFocusRef = useRef(false);

  // URL validation cache: url -> "checking" | "ok" | "broken"
  const [urlStatuses, setUrlStatuses] = useState<Record<string, UrlStatus>>({});

  useEffect(() => {
    if (!user || !userLearningId) return;
    void loadAll();
  }, [user, userLearningId]);

  async function loadAll() {
    setLoadingData(true);
    const { data: ulData, error: ulErr } = await supabase
      .from("user_learning")
      .select(
        "id, user_id, current_level, current_module, current_lesson, completed_lessons, completed_lesson_ids, total_lessons, streak_days, total_time_minutes, coach_tone, learning_path_id, reminders_enabled, reminder_inactivity_days, learning_paths(skill_name, display_name)"
      )
      .eq("id", userLearningId!)
      .maybeSingle();
    if (ulErr || !ulData) {
      toast({ title: "Path not found", variant: "destructive" });
      navigate("/tools/learn");
      return;
    }
    const ulRow = ulData as unknown as UserLearning;
    if (ulRow.user_id !== user!.id) {
      navigate("/tools/learn");
      return;
    }
    setUl(ulRow);

    const [{ data: mods }, { data: lessonsData }, { data: history }] = await Promise.all([
      supabase
        .from("learning_modules")
        .select("*")
        .eq("learning_path_id", ulRow.learning_path_id)
        .order("module_number", { ascending: true }),
      supabase
        .from("learning_lessons")
        .select("*")
        .eq("learning_path_id", ulRow.learning_path_id)
        .order("order_index", { ascending: true }),
      supabase
        .from("coach_messages")
        .select("message_text, sent_by, sent_at")
        .eq("user_learning_id", ulRow.id)
        .order("sent_at", { ascending: true })
        .limit(40),
    ]);

    setModules((mods as Module[]) || []);
    setLessons((lessonsData as Lesson[]) || []);

    // Pick the first incomplete lesson
    const completed = new Set(ulRow.completed_lesson_ids || []);
    const next = ((lessonsData as Lesson[]) || []).find((l) => !completed.has(l.id));
    setActiveLessonId(next?.id || (lessonsData as Lesson[])?.[0]?.id || null);

    if (history) {
      setMessages(
        history.map((h: any) => ({
          role: h.sent_by === "user" ? "user" : "assistant",
          content: h.message_text,
        }))
      );
    } else {
      setMessages([
        {
          role: "assistant",
          content: `Welcome to **${ulRow.learning_paths.display_name}**! I'm your coach. Ask me anything about a lesson, paste your work for review, or just say "where do I start?".`,
        },
      ]);
    }
    setLoadingData(false);
  }

  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId) || null,
    [lessons, activeLessonId]
  );

  const completedSet = useMemo(
    () => new Set(ul?.completed_lesson_ids || []),
    [ul?.completed_lesson_ids]
  );

  const lessonsByModule = useMemo(() => {
    const m: Record<string, Lesson[]> = {};
    lessons.forEach((l) => {
      m[l.module_id] = m[l.module_id] || [];
      m[l.module_id].push(l);
    });
    return m;
  }, [lessons]);

  // Validate all known content URLs in the background; broken ones get hidden.
  useEffect(() => {
    const urls = new Set<string>();
    lessons.forEach((l) => {
      if (l.content_url && parseUrl(l.content_url)) urls.add(l.content_url);
    });
    modules.forEach((m) => {
      if (m.content_url && parseUrl(m.content_url)) urls.add(m.content_url);
    });
    urls.forEach((u) => {
      if (urlStatuses[u]) return;
      setUrlStatuses((s) => ({ ...s, [u]: "checking" }));
      void validateUrl(u).then((status) => {
        setUrlStatuses((s) => ({ ...s, [u]: status }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons, modules]);

  function urlState(u: string | null | undefined): UrlStatus | "missing" {
    if (!u || !parseUrl(u)) return "missing";
    return urlStatuses[u] || "checking";
  }

  async function markComplete(lesson: Lesson) {
    if (!ul) return;
    const completed = new Set(ul.completed_lesson_ids || []);
    if (completed.has(lesson.id)) return;
    completed.add(lesson.id);
    const newCount = completed.size;
    const { error } = await supabase
      .from("user_learning")
      .update({
        completed_lesson_ids: Array.from(completed),
        completed_lessons: newCount,
        last_activity_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", ul.id);
    if (error) {
      toast({ title: "Could not save progress", variant: "destructive" });
      return;
    }
    setUl({ ...ul, completed_lesson_ids: Array.from(completed), completed_lessons: newCount });
    toast({ title: "Lesson complete 🎉", description: lesson.title });

    // Evaluate achievements (fire-and-forget)
    void evaluateAchievements({
      id: ul.id,
      user_id: ul.user_id,
      completed_lessons: newCount,
      total_lessons: ul.total_lessons,
      streak_days: ul.streak_days,
      current_module: ul.current_module,
      current_level: ul.current_level,
      learning_paths: ul.learning_paths,
    }).then((earned) => {
      earned.forEach((name) =>
        toast({ title: "🏆 Achievement unlocked", description: name })
      );
    });

    // Auto-advance
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const next = lessons[idx + 1];
    if (next) setActiveLessonId(next.id);
  }

  async function markModuleComplete(moduleId: string) {
    if (!ul) return;
    const ml = lessonsByModule[moduleId] || [];
    if (ml.length === 0) return;
    const completed = new Set(ul.completed_lesson_ids || []);
    let added = 0;
    ml.forEach((l) => {
      if (!completed.has(l.id)) {
        completed.add(l.id);
        added++;
      }
    });
    if (added === 0) {
      toast({ title: "Module already complete ✅" });
      return;
    }
    const newCount = completed.size;
    const { error } = await supabase
      .from("user_learning")
      .update({
        completed_lesson_ids: Array.from(completed),
        completed_lessons: newCount,
        last_activity_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", ul.id);
    if (error) {
      toast({ title: "Could not save progress", variant: "destructive" });
      return;
    }
    setUl({ ...ul, completed_lesson_ids: Array.from(completed), completed_lessons: newCount });
    const mod = modules.find((m) => m.id === moduleId);
    toast({
      title: "Module complete 🎉",
      description: `${mod?.title || "Module"} marked complete (${added} lesson${added === 1 ? "" : "s"}).`,
    });

    void evaluateAchievements({
      id: ul.id,
      user_id: ul.user_id,
      completed_lessons: newCount,
      total_lessons: ul.total_lessons,
      streak_days: ul.streak_days,
      current_module: ul.current_module,
      current_level: ul.current_level,
      learning_paths: ul.learning_paths,
    }).then((earned) => {
      earned.forEach((name) =>
        toast({ title: "🏆 Achievement unlocked", description: name })
      );
    });

    // Move to first lesson of next module if exists
    const idx = modules.findIndex((m) => m.id === moduleId);
    const nextMod = modules[idx + 1];
    if (nextMod) {
      const first = (lessonsByModule[nextMod.id] || [])[0];
      if (first) setActiveLessonId(first.id);
    }
  }

  async function sendMessage() {
    if (!ul || !input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      // Build a rich progress snapshot so the coach NEVER repeats itself
      // and always knows what's done vs what's next.
      const activeModule = activeLesson
        ? modules.find((m) => m.id === activeLesson.module_id)
        : null;
      const moduleLessons = activeModule ? lessonsByModule[activeModule.id] || [] : [];
      const moduleDoneCount = moduleLessons.filter((l) => completedSet.has(l.id)).length;
      const moduleAllDone = moduleLessons.length > 0 && moduleDoneCount === moduleLessons.length;
      const completedTitles = lessons.filter((l) => completedSet.has(l.id)).map((l) => l.title);
      const remainingInModule = moduleLessons
        .filter((l) => !completedSet.has(l.id))
        .map((l) => l.title);
      const nextLessonOverall = lessons.find((l) => !completedSet.has(l.id));

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/learning-coach-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userLearningId: ul.id,
          message: userMsg,
          lessonId: activeLessonId,
          history: messages.slice(-10),
          progress: {
            completedLessons: ul.completed_lessons,
            totalLessons: ul.total_lessons,
            streakDays: ul.streak_days,
            currentModuleNumber: activeModule?.module_number ?? null,
            currentModuleTitle: activeModule?.title ?? null,
            moduleDoneCount,
            moduleTotal: moduleLessons.length,
            moduleAllDone,
            completedLessonTitles: completedTitles.slice(-20),
            remainingInModule: remainingInModule.slice(0, 10),
            nextLessonTitle: nextLessonOverall?.title ?? null,
          },
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg = "Coach is unavailable right now.";
        try { errMsg = JSON.parse(errText).error || errMsg; } catch {}
        if (resp.status === 402) errMsg = errMsg || "Out of credits. Upgrade to keep chatting.";
        if (resp.status === 429) errMsg = "Slow down — try again in a moment.";
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${errMsg}` };
          return copy;
        });
        toast({ title: "Coach error", description: errMsg, variant: "destructive" });
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;
      while (!done) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
              requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `⚠️ ${e.message || "Something went wrong"}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  // Decide whether the active lesson has an INLINE-EMBEDDABLE video.
  // (Articles & blocked sites are NOT shown here — the coach handles them in chat.)
  const activeVideoUrl = useMemo(() => {
    if (!activeLesson) return null;
    const candidates = [activeLesson.content_url];
    const parentMod = modules.find((m) => m.id === activeLesson.module_id);
    if (parentMod?.content_url) candidates.push(parentMod.content_url);
    for (const u of candidates) {
      if (!u || !parseUrl(u)) continue;
      const state = urlState(u);
      if (state === "broken") continue; // never show broken
      try {
        const host = new URL(u).hostname.toLowerCase();
        const videoHost =
          host === "youtu.be" ||
          host.endsWith("youtube.com") ||
          host === "vimeo.com" ||
          host === "player.vimeo.com" ||
          host.endsWith("loom.com");
        if (videoHost) return u;
      } catch { /* ignore */ }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson, modules, urlStatuses]);

  function askCoachToTeachLesson(lesson: Lesson) {
    const prompt = `Teach me "${lesson.title}" right here in the chat. Give me:\n1. The 3 most important concepts in plain language\n2. A concrete example from the real world\n3. A 5-minute exercise I can do right now\n\nDo not link me anywhere — explain it all here.`;
    setInput(prompt);
  }

  // When the active lesson changes and there's NO embeddable video, auto-stage the
  // teach-in-chat prompt so the user just hits send. Only stage if the input is empty.
  useEffect(() => {
    if (!activeLesson) return;
    if (activeVideoUrl) return;
    if (input.trim()) return;
    askCoachToTeachLesson(activeLesson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLessonId, activeVideoUrl]);

  if (loading || loadingData || !ul) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progressPct = ul.total_lessons
    ? Math.round((ul.completed_lessons / ul.total_lessons) * 100)
    : 0;

  // Reusable chat panel — used as a sticky side rail on xl+ and inside a bottom Sheet on smaller screens.
  const chatPanel = (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 sm:p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base">AI Coach</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">0.1 cr/msg</Badge>
        </div>
        {activeLesson && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Context: {activeLesson.title}
          </p>
        )}
      </div>
      <ScrollArea className="flex-1 p-3 sm:p-4 min-h-0" ref={scrollRef as any}>
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm break-words ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground ml-4 sm:ml-8"
                  : "bg-muted mr-4 sm:mr-8"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2 break-words">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          ))}
          {streaming && messages[messages.length - 1]?.content === "" && (
            <div className="text-xs text-muted-foreground">Coach is typing…</div>
          )}
        </div>
      </ScrollArea>
      <div className="p-3 border-t shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the coach anything…"
            className="min-h-[44px] max-h-32 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            disabled={streaming}
          />
          <Button
            size="icon"
            onClick={() => void sendMessage()}
            disabled={streaming || !input.trim()}
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${ul.learning_paths.display_name} | SkryveAI Learn`}
        description={`Learn ${ul.learning_paths.display_name} with your AI coach.`}
      />
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
        {/* Compact header */}
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link to="/tools/learn">
              <ArrowLeft className="h-4 w-4 mr-1" /> All skills
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" /> AI Coach
            </Badge>
            <Badge variant="outline">Level {ul.current_level}</Badge>
            <Badge variant="outline">
              <Flame className="h-3 w-3 mr-1" />
              {ul.streak_days}d
            </Badge>
            <ReminderSettingsButton ul={ul} onUpdate={setUl} />
            {/* Curriculum trigger — opens a side drawer */}
            <Sheet open={curriculumOpen} onOpenChange={setCurriculumOpen}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="ml-auto">
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  Curriculum
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Curriculum
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <NextBadgeCard
                      userId={ul.user_id}
                      userLearningId={ul.id}
                      completedLessons={ul.completed_lessons}
                      totalLessons={ul.total_lessons}
                      streakDays={ul.streak_days}
                      skillName={ul.learning_paths.display_name}
                    />
                    <Tabs defaultValue={modules.find((m) => m.id === activeLesson?.module_id)?.id || modules[0]?.id} className="w-full">
                      <ScrollArea className="w-full">
                        <TabsList className="inline-flex w-max h-auto justify-start">
                          {modules.map((m) => {
                            const ml = lessonsByModule[m.id] || [];
                            const mDone = ml.filter((l) => completedSet.has(l.id)).length;
                            const allDone = ml.length > 0 && mDone === ml.length;
                            return (
                              <TabsTrigger key={m.id} value={m.id} className="text-xs gap-1.5 whitespace-nowrap">
                                {allDone && <CheckCircle2 className="h-3 w-3 text-primary" />}
                                M{m.module_number}
                                <span className="text-[10px] text-muted-foreground">
                                  ({mDone}/{ml.length})
                                </span>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                      </ScrollArea>
                      {modules.map((m) => {
                        const ml = lessonsByModule[m.id] || [];
                        const mDone = ml.filter((l) => completedSet.has(l.id)).length;
                        const mPct = ml.length ? Math.round((mDone / ml.length) * 100) : 0;
                        const allDone = ml.length > 0 && mDone === ml.length;
                        return (
                          <TabsContent key={m.id} value={m.id} className="mt-4">
                            <div className="mb-3 space-y-2">
                              <p className="text-sm font-medium">{m.title}</p>
                              {m.description && (
                                <p className="text-xs text-muted-foreground">{m.description}</p>
                              )}
                              <div className="flex items-center gap-2">
                                <Progress value={mPct} className="h-1.5 flex-1" />
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {mDone}/{ml.length}
                                </span>
                              </div>
                              {allDone ? (
                                <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Module complete
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => void markModuleComplete(m.id)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Mark module complete
                                </Button>
                              )}
                            </div>
                            <ul className="space-y-1">
                              {ml.map((l) => {
                                const done = completedSet.has(l.id);
                                return (
                                  <li key={l.id}>
                                    <button
                                      onClick={() => {
                                        setActiveLessonId(l.id);
                                        setCurriculumOpen(false);
                                      }}
                                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${
                                        activeLessonId === l.id ? "bg-muted" : ""
                                      }`}
                                    >
                                      {done ? (
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                      ) : (
                                        <span className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                                      )}
                                      <span className="flex-1 truncate">{l.title}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold break-words">
            {ul.learning_paths.display_name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Progress value={progressPct} className="flex-1 max-w-md h-1.5" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {ul.completed_lessons}/{ul.total_lessons} · {progressPct}%
            </span>
          </div>
        </div>

        {/* Active lesson summary strip — always visible, very compact */}
        {activeLesson && (
          <Card className="p-3 sm:p-4 mb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px]">
                    Now learning
                  </Badge>
                  {completedSet.has(activeLesson.id) && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                    </Badge>
                  )}
                  {activeLesson.estimated_minutes && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {activeLesson.estimated_minutes} min
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-semibold break-words leading-tight">
                  {activeLesson.title}
                </h2>
              </div>
              <Button
                size="sm"
                variant={completedSet.has(activeLesson.id) ? "outline" : "default"}
                onClick={() => markComplete(activeLesson)}
                disabled={completedSet.has(activeLesson.id)}
                className="shrink-0"
              >
                {completedSet.has(activeLesson.id) ? "Completed" : "Mark complete"}
              </Button>
            </div>
            {/* Inline video ONLY — no article links, no external CTAs */}
            {activeVideoUrl && (
              <div className="mt-3">
                <LessonContentEmbed
                  url={activeVideoUrl}
                  title={activeLesson.title}
                  onAskCoach={() => askCoachToTeachLesson(activeLesson)}
                />
              </div>
            )}
          </Card>
        )}

        {/* Chat is the main surface — full width, dominant */}
        <Card className="flex flex-col h-[calc(100vh-260px)] min-h-[480px] overflow-hidden">
          {chatPanel}
        </Card>
      </main>
    </div>
  );
}
