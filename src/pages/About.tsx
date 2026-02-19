import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Globe, Sparkles, Zap, Heart, Users, Shield } from "lucide-react";

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
    description: "Fast outreach without sacrifice in quality. Deep research, delivered instantly.",
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
      <Header />

      <section className="relative pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              About <span className="text-gradient">SkryveAI</span>
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto font-medium">
              Your talent was never the problem. Now your pitch won't be either.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-lg text-muted-foreground"
          >
            <h2 className="text-2xl font-bold text-foreground">The Origin</h2>
            <p>
              Somewhere right now, a brilliant freelancer is staring at an inbox full of silence. They sent 50 cold emails this week. Well-crafted, honest, genuine. They spent hours on each one — researching the company, understanding what they do, trying to make it feel real. And still — nothing.
            </p>
            <p>
              The problem wasn't the skill. It was the system. Cold outreach was never built for the freelancer in Lagos, Accra, Lahore, or Manila. It was built for people who already had the network, the tools, the time, and the team to do the research at scale. Everyone else was left guessing.
            </p>
            <p className="text-foreground font-semibold text-xl">
              SkryveAI was built to fix that.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Insight */}
      <section className="py-16 bg-gradient-subtle">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-lg text-muted-foreground"
          >
            <h2 className="text-2xl font-bold text-foreground">The Insight</h2>
            <p>
              The freelancers landing clients consistently weren't more talented. They were better at showing up. They sent emails that proved they had done their homework — referencing a real problem the prospect had, showing they understood the business, making it impossible to ignore.
            </p>
            <p>
              That kind of hyper-personalization used to take hours per prospect. Now it takes seconds. SkryveAI automates the research, the audit, and the pitch — so every freelancer can show up to the conversation already knowing the room.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-card border"
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground">
                To make high-converting cold outreach accessible to every skilled freelancer and startup founder — regardless of where they are in the world — by automating the research, audit, and personalization that turns cold emails into real conversations.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-card border"
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Vision</h2>
              <p className="text-muted-foreground">
                A world where talent alone is enough. Where a developer in Port Harcourt competes on equal footing with an agency in New York. Where the door to opportunity is open to everyone who has the skill to walk through it.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-gradient-subtle">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2">Our Core Values</h2>
            <p className="text-muted-foreground">What drives every decision we make</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Truth */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Sparkles className="w-10 h-10 mx-auto mb-4 text-primary" />
            <p className="text-xl md:text-2xl font-semibold text-foreground leading-relaxed">
              SkryveAI is the great equalizer — giving every freelancer, anywhere in the world, the same unfair advantage that used to belong only to the few with access, connections, and resources.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
