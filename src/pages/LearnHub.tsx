import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Star,
  Clock,
  BookOpen,
  Users,
  Loader2,
  ChevronRight,
  GraduationCap,
  TrendingUp,
  Sparkles,
  Award,
  Filter,
  X,
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
  is_published: boolean;
  is_featured: boolean;
  enrolled_count: number;
  avg_rating: number | null;
  review_count: number;
  tags: string[];
  instructor_name: string | null;
  created_at: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  progress_percent: number;
  courses: Course;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "All",
  "Web Design",
  "Graphic Design",
  "Copywriting",
  "Video Editing",
  "Social Media",
  "UI/UX",
  "SEO",
  "Digital Marketing",
  "Coding",
  "Data Analysis",
  "AI & Automation",
  "Virtual Assistance",
  "Content Writing",
];

const LEVELS = [
  { label: "All Levels", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "expert" },
];

const DURATIONS = [
  { label: "Any Duration", value: "all" },
  { label: "Under 10 hrs", value: "under10" },
  { label: "10–30 hrs", value: "10to30" },
  { label: "30+ hrs", value: "over30" },
];

const PRICES = [
  { label: "All Prices", value: "all" },
  { label: "Free", value: "free" },
  { label: "Paid", value: "paid" },
];

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

function levelLabel(level: string | null) {
  if (!level) return null;
  if (level === "expert") return "Advanced";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

function CourseCard({
  course,
  isEnrolled,
  progress,
  onClick,
}: {
  course: Course;
  isEnrolled: boolean;
  progress?: number;
  onClick: () => void;
}) {
  const lvl = levelLabel(course.level);
  const rating = course.avg_rating ?? 0;

  return (
    <div
      className="border border-border rounded-xl bg-card overflow-hidden hover:border-primary/30 transition-colors group cursor-pointer flex flex-col"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden flex-shrink-0">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${getThumbnailGradient(course.skill_category)} flex items-center justify-center`}
          >
            <GraduationCap className="h-10 w-10 text-white/50" />
          </div>
        )}
        {isEnrolled && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border rounded-md px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-foreground">Enrolled</span>
          </div>
        )}
        {course.is_featured && !isEnrolled && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-primary/90 backdrop-blur-sm rounded-md px-2 py-1">
            <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
            <span className="text-[11px] font-medium text-primary-foreground">Featured</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-4 flex flex-col flex-1">
        {/* Tags row */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          {course.skill_category && (
            <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
              {course.skill_category}
            </span>
          )}
          {lvl && (
            <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
              {lvl}
            </span>
          )}
        </div>

        <h3 className="text-[14px] font-medium text-foreground leading-snug line-clamp-2 mb-1.5">
          {course.title}
        </h3>

        {course.instructor_name && (
          <p className="text-[12px] text-muted-foreground mb-2 truncate">
            {course.instructor_name}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-3 flex-wrap">
          {course.duration_hours && (
            <>
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>{course.duration_hours}h</span>
              <span>·</span>
            </>
          )}
          {course.lesson_count > 0 && (
            <span>{course.lesson_count} lessons</span>
          )}
          {course.enrolled_count > 0 && (
            <>
              <span>·</span>
              <Users className="h-3 w-3 flex-shrink-0" />
              <span>{course.enrolled_count.toLocaleString()}</span>
            </>
          )}
        </div>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3 w-3 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
                />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {rating.toFixed(1)}
              {course.review_count > 0 && ` (${course.review_count})`}
            </span>
          </div>
        )}

        {/* Progress bar if enrolled */}
        {isEnrolled && progress !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Progress</span>
              <span className="text-[11px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1 bg-border rounded-full">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
          {course.price === 0 ? (
            <span className="text-[13px] font-semibold text-emerald-500">Free</span>
          ) : (
            <span className="text-[13px] font-semibold text-foreground">
              ₦{course.price.toLocaleString()}
            </span>
          )}
          <span className="flex items-center gap-1 text-[12px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            {isEnrolled ? "Continue" : "View"} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── ContinueLearningRow ──────────────────────────────────────────────────────

function ContinueLearningRow({
  enrollment,
  onClick,
}: {
  enrollment: Enrollment;
  onClick: () => void;
}) {
  const c = enrollment.courses;
  return (
    <div
      className="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer flex items-center gap-4"
      onClick={onClick}
    >
      {/* Mini thumbnail */}
      <div className="w-14 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
        {c.thumbnail_url ? (
          <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${getThumbnailGradient(c.skill_category)}`}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-foreground truncate">{c.title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="h-1 bg-border rounded-full flex-1 max-w-[120px]">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${enrollment.progress_percent}%` }}
            />
          </div>
          <span className="text-[12px] text-muted-foreground flex-shrink-0">
            {enrollment.progress_percent}% complete
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[12px] text-primary font-medium flex-shrink-0">
        Continue <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {count !== undefined && (
        <span className="text-[11px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md ml-1">
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LearnHub() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollmentProgress, setEnrollmentProgress] = useState<Map<string, number>>(new Map());
  const [inProgressEnrollments, setInProgressEnrollments] = useState<Enrollment[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [certificateCount, setCertificateCount] = useState(0);

  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [popularCourses, setPopularCourses] = useState<Course[]>([]);
  const [newCourses, setNewCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [displayCount, setDisplayCount] = useState(12);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("all");
  const [duration, setDuration] = useState("all");
  const [price, setPrice] = useState("all");

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  // ── Load user & enrollments ──────────────────────────────────────────────

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      await loadEnrollments(user.id);
    }
    await loadSections();
    setLoading(false);
  }

  async function loadEnrollments(uid: string) {
    const { data: profile } = await (supabase as any)
      .from("talent_profiles")
      .select("id")
      .eq("user_id", uid)
      .single();

    if (!profile) return;

    const { data: enrollments } = await (supabase as any)
      .from("enrollments")
      .select("id, course_id, progress_percent, completed_at, courses(*)")
      .eq("talent_id", profile.id)
      .eq("payment_status", "paid");

    if (enrollments) {
      const ids = new Set<string>(enrollments.map((e: any) => e.course_id));
      const progressMap = new Map<string, number>(
        enrollments.map((e: any) => [e.course_id, e.progress_percent])
      );
      setEnrolledIds(ids);
      setEnrollmentProgress(progressMap);
      const inProgress = enrollments.filter(
        (e: any) => e.progress_percent < 100 && e.courses
      );
      const completed = enrollments.filter((e: any) => e.progress_percent === 100);
      setInProgressEnrollments(inProgress as Enrollment[]);
      setCompletedCount(completed.length);

      // Certificates
      const { data: certs } = await (supabase as any)
        .from("certificates")
        .select("id")
        .eq("talent_id", profile.id);
      setCertificateCount(certs?.length ?? 0);
    }
  }

  async function loadSections() {
    const [{ data: featured }, { data: popular }, { data: newest }] = await Promise.all([
      (supabase as any)
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .eq("is_featured", true)
        .limit(3),
      (supabase as any)
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("enrolled_count", { ascending: false })
        .limit(6),
      (supabase as any)
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    setFeaturedCourses((featured as Course[]) || []);
    setPopularCourses((popular as Course[]) || []);
    setNewCourses((newest as Course[]) || []);
  }

  // ── Filtering ────────────────────────────────────────────────────────────

  const runFilter = useCallback(async () => {
    setFilterLoading(true);
    let query = (supabase as any).from("courses").select("*").eq("is_published", true);

    if (search.trim()) {
      query = query.or(
        `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
      );
    }
    if (category !== "All") {
      query = query.eq("skill_category", category);
    }
    if (level !== "all") {
      query = query.eq("level", level);
    }
    if (duration === "under10") {
      query = query.lt("duration_hours", 10);
    } else if (duration === "10to30") {
      query = query.gte("duration_hours", 10).lte("duration_hours", 30);
    } else if (duration === "over30") {
      query = query.gt("duration_hours", 30);
    }
    if (price === "free") {
      query = query.eq("price", 0);
    } else if (price === "paid") {
      query = query.gt("price", 0);
    }

    query = query.order("enrolled_count", { ascending: false });

    const { data, error } = await query;
    if (error) {
      toast({ title: "Failed to load courses", variant: "destructive" });
    } else {
      setFilteredCourses((data as Course[]) || []);
      setDisplayCount(12);
    }
    setFilterLoading(false);
  }, [search, category, level, duration, price, toast]);

  useEffect(() => {
    void runFilter();
  }, [runFilter]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const isFiltering =
    search || category !== "All" || level !== "all" || duration !== "all" || price !== "all";

  function clearFilters() {
    setCategory("All");
    setLevel("all");
    setDuration("all");
    setPrice("all");
    setSearch("");
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visibleCourses = filteredCourses.slice(0, displayCount);
  const hasMore = filteredCourses.length > displayCount;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16 pt-6 space-y-8">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Learning Hub
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Course Catalogue</h1>
        </div>
        <Link
          to="/learn/my-courses"
          className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <GraduationCap className="h-4 w-4" />
          My Learning
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Stat bar ── */}
      {userId && (enrolledIds.size > 0 || completedCount > 0) && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { label: "Enrolled", value: enrolledIds.size, icon: BookOpen },
              { label: "Completed", value: completedCount, icon: Award },
              { label: "Certificates", value: certificateCount, icon: Sparkles },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="px-5 py-5 flex flex-col gap-1">
                <div className="font-mono text-2xl font-semibold text-foreground">{value}</div>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Continue Learning ── */}
      {inProgressEnrollments.length > 0 && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">Continue Learning</span>
            <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
              {inProgressEnrollments.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {inProgressEnrollments.map((e) => (
              <ContinueLearningRow
                key={e.id}
                enrollment={e}
                onClick={() => navigate(`/learn/${e.course_id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Search + Filter row ── */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground">Filter Courses</span>
          {isFiltering && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search courses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-[13px]"
            />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-auto min-w-[150px] h-9 text-[13px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="text-[13px]">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-auto min-w-[140px] h-9 text-[13px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value} className="text-[13px]">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-auto min-w-[140px] h-9 text-[13px]">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="text-[13px]">
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={price} onValueChange={setPrice}>
            <SelectTrigger className="w-auto min-w-[120px] h-9 text-[13px]">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              {PRICES.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-[13px]">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Featured Courses ── */}
      {featuredCourses.length > 0 && !isFiltering && (
        <section>
          <SectionLabel icon={Sparkles} label="Featured Courses" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                isEnrolled={enrolledIds.has(c.id)}
                progress={enrollmentProgress.get(c.id)}
                onClick={() => navigate(`/learn/${c.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Most Popular ── */}
      {popularCourses.length > 0 && !isFiltering && (
        <section>
          <SectionLabel icon={TrendingUp} label="Most Popular" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                isEnrolled={enrolledIds.has(c.id)}
                progress={enrollmentProgress.get(c.id)}
                onClick={() => navigate(`/learn/${c.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── New Courses ── */}
      {newCourses.length > 0 && !isFiltering && (
        <section>
          <SectionLabel icon={BookOpen} label="New Courses" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                isEnrolled={enrolledIds.has(c.id)}
                progress={enrollmentProgress.get(c.id)}
                onClick={() => navigate(`/learn/${c.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── All / Filtered Courses ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {isFiltering
                ? `Results — ${filteredCourses.length} course${filteredCourses.length !== 1 ? "s" : ""}`
                : "All Courses"}
            </p>
            {filterLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {filteredCourses.length === 0 && !filterLoading ? (
          <div className="border border-border rounded-xl bg-card px-5 py-16 text-center">
            <GraduationCap className="h-9 w-9 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-[14px] font-medium text-foreground mb-1">No courses found</p>
            <p className="text-[13px] text-muted-foreground mb-5">
              Try adjusting your filters or search term.
            </p>
            <button
              onClick={clearFilters}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleCourses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  isEnrolled={enrolledIds.has(c.id)}
                  progress={enrollmentProgress.get(c.id)}
                  onClick={() => navigate(`/learn/${c.id}`)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setDisplayCount((n) => n + 12)}
                  className="px-5 py-2.5 rounded-lg border border-border bg-card text-[13px] font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  Load more · {filteredCourses.length - displayCount} remaining
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
