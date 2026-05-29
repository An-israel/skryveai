import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Loader2,
  Share2,
  Linkedin,
  Twitter,
  Copy,
  UserPlus,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertificateData {
  id: string;
  course_id: string;
  talent_id: string;
  issued_at: string;
  certificate_url: string | null;
  shared_to_profile: boolean;
}

interface CourseData {
  id: string;
  title: string;
  skill_category: string;
  duration_hours: number;
}

// ─── Certificate Canvas Generation ───────────────────────────────────────────

function drawCertificate(
  canvas: HTMLCanvasElement,
  studentName: string,
  courseTitle: string,
  issuedAt: string,
  certId: string
) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = 1200;
  canvas.height = 850;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1200, 850);

  // Border (double line)
  ctx.strokeStyle = "#1E3A5F";
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 1160, 810);
  ctx.strokeStyle = "#2563EB";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 1140, 790);

  // Top accent bar
  ctx.fillStyle = "#1E3A5F";
  ctx.fillRect(20, 20, 1160, 6);

  // Header: "CERTIFICATE OF COMPLETION"
  ctx.font = "bold 48px Georgia, serif";
  ctx.fillStyle = "#1E3A5F";
  ctx.textAlign = "center";
  ctx.fillText("CERTIFICATE OF COMPLETION", 600, 120);

  // Decorative line under header
  ctx.strokeStyle = "#2563EB";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, 140);
  ctx.lineTo(1000, 140);
  ctx.stroke();

  // "This certifies that"
  ctx.font = "24px Georgia, serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("This certifies that", 600, 200);

  // Student name
  ctx.font = "bold 56px Georgia, serif";
  ctx.fillStyle = "#1E3A5F";
  ctx.fillText(studentName, 600, 280);

  // Underline under name
  const nameWidth = ctx.measureText(studentName).width;
  ctx.strokeStyle = "#2563EB";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(600 - nameWidth / 2, 295);
  ctx.lineTo(600 + nameWidth / 2, 295);
  ctx.stroke();

  // "has successfully completed"
  ctx.font = "26px Georgia, serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("has successfully completed", 600, 350);

  // Course name (with word wrap)
  ctx.font = "bold 38px Georgia, serif";
  ctx.fillStyle = "#2563EB";
  const courseWords = courseTitle.split(" ");
  let line = "";
  let y = 410;
  for (const word of courseWords) {
    const test = line + (line ? " " : "") + word;
    if (ctx.measureText(test).width > 900) {
      ctx.fillText(line, 600, y);
      line = word;
      y += 50;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, 600, y);

  // Date + cert ID
  ctx.font = "20px Georgia, serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(
    `Completed on ${new Date(issuedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    600,
    y + 70
  );
  ctx.font = "14px monospace";
  ctx.fillText(`Certificate ID: ${certId}`, 600, y + 100);

  // Signature line
  ctx.strokeStyle = "#1E3A5F";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(350, 720);
  ctx.lineTo(600, 720);
  ctx.stroke();
  ctx.font = "bold 18px Georgia, serif";
  ctx.fillStyle = "#1E3A5F";
  ctx.textAlign = "center";
  ctx.fillText("Aniekan Israel", 475, 745);
  ctx.font = "16px Georgia, serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("Founder, Skryve", 475, 765);

  // Skryve branding (bottom right)
  ctx.font = "bold 24px Georgia, serif";
  ctx.fillStyle = "#1E3A5F";
  ctx.textAlign = "right";
  ctx.fillText("Skryve", 1150, 800);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("skryve.io", 1150, 820);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [studentName, setStudentName] = useState("Learner");
  const [existingCerts, setExistingCerts] = useState<any[]>([]);
  const [addedToProfile, setAddedToProfile] = useState(false);
  const [certUrl, setCertUrl] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [courseId]);

  async function init() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const [{ data: profile }, { data: courseData }] = await Promise.all([
      (supabase as any)
        .from("talent_profiles")
        .select("id, full_name, certifications")
        .eq("user_id", user.id)
        .single(),
      (supabase as any).from("courses").select("*").eq("id", courseId).single(),
    ]);

    if (!courseData) {
      navigate("/learn");
      return;
    }

    setCourse(courseData as CourseData);
    if (profile?.full_name) setStudentName(profile.full_name);
    setExistingCerts(Array.isArray(profile?.certifications) ? profile.certifications : []);

    // Fetch certificate
    const { data: certData } = await (supabase as any)
      .from("certificates")
      .select("*")
      .eq("course_id", courseId)
      .eq("talent_id", profile?.id)
      .single();

    if (!certData) {
      // Create certificate
      const { data: newCert } = await (supabase as any)
        .from("certificates")
        .upsert({
          course_id: courseId,
          talent_id: profile?.id,
          issued_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      setCert(newCert as CertificateData);
      setLoading(false);
      return;
    }

    setCert(certData as CertificateData);
    if (certData.certificate_url) setCertUrl(certData.certificate_url);

    setLoading(false);
  }

  // Draw certificate on canvas once data is loaded
  useEffect(() => {
    if (!loading && cert && course && canvasRef.current) {
      drawCertificate(canvasRef.current, studentName, course.title, cert.issued_at, cert.id);
      // Upload if no URL yet
      if (!cert.certificate_url) {
        void uploadCertificate(canvasRef.current, cert.id);
      }
    }
  }, [loading, cert, course, studentName]);

  const uploadCertificate = useCallback(
    async (canvas: HTMLCanvasElement, certId: string) => {
      try {
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob(resolve as any, "image/png")
        );
        const path = `certificates/${certId}.png`;
        await supabase.storage.from("portfolio").upload(path, blob, { upsert: true });
        const {
          data: { publicUrl },
        } = supabase.storage.from("portfolio").getPublicUrl(path);
        await (supabase as any)
          .from("certificates")
          .update({ certificate_url: publicUrl })
          .eq("id", certId);
        setCertUrl(publicUrl);
      } catch {
        // Storage upload is best-effort — canvas still works locally
      }
    },
    []
  );

  function downloadPNG() {
    if (!canvasRef.current || !course) return;
    const link = document.createElement("a");
    link.download = `skryve-certificate-${courseId}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function downloadPDF() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const win = window.open("");
    if (!win) return;
    win.document.write(
      `<html><body style="margin:0"><img src="${dataUrl}" style="width:100%" onload="window.print();window.close()"/></body></html>`
    );
    win.document.close();
  }

  async function addToProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !cert || !course) return;

    const newEntry = {
      name: course.title,
      issuer: "Skryve",
      date: cert.issued_at,
      url: `/certificates/${cert.id}`,
    };

    await (supabase as any)
      .from("talent_profiles")
      .update({
        certifications: [...existingCerts, newEntry],
      })
      .eq("user_id", user.id);

    setAddedToProfile(true);
    toast({ title: "Added to your profile!" });
  }

  function copyLink() {
    const link = `${window.location.origin}/certificates/${cert?.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied!" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cert || !course) return null;

  const shareUrl = `${window.location.origin}/certificates/${cert.id}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/learn/${courseId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Course
          </Link>
        </Button>
      </div>

      {/* Title area */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Completed on{" "}
          {new Date(cert.issued_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {cert.id}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyLink}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Canvas certificate preview */}
      <Card className="mb-6 overflow-hidden p-0">
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ maxWidth: "100%" }}
        />
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={downloadPDF} className="bg-[#1E3A5F] hover:bg-[#163050] text-white">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button variant="outline" onClick={downloadPNG}>
          <Download className="h-4 w-4 mr-2" />
          Download PNG
        </Button>
        <Button
          variant="outline"
          onClick={addToProfile}
          disabled={addedToProfile}
          className={addedToProfile ? "text-[#059669] border-[#059669]/30" : ""}
        >
          {addedToProfile ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-[#059669]" />
              Added to Profile
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Add to Profile
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(
                `I just completed ${course.title} on Skryve! 🎓`
              )}`,
              "_blank"
            )
          }
        >
          <Linkedin className="h-4 w-4 mr-2 text-[#0077b5]" />
          Share on LinkedIn
        </Button>
        <Button variant="outline" onClick={copyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </Button>
      </div>
    </div>
  );
}
