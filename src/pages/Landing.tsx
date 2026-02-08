import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { 
  Search, 
  BarChart3, 
  FileText, 
  Send, 
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Linkedin,
  Instagram,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Smart Business Discovery",
    description: "Find potential clients by business type and location. Our AI identifies businesses that need your services.",
  },
  {
    icon: BarChart3,
    title: "Full Online Presence Audit",
    description: "Automatically scan websites, LinkedIn, Instagram, and Facebook for pain points costing them money.",
  },
  {
    icon: FileText,
    title: "Personalized Pitches",
    description: "Generate cold emails that reference specific problems — their website copy, social media, branding, and more.",
  },
  {
    icon: Send,
    title: "Automated Outreach",
    description: "Send personalized emails at scale with smart scheduling and warmup to maximize inbox placement.",
  },
];

const campaignTypes = [
  {
    icon: Search,
    title: "Find Clients",
    subtitle: "For Freelancers",
    description: "Search businesses by industry and location, audit their online presence, and send personalized pitches.",
  },
  {
    icon: UserPlus,
    title: "Pitch a Client",
    subtitle: "Direct Outreach",
    description: "Already have a client in mind? Enter their details, we analyze everything and craft the perfect email.",
  },
  {
    icon: TrendingUp,
    title: "Find Investors",
    subtitle: "Raise Funding",
    description: "Find investors in your industry, build compelling pitch emails, and reach out to raise capital for your startup.",
  },
];

const stats = [
  { value: "10x", label: "Faster Prospecting" },
  { value: "80%", label: "Time Saved" },
  { value: "3x", label: "More Responses" },
];

const steps = [
  { step: "1", title: "Choose", description: "Pick your campaign type" },
  { step: "2", title: "Search", description: "Find your targets" },
  { step: "3", title: "Analyze", description: "AI audits their presence" },
  { step: "4", title: "Pitch", description: "Review personalized emails" },
  { step: "5", title: "Send", description: "Launch your campaign" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
              <span className="text-sm text-primary-foreground/90">AI-Powered Cold Outreach & Investor Outreach</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Find Clients, Investors & Send{" "}
              <span className="text-gradient">Perfect Pitches</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              SkryveAI helps freelancers find clients, analyze their entire online presence, and send pitches that get replies. Startups can find and pitch investors too.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 flex justify-center gap-12"
          >
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-sm text-primary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Campaign Types */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Three Ways to Grow</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you're a freelancer looking for clients or a startup seeking investors — we've got you covered.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {campaignTypes.map((type, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <type.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{type.title}</h3>
                <p className="text-xs text-primary font-medium mb-2">{type.subtitle}</p>
                <p className="text-muted-foreground text-sm">{type.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From search to send in 5 simple steps. Our AI handles the heavy lifting.
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4 lg:gap-0 lg:flex-nowrap">
            {steps.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center"
              >
                <div className="flex flex-col items-center text-center px-4 lg:px-8">
                  <div className="w-12 h-12 rounded-full bg-gradient-accent text-primary-foreground flex items-center justify-center text-xl font-bold mb-3 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground max-w-[120px]">{item.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block w-6 h-6 text-muted-foreground/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Analyze */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Beyond Website Analysis</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We audit their entire online presence — not just their website — to find pain points that make them reply.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: BarChart3, title: "Website Copy", desc: "Is their copy compelling? Does it convert visitors to leads?" },
              { icon: Linkedin, title: "LinkedIn", desc: "Is their profile optimized? Posting strategy? Bio compelling?" },
              { icon: Instagram, title: "Instagram", desc: "Design quality, posting frequency, bio optimization, engagement" },
              { icon: Target, title: "Branding", desc: "Visual consistency across all platforms and touchpoints" },
              { icon: FileText, title: "Calls to Action", desc: "Can visitors easily book, buy, or contact them?" },
              { icon: Sparkles, title: "Design Quality", desc: "Compare their graphics to professional standards" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-card border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-0.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful features for freelancers and startups looking to grow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl bg-card border hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <Target className="w-12 h-12 mx-auto mb-6 text-primary-foreground/80" />
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Land More Clients?
            </h2>
            <p className="text-primary-foreground/80 mb-8">
              Join freelancers and startups using AI to find clients, pitch investors, and grow their business.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-primary-foreground/60">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                No credit card required
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                3-day free trial
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
