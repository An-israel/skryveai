import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Star,
  Clock,
  Users,
  BookOpen,
  PlayCircle,
  Lock,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Award,
  Briefcase,
  ExternalLink,
  GraduationCap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  description: string | null;
  skill_category: string | null;
  level: string | null;
  duration_hours: number | null;
  lesson_count: number;
  price: number;
  thumbnail_url: string | null;
  enrolled_count: number;
  avg_rating: number | null;
  review_count: number;
  what_you_will_learn: string[];
  instructor_name: string | null;
  instructor_bio: string | null;
  instructor_photo_url: string | null;
  tags: string[];
  is_published: boolean;
}

interface Lesson {
  id: string;
  course_id: string;
  module_name: string | null;
  title: string;
  content_type: string;
  content_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_free_preview: boolean;
}

interface Enrollment {
  id: string;
  course_id: string;
  talent_id: string;
  payment_status: string;
  progress_percent: number;
  completed_at: string | null;
}

interface Review {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  talent_id: string;
  talent_profiles?: { user_id: string };
}

interface AggJob {
  id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  skill_tags: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_GRADIENTS: Record<string, string> = {
  "Web Design": "from-blue-500 to-cyan-400",
  "Graphic Design": "from-pink-500 to-purple-400",
  Copywriting: "from-orange-400 to-yellow-300",
  "Video Editing": "from-red-500 to-pink-400",
  "Social Media": "from-violet-500 to-purple-400",
  "UI/UX": "from-indigo-500 to-blue-400",
  SEO: "from-green-500 to-emerald-400",
  "Digital Marketing": "from-teal-500 to-cyan-400",
  Coding: "from-slate-600 to-blue-500",
  "Data Analysis": "from-amber-500 to-orange-400",
  "AI & Automation": "from-purple-600 to-indigo-500",
  "Virtual Assistance": "from-rose-400 to-pink-300",
  "Content Writing": "from-lime-500 to-green-400",
};

function getThumbnailGradient(category: string | null) {
  if (!category) return "from-[#2563EB] to-[#1E3A5F]";
  return CATEGORY_GRADIENTS[category] ?? "from-[#2563EB] to-[#1E3A5F]";
}

function MiniStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

// ─── ModuleAccordion ──────────────────────────────────────────────────────────

function ModuleAccordion({
  moduleName,
  lessons,
  isEnrolled,
  courseId,
  defaultOpen,
  onLessonClick,
}: {
  moduleName: string;
  lessons: Lesson[];
  isEnrolled: boolean;
  courseId: string;
  defaultOpen: boolean;
  onLessonClick: (lesson: Lesson) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const totalMin = lessons.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[13px] font-semibold text-foreground text-left">{moduleName}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <span className="text-[12px] text-muted-foreground">
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
            {totalMin > 0 && ` · ${totalMin} min`}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="divide-y divide-border border-t border-border">
          {lessons.map((lesson) => {
            const canAccess = isEnrolled || lesson.is_free_preview;
            return (
              <button
                key={lesson.id}
                className={`w-full text-left flex items-center gap-3 px-5 py-3.5 transition-colors ${
                  canAccess
                    ? "hover:bg-muted/30 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (canAccess) onLessonClick(lesson);
                }}
                disabled={!canAccess}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {canAccess ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Icon */}
                <div className="flex-shrink-0">
                  {canAccess ? (
                    <PlayCircle className="h-4 w-4 text-primary/60" />
                  ) : (
                    <PlayCircle className="h-4 w-4 text-muted-foreground/30" />
                  )}
                </div>

                <span className="flex-1 text-[14px] font-medium text-foreground text-left leading-snug">
                  {lesson.title}
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {lesson.is_free_preview && (
                    <span className="text-[11px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md">
                      Preview
                    </span>
                  )}
                  {lesson.duration_minutes && (
                    <span className="text-[12px] text-muted-foreground">
                      {lesson.duration_minutes} min
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LearnPath() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<AggJob[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [talentProfile, setTalentProfile] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [courseId]);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      setUserEmail(user.email ?? null);
    }

    const [
      { data: courseData },
      { data: lessonsData },
      { data: reviewsData },
    ] = await Promise.all([
      (supabase as any).from("courses").select("*").eq("id", courseId).single(),
      (supabase as any)
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true }),
      (supabase as any)
        .from("course_reviews")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (!courseData) {
      toast({ title: "Course not found", variant: "destructive" });
      navigate("/learn");
      return;
    }

    setCourse(courseData as Course);
    setLessons((lessonsData as Lesson[]) || []);
    setReviews((reviewsData as Review[]) || []);

    // Load enrollment + talent profile
    if (user) {
      const { data: profile } = await (supabase as any)
        .from("talent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setTalentProfile(profile);
        const { data: enr } = await (supabase as any)
          .from("enrollments")
          .select("*")
          .eq("course_id", courseId)
          .eq("talent_id", profile.id)
          .single();
        if (enr) setEnrollment(enr as Enrollment);
      }
    }

    // Related jobs
    if (courseData?.skill_category) {
      const { data: jobs } = await (supabase as any)
        .from("aggregated_jobs")
        .select("id, title, company_name, company_logo_url, skill_tags")
        .eq("is_active", true)
        .ilike("skill_tags", `%${courseData.skill_category}%`)
        .limit(3);
      setRelatedJobs((jobs as AggJob[]) || []);
    }

    setLoading(false);
  }

  // ── Group lessons by module ──────────────────────────────────────────────

  const modules = Array.from(
    new Map(
      lessons.map((l) => [l.module_name ?? "Course Content", l.module_name ?? "Course Content"])
    ).keys()
  );

  const lessonsByModule = modules.reduce<Record<string, Lesson[]>>((acc, mod) => {
    acc[mod] = lessons.filter((l) => (l.module_name ?? "Course Content") === mod);
    return acc;
  }, {});

  // ── Rating breakdown ─────────────────────────────────────────────────────

  function ratingCount(star: number) {
    return reviews.filter((r) => r.rating === star).length;
  }

  // ── Navigate to first lesson ──────────────────────────────────────────────

  function continueLesson() {
    if (lessons.length > 0) {
      navigate(`/learn/${courseId}/${lessons[0].id}`);
    }
  }

  // ── Free enrollment ──────────────────────────────────────────────────────

  async function handleEnrollFree() {
    if (!userId) {
      navigate("/login");
      return;
    }
    if (!talentProfile) {
      toast({ title: "Complete your profile first", variant: "destructive" });
      return;
    }
    setEnrolling(true);
    try {
      const { data, error } = await (supabase as any)
        .from("enrollments")
        .insert({
          course_id: courseId,
          talent_id: talentProfile.id,
          payment_status: "paid",
          progress_percent: 0,
        })
        .select("*")
        .single();
      if (error) throw error;
      setEnrollment(data as Enrollment);
      toast({ title: "Enrolled!", description: "Welcome to the course." });
      if (lessons.length > 0) {
        navigate(`/learn/${courseId}/${lessons[0].id}`);
      }
    } catch (e: any) {
      toast({ title: "Enrollment failed", description: e.message, variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  }

  // ── Paid enrollment via Paystack ──────────────────────────────────────────

  function handleEnrollPaid() {
    if (!userId || !userEmail) {
      navigate("/login");
      return;
    }
    if (!course) return;
    const handler = (window as any).PaystackPop?.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
      email: userEmail,
      amount: course.price * 100,
      currency: "NGN",
      ref: `course_${courseId}_${Date.now()}`,
      metadata: { course_id: courseId, user_id: userId },
      callback: async () => {
        if (talentProfile) {
          try {
            const { data } = await (supabase as any)
              .from("enrollments")
              .insert({
                course_id: courseId,
                talent_id: talentProfile.id,
                payment_status: "paid",
                progress_percent: 0,
              })
              .select("*")
              .single();
            setEnrollment(data as Enrollment);
            toast({ title: "Enrolled!", description: "Payment successful." });
            if (lessons.length > 0) {
              navigate(`/learn/${courseId}/${lessons[0].id}`);
            }
          } catch {
            toast({ title: "Payment received, enrollment pending. Please refresh.", variant: "destructive" });
          }
        }
      },
      onClose: () => {},
    });
    handler?.openIframe();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) return null;

  const overallRating = course.avg_rating ?? 0;
  const isEnrolled = !!enrollment;
  const progress = enrollment?.progress_percent ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16 pt-4">

      {/* Back */}
      <Link
        to="/learn"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to courses
      </Link>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Course header banner */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="aspect-video relative overflow-hidden">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${getThumbnailGradient(course.skill_category)} flex items-center justify-center`}
                >
                  <GraduationCap className="h-16 w-16 text-white/30" />
                </div>
              )}
            </div>

            <div className="px-5 py-5">
              {/* Chips */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {course.skill_category && (
                  <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                    {course.skill_category}
                  </span>
                )}
                {course.level && (
                  <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md capitalize">
                    {course.level === "expert" ? "Advanced" : course.level}
                  </span>
                )}
              </div>

              <h1 className="text-xl font-semibold text-foreground leading-snug mb-2">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                  {course.description}
                </p>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
                {course.enrolled_count > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {course.enrolled_count.toLocaleString()} students
                  </span>
                )}
                {overallRating > 0 && (
                  <span className="flex items-center gap-1.5">
                    <MiniStars rating={overallRating} />
                    <span>{overallRating.toFixed(1)}</span>
                    {course.review_count > 0 && (
                      <span className="text-muted-foreground/60">({course.review_count})</span>
                    )}
                  </span>
                )}
                {course.lesson_count > 0 && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course.lesson_count} lessons
                  </span>
                )}
                {course.duration_hours && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {course.duration_hours}h total
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* What You'll Learn */}
          {course.what_you_will_learn.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">
                  What You Will Learn
                </span>
              </div>
              <div className="px-5 py-5">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.what_you_will_learn.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[13px] text-foreground leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Curriculum */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Curriculum
              </p>
              <span className="text-[12px] text-muted-foreground">
                {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                {course.duration_hours ? ` · ${course.duration_hours}h` : ""}
              </span>
            </div>

            {lessons.length === 0 ? (
              <div className="border border-border rounded-xl bg-card px-5 py-10 text-center">
                <p className="text-[13px] text-muted-foreground">No lessons yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {modules.map((mod, idx) => (
                  <ModuleAccordion
                    key={mod}
                    moduleName={mod}
                    lessons={lessonsByModule[mod] || []}
                    isEnrolled={isEnrolled}
                    courseId={courseId!}
                    defaultOpen={idx === 0}
                    onLessonClick={(lesson) => navigate(`/learn/${courseId}/${lesson.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Instructor */}
          {course.instructor_name && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Your Instructor</span>
              </div>
              <div className="px-5 py-5 flex items-start gap-4">
                <Avatar className="h-14 w-14 flex-shrink-0">
                  <AvatarImage src={course.instructor_photo_url ?? undefined} />
                  <AvatarFallback className="text-base bg-muted text-foreground">
                    {course.instructor_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-foreground mb-1">
                    {course.instructor_name}
                  </p>
                  {course.instructor_bio && (
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {course.instructor_bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Student Reviews</span>
                <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                  {course.review_count}
                </span>
              </div>
              <div className="px-5 py-5">
                {/* Rating summary */}
                <div className="flex items-start gap-6 mb-6">
                  <div className="text-center flex-shrink-0">
                    <div className="font-mono text-4xl font-semibold text-foreground mb-1">
                      {overallRating.toFixed(1)}
                    </div>
                    <MiniStars rating={overallRating} size="md" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {course.review_count} review{course.review_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingCount(star);
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-[12px] text-muted-foreground w-3 text-right">
                            {star}
                          </span>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                          <div className="h-1 bg-border rounded-full flex-1">
                            <div
                              className="h-full bg-yellow-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[12px] text-muted-foreground w-4">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual reviews */}
                <div className="divide-y divide-border">
                  {reviews.map((r) => (
                    <div key={r.id} className="py-4 first:pt-0 last:pb-0 flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
                          {r.talent_id?.slice(0, 1).toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <MiniStars rating={r.rating} />
                          <span className="text-[12px] text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {r.review && (
                          <p className="text-[13px] text-muted-foreground leading-relaxed">
                            {r.review}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="mt-6 lg:mt-0">
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* Enroll card */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              {/* Progress bar (enrolled) */}
              {isEnrolled && (
                <div className="px-5 py-3.5 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] text-muted-foreground">Your progress</span>
                    <span className="text-[12px] font-medium text-foreground">{progress}%</span>
                  </div>
                  <div className="h-1 bg-border rounded-full">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {progress === 100 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[12px] text-emerald-500 font-medium">Completed</span>
                    </div>
                  )}
                </div>
              )}

              <div className="px-5 py-5">
                {/* Price */}
                <div className="mb-4">
                  {course.price === 0 ? (
                    <span className="font-mono text-2xl font-semibold text-emerald-500">Free</span>
                  ) : (
                    <span className="font-mono text-2xl font-semibold text-foreground">
                      ₦{course.price.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Enroll / Continue button */}
                {isEnrolled ? (
                  <button
                    className="w-full px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    onClick={continueLesson}
                  >
                    Continue Learning
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : course.price === 0 ? (
                  <button
                    className="w-full px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    onClick={handleEnrollFree}
                    disabled={enrolling}
                  >
                    {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enroll for Free
                  </button>
                ) : (
                  <button
                    className="w-full px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    onClick={handleEnrollPaid}
                    disabled={enrolling}
                  >
                    {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enroll — ₦{course.price.toLocaleString()}
                  </button>
                )}

                {/* Perks */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Shield className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[12px] text-muted-foreground">Full Lifetime Access</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Award className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[12px] text-muted-foreground">Certificate of Completion</span>
                  </div>
                  {course.lesson_count > 0 && (
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-[12px] text-muted-foreground">
                        {course.lesson_count} lessons
                        {course.duration_hours ? ` · ${course.duration_hours}h` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Course stats panel */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-y divide-border">
                {[
                  { label: "Students", value: course.enrolled_count.toLocaleString() },
                  { label: "Lessons", value: String(course.lesson_count) },
                  { label: "Duration", value: course.duration_hours ? `${course.duration_hours}h` : "—" },
                  {
                    label: "Rating",
                    value: overallRating > 0 ? overallRating.toFixed(1) : "—",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-4">
                    <div className="font-mono text-base font-semibold text-foreground">{value}</div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related jobs */}
            {relatedJobs.length > 0 && (
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[13px] font-semibold text-foreground">
                    Jobs after this course
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {relatedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src={job.company_logo_url ?? undefined} />
                        <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
                          {job.company_name?.[0] ?? "J"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {job.title}
                        </p>
                        <p className="text-[12px] text-muted-foreground truncate">
                          {job.company_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-border">
                  <Link
                    to={`/jobs?skill=${encodeURIComponent(course.skill_category ?? "")}`}
                    className="flex items-center gap-1 text-[12px] text-primary hover:underline"
                  >
                    View all jobs
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
