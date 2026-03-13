import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, X, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FEATURE_UPDATE_KEY = "skryve_feature_update_job_applications_v1";

export function FeatureUpdatePopup() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem(FEATURE_UPDATE_KEY);
    if (!dismissed) {
      // Show after a small delay so the page loads first
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(FEATURE_UPDATE_KEY, "true");
    setShow(false);
  };

  const tryIt = () => {
    dismiss();
    navigate("/campaigns/new");
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
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">New: Apply for Jobs in Bulk!</CardTitle>
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">Free for all users</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Search jobs across <strong>LinkedIn, Indeed, Glassdoor</strong> and more. 
                  Our AI will tailor your CV and write personalized cover letters for each job — 
                  <strong> apply to up to 50 jobs at once!</strong>
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Search 7+ job platforms (last 24 hours)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    AI scrapes employer emails automatically
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    CV tailored per job + cover letters generated
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Send all applications at once — save hours
                  </li>
                </ul>
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={tryIt}>
                    Try It Now
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
