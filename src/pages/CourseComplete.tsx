import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  Briefcase,
  ExternalLink,
  Loader2,
  Share2,
  Twitter,
  Linkedin,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  skill_category: string;
  duration_hours: number;
  thumbnail_url: string | null;
}

interface Job {
  id: string;
  title: string;
  company: string;
  platform: string;
  skill_tags: string[];
  salary_min: number | null;
  salary_max: number | null;
  external_url: string | null;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#2563EB", "#059669", "#f59e0b", "#ec4899", "#8b5cf6"];

const confettiPieces = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 2,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: Math.random() * 8 + 6,
  duration: Math.random() * 2 + 2,
}));

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {confettiPieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            animationName: "confettiFall",
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "linear",
            animationFillMode: "forwards",
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CourseComplete() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [certId, setCertId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showConfetti, setShowConfetti] = useState(true);
  const [fullName, setFullName] = useState("Learner");

  useEffect(() => {
    void init();
    // Stop confetti after 4s
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, [courseId]);

  async function init() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const [{ data: courseData }, { data: profile }] = await Promise.all([
      (supabase as any).from("courses").select("*").eq("id", courseId).single(),
      (supabase as any)
        .from("talent_profiles")
        .select("id, full_name")
        .eq("user_id", user.id)
        .single(),
    ]);

    if (!courseData) {
      navigate("/learn");
      return;
    }

    setCourse(courseData as Course);
    if (profile?.full_name) setFullName(profile.full_name);

    // Verify enrollment is complete
    const { data: enrollment } = await (supabase as any)
      .from("enrollments")
      .select("*")
      .eq("course_id", courseId)
      .eq("talent_id", profile?.id)
      .single();

    if (!enrollment || enrollment.progress_percent < 100) {
      navigate(`/learn/${courseId}`);
      return;
    }

    // Fetch or create certificate
    const { data: cert } = await (supabase as any)
      .from("certificates")
      .select("id")
      .eq("course_id", courseId)
      .eq("talent_id", profile?.id)
      .single();

    if (cert) {
      setCertId(cert.id);
    } else {
      const { data: newCert } = await (supabase as any)
        .from("certificates")
        .upsert({
          course_id: courseId,
          talent_id: profile?.id,
          issued_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (newCert) setCertId(newCert.id);
    }

    // Fetch matching jobs
    const { data: jobsData } = await (supabase as any)
      .from("aggregated_jobs")
      .select("*")
      .eq("is_active", true)
      .contains("skill_tags", [courseData.skill_category])
      .limit(6);

    // If no exact match, try fetching any active jobs
    if (!jobsData || jobsData.length === 0) {
      const { data: fallbackJobs } = await (supabase as any)
        .from("aggregated_jobs")
        .select("*")
        .eq("is_active", true)
        .limit(6);
      setJobs((fallbackJobs || []) as Job[]);
    } else {
      setJobs((jobsData || []) as Job[]);
    }

    setLoading(false);
  }

  function matchPercent(job: Job, skillCategory: string): number {
    if (!job.skill_tags || !skillCategory) return 0;
    const words = skillCategory.toLowerCase().split(/\s+/);
    const matched = words.filter((w) =>
      job.skill_tags.some((t) => t.toLowerCase().includes(w))
    );
    return Math.round((matched.length / words.length) * 100);
  }

  function formatSalary(min: number | null, max: number | null): string {
    if (!min && !max) return "";
    if (min && max) return `$${(min / 1000).toFixed(0)}k–$${(max / 1000).toFixed(0)}k`;
    if (min) return `From $${(min / 1000).toFixed(0)}k`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) return null;

  const certUrl = certId
    ? `${window.location.origin}/certificates/${certId}`
    : window.location.href;

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border border-border rounded-xl bg-card overflow-hidden mb-6"
      >
        <div className="px-8 py-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Award className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 leading-snug">
            You completed{" "}
            <span className="text-primary">{course.title}</span>
          </h1>
          <p className="text-[13px] text-muted-foreground mb-1">
            {course.duration_hours} hours of learning. Certified.
          </p>
          <p className="text-[13px] text-muted-foreground mb-7">
            Congratulations, {fullName}! Your certificate is ready.
          </p>

          <div className="flex flex-col gap-3 mb-7">
            <button
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              onClick={() => navigate(`/learn/${courseId}/certificate`)}
            >
              Claim Your Certificate
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link
              to="/learn"
              className="px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-center"
            >
              Browse More Courses
            </Link>
          </div>

          {/* Social share */}
          <div className="border-t border-border pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Share your achievement
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-2 transition-colors"
                onClick={() =>
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}&summary=${encodeURIComponent(
                      `I just completed ${course.title} on Skryve! 🎓`
                    )}`,
                    "_blank"
                  )
                }
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-2 transition-colors"
                onClick={() =>
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `I just completed ${course.title} on @SkryveHQ! 🎓 ${certUrl}`
                    )}`,
                    "_blank"
                  )
                }
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Jobs section */}
      {jobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-semibold text-foreground">Jobs You Can Now Apply To</span>
              </div>
              <Link
                to={`/jobs?skill=${encodeURIComponent(course.skill_category)}`}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {jobs.map((job) => {
                const match = matchPercent(job, course.skill_category);
                const salaryStr = formatSalary(job.salary_min, job.salary_max);
                return (
                  <div key={job.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-foreground line-clamp-1">{job.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[12px] text-muted-foreground">{job.company}</span>
                          <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">{job.platform}</span>
                          {salaryStr && (
                            <span className="text-[12px] text-muted-foreground">{salaryStr}</span>
                          )}
                          {match > 0 && (
                            <span className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
                              {match}% match
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
                          onClick={() => navigate(`/jobs?skill=${encodeURIComponent(course.skill_category)}`)}
                        >
                          Apply
                        </button>
                        {job.external_url && (
                          <a
                            href={job.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
