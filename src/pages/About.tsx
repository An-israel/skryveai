import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Globe, Sparkles, Zap, Heart, Users, Shield } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const values = [
  {
    icon: Globe,
    title: "Democratization",
    description: "Great tools shouldn't belong only to those with existing privilege. We build for the underdog.",
  },
  {
    icon: Heart,
    title: "Authenticity",
    description: "We don't automate spam. We automate genuine understanding. Every pitch must feel real — because it is.",
  },
  {
    icon: Zap,
    title: "Speed with Depth",
    description: "Land opportunities faster without sacrificing quality. Deep, tailored applications — delivered in minutes, not hours.",
  },
  {
    icon: Shield,
    title: "Builder Culture",
    description: "We are built by someone who lived the problem. That honesty runs through everything we make.",
  },
  {
    icon: Users,
    title: "Global by Default",
    description: "Our default user is not in Silicon Valley. We think global from day one.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen">
      <SEOHead
        title="About Skryve — The AI-Powered Career Platform for Talent"
        description="Learn how Skryve was built to level the playing field for talent everywhere. Find jobs, build ATS-ready CVs, write winning proposals, learn in-demand skills, and get hired — all in one platform."
        canonical="https://skryveai.com/about"
        keywords="about Skryve, AI career platform, freelancer tools, find jobs, CV builder, ATS checker, talent marketplace, learn skills"
      />
      <Header />

      <section className="relative pt-32 pb-20 bg-gradient-subtle overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              About <span className="text-gradient-rich">SkryveAI</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Your talent was never the problem. Now the system that hires it works for you too.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-lg text-muted-foreground"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">The Origin</h2>
            <p>
              Somewhere right now, a brilliant professional is staring at an inbox full of silence. They applied to 50 jobs this week. Well-crafted applications, honest, genuine. They spent hours on each one — tailoring the CV, writing the proposal, trying to stand out. And still — nothing.
            </p>
            <p>
              The problem wasn't the skill. It was the system. The job market was never built for the talent in Lagos, Accra, Lahore, or Manila. It was built for people who already had the network, the tools, the mentors, and the polished CV to get past the gatekeepers. Everyone else was left guessing.
            </p>
            <p className="text-foreground font-semibold text-xl">
              Skryve was built to fix that.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Insight */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-lg text-muted-foreground"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">The Insight</h2>
            <p>
              The people landing roles and clients consistently weren't more talented. They were better at showing up. Their CV matched the job description. Their proposal spoke to the client's actual problem. Their skills stayed sharp because they never stopped learning.
            </p>
            <p>
              That kind of preparation used to take hours per application — or a career coach most people can't afford. Now it takes minutes. Skryve puts the whole toolkit in one place: jobs matched to your skills, a CV builder that beats ATS filters, AI-written proposals, courses with a personal AI coach, and a marketplace where clients hire you directly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-card border border-border-subtle card-hover"
            >
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To give every skilled professional — regardless of where they are in the world — the tools to find real opportunities, present themselves at their best, keep growing, and get paid for their talent.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl bg-card border border-border-subtle card-hover"
            >
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                A world where talent alone is enough. Where a developer in Port Harcourt competes on equal footing with an agency in New York. Where the door to opportunity is open to everyone who has the skill to walk through it.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 tracking-tight">Our Core Values</h2>
            <p className="text-muted-foreground">What drives every decision we make</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-7 rounded-2xl bg-card border border-border-subtle card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-5">
                  <value.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Truth */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Sparkles className="w-10 h-10 mx-auto mb-4 text-primary" />
            <p className="text-xl md:text-2xl font-display font-bold text-foreground leading-relaxed">
              Skryve is the great equalizer — giving every talent, anywhere in the world, the same unfair advantage that used to belong only to the few with access, connections, and resources.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
