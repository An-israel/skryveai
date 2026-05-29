import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Award,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertRecord {
  id: string;
  issued_at: string;
  certificate_url: string | null;
  courses: {
    title: string;
    skill_category: string;
    thumbnail_url: string | null;
  };
  talent_profiles: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CertificateVerify() {
  const { certId } = useParams<{ certId: string }>();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<CertRecord | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void load();
  }, [certId]);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("certificates")
      .select("*, courses(title, skill_category, thumbnail_url), talent_profiles(full_name, profile_photo_url)")
      .eq("id", certId)
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setCert(data as CertRecord);
    }
    setLoading(false);
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Not Found ─────────────────────────────────────────────────────────────

  if (notFound || !cert) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
            <ShieldCheck className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-500 text-sm mb-6">
            We couldn't verify this certificate. The ID may be invalid or the certificate may
            have been revoked.
          </p>
          <a
            href="https://skryve.io"
            className="text-[#2563EB] text-sm font-medium hover:underline"
          >
            Return to Skryve
          </a>
        </div>
      </div>
    );
  }

  const completedDate = new Date(cert.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="https://skryve.io" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-gray-900">Skryve</span>
          </a>
          <a
            href="https://skryve.io"
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            Visit Skryve
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Verified badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#059669]/10 mb-4">
            <CheckCircle className="h-10 w-10 text-[#059669]" />
          </div>
          <Badge className="bg-[#059669]/10 text-[#059669] border-[#059669]/20 px-4 py-1 text-sm mb-3">
            Certificate Verified
          </Badge>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            This certificate is authentic.
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            This certificate was issued by Skryve to verify successful completion of{" "}
            <strong>{cert.courses?.title}</strong>.
          </p>
        </div>

        {/* Certificate details card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0">
              <Award className="h-6 w-6 text-[#2563EB]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{cert.courses?.title}</h2>
              {cert.courses?.skill_category && (
                <span className="text-sm text-gray-500">{cert.courses.skill_category}</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm text-gray-500 font-medium">Recipient</span>
              <span className="text-sm font-semibold text-gray-900">
                {cert.talent_profiles?.full_name || "Skryve Learner"}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm text-gray-500 font-medium">Completion Date</span>
              <span className="text-sm font-semibold text-gray-900">{completedDate}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm text-gray-500 font-medium">Issued by</span>
              <span className="text-sm font-semibold text-gray-900">Skryve</span>
            </div>
            <div className="flex items-start justify-between py-3">
              <span className="text-sm text-gray-500 font-medium">Certificate ID</span>
              <span className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded break-all max-w-[60%] text-right">
                {cert.id}
              </span>
            </div>
          </div>
        </div>

        {/* Verification seal */}
        <div className="bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl p-4 flex items-center gap-3 mb-8">
          <ShieldCheck className="h-8 w-8 text-[#2563EB] flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#1E3A5F]">Verified by Skryve</p>
            <p className="text-xs text-gray-500">
              This certificate's authenticity can be confirmed at skryve.io. Certificate ID:{" "}
              <span className="font-mono">{cert.id}</span>
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href="https://skryve.io/learn">
            <Button className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              Explore Courses on Skryve
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </a>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        © {new Date().getFullYear()} Skryve. All rights reserved.
      </footer>
    </div>
  );
}
