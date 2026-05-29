import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#059669]/10 mb-6">
          <Award className="h-12 w-12 text-[#059669]" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
          You completed{" "}
          <span className="text-[#2563EB]">{course.title}</span>! 🎉
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          {course.duration_hours} hours of learning. Certified.
        </p>
        <p className="text-muted-foreground mb-8">
          Congratulations, {fullName}! Your certificate is ready.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button
            size="lg"
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            onClick={() => navigate(`/learn/${courseId}/certificate`)}
          >
            Claim Your Certificate
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/learn">Browse More Courses</Link>
          </Button>
        </div>

        {/* Social share */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-muted-foreground">Share your achievement:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}&summary=${encodeURIComponent(
                  `I just completed ${course.title} on Skryve! 🎓`
                )}`,
                "_blank"
              )
            }
          >
            <Linkedin className="h-4 w-4 mr-2 text-[#0077b5]" />
            LinkedIn
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `I just completed ${course.title} on @SkryveHQ! 🎓 ${certUrl}`
                )}`,
                "_blank"
              )
            }
          >
            <Twitter className="h-4 w-4 mr-2 text-[#1da1f2]" />
            Twitter
          </Button>
        </div>
      </motion.div>

      {/* Jobs section */}
      {jobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#2563EB]" />
                Jobs You Can Now Apply To
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Roles matching your new {course.skill_category} skills
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/jobs?skill=${encodeURIComponent(course.skill_category)}`}>
                View All Jobs
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => {
              const match = matchPercent(job, course.skill_category);
              const salaryStr = formatSalary(job.salary_min, job.salary_max);
              return (
                <Card key={job.id} className="p-4 flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2">{job.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {job.platform}
                    </Badge>
                    {salaryStr && (
                      <span className="text-xs text-muted-foreground">{salaryStr}</span>
                    )}
                    {match > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs text-[#059669] border-[#059669]/30"
                      >
                        {match}% match
                      </Badge>
                    )}
                  </div>
                  <div className="mt-auto pt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
                      onClick={() =>
                        navigate(`/jobs?skill=${encodeURIComponent(course.skill_category)}`)
                      }
                    >
                      Generate Proposal
                    </Button>
                    {job.external_url && (
                      <Button size="sm" variant="outline" className="text-xs" asChild>
                        <a href={job.external_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
