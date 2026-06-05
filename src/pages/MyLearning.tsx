import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Download,
  Trophy,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  description: string | null;
  skill_category: string | null;
  thumbnail_url: string | null;
  duration_hours: number | null;
  lesson_count: number;
  instructor_name: string | null;
}

interface Enrollment {
  id: string;
  course_id: string;
  progress_percent: number;
  completed_at: string | null;
  created_at: string;
  courses: Course;
}

interface Certificate {
  id: string;
  course_id: string;
  issued_at: string;
  certificate_url: string | null;
  courses: Course;
}

// ─── Gradient fallback ────────────────────────────────────────────────────────

const CATEGORY_GRADIENTS: Record<string, string> = {
  "Web Design": "from-blue-500 to-cyan-400",
  "Graphic Design": "from-pink-500 to-purple-400",
  "Copywriting": "from-orange-400 to-yellow-300",
  "Video Editing": "from-red-500 to-pink-400",
  "UI/UX": "from-indigo-500 to-blue-400",
  "SEO": "from-green-500 to-emerald-400",
  "Coding": "from-slate-600 to-blue-500",
  "AI & Automation": "from-purple-600 to-indigo-500",
};

function getGradient(category: string | null) {
  if (!category) return "from-[#2563EB] to-[#1E3A5F]";
  return CATEGORY_GRADIENTS[category] ?? "from-[#2563EB] to-[#1E3A5F]";
}

// ─── Certificate Modal ────────────────────────────────────────────────────────

