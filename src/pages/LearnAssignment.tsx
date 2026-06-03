import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  PlayCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Send,
  Loader2,
  Brain,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Download,
  Volume2,
  Maximize,
  Play,
  Pause,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string;
  course_id: string;
  module_name: string | null;
  title: string;
  content_type: string;
  content_url: string | null;
  content_body: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_free_preview: boolean;
  attachments: { name: string; url: string }[];
}

interface Enrollment {
  id: string;
  course_id: string;
  talent_id: string;
  progress_percent: number;
  completed_at: string | null;
}

interface LessonProgress {
  id?: string;
  enrollment_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  watch_percent: number;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LearnAssignment() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data state
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [lessonNote, setLessonNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [courseTitle, setCourseTitle] = useState("");
  const [watchPercent, setWatchPercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Panel visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  // AI Coach
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi! I'm your AI Coach. Ask me anything about this lesson." },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const notesSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void init();
  }, [courseId, lessonId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function init() {
    setLoading(true);
    setWatchPercent(0);
    setIsPlaying(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    // Load lessons + course title
    const [{ data: lessonsData }, { data: courseData }] = await Promise.all([
      (supabase as any)
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true }),
      (supabase as any)
        .from("courses")
        .select("title")
        .eq("id", courseId)
        .single(),
    ]);

    const allLessons = (lessonsData as Lesson[]) || [];
    setLessons(allLessons);
    setCourseTitle(courseData?.title ?? "");

    const lesson = allLessons.find((l) => l.id === lessonId) || null;
    setCurrentLesson(lesson);

    // Load talent profile + enrollment
    const { data: profile } = await (supabase as any)
      .from("talent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      setLoading(false);
      return;
    }

    const { data: enr } = await (supabase as any)
      .from("enrollments")
      .select("*")
      .eq("course_id", courseId)
      .eq("talent_id", profile.id)
      .single();

    if (!enr) {
      // Not enrolled — check if free preview
      if (!lesson?.is_free_preview) {
        navigate(`/learn/${courseId}`);
        return;
      }
    } else {
      setEnrollment(enr as Enrollment);

      // Load lesson progress
      const { data: progressData } = await (supabase as any)
        .from("lesson_progress")
        .select("lesson_id, is_completed, notes")
        .eq("enrollment_id", enr.id);

      if (progressData) {
        const completedIds = new Set<string>(
          (progressData as LessonProgress[])
            .filter((p) => p.is_completed)
            .map((p) => p.lesson_id)
        );
        setCompletedLessonIds(completedIds);

        // Load note for this lesson
        const thisProgress = (progressData as LessonProgress[]).find(
          (p) => p.lesson_id === lessonId
        );
        setLessonNote(thisProgress?.notes ?? "");
      }
    }

    // Reset AI chat context for new lesson
    if (lesson) {
      setMessages([
        {
          role: "assistant",
          content: `I'm ready to help you with **"${lesson.title}"**. Ask me anything, or try one of the prompts below!`,
        },
      ]);
    }

    setLoading(false);
  }

  // ── Mark Complete ─────────────────────────────────────────────────────────

  const markComplete = useCallback(async () => {
    if (!enrollment || !lessonId || completedLessonIds.has(lessonId)) return;

    await (supabase as any).from("lesson_progress").upsert(
      {
        enrollment_id: enrollment.id,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "enrollment_id,lesson_id" }
    );

    const newCompleted = completedLessonIds.size + 1;
    const newPercent = Math.round((newCompleted / lessons.length) * 100);

    await (supabase as any)
      .from("enrollments")
      .update({ progress_percent: newPercent })
      .eq("id", enrollment.id);

    // Check if course complete
    if (newPercent === 100) {
      await (supabase as any)
        .from("enrollments")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      await (supabase as any).from("certificates").upsert({
        course_id: courseId,
        talent_id: enrollment.talent_id,
        issued_at: new Date().toISOString(),
      });
    }

    // Module complete toast + quiz check
    const currentModule = currentLesson?.module_name;
    const moduleLessons = lessons.filter(
      (l) => (l.module_name ?? "Course Content") === (currentModule ?? "Course Content")
    );
    const allModuleDone = moduleLessons.every(
      (l) => completedLessonIds.has(l.id) || l.id === lessonId
    );
    if (allModuleDone && currentModule) {
      toast({ title: "Module Complete! 🎉", description: currentModule });
    } else {
      toast({ title: "Lesson Complete! ✅" });
    }

    const newSet = new Set([...completedLessonIds, lessonId]);
    setCompletedLessonIds(newSet);
    setEnrollment({ ...enrollment, progress_percent: newPercent });

    // If course complete → navigate to completion page
    if (newPercent === 100) {
      setTimeout(() => navigate(`/learn/${courseId}/complete`), 2000);
      return;
    }

    // If this was the last lesson in a module, check for a quiz
    if (allModuleDone && currentModule) {
      const { data: quiz } = await (supabase as any)
        .from("quizzes")
        .select("id")
        .eq("course_id", courseId)
        .eq("module_name", currentModule)
        .single();

      if (quiz) {
        // Check if course has quiz_required
        const { data: courseInfo } = await (supabase as any)
          .from("courses")
          .select("quiz_required")
          .eq("id", courseId)
          .single();

        if (courseInfo?.quiz_required) {
          setTimeout(() => navigate(`/learn/${courseId}/quiz/${quiz.id}`), 2000);
          return;
        }
      }
    }

    // Auto-advance after 3 seconds
    if (currentLesson) {
      const nextLesson = lessons.find((l) => l.order_index > currentLesson.order_index);
      if (nextLesson) {
        setTimeout(() => navigate(`/learn/${courseId}/${nextLesson.id}`), 3000);
      }
    }
  }, [enrollment, lessonId, completedLessonIds, lessons, currentLesson, courseId, navigate, toast]);

  // ── Video tracking ────────────────────────────────────────────────────────

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || v.duration === 0) return;
    const pct = Math.round((v.currentTime / v.duration) * 100);
    setWatchPercent(pct);
    if (pct >= 80 && !completedLessonIds.has(lessonId ?? "")) {
      void markComplete();
    }
  }

  // ── Save notes ────────────────────────────────────────────────────────────

  function handleNoteChange(value: string) {
    setLessonNote(value);
    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
    notesSaveTimeoutRef.current = setTimeout(() => void saveNote(value), 1500);
  }

  async function saveNote(note: string) {
    if (!enrollment || !lessonId) return;
    await (supabase as any).from("lesson_progress").upsert(
      {
        enrollment_id: enrollment.id,
        lesson_id: lessonId,
        notes: note,
        is_completed: completedLessonIds.has(lessonId),
      },
      { onConflict: "enrollment_id,lesson_id" }
    );
  }

  // ── AI Coach ──────────────────────────────────────────────────────────────

  async function sendAiMessage(text?: string) {
    const msg = (text ?? aiInput).trim();
    if (!msg || aiLoading) return;
    setAiInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setAiLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-coach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: messages
              .slice(-6)
              .concat([{ role: "user", content: msg }])
              .map((m) => ({ role: m.role, content: m.content })),
            lessonTitle: currentLesson?.title ?? "",
            lessonSummary: currentLesson?.content_body?.slice(0, 200) ?? "",
          }),
        }
      );

      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "I couldn't process that. Please try again." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect. Please try again." },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function navigate_lesson(direction: "prev" | "next") {
    if (!currentLesson) return;
    const sorted = [...lessons].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((l) => l.id === currentLesson.id);
    const target = direction === "prev" ? sorted[idx - 1] : sorted[idx + 1];
    if (target) navigate(`/learn/${courseId}/${target.id}`);
  }

  // ── isVideoUrl ────────────────────────────────────────────────────────────

  function isEmbedUrl(url: string): boolean {
    try {
      const host = new URL(url).hostname;
      return (
        host.includes("youtube") ||
        host === "youtu.be" ||
        host.includes("vimeo") ||
        host.includes("loom")
      );
    } catch {
      return false;
    }
  }

  function toEmbedUrl(url: string): string {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube") || u.hostname === "youtu.be") {
        const vid = u.searchParams.get("v") ?? u.pathname.slice(1);
        return `https://www.youtube.com/embed/${vid}`;
      }
      if (u.hostname.includes("vimeo")) {
        return `https://player.vimeo.com/video${u.pathname}`;
      }
    } catch {}
    return url;
  }

  // ── Sidebar module groups ─────────────────────────────────────────────────

  const moduleGroups = Array.from(
    new Set(lessons.map((l) => l.module_name ?? "Course Content"))
  );

  const progress = enrollment?.progress_percent ?? 0;
  const sortedLessons = [...lessons].sort((a, b) => a.order_index - b.order_index);
  const currentIdx = sortedLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = sortedLessons[currentIdx - 1] ?? null;
  const nextLesson = sortedLessons[currentIdx + 1] ?? null;

  // ── Render word count estimate ────────────────────────────────────────────

  function estimatedReadTime(text: string) {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Lesson not found.</p>
        <Button asChild>
          <Link to={`/learn/${courseId}`}>Back to course</Link>
        </Button>
      </div>
    );
  }

  const isCompleted = completedLessonIds.has(lessonId ?? "");

  return (
    <div
      className="flex h-[calc(100vh-60px)] overflow-hidden"
      style={{ maxHeight: "calc(100vh - 60px)" }}
    >
      {/* ── LEFT SIDEBAR ── */}
      {sidebarOpen && (
        <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-card overflow-y-auto flex-shrink-0">
          <div className="px-5 py-3.5 border-b border-border flex-shrink-0">
            <Link
              to={`/learn/${courseId}`}
              className="text-[13px] font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors"
            >
              {courseTitle}
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {moduleGroups.map((mod) => {
              const modLessons = sortedLessons.filter(
                (l) => (l.module_name ?? "Course Content") === mod
              );
              return (
                <div key={mod} className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-2">
                    {mod}
                  </p>
                  <ul className="space-y-0.5">
                    {modLessons.map((lesson, i) => {
                      const done = completedLessonIds.has(lesson.id);
                      const isCurrent = lesson.id === lessonId;
                      const prevDone = i === 0 || completedLessonIds.has(modLessons[i - 1]?.id);
                      const accessible = done || isCurrent || prevDone || lesson.is_free_preview;
                      return (
                        <li key={lesson.id}>
                          <button
                            className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors ${
                              isCurrent
                                ? "bg-primary/10 text-primary font-medium"
                                : accessible
                                ? "hover:bg-muted/50 text-foreground"
                                : "opacity-40 cursor-not-allowed text-muted-foreground"
                            }`}
                            onClick={() => {
                              if (accessible) navigate(`/learn/${courseId}/${lesson.id}`);
                            }}
                            disabled={!accessible}
                          >
                            {done ? (
                              <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            ) : isCurrent ? (
                              <PlayCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                            )}
                            <span className="flex-1 line-clamp-1">{lesson.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-2">
              <span>Progress</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <div className="h-1 bg-border rounded-full">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </aside>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <button
            className="h-7 w-7 hidden lg:flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
          <Link
            to={`/learn/${courseId}`}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex-1 min-w-0 ml-1">
            <p className="text-[11px] text-muted-foreground truncate">
              {currentLesson.module_name ?? "Course Content"}
            </p>
            <h1 className="text-[14px] font-medium text-foreground truncate">{currentLesson.title}</h1>
          </div>
          {isCompleted && (
            <span className="hidden sm:flex items-center gap-1.5 text-[12px] text-primary font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              Completed
            </span>
          )}
          <button
            className="h-7 w-7 hidden lg:flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
          >
            {aiPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="p-5 md:p-7 max-w-3xl mx-auto">
          {/* ── Video content ── */}
          {currentLesson.content_type === "video" && currentLesson.content_url && (
            <div className="mb-6">
              {isEmbedUrl(currentLesson.content_url) ? (
                <div className="relative pt-[56.25%] rounded-xl overflow-hidden bg-black">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={toEmbedUrl(currentLesson.content_url)}
                    title={currentLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    src={currentLesson.content_url}
                    className="w-full"
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                      setIsPlaying(false);
                      if (!completedLessonIds.has(lessonId ?? "")) void markComplete();
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="h-1 bg-border/40 rounded-full mb-3">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${watchPercent}%` }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="h-7 w-7 text-white hover:bg-white/20 rounded-md flex items-center justify-center transition-colors"
                        onClick={() => {
                          if (videoRef.current) {
                            if (isPlaying) videoRef.current.pause();
                            else videoRef.current.play();
                          }
                        }}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <Volume2 className="h-3 w-3 text-white/70" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={volume}
                        className="w-16 h-1"
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setVolume(v);
                          if (videoRef.current) videoRef.current.volume = v;
                        }}
                      />
                      <select
                        value={playbackSpeed}
                        className="bg-transparent text-white text-xs border border-white/20 rounded px-1"
                        onChange={(e) => {
                          const s = parseFloat(e.target.value);
                          setPlaybackSpeed(s);
                          if (videoRef.current) videoRef.current.playbackRate = s;
                        }}
                      >
                        {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                          <option key={s} value={s} className="text-black">
                            {s}x
                          </option>
                        ))}
                      </select>
                      <button
                        className="h-7 w-7 text-white hover:bg-white/20 rounded-md flex items-center justify-center transition-colors ml-auto"
                        onClick={() => videoRef.current?.requestFullscreen()}
                      >
                        <Maximize className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Text content ── */}
          {currentLesson.content_type === "text" && currentLesson.content_body && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4 text-[12px] text-muted-foreground">
                <span>Estimated read time: {estimatedReadTime(currentLesson.content_body)} min</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{currentLesson.content_body}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* ── Mark Complete button ── */}
          {!isCompleted ? (
            <button
              className="mb-6 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              onClick={() => void markComplete()}
              disabled={!enrollment}
            >
              <CheckCircle className="h-4 w-4" />
              Mark as Complete
            </button>
          ) : (
            <div className="flex items-center gap-2 text-primary text-[13px] font-medium mb-6">
              <CheckCircle className="h-4 w-4" />
              Lesson completed
            </div>
          )}

          {/* ── Notes ── */}
          {enrollment && (
            <div className="border border-border rounded-xl bg-card overflow-hidden mb-6">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-[13px] font-semibold text-foreground">My Notes</h3>
              </div>
              <div className="px-5 py-5">
                <Textarea
                  value={lessonNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  onBlur={() => void saveNote(lessonNote)}
                  placeholder="Take notes for this lesson…"
                  className="min-h-[100px] text-[13px] resize-none"
                />
                <p className="text-[12px] text-muted-foreground mt-2">Auto-saved</p>
              </div>
            </div>
          )}

          {/* ── Attachments ── */}
          {currentLesson.attachments?.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden mb-6">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-[13px] font-semibold text-foreground">Downloads</h3>
              </div>
              <div className="px-5 py-5">
                <ul className="space-y-2">
                  {currentLesson.attachments.map((att, i) => (
                    <li key={i}>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[13px] text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {att.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between pt-5 border-t border-border">
            <button
              className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              onClick={() => navigate_lesson("prev")}
              disabled={!prevLesson}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              onClick={() => navigate_lesson("next")}
              disabled={!nextLesson}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>

      {/* ── RIGHT AI COACH PANEL ── */}
      {aiPanelOpen && (
        <aside className="hidden lg:flex flex-col w-80 border-l border-border bg-card flex-shrink-0 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-border flex-shrink-0 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">AI Coach</h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3.5 py-2.5 text-[13px] break-words ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground ml-6"
                    : "bg-muted mr-6"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            ))}
            {aiLoading && (
              <div className="bg-muted rounded-xl px-3.5 py-2.5 mr-6">
                <div className="flex gap-1 items-center">
                  <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                "Explain this again",
                "Give me an example",
                "How do I use this in real work?",
                "Test me on this",
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 hover:text-foreground transition-colors disabled:opacity-50"
                  onClick={() => void sendAiMessage(prompt)}
                  disabled={aiLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask anything…"
                className="min-h-[40px] max-h-24 resize-none text-[13px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendAiMessage();
                  }
                }}
                disabled={aiLoading}
              />
              <button
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                onClick={() => void sendAiMessage()}
                disabled={aiLoading || !aiInput.trim()}
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
