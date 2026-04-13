import { motion } from "framer-motion";
import { Search, BarChart3, FileText, Send, Target, Linkedin, Zap, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Search,
    title: "Smart Business Discovery",
    description: "Find potential clients by business type and location. Our AI identifies businesses that need your services and gives you verified contact details.",
    badge: null,
  },
  {
    icon: BarChart3,
    title: "Full Online Presence Audit",
    description: "Automatically scan websites, LinkedIn, Instagram, and Facebook for pain points costing them money — so your pitch hits where it hurts.",
    badge: null,
  },
  {
    icon: FileText,
    title: "Personalized Cold Pitches",
    description: "Generate cold emails that reference specific problems — their website copy, social media, branding, and more. Replies go up, rejections go down.",
    badge: null,
  },
  {
    icon: Send,
    title: "Automated Email Campaigns",
    description: "Send personalized emails at scale with smart scheduling and warmup to maximize inbox placement and open rates.",
    badge: null,
  },
  {
    icon: Bot,
    title: "AutoPilot Outreach",
    description: "Set your target, daily quota, and tone — then let SkryveAI find leads and send personalized emails 24/7 without lifting a finger.",
    badge: "NEW",
  },
  {
    icon: FileText,
    title: "AI CV Builder",
    description: "Upload your existing CV and let AI rewrite it into a polished, ATS-optimized resume with a tailored LinkedIn profile guide included.",
    badge: null,
  },
  {
    icon: Target,
    title: "ATS Score Checker",
    description: "Instantly score your CV against any job description. See your grade, keyword gaps, and exactly what to fix to pass the ATS filter.",
    badge: null,
  },
  {
    icon: Linkedin,
    title: "LinkedIn Profile Analyzer",
    description: "Upload your LinkedIn PDF and get a full profile score with section-by-section feedback, quick wins, and headline/about rewrite suggestions.",
    badge: null,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gradient-subtle section-divider">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Platform</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">AI Tools for Cold Outreach, CV Building & LinkedIn Optimization</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From finding your next client to building an ATS-optimized resume and analyzing your LinkedIn profile — SkryveAI gives freelancers and startups every AI tool they need to grow faster.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="group p-7 rounded-2xl bg-card border border-border-subtle card-hover relative"
            >
              {feature.badge && (
                <Badge className="absolute top-4 right-4 text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                  {feature.badge}
                </Badge>
              )}
              <div className="w-12 h-12 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
