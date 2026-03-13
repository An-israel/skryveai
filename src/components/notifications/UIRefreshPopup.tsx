import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { X, Paintbrush, Sparkles, Layout, Zap } from "lucide-react";

const UI_REFRESH_KEY = "skryve_ui_refresh_v1";

export function UIRefreshPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(UI_REFRESH_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(UI_REFRESH_KEY, "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <Card className="border-0 shadow-2xl overflow-hidden">
              {/* Gradient banner */}
              <div className="relative h-28 bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                {/* Floating orbs */}
                <motion.div
                  animate={{ y: [-5, 5, -5], x: [-3, 3, -3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-4 left-8 w-12 h-12 rounded-full bg-white/10 blur-sm"
                />
                <motion.div
                  animate={{ y: [5, -5, 5], x: [3, -3, 3] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-4 right-10 w-16 h-16 rounded-full bg-white/10 blur-sm"
                />
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="relative"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Paintbrush className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  onClick={dismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <CardHeader className="text-center pb-2 pt-5">
                <h3 className="text-xl font-bold text-foreground">Fresh New Look! ✨</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We've redesigned the experience to feel smoother, cleaner, and more you.
                </p>
              </CardHeader>

              <CardContent className="space-y-3 pb-6">
                <div className="space-y-2">
                  {[
                    { icon: Layout, title: "Cleaner layouts", desc: "More breathing room, less clutter" },
                    { icon: Sparkles, title: "Premium feel", desc: "Polished visuals across every page" },
                    { icon: Zap, title: "Smoother interactions", desc: "Faster, more intuitive workflows" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50"
                    >
                      <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button className="w-full mt-2" size="lg" onClick={dismiss}>
                  Let's Go!
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