function CertificateModal({
  cert,
  open,
  onClose,
}: {
  cert: Certificate | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!cert) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Certificate of Completion</DialogTitle>
        </DialogHeader>
        <div className="relative border-8 border-double border-primary/30 rounded-xl p-10 text-center bg-gradient-to-br from-background to-muted/30">
          <div className="absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-primary/50 rounded-tl" />
          <div className="absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-primary/50 rounded-tr" />
          <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-primary/50 rounded-bl" />
          <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-primary/50 rounded-br" />
          <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Certificate of Completion
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            This certifies successful completion of
          </p>
          <h2 className="text-2xl font-bold mb-2">{cert.courses.title}</h2>
          {cert.courses.skill_category && (
            <span className="inline-block px-3 py-1 rounded-full bg-muted text-[12px] font-medium text-muted-foreground mb-4">
              {cert.courses.skill_category}
            </span>
          )}
          <p className="text-[13px] text-muted-foreground mt-2">
            Issued on{" "}
            {new Date(cert.issued_at).toLocaleDateString("en-NG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="mt-6 pt-4 border-t border-dashed">
            <img src="/logo.png" alt="Skryve" className="h-8 mx-auto opacity-60" />
          </div>
        </div>
        {cert.certificate_url && (
          <a
            href={cert.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-2"
          >
            <button className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-2 transition-colors">
              <Download className="h-4 w-4" />
              Download Certificate
            </button>
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-border text-[11px] font-semibold text-muted-foreground leading-none">
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "in-progress" | "completed" | "certificates";

export default function MyLearning() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("in-progress");
  const [inProgress, setInProgress] = useState<Enrollment[]>([]);
  const [completed, setCompleted] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: profile } = await (supabase as any)
      .from("talent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      toast({ title: "Profile not found", variant: "destructive" });
      setLoading(false);
      return;
    }

    const [
      { data: inProgressData },
      { data: completedData },
      { data: certsData },
    ] = await Promise.all([
      (supabase as any)
        .from("enrollments")
        .select(
          "id, course_id, progress_percent, completed_at, created_at, courses(*)"
        )
        .eq("talent_id", profile.id)
        .eq("payment_status", "paid")
        .lt("progress_percent", 100)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("enrollments")
        .select(
          "id, course_id, progress_percent, completed_at, created_at, courses(*)"
        )
        .eq("talent_id", profile.id)
        .eq("payment_status", "paid")
        .eq("progress_percent", 100)
        .order("completed_at", { ascending: false }),
      (supabase as any)
        .from("certificates")
        .select("id, course_id, issued_at, certificate_url, courses(*)")
        .eq("talent_id", profile.id)
        .order("issued_at", { ascending: false }),
    ]);

    setInProgress((inProgressData as Enrollment[]) || []);
    setCompleted((completedData as Enrollment[]) || []);
    setCertificates((certsData as Certificate[]) || []);
    setLoading(false);
  }

  async function continueEnrollment(enrollment: Enrollment) {
    const { data: lessons } = await (supabase as any)
      .from("course_lessons")
      .select("id, order_index")
      .eq("course_id", enrollment.course_id)
      .order("order_index", { ascending: true });

    const { data: progress } = await (supabase as any)
      .from("lesson_progress")
      .select("lesson_id")
      .eq("enrollment_id", enrollment.id)
      .eq("is_completed", true);

    const completedIds = new Set(
      (progress || []).map((p: any) => p.lesson_id)
    );
    const firstIncomplete = (lessons || []).find(
      (l: any) => !completedIds.has(l.id)
    );

    if (firstIncomplete) {
      navigate(`/learn/${enrollment.course_id}/${firstIncomplete.id}`);
    } else if (lessons?.length > 0) {
      navigate(`/learn/${enrollment.course_id}/${lessons[0].id}`);
    } else {
      navigate(`/learn/${enrollment.course_id}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12 pt-2">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/learn"
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors -ml-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Browse Courses
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-foreground">My Learning</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Track your progress and download certificates
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border pb-3">
        <TabButton
          active={tab === "in-progress"}
          onClick={() => setTab("in-progress")}
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label="In Progress"
          count={inProgress.length}
        />
        <TabButton
          active={tab === "completed"}
          onClick={() => setTab("completed")}
          icon={<GraduationCap className="h-3.5 w-3.5" />}
          label="Completed"
          count={completed.length}
        />
        <TabButton
          active={tab === "certificates"}
          onClick={() => setTab("certificates")}
          icon={<Award className="h-3.5 w-3.5" />}
          label="Certificates"
          count={certificates.length}
        />
      </div>

      {/* ── In Progress ── */}
      {tab === "in-progress" && (
        <>
          {inProgress.length === 0 ? (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[14px] font-medium text-foreground mb-1">
                  No courses in progress
                </p>
                <p className="text-[13px] text-muted-foreground mb-5">
                  You haven't started any courses yet.
                </p>
                <Link
                  to="/learn"
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  Browse Courses
                </Link>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">
                  In Progress
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {inProgress.length}{" "}
                  {inProgress.length === 1 ? "course" : "courses"}
                </span>
              </div>
              <div className="divide-y divide-border">
                {inProgress.map((enr) => {
                  const c = enr.courses;
                  return (
                    <div
                      key={enr.id}
                      className="px-5 py-4 hover:bg-muted/30 transition-colors flex items-center gap-4"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        {c.thumbnail_url ? (
                          <img
                            src={c.thumbnail_url}
                            alt={c.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${getGradient(c.skill_category)} flex items-center justify-center`}
                          >
                            <GraduationCap className="h-5 w-5 text-white/60" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {c.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.skill_category && (
                            <span className="text-[11px] text-muted-foreground">
                              {c.skill_category}
                            </span>
                          )}
                          {c.instructor_name && (
                            <>
                              <span className="text-[11px] text-border">·</span>
                              <span className="text-[11px] text-muted-foreground">
                                {c.instructor_name}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-border rounded-full">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${enr.progress_percent}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {enr.progress_percent}%
                          </span>
                        </div>
                      </div>

                      {/* Meta + action */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(enr.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        <button
                          onClick={() => void continueEnrollment(enr)}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1"
                        >
                          Continue
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Completed ── */}
      {tab === "completed" && (
        <>
          {completed.length === 0 ? (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[14px] font-medium text-foreground mb-1">
                  No completed courses yet
                </p>
                <p className="text-[13px] text-muted-foreground">
                  Keep learning!
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">
                  Completed
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {completed.length}{" "}
                  {completed.length === 1 ? "course" : "courses"}
                </span>
              </div>
              <div className="divide-y divide-border">
                {completed.map((enr) => {
                  const c = enr.courses;
                  return (
                    <div
                      key={enr.id}
                      className="px-5 py-4 hover:bg-muted/30 transition-colors flex items-center gap-4"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {c.thumbnail_url ? (
                          <img
                            src={c.thumbnail_url}
                            alt={c.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${getGradient(c.skill_category)} flex items-center justify-center`}
                          >
                            <GraduationCap className="h-5 w-5 text-white/60" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-foreground truncate">
                            {c.title}
                          </p>
                          <span className="flex-shrink-0 flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Completed
                          </span>
                        </div>
                        {c.skill_category && (
                          <span className="text-[11px] text-muted-foreground">
                            {c.skill_category}
                          </span>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {enr.completed_at
                            ? `Completed ${formatDistanceToNow(
                                new Date(enr.completed_at),
                                { addSuffix: true }
                              )}`
                            : "Completed"}
                        </p>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => navigate(`/learn/${enr.course_id}`)}
                        className="px-4 py-2 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex-shrink-0"
                      >
                        Review
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Certificates ── */}
      {tab === "certificates" && (
        <>
          {certificates.length === 0 ? (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Award className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[14px] font-medium text-foreground mb-1">
                  No certificates yet
                </p>
                <p className="text-[13px] text-muted-foreground mb-5">
                  Complete a course to earn one!
                </p>
                <Link
                  to="/learn"
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  Browse Courses
                </Link>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">
                  Certificates
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {certificates.length}{" "}
                  {certificates.length === 1 ? "certificate" : "certificates"}
                </span>
              </div>
              <div className="divide-y divide-border">
                {certificates.map((cert) => {
                  const c = cert.courses;
                  return (
                    <div
                      key={cert.id}
                      className="px-5 py-4 hover:bg-muted/30 transition-colors flex items-center gap-4 cursor-pointer"
                      onClick={() => {
                        setSelectedCert(cert);
                        setCertModalOpen(true);
                      }}
                    >
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGradient(c.skill_category)} flex items-center justify-center flex-shrink-0`}
                      >
                        <Trophy className="h-4 w-4 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {c.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {c.skill_category && (
                            <span className="mr-2">{c.skill_category}</span>
                          )}
                          Issued{" "}
                          {new Date(cert.issued_at).toLocaleDateString(
                            "en-NG",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>

                      {/* Action */}
                      <button
                        className="px-4 py-2 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex-shrink-0 flex items-center gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCert(cert);
                          setCertModalOpen(true);
                        }}
                      >
                        <Award className="h-3.5 w-3.5" />
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <CertificateModal
        cert={selectedCert}
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
      />
    </div>
  );
}
