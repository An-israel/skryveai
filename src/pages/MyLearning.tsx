import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <div className="relative border-8 border-double border-[#2563EB]/30 rounded-xl p-10 text-center bg-gradient-to-br from-background to-muted/30">
          {/* Decorative corners */}
          <div className="absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-[#2563EB]/50 rounded-tl" />
          <div className="absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-[#2563EB]/50 rounded-tr" />
          <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-[#2563EB]/50 rounded-bl" />
          <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-[#2563EB]/50 rounded-br" />

          <Trophy className="h-12 w-12 text-[#2563EB] mx-auto mb-4" />
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">
            Certificate of Completion
          </p>
          <p className="text-lg text-muted-foreground mb-4">
            This certifies successful completion of
          </p>
          <h2 className="text-2xl font-bold mb-2">{cert.courses.title}</h2>
          {cert.courses.skill_category && (
            <Badge variant="secondary" className="mb-4">
              {cert.courses.skill_category}
            </Badge>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Issued on {new Date(cert.issued_at).toLocaleDateString("en-NG", {
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
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Certificate
            </Button>
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyLearning() {
  const navigate = useNavigate();
  const { toast } = useToast();

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
    const { data: { user } } = await supabase.auth.getUser();
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
        .select("id, course_id, progress_percent, completed_at, created_at, courses(*)")
        .eq("talent_id", profile.id)
        .eq("payment_status", "paid")
        .lt("progress_percent", 100)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("enrollments")
        .select("id, course_id, progress_percent, completed_at, created_at, courses(*)")
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
    // Navigate to first incomplete lesson
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

    const completedIds = new Set((progress || []).map((p: any) => p.lesson_id));
    const firstIncomplete = (lessons || []).find((l: any) => !completedIds.has(l.id));

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
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/learn">
            <ArrowLeft className="h-4 w-4 mr-1" /> Browse Courses
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My Learning</h1>
          <p className="text-sm text-muted-foreground">
            Track your progress and download certificates
          </p>
        </div>
      </div>

      <Tabs defaultValue="in-progress">
        <TabsList className="mb-6">
          <TabsTrigger value="in-progress" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            In Progress
            {inProgress.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {inProgress.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />
            Completed
            {completed.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completed.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="certificates" className="gap-1.5">
            <Award className="h-4 w-4" />
            Certificates
            {certificates.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {certificates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── In Progress ── */}
        <TabsContent value="in-progress">
          {inProgress.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>You haven't started any courses yet.</p>
              <Button asChild className="mt-4">
                <Link to="/learn">Browse Courses</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgress.map((enr) => {
                const c = enr.courses;
                return (
                  <Card key={enr.id} className="overflow-hidden flex flex-col">
                    <div className="relative h-40 flex-shrink-0">
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
                          <GraduationCap className="h-10 w-10 text-white/50" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <Progress
                          value={enr.progress_percent}
                          className="h-1.5"
                        />
                        <p className="text-xs text-white/80 mt-1">
                          {enr.progress_percent}% complete
                        </p>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      {c.skill_category && (
                        <Badge variant="secondary" className="w-fit text-xs mb-1.5">
                          {c.skill_category}
                        </Badge>
                      )}
                      <h3 className="font-semibold line-clamp-2 flex-1">{c.title}</h3>
                      {c.instructor_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {c.instructor_name}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Enrolled {formatDistanceToNow(new Date(enr.created_at), { addSuffix: true })}
                        </span>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => void continueEnrollment(enr)}
                        >
                          Continue <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Completed ── */}
        <TabsContent value="completed">
          {completed.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No completed courses yet. Keep learning!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completed.map((enr) => {
                const c = enr.courses;
                return (
                  <Card key={enr.id} className="overflow-hidden flex flex-col">
                    <div className="relative h-40 flex-shrink-0">
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
                          <GraduationCap className="h-10 w-10 text-white/50" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-[#059669] text-white border-0">
                        Completed
                      </Badge>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      {c.skill_category && (
                        <Badge variant="secondary" className="w-fit text-xs mb-1.5">
                          {c.skill_category}
                        </Badge>
                      )}
                      <h3 className="font-semibold line-clamp-2 flex-1">{c.title}</h3>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">
                          {enr.completed_at
                            ? `Completed ${formatDistanceToNow(new Date(enr.completed_at), { addSuffix: true })}`
                            : "Completed"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/learn/${enr.course_id}`)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Certificates ── */}
        <TabsContent value="certificates">
          {certificates.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No certificates yet. Complete a course to earn one!</p>
              <Button asChild className="mt-4">
                <Link to="/learn">Browse Courses</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert) => {
                const c = cert.courses;
                return (
                  <Card
                    key={cert.id}
                    className="p-6 text-center cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed border-[#2563EB]/20 hover:border-[#2563EB]/50"
                    onClick={() => {
                      setSelectedCert(cert);
                      setCertModalOpen(true);
                    }}
                  >
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br ${getGradient(c.skill_category)} flex items-center justify-center mx-auto mb-4`}
                    >
                      <Trophy className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {c.title}
                    </h3>
                    {c.skill_category && (
                      <Badge variant="secondary" className="text-xs mb-2">
                        {c.skill_category}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Issued {new Date(cert.issued_at).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCert(cert);
                        setCertModalOpen(true);
                      }}
                    >
                      <Award className="h-3.5 w-3.5" />
                      View Certificate
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CertificateModal
        cert={selectedCert}
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
      />
    </div>
  );
}
