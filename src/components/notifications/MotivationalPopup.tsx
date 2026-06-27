import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Rocket, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/hooks/use-toast";

const motivationalMessages = [
  {
    icon: Rocket,
    title: "Fresh Jobs Just Dropped 🚀",
    message: "New roles from across the web land on Skryve every day. Browse today's matches and apply in minutes.",
    cta: "Browse Jobs",
    ctaLink: "/jobs",
  },
  {
    icon: Target,
    title: "Stand Out to Clients 🎯",
    message: "A complete profile gets noticed first. Add your skills, portfolio and rate so clients can find and hire you.",
    cta: "Complete Profile",
    ctaLink: "/profile",
  },
  {
    icon: Zap,
    title: "Level Up Your Skills ⚡",
    message: "Finish a course, earn a certificate, and become more hireable. A few minutes today pays off.",
    cta: "Start Learning",
    ctaLink: "/learn",
  },
];

export function MotivationalPopup() {
  const [show, setShow] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [message, setMessage] = useState(motivationalMessages[0]);
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const { toast } = useToast();

  useEffect(() => {
    const lastShown = localStorage.getItem("skryve_motivational_last");
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000;

    // Show every 4 hours
    if (!lastShown || now - parseInt(lastShown) > fourHours) {
      const randomMsg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      setMessage(randomMsg);

      const timer = setTimeout(() => {
        setShow(true);
        localStorage.setItem("skryve_motivational_last", now.toString());
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Check if we should prompt for push notifications
    if ("Notification" in window && permission === "default" && !isSubscribed) {
      const pushPromptShown = localStorage.getItem("skryve_push_prompt_shown");
      if (!pushPromptShown) {
        const timer = setTimeout(() => {
          setShowPushPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [permission, isSubscribed]);

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast({ title: "Notifications enabled! 🔔", description: "We'll let you know about new job matches, messages, and offers." });
    } else {
      toast({ title: "Couldn't enable notifications", description: "Please allow notifications in your browser settings.", variant: "destructive" });
    }
    setShowPushPrompt(false);
    localStorage.setItem("skryve_push_prompt_shown", "true");
  };

  const IconComponent = message.icon;

  return (
    <>
      {/* Motivational popup */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm"
          >
            <Card className="p-5 shadow-lg border-primary/20 bg-card">
              <button
                onClick={() => setShow(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-sm mb-1">{message.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{message.message}</p>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setShow(false);
                      window.location.href = message.ctaLink;
                    }}
                  >
                    {message.cta}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Push notification permission prompt */}
      <AnimatePresence>
        {showPushPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-6 z-50 max-w-sm"
          >
            <Card className="p-5 shadow-lg border-primary/20 bg-card">
              <button
                onClick={() => {
                  setShowPushPrompt(false);
                  localStorage.setItem("skryve_push_prompt_shown", "true");
                }}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-info" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-sm mb-1">Stay in the loop 🔔</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Get notified about new job matches, messages, and offers so you never miss an opportunity.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleEnablePush}
                      disabled={isLoading}
                    >
                      {isLoading ? "Enabling..." : "Enable Notifications"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => {
                        setShowPushPrompt(false);
                        localStorage.setItem("skryve_push_prompt_shown", "true");
                      }}
                    >
                      Not now
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
