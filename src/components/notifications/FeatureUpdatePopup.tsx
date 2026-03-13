import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Sparkles, ArrowRight, FileText, Target, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FEATURE_UPDATE_KEY = "skryve_feature_update_career_tools_v2";

export function FeatureUpdatePopup() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem(FEATURE_UPDATE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(FEATURE_UPDATE_KEY, "true");
    setShow(false);
  };

  const goTo = (path: string) => {
    dismiss();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="border-2 border-primary/30 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/80 p-1" />
              <CardHeader className="relative pb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={dismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">New: Career Tools Suite!</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">Free for all users</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We've launched <strong>3 powerful career tools</strong> to help you land your dream job faster:
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => goTo("/cv-builder")}
                    className="w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">CV / Resume Builder</p>
                      <p className="text-xs text-muted-foreground">Build or optimize your CV with AI. Download as PDF or DOCX. Includes LinkedIn guide.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => goTo("/ats-checker")}
                    className="w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">ATS Score Checker</p>
                      <p className="text-xs text-muted-foreground">Instant 8-category ATS compatibility score with actionable improvements.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => goTo("/cv-builder")}
                    className="w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">LinkedIn Optimization Guide</p>
                      <p className="text-xs text-muted-foreground">Personalized 11-section guide with copy-paste content for your LinkedIn profile.</p>
                    </div>
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={() => goTo("/cv-builder")}>
                    Try CV Builder
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button variant="outline" onClick={dismiss}>
                    Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
