import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  { label: "All", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "expert" },
];

const DURATIONS = [
  { label: "All", value: "all" },
  { label: "Under 10 hrs", value: "under10" },
  { label: "10–30 hrs", value: "10to30" },
  { label: "30+ hrs", value: "over30" },
];

const PRICES = [
  { label: "All", value: "all" },
  { label: "Free", value: "free" },
  { label: "Paid", value: "paid" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= Math.round(r) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {r > 0 ? r.toFixed(1) : "No ratings"} {count > 0 && `(${count})`}
      </span>
    </div>
  );
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  "Web Design": "from-blue-500 to-cyan-400",
  "Graphic Design": "from-pink-500 to-purple-400",
  "Copywriting": "from-orange-400 to-yellow-300",
  "Video Editing": "from-red-500 to-pink-400",
  "Social Media": "from-violet-500 to-purple-400",
  "UI/UX": "from-indigo-500 to-blue-400",
  "SEO": "from-green-500 to-emerald-400",
  "Digital Marketing": "from-teal-500 to-cyan-400",
  "Coding": "from-slate-600 to-blue-500",
  "Data Analysis": "from-amber-500 to-orange-400",
  "AI & Automation": "from-purple-600 to-indigo-500",
  "Virtual Assistance": "from-rose-400 to-pink-300",
  "Content Writing": "from-lime-500 to-green-400",
};

function getThumbnailGradient(category: string | null) {
  if (!category) return "from-[#2563EB] to-[#1E3A5F]";
  return CATEGORY_GRADIENTS[category] ?? "from-[#2563EB] to-[#1E3A5F]";
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

function CourseCard({
  course,
  isEnrolled,
  onClick,
}: {
  course: Course;
  isEnrolled: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group flex flex-col"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden flex-shrink-0">
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
            <GraduationCap className="h-12 w-12 text-white/60" />
          </div>
        )}
        {isEnrolled && (
          <Badge className="absolute top-2 right-2 bg-[#059669] text-white border-0">
            Enrolled
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {course.skill_category && (
            <Badge variant="secondary" className="text-[11px]">
              {course.skill_category}
            </Badge>
          )}
          {course.level && (
            <Badge variant="outline" className="text-[11px] capitalize">
              {course.level === "expert" ? "Advanced" : course.level}
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-sm leading-tight mb-1.5 line-clamp-2">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
            {course.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          {course.duration_hours && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {course.duration_hours}h
            </span>
          )}
          {course.lesson_count > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {course.lesson_count} lessons
            </span>
          )}
          {course.enrolled_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {course.enrolled_count.toLocaleString()}
            </span>
          )}
        </div>

        <StarRating rating={course.avg_rating} count={course.review_count} />

        <div className="mt-2 pt-2 border-t">
          {course.price === 0 ? (
            <span className="text-sm font-semibold text-[#059669]">Free</span>
          ) : (
            <span className="text-sm font-bold">
              ₦{course.price.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── ContinueLearningCard ─────────────────────────────────────────────────────

function ContinueLearningCard({
  enrollment,
  onClick,
}: {
  enrollment: Enrollment;
  onClick: () => void;
}) {
  const c = enrollment.courses;
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex-shrink-0 w-64 group"
      onClick={onClick}
    >
      <div className="relative h-32 overflow-hidden">
        {c.thumbnail_url ? (
          <img
            src={c.thumbnail_url}
            alt={c.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${getThumbnailGradient(c.skill_category)}`}
          />
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-1 mb-2">{c.title}</h3>
        <Progress value={enrollment.progress_percent} className="h-1.5 mb-1.5" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {enrollment.progress_percent}% complete
          </span>
          <span className="text-xs text-[#2563EB] font-medium flex items-center gap-0.5">
            Continue <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LearnHub() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [inProgressEnrollments, setInProgressEnrollments] = useState<Enrollment[]>([]);

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
    const { data: { user } } = await supabase.auth.getUser();
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
      .select("id, course_id, progress_percent, courses(*)")
      .eq("talent_id", profile.id)
      .eq("payment_status", "paid");

    if (enrollments) {
      const ids = new Set<string>(enrollments.map((e: any) => e.course_id));
      setEnrolledIds(ids);
      const inProgress = enrollments.filter((e: any) => e.progress_percent < 100 && e.courses);
      setInProgressEnrollments(inProgress as Enrollment[]);
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
    let query = (supabase as any)
      .from("courses")
      .select("*")
      .eq("is_published", true);

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

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visibleCourses = filteredCourses.slice(0, displayCount);
  const hasMore = filteredCourses.length > displayCount;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] text-white p-8 mb-8 mt-2">
        <div className="relative z-10 max-w-2xl">
          <Badge className="mb-3 bg-white/20 text-white border-white/30">
            <Sparkles className="h-3 w-3 mr-1" /> SkryveAI Learn
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Learn a Skill. Land a Job.
          </h1>
          <p className="text-white/80 text-lg mb-6">
            Practical courses built for African freelancers. Learn at your pace,
            earn certificates, and unlock more opportunities.
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search courses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
            />
          </div>
        </div>
        {/* decorative circles */}
        <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute right-16 bottom-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-auto min-w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-auto min-w-[140px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger className="w-auto min-w-[140px]">
            <SelectValue placeholder="Duration" />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={price} onValueChange={setPrice}>
          <SelectTrigger className="w-auto min-w-[120px]">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            {PRICES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(category !== "All" || level !== "all" || duration !== "all" || price !== "all" || search) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCategory("All");
              setLevel("all");
              setDuration("all");
              setPrice("all");
              setSearch("");
            }}
          >
            Clear filters
          </Button>
        )}

        <Link to="/learn/my-courses" className="ml-auto">
          <Button variant="outline" size="sm" className="gap-1.5">
            <GraduationCap className="h-4 w-4" /> My Learning
          </Button>
        </Link>
      </div>

      {/* ── Continue Learning ── */}
      {inProgressEnrollments.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold">Continue Learning</h2>
            <Badge variant="secondary">{inProgressEnrollments.length}</Badge>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {inProgressEnrollments.map((e) => (
              <ContinueLearningCard
                key={e.id}
                enrollment={e}
                onClick={() => navigate(`/learn/${e.course_id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Courses ── */}
      {featuredCourses.length > 0 && !search && category === "All" && level === "all" && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-xl font-bold">Featured Courses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                isEnrolled={enrolledIds.has(c.id)}
                onClick={() => navigate(`/learn/${c.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Most Popular ── */}
      {popularCourses.length > 0 && !search && category === "All" && level === "all" && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-xl font-bold">Most Popular</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                isEnrolled={enrolledIds.has(c.id)}
                onClick={() => navigate(`/learn/${c.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── New Courses ── */}
      {newCourses.length > 0 && !search && category === "All" && level === "all" && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-xl font-bold">New Courses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                isEnrolled={enrolledIds.has(c.id)}
                onClick={() => navigate(`/learn/${c.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── All / Filtered Courses ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {search || category !== "All" || level !== "all" || duration !== "all" || price !== "all"
              ? `Results (${filteredCourses.length})`
              : "All Courses"}
          </h2>
          {filterLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {filteredCourses.length === 0 && !filterLoading ? (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No courses match your filters.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setCategory("All");
                setLevel("all");
                setDuration("all");
                setPrice("all");
                setSearch("");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleCourses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  isEnrolled={enrolledIds.has(c.id)}
                  onClick={() => navigate(`/learn/${c.id}`)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount((n) => n + 12)}
                >
                  Load More ({filteredCourses.length - displayCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
