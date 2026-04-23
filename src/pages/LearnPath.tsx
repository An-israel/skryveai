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
import { validateUrl, parseUrl, type UrlStatus } from "@/lib/learning/url-validation";
import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  PlayCircle,
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${ul.learning_paths.display_name} | SkryveAI Learn`}
        description={`Learn ${ul.learning_paths.display_name} with your AI coach.`}
      />
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-3">
            <Link to="/tools/learn">
              <ArrowLeft className="h-4 w-4 mr-1" /> All skills
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Badge variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" /> AI Coach
            </Badge>
            <Badge variant="outline">Level {ul.current_level}</Badge>
            <Badge variant="outline">
              <Flame className="h-3 w-3 mr-1" />
              {ul.streak_days}d streak
            </Badge>
            <ReminderSettingsButton ul={ul} onUpdate={setUl} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{ul.learning_paths.display_name}</h1>
          <div className="flex items-center gap-3 mt-3">
            <Progress value={progressPct} className="flex-1 max-w-md" />
            <span className="text-sm text-muted-foreground">
              {ul.completed_lessons}/{ul.total_lessons} lessons · {progressPct}%
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left: lesson area + module list */}
          <div className="space-y-6 min-w-0">
            {activeLesson && (
              <Card className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="mb-2 capitalize">
                      {activeLesson.content_type}
                    </Badge>
                    <h2 className="text-xl font-semibold">{activeLesson.title}</h2>
                    {activeLesson.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {activeLesson.description}
                      </p>
                    )}
                  </div>
                  {completedSet.has(activeLesson.id) && (
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  {activeLesson.estimated_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activeLesson.estimated_minutes} min
                    </span>
                  )}
                  {activeLesson.has_assignment && (
                    <Badge variant="outline" className="text-[10px]">Has assignment</Badge>
                  )}
                </div>
                {(() => {
                  const ownUrl = activeLesson.content_url;
                  const ownState = urlState(ownUrl);
                  const parentModule = modules.find((m) => m.id === activeLesson.module_id);
                  const moduleUrl = parentModule?.content_url;
                  const moduleState = urlState(moduleUrl);

                  // Lesson URL is good (or still being checked optimistically) → render it.
                  if (ownState === "ok" || ownState === "checking") {
                    return (
                      <div className="mb-4 space-y-1">
                        <a
                          href={ownUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <PlayCircle className="h-4 w-4" /> Open lesson resource
                          {ownState === "checking" && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </a>
                      </div>
                    );
                  }

                  // Lesson URL missing or broken → fall back to module-level URL.
                  if (moduleState === "ok" || moduleState === "checking") {
                    return (
                      <div className="mb-4 space-y-2">
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                          {ownState === "broken" ? (
                            <>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Lesson link unreachable — using module resource
                            </>
                          ) : (
                            "Using module resource"
                          )}
                        </Badge>
                        <a
                          href={moduleUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <PlayCircle className="h-4 w-4" /> Open module resource ({parentModule?.title})
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {ownState === "broken"
                            ? "We couldn't reach the lesson link, so we're showing the module-level resource instead."
                            : "This lesson doesn't have its own link yet — opening the module-level resource instead."}
                        </p>
                      </div>
                    );
                  }

                  // Both broken or missing.
                  return (
                    <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {ownState === "broken" || moduleState === "broken"
                            ? "Resource link is broken or redirecting"
                            : "Resource coming soon"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Use the AI coach on the right to learn this topic right now — it knows the lesson context.
                        </p>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <Button
                    onClick={() => markComplete(activeLesson)}
                    disabled={completedSet.has(activeLesson.id)}
                  >
                    {completedSet.has(activeLesson.id) ? "Completed" : "Mark complete"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInput(`Teach me "${activeLesson.title}" — give me the key concepts, an example, and a 5-minute exercise.`);
                    }}
                  >
                    Ask coach to teach this
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Curriculum
              </h3>
              <Tabs defaultValue={modules[0]?.id} className="w-full">
                <TabsList className="w-full flex-wrap h-auto justify-start">
                  {modules.map((m) => (
                    <TabsTrigger key={m.id} value={m.id} className="text-xs">
                      M{m.module_number}: {m.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {modules.map((m) => (
                  <TabsContent key={m.id} value={m.id} className="mt-4">
                    <p className="text-xs text-muted-foreground mb-3">{m.description}</p>
                    <ul className="space-y-1">
                      {(lessonsByModule[m.id] || []).map((l) => {
                        const done = completedSet.has(l.id);
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => setActiveLessonId(l.id)}
                              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${
                                activeLessonId === l.id ? "bg-muted" : ""
                              }`}
                            >
                              {done ? (
                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <span className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                              )}
                              <span className="flex-1">{l.title}</span>
                              <span className="text-[10px] uppercase text-muted-foreground">
                                {l.content_type}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          </div>

          {/* Right: AI Coach chat */}
          <Card className="flex flex-col h-[calc(100vh-220px)] sticky top-20">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">AI Coach</h3>
                <Badge variant="outline" className="ml-auto text-[10px]">0.1 cr/msg</Badge>
              </div>
              {activeLesson && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Context: {activeLesson.title}
                </p>
              )}
            </div>
            <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-muted mr-8"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
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
            <div className="p-3 border-t">
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
          </Card>
        </div>
      </main>
    </div>
  );
}
