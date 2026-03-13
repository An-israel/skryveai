import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Search, BarChart3, Send, Zap } from "lucide-react";

const stats = [
  { value: "10x", label: "Faster Prospecting" },
  { value: "80%", label: "Time Saved" },
  { value: "3x", label: "More Responses" },
];

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/[0.03] blur-[80px] pointer-events-none" />

      {/* Decorative floating shapes — right side */}
      <div className="hidden lg:block absolute top-32 right-[8%] w-[480px] h-[480px] pointer-events-none">
        {/* Main card shape */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 right-0 w-[300px] rounded-2xl bg-card border border-border-subtle shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">12 Businesses Found</div>
              <div className="text-xs text-muted-foreground">Web Design • Lagos, Nigeria</div>
            </div>
          </div>
          <div className="space-y-2">
            {["Acme Digital Studio", "Nova Creative Co", "Zenith Brands"].map((name, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-xs text-foreground font-medium">{name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Analysis score card */}
        <motion.div
          initial={{ opacity: 0, x: 30, y: 30 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-[200px] right-[180px] w-[200px] rounded-2xl bg-card border border-border-subtle shadow-lg p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-warning" />
            </div>
            <span className="text-xs font-bold text-foreground">Audit Score</span>
          </div>
          <div className="text-3xl font-display font-extrabold text-foreground mb-1">42<span className="text-muted-foreground text-lg">/100</span></div>
          <div className="text-[10px] text-muted-foreground">5 issues found • Weak CTA</div>
        </motion.div>

        {/* Send confirmation pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-[340px] right-[40px] rounded-full bg-gradient-accent text-primary-foreground px-5 py-3 shadow-glow flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span className="text-sm font-bold">3 Emails Sent ✓</span>
        </motion.div>

        {/* Floating icon badges */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[80px] right-[320px] w-12 h-12 rounded-xl bg-primary/8 border border-border-subtle flex items-center justify-center shadow-sm"
        >
          <Zap className="w-5 h-5 text-primary" />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold text-foreground mb-8 leading-[1.05] tracking-tight">
              Find, Audit &{" "}
              <span className="text-gradient-rich">Close Your Ideal Clients</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
              SkryveAI finds businesses that need your services, audits their entire online presence, and sends personalized pitches that actually get replies.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="xl" className="bg-gradient-accent text-primary-foreground font-bold text-base px-8 py-6 rounded-full shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02]" asChild>
                <Link to="/signup">
                  START FOR FREE
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" className="rounded-full border-primary text-primary font-bold text-base px-8 py-6 hover:bg-primary hover:text-primary-foreground transition-all duration-300" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-24 flex justify-start gap-6 md:gap-8"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-5xl font-display font-extrabold text-foreground tracking-tight">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
