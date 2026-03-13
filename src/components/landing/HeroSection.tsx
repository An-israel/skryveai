import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Search, BarChart3, Send, Zap, TrendingUp, CheckCircle2 } from "lucide-react";

const stats = [
  { value: "10x", label: "Faster Prospecting" },
  { value: "80%", label: "Time Saved" },
  { value: "3x", label: "More Responses" },
];

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 overflow-hidden">
      {/* ─── Rich Gradient Background Wash (Instantly-style) ─── */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Purple-pink gradient orb — right side */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-hero-orb)' }} 
      />
      
      {/* Blue gradient orb — bottom left */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-hero-orb-blue)' }} 
      />

      {/* Subtle grain texture */}
      <div className="absolute inset-0 grain pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-[1fr_480px] gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="font-display text-5xl md:text-7xl lg:text-[5.2rem] font-extrabold text-foreground mb-8 leading-[1.05] tracking-tight">
              Find, Contact &{" "}
              <span className="text-gradient-rich">Close Your Ideal Clients</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
              SkryveAI finds businesses that need your services, audits their entire online presence, and sends personalized pitches that actually get replies.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button size="xl" className="bg-gradient-accent text-primary-foreground font-bold text-base px-8 py-6 rounded-full shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" asChild>
                <Link to="/signup">
                  START FOR FREE
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" className="rounded-full border-border text-foreground font-semibold text-base px-8 py-6 hover:bg-muted/50 transition-all duration-300" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>

            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                3-day free trial
              </span>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-16 flex gap-10"
            >
              {stats.map((stat, i) => (
                <div key={i} className="text-left">
                  <div className="text-3xl md:text-4xl font-display font-extrabold text-foreground tracking-tight">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-0.5 font-medium">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Floating UI Cards */}
          <div className="hidden lg:block relative h-[520px]">
            {/* Main "Emails Sent" chart card */}
            <motion.div
              initial={{ opacity: 0, y: 30, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-0 right-0 w-[300px] rounded-2xl bg-card border border-border-subtle p-6 shadow-lg"
            >
              <div className="text-sm font-bold text-foreground mb-4">Emails Sent</div>
              {/* Mini chart visualization */}
              <div className="flex items-end gap-1 h-[100px] mb-3">
                {[15, 22, 18, 35, 42, 55, 48, 62, 75, 82, 90, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.6 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                    className="flex-1 rounded-sm bg-gradient-to-t from-primary/60 to-primary/20"
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>JAN</span><span>MAR</span><span>JUN</span><span>SEP</span><span>DEC</span>
              </div>
            </motion.div>

            {/* Audit Score Card */}
            <motion.div
              initial={{ opacity: 0, x: -20, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-[160px] left-0 w-[220px] rounded-2xl bg-card border border-border-subtle p-5 shadow-lg animate-float-delayed"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-warning" />
                </div>
                <span className="text-xs font-bold text-foreground">Audit Score</span>
              </div>
              <div className="text-4xl font-display font-extrabold text-foreground mb-1">
                42<span className="text-lg text-muted-foreground font-semibold">/100</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[42%] bg-gradient-to-r from-warning to-destructive rounded-full" />
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">5 issues • Weak CTAs, no social proof</div>
            </motion.div>

            {/* Business Discovery Card */}
            <motion.div
              initial={{ opacity: 0, y: 30, x: 10 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-[300px] right-[20px] w-[260px] rounded-2xl bg-card border border-border-subtle p-5 shadow-lg"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">12 Businesses Found</div>
                  <div className="text-[10px] text-muted-foreground">Web Design • Lagos</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {["Acme Digital Studio", "Nova Creative Co", "Zenith Brands"].map((name, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-xs text-foreground font-medium">{name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Verified</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Floating "Sent" confirmation pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-[480px] left-[40px] rounded-full bg-gradient-accent text-primary-foreground px-5 py-2.5 shadow-glow flex items-center gap-2 animate-float"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">3 Personalized Emails Sent ✓</span>
            </motion.div>

            {/* Floating icon — lightning */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[120px] left-[60px] w-11 h-11 rounded-xl bg-primary/6 border border-border-subtle flex items-center justify-center shadow-sm"
            >
              <Zap className="w-5 h-5 text-primary" />
            </motion.div>

            {/* Floating icon — growth */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute top-[60px] left-[180px] w-10 h-10 rounded-xl bg-success/8 border border-border-subtle flex items-center justify-center shadow-sm"
            >
              <TrendingUp className="w-4 h-4 text-success" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
