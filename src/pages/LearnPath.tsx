import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { courseSchema, SITE_URL } from "@/components/schema/jsonld";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function SmallStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
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

  // ── Navigate to first incomplete lesson ──────────────────────────────────

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
        // On success: create enrollment
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) return null;

  const overallRating = course.avg_rating ?? 0;
  const isEnrolled = !!enrollment;

  return (
    <>
    <SEOHead
      title={course.title}
      description={(course.description || `Learn ${course.title} on Skryve.`).slice(0, 160)}
      canonical={`${SITE_URL}/learn/${course.id}`}
      jsonLd={courseSchema({ name: course.title, description: course.description || undefined })}
    />
    <div className="max-w-7xl mx-auto px-4 pb-12 pt-2">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/learn">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to courses
        </Link>
      </Button>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* ── LEFT COLUMN (2/3) ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {course.skill_category && (
                <Badge variant="secondary">{course.skill_category}</Badge>
              )}
              {course.level && (
                <Badge variant="outline" className="capitalize">
                  {course.level === "expert" ? "Advanced" : course.level}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{course.title}</h1>
            {course.description && (
              <p className="text-muted-foreground">{course.description}</p>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{course.enrolled_count.toLocaleString()} students</span>
            </div>
            {overallRating > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{overallRating.toFixed(1)} ({course.review_count} reviews)</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{course.lesson_count} lessons</span>
            </div>
            {course.duration_hours && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{course.duration_hours}h total</span>
              </div>
            )}
          </div>

          {/* What You'll Learn */}
          {course.what_you_will_learn.length > 0 && (
            <Card className="p-6">
              <h2 className="font-bold text-lg mb-4">What You Will Learn</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {course.what_you_will_learn.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-[#059669] mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Curriculum */}
          <div>
            <h2 className="font-bold text-lg mb-4">Curriculum</h2>
            {lessons.length === 0 ? (
              <p className="text-muted-foreground text-sm">No lessons yet.</p>
            ) : (
              <Accordion type="multiple" defaultValue={modules.slice(0, 1)}>
                {modules.map((mod) => {
                  const modLessons = lessonsByModule[mod] || [];
                  const totalMin = modLessons.reduce(
                    (sum, l) => sum + (l.duration_minutes ?? 0),
                    0
                  );
                  return (
                    <AccordionItem key={mod} value={mod}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2">
                          <span className="font-medium text-left">{mod}</span>
                          <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                            {modLessons.length} lessons
                            {totalMin > 0 && ` · ${totalMin} min`}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1 py-1">
                          {modLessons.map((lesson) => {
                            const canAccess = isEnrolled || lesson.is_free_preview;
                            return (
                              <li key={lesson.id}>
                                <button
                                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                                    canAccess
                                      ? "hover:bg-muted cursor-pointer"
                                      : "opacity-60 cursor-not-allowed"
                                  }`}
                                  onClick={() => {
                                    if (canAccess) navigate(`/learn/${courseId}/${lesson.id}`);
                                  }}
                                  disabled={!canAccess}
                                >
                                  {canAccess ? (
                                    <PlayCircle className="h-4 w-4 text-[#2563EB] flex-shrink-0" />
                                  ) : (
                                    <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className="flex-1">{lesson.title}</span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {lesson.is_free_preview && (
                                      <Badge variant="outline" className="text-[10px] text-[#059669] border-[#059669]/30">
                                        Preview
                                      </Badge>
                                    )}
                                    {lesson.duration_minutes && (
                                      <span className="text-xs text-muted-foreground">
                                        {lesson.duration_minutes} min
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>

          {/* Instructor */}
          {course.instructor_name && (
            <div>
              <h2 className="font-bold text-lg mb-4">Your Instructor</h2>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 flex-shrink-0">
                  <AvatarImage src={course.instructor_photo_url ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {course.instructor_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{course.instructor_name}</h3>
                  {course.instructor_bio && (
                    <p className="text-sm text-muted-foreground mt-1">{course.instructor_bio}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-4">Student Reviews</h2>
              {/* Rating summary */}
              <div className="flex items-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-[#2563EB]">
                    {overallRating.toFixed(1)}
                  </div>
                  <StarRating rating={overallRating} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {course.review_count} reviews
                  </p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingCount(star);
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-3 text-right">{star}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="w-6 text-xs text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual reviews */}
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback>
                        {r.talent_id?.slice(0, 1).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <SmallStars rating={r.rating} />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {r.review && (
                        <p className="text-sm text-muted-foreground">{r.review}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT STICKY CARD ── */}
        <div className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card className="overflow-hidden">
              {/* Course thumbnail */}
              <div className="h-48 overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#2563EB] to-[#1E3A5F] flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-white/40" />
                  </div>
                )}
              </div>

              <div className="p-5">
                {/* Price */}
                <div className="mb-4">
                  {course.price === 0 ? (
                    <span className="text-2xl font-bold text-[#059669]">Free</span>
                  ) : (
                    <span className="text-2xl font-bold">
                      ₦{course.price.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Enroll / Continue button */}
                {isEnrolled ? (
                  <Button className="w-full" onClick={continueLesson}>
                    Continue Learning →
                  </Button>
                ) : course.price === 0 ? (
                  <Button
                    className="w-full"
                    onClick={handleEnrollFree}
                    disabled={enrolling}
                  >
                    {enrolling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Enroll Free
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleEnrollPaid}
                    disabled={enrolling}
                  >
                    {enrolling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Enroll — ₦{course.price.toLocaleString()}
                  </Button>
                )}

                {/* Perks */}
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-[#059669]" />
                    Full Lifetime Access
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-[#059669]" />
                    Certificate of Completion
                  </li>
                  {course.lesson_count > 0 && (
                    <li className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-[#059669]" />
                      {course.lesson_count} lessons
                      {course.duration_hours ? ` · ${course.duration_hours}h` : ""}
                    </li>
                  )}
                </ul>
              </div>
            </Card>

            {/* Related jobs */}
            {relatedJobs.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-4 w-4 text-[#2563EB]" />
                  <h3 className="font-semibold text-sm">Jobs after this course</h3>
                </div>
                <div className="space-y-2">
                  {relatedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={job.company_logo_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {job.company_name?.[0] ?? "J"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.company_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to={`/jobs?skill=${encodeURIComponent(course.skill_category ?? "")}`}
                  className="flex items-center gap-1 text-xs text-[#2563EB] hover:underline mt-3"
                >
                  View all jobs <ExternalLink className="h-3 w-3" />
                </Link>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
