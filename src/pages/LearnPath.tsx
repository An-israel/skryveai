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
import { validateUrl, parseUrl, seedUrlStatuses, type UrlStatus } from "@/lib/learning/url-validation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Eye,
  Flame,
  Loader2,
  PartyPopper,
  PlayCircle,
  Send,
  Sparkles,
  Trophy,
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

  // Confirmation modal for marking a module complete
  const [confirmModuleId, setConfirmModuleId] = useState<string | null>(null);

  // ARIA live announcements (module readiness, etc.)
  const [liveAnnounce, setLiveAnnounce] = useState("");
  const lastAnnouncedKeyRef = useRef<string>("");

  // Auto-detect lesson completion from chat signals (quiz/checklist/upload/done)
  const [autoDetect, setAutoDetect] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("skryve.learn.autoDetect");
      return v === null ? true : v === "1";
    } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("skryve.learn.autoDetect", autoDetect ? "1" : "0"); } catch {}
  }, [autoDetect]);

  useEffect(() => {
    if (!user || !userLearningId) return;
    // Hydrate "already taught in chat" memory so we don't re-stage the prompt
    // when the user revisits the same lesson on mobile or desktop.
    try {
      const key = `skryve.taughtLessons.${userLearningId}`;
      const raw = localStorage.getItem(key);
      if (raw) taughtLessonsRef.current = new Set(JSON.parse(raw));
    } catch { /* ignore */ }
    void loadAll();
  }, [user, userLearningId]);

  function rememberTaught(lessonId: string) {
    taughtLessonsRef.current.add(lessonId);
    try {
      const key = `skryve.taughtLessons.${userLearningId}`;
      localStorage.setItem(key, JSON.stringify(Array.from(taughtLessonsRef.current)));
    } catch { /* ignore */ }
  }

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
  // Server-validated verdicts (lesson_video_status) take precedence over the
  // client-side reachability heuristic, because YouTube blocks cross-origin checks.
  useEffect(() => {
    const urls = new Set<string>();
    lessons.forEach((l) => {
      if (l.content_url && parseUrl(l.content_url)) urls.add(l.content_url);
    });
    modules.forEach((m) => {
      if (m.content_url && parseUrl(m.content_url)) urls.add(m.content_url);
    });
    if (urls.size === 0) return;
    const urlList = Array.from(urls);

    void (async () => {
      const { data: serverStatuses } = await (supabase as any)
        .from("lesson_video_status")
        .select("url, status")
        .in("url", urlList);
      const serverMap = new Map<string, UrlStatus>(
        ((serverStatuses as { url: string; status: string }[]) || [])
          .filter((s) => s.status === "ok" || s.status === "broken")
          .map((s) => [s.url, s.status as UrlStatus]),
      );
      // Apply server verdicts immediately so broken videos are skipped on first paint.
      if (serverMap.size > 0) {
        seedUrlStatuses(Array.from(serverMap, ([url, status]) => ({ url, status })));
        setUrlStatuses((s) => {
          const next = { ...s };
          serverMap.forEach((status, url) => { next[url] = status; });
          return next;
        });
      }
      // Fall back to the client-side check only for URLs the server hasn't classified.
      urlList.forEach((u) => {
        if (serverMap.has(u)) return;
        if (urlStatuses[u]) return;
        setUrlStatuses((s) => ({ ...s, [u]: "checking" }));
        void validateUrl(u).then((status) => {
          setUrlStatuses((s) => ({ ...s, [u]: status }));
        });
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons, modules]);

  function urlState(u: string | null | undefined): UrlStatus | "missing" {
    if (!u || !parseUrl(u)) return "missing";
    return urlStatuses[u] || "checking";
  }

  // Detects natural-language signals that the user finished an interactive task
  // tied to the active lesson (quiz/checklist/upload/done/submitted).
  function looksLikeCompletionSignal(text: string): boolean {
    const t = text.toLowerCase();
    const verbs = [
      "finished", "completed", "done with", "i'm done", "im done",
      "submitted", "uploaded", "turned in", "passed", "aced",
    ];
    const nouns = [
      "quiz", "checklist", "exercise", "assignment", "task",
      "upload", "submission", "lesson",
    ];
    if (verbs.some((v) => t.includes(v))) {
      // either a verb alone ("i'm done") or verb + noun match
      if (/i('?| a)?m? ?done/.test(t)) return true;
      return nouns.some((n) => t.includes(n));
    }
    return false;
  }

  // Announce module readiness to screen readers
  useEffect(() => {
    if (!activeLesson) return;
    const mod = modules.find((m) => m.id === activeLesson.module_id);
    if (!mod) return;
    const ml = lessonsByModule[mod.id] || [];
    if (ml.length === 0) return;
    const done = ml.filter((l) => completedSet.has(l.id)).length;
    const allDone = done === ml.length;
    const lastLesson = ml[ml.length - 1]?.id === activeLesson.id;
    const lessonDone = completedSet.has(activeLesson.id);

    let msg = "";
    let key = "";
    if (allDone) {
      msg = `Module ${mod.title} is ready to mark complete. All ${ml.length} lessons are finished.`;
      key = `ready:${mod.id}`;
    } else if (lastLesson && lessonDone) {
      msg = `Last lesson of ${mod.title} complete. ${ml.length - done} lesson${ml.length - done === 1 ? "" : "s"} remaining before the module is done.`;
      key = `last-done:${activeLesson.id}`;
    } else if (lastLesson) {
      msg = `You're on the last lesson of ${mod.title}.`;
      key = `last:${activeLesson.id}`;
    }
    if (msg && key !== lastAnnouncedKeyRef.current) {
      lastAnnouncedKeyRef.current = key;
      setLiveAnnounce(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson, completedSet, lessonsByModule, modules]);

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
    const newlyCompleted: Lesson[] = [];
    ml.forEach((l) => {
      if (!completed.has(l.id)) {
        completed.add(l.id);
        newlyCompleted.push(l);
      }
    });
    if (newlyCompleted.length === 0) {
      toast({ title: "Module already complete ✅" });
      return;
    }
    setCompletingModuleId(moduleId);
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
      setCompletingModuleId(null);
      toast({ title: "Could not save progress", variant: "destructive" });
      return;
    }
    // Instantly refresh UI indicators in the curriculum drawer
    setUl({ ...ul, completed_lesson_ids: Array.from(completed), completed_lessons: newCount });

    // Silent credit deduction — 2 credits per module completion.
    // Fire-and-forget: never surfaced in UI, never blocks completion, never errors out loud.
    void (async () => {
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", ul.user_id);
        const staffRoles = ["super_admin", "content_editor", "support_agent", "staff"];
        const isStaff = (roles || []).some((r: { role: string }) => staffRoles.includes(r.role));
        if (isStaff) return;
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("credits, plan")
          .eq("user_id", ul.user_id)
          .maybeSingle();
        if (!subRow || subRow.plan === "lifetime") return;
        const newCredits = Math.max(0, (subRow.credits ?? 0) - 2);
        await supabase
          .from("subscriptions")
          .update({ credits: newCredits })
          .eq("user_id", ul.user_id);
      } catch { /* silent */ }
    })();
    const mod = modules.find((m) => m.id === moduleId);
    toast({
      title: "Module complete 🎉",
      description: `${mod?.title || "Module"} marked complete (${newlyCompleted.length} lesson${newlyCompleted.length === 1 ? "" : "s"}).`,
    });

    // Track skill_learning usage (silent, fire-and-forget) for admin analytics
    void supabase.from("tool_usage").insert({
      user_id: ul.user_id,
      tool_name: "skill_learning",
      metadata: {
        skill: (ul as any).learning_paths?.skill_name || null,
        skill_display: (ul as any).learning_paths?.display_name || null,
        module_title: mod?.title || null,
        module_id: moduleId,
        lessons_completed: newlyCompleted.length,
        total_completed: newCount,
        total_lessons: ul.total_lessons,
      },
    } as never).then(() => {});

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
    const nextFirstLesson = nextMod ? (lessonsByModule[nextMod.id] || [])[0] : null;

    // Post a chat confirmation summarising what was completed and what's next
    const titlesList = newlyCompleted
      .map((l) => `- ${l.title}`)
      .join("\n");
    const confirmation = nextFirstLesson
      ? `✅ **${mod?.title || "Module"} complete!** Marked these as done:\n${titlesList}\n\n👉 Up next: **${nextFirstLesson.title}** (Module ${nextMod!.module_number}). I'll start teaching it now.`
      : `✅ **${mod?.title || "Module"} complete!** Marked these as done:\n${titlesList}\n\n🎓 You've reached the end of the curriculum — incredible work!`;
    setMessages((m) => [...m, { role: "assistant", content: confirmation }]);

    setJustCompletedModuleId(moduleId);
    setTimeout(() => setJustCompletedModuleId((cur) => (cur === moduleId ? null : cur)), 2500);
    setCompletingModuleId(null);

    if (nextFirstLesson) {
      // Trigger auto-focus + auto-stage on next lesson load
      pendingFocusRef.current = true;
      setActiveLessonId(nextFirstLesson.id);
      setCurriculumOpen(false);
    }
  }

  async function sendMessage() {
    if (!ul || !input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");

    // Auto-detect: if the user signals they finished a quiz/checklist/upload/exercise
    // for the active lesson, silently mark that lesson complete so the module
    // completion banner can appear on the next render.
    if (autoDetect && activeLesson && !completedSet.has(activeLesson.id) && looksLikeCompletionSignal(userMsg)) {
      void markComplete(activeLesson);
    }

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

  function askCoachToTeachLesson(lesson: Lesson, opts?: { autoSend?: boolean }) {
    const prompt = `Teach me "${lesson.title}". Walk me through:\n1. The 3 most important concepts in plain language\n2. A concrete real-world example\n3. A 5-minute exercise I can try right now`;
    rememberTaught(lesson.id);
    if (opts?.autoSend) {
      // Set input then trigger send on the next tick
      setInput(prompt);
      setTimeout(() => void sendMessage(), 0);
    } else {
      setInput(prompt);
    }
  }

  // When the active lesson changes and there's NO embeddable video, auto-stage the
  // teach-in-chat prompt so the user just hits send.
  // - Skip if we've already auto-staged for this lesson before (mobile/desktop revisit).
  // - If the user just marked a module complete, auto-send the prompt and focus the chat.
  useEffect(() => {
    if (!activeLesson) return;
    if (activeVideoUrl) return;
    if (input.trim()) return;

    const shouldAutoSend = pendingFocusRef.current;
    const alreadyTaught = taughtLessonsRef.current.has(activeLesson.id);

    if (shouldAutoSend) {
      pendingFocusRef.current = false;
      // Focus chat input and (optionally) auto-send the lesson kick-off prompt
      setTimeout(() => inputRef.current?.focus(), 50);
      if (!alreadyTaught) {
        askCoachToTeachLesson(activeLesson, { autoSend: true });
      } else {
        // Already taught — just focus and let the user ask anything new
        inputRef.current?.focus();
      }
      return;
    }

    if (!alreadyTaught) {
      askCoachToTeachLesson(activeLesson);
    }
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
            ref={inputRef}
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
                    <div className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                      <div className="min-w-0">
                        <Label htmlFor="auto-detect" className="text-xs font-medium flex items-center gap-1.5">
                          <Eye className="h-3 w-3" /> Auto-detect lesson done
                        </Label>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Marks the lesson complete when you tell the coach you finished a quiz, checklist, or upload.
                        </p>
                      </div>
                      <Switch
                        id="auto-detect"
                        checked={autoDetect}
                        onCheckedChange={setAutoDetect}
                      />
                    </div>
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
                                <Badge
                                  className={`border-primary/20 transition-colors ${
                                    justCompletedModuleId === m.id
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-primary/10 text-primary"
                                  }`}
                                  variant="outline"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {justCompletedModuleId === m.id ? "Marked complete!" : "Module complete"}
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  disabled={completingModuleId === m.id}
                                  onClick={() => setConfirmModuleId(m.id)}
                                >
                                  {completingModuleId === m.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                      Marking complete…
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      Mark module complete
                                    </>
                                  )}
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

        {/* Accessible live region — announces module readiness to screen readers */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveAnnounce}
        </div>

        {/* Module timeline — shows exactly what's left in the current module */}
        {activeLesson && (() => {
          const currentModule = modules.find((m) => m.id === activeLesson.module_id);
          if (!currentModule) return null;
          const ml = lessonsByModule[currentModule.id] || [];
          if (ml.length === 0) return null;
          const done = ml.filter((l) => completedSet.has(l.id)).length;
          const remaining = ml.length - done;
          return (
            <Card className="p-3 sm:p-4 mb-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {currentModule.title} · {done}/{ml.length} lessons
                </p>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {remaining === 0 ? "All done" : `${remaining} left`}
                </span>
              </div>
              <ol className="space-y-1">
                {ml.map((l) => {
                  const isDone = completedSet.has(l.id);
                  const isActive = l.id === activeLesson.id;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setActiveLessonId(l.id)}
                        className={`w-full flex items-center gap-2 text-left text-xs rounded-md px-2 py-1.5 transition-colors ${
                          isActive
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-muted/60 text-muted-foreground"
                        }`}
                        aria-current={isActive ? "step" : undefined}
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : isActive ? (
                          <PlayCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className={`truncate ${isDone ? "line-through opacity-70" : ""} ${isActive ? "font-medium text-foreground" : ""}`}>
                          {l.title}
                        </span>
                        {isActive && !isDone && (
                          <Badge variant="secondary" className="ml-auto text-[9px] py-0 px-1.5">
                            Now
                          </Badge>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Card>
          );
        })()}

        {/* Module wrap-up banner — tells the user when they've finished a module
            and what to do next. Always visible above the chat so it can't be missed. */}
        {activeLesson && (() => {
          const currentModule = modules.find((m) => m.id === activeLesson.module_id);
          if (!currentModule) return null;
          const ml = lessonsByModule[currentModule.id] || [];
          if (ml.length === 0) return null;
          const mDone = ml.filter((l) => completedSet.has(l.id)).length;
          const allDone = mDone === ml.length;
          const onLastLesson = ml[ml.length - 1]?.id === activeLesson.id;
          const lessonDone = completedSet.has(activeLesson.id);
          const modIdx = modules.findIndex((m) => m.id === currentModule.id);
          const nextMod = modules[modIdx + 1];
          const isLoading = completingModuleId === currentModule.id;

          // Case 1: every lesson done → push to mark module complete
          if (allDone) {
            return (
              <Card className="p-3 sm:p-4 mb-3 border-primary/30 bg-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <PartyPopper className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        You've finished every lesson in {currentModule.title}!
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {nextMod
                          ? `Mark the module complete to unlock ${nextMod.title}.`
                          : "Mark the module complete to wrap up the curriculum."}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setConfirmModuleId(currentModule.id)}
                    disabled={isLoading}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Trophy className="h-3.5 w-3.5 mr-1" />
                        {nextMod ? "Complete & start next module" : "Mark module complete"}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          }

          // Case 2: on the last lesson and it's done → encourage wrap-up
          if (onLastLesson && lessonDone && mDone === ml.length - 1) {
            return (
              <Card className="p-3 sm:p-4 mb-3 border-primary/30 bg-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        Last lesson of {currentModule.title} done.
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mark the module complete to lock in your progress
                        {nextMod ? ` and move on to ${nextMod.title}.` : "."}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setConfirmModuleId(currentModule.id)}
                    disabled={isLoading}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Trophy className="h-3.5 w-3.5 mr-1" />
                        Mark module complete
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          }

          // Case 3: on the last lesson but not yet marked complete → nudge
          if (onLastLesson && !lessonDone) {
            return (
              <Card className="p-3 sm:p-4 mb-3 border-dashed">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This is the <span className="font-medium text-foreground">last lesson</span> of {currentModule.title}.
                    Once you've finished, mark it complete — then you'll be able to wrap up the whole module.
                  </p>
                </div>
              </Card>
            );
          }

          return null;
        })()}

        {/* Chat is the main surface — full width, dominant */}
        <Card className="flex flex-col h-[calc(100vh-260px)] min-h-[480px] overflow-hidden">
          {chatPanel}
        </Card>
      </main>

      {/* Confirmation modal for marking a module complete */}
      <AlertDialog
        open={!!confirmModuleId}
        onOpenChange={(o) => !o && setConfirmModuleId(null)}
      >
        <AlertDialogContent>
          {(() => {
            const mod = modules.find((m) => m.id === confirmModuleId);
            const ml = confirmModuleId ? lessonsByModule[confirmModuleId] || [] : [];
            const completedLessons = ml.filter((l) => completedSet.has(l.id));
            const incompleteLessons = ml.filter((l) => !completedSet.has(l.id));
            const hasIncomplete = incompleteLessons.length > 0;
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Mark "{mod?.title || "Module"}" complete?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark every lesson in the module as done and move you to the next module.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {completedLessons.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        ✅ Already complete ({completedLessons.length})
                      </p>
                      <ul className="space-y-1">
                        {completedLessons.map((l) => (
                          <li key={l.id} className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{l.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasIncomplete && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">
                            {incompleteLessons.length} lesson{incompleteLessons.length === 1 ? "" : "s"} not finished
                          </p>
                          <p className="text-[11px] text-muted-foreground mb-1.5">
                            These will be marked complete too:
                          </p>
                          <ul className="space-y-1">
                            {incompleteLessons.map((l) => (
                              <li key={l.id} className="flex items-center gap-2 text-xs">
                                <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="truncate">{l.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Not yet</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (confirmModuleId) {
                        const id = confirmModuleId;
                        setConfirmModuleId(null);
                        void markModuleComplete(id);
                      }
                    }}
                  >
                    {hasIncomplete ? "Complete anyway" : "Mark complete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
