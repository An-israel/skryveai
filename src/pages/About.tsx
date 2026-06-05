import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe, Heart, Zap, Shield, Users, Sparkles, ArrowRight,
  Menu, X, Twitter, Linkedin, Instagram,
} from "lucide-react";

/* ─── Navbar ──────────────────────────────────────────────── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#09090b]/95 backdrop-blur-md border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
          <span className="font-bold text-[15px] text-white tracking-tight">Skryve</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {[
            { label: "Features", href: "/#features" },
            { label: "Pricing",  href: "/pricing"   },
            { label: "Blog",     href: "/blog"      },
            { label: "About",    href: "/about"     },
          ].map(({ label, href }) => (
            <Link
              key={label}
              to={href}
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-[#09090b] text-[13px] font-semibold hover:bg-white/90 transition-all"
          >
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#09090b]/98 border-t border-white/[0.06] px-5 py-5 flex flex-col gap-4">
          {[
            { label: "Features", href: "/#features" },
            { label: "Pricing",  href: "/pricing"   },
            { label: "Blog",     href: "/blog"      },
            { label: "About",    href: "/about"     },
          ].map(({ label, href }) => (
            <Link
              key={label}
              to={href}
              className="text-[14px] font-medium text-white/60 hover:text-white transition-colors"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.06]">
            <Link
              to="/login"
              className="text-center py-2 rounded-lg border border-white/[0.12] text-[13px] text-white/70"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-center py-2 rounded-lg bg-white text-[#09090b] text-[13px] font-semibold"
              onClick={() => setOpen(false)}
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#09090b] border-t border-white/[0.06] py-12">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
            <span className="font-bold text-[15px] text-white">Skryve</span>
          </Link>

          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-3 text-[13px] text-white/35">
            {[
              { label: "About",          href: "/about"          },
              { label: "Blog",           href: "/blog"           },
              { label: "Pricing",        href: "/pricing"        },
              { label: "Contact",        href: "/contact"        },
              { label: "Privacy Policy", href: "/privacy-policy" },
              { label: "Terms",          href: "/terms"          },
            ].map(({ label, href }) => (
              <Link key={label} to={href} className="hover:text-white transition-colors">{label}</Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {[
              { icon: Twitter,   href: "https://twitter.com",   label: "Twitter"   },
              { icon: Linkedin,  href: "https://linkedin.com",  label: "LinkedIn"  },
              { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-white/25 hover:text-white/60 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-white/25">
          <p>© {new Date().getFullYear()} Skryve. All rights reserved.</p>
          <p>Built for the modern African professional.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Data ────────────────────────────────────────────────── */
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

/* ─── Page ────────────────────────────────────────────────── */
export default function About() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Helmet>
        <title>About SkryveAI — AI-Powered Outreach for Freelancers & Startups</title>
        <meta
          name="description"
          content="Learn how SkryveAI was built to democratize cold outreach. Our AI platform helps freelancers and startups worldwide find clients, send personalized emails, build CVs, and grow their business."
        />
        <meta name="keywords" content="about SkryveAI, AI outreach platform, freelancer tools, startup growth, cold email tool for freelancers, AI business tools" />
        <link rel="canonical" href="https://skryveai.com/about" />
        <meta property="og:title" content="About SkryveAI — AI-Powered Outreach" />
        <meta property="og:description" content="SkryveAI democratizes cold outreach for freelancers and founders worldwide." />
        <meta property="og:url" content="https://skryveai.com/about" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-5 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-4 block">
            Our Story
          </span>
          <h1 className="text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-5">
            Your talent was never<br />the problem
          </h1>
          <p className="text-[16px] text-white/40 leading-relaxed">
            SkryveAI was built to fix the gap between brilliant freelancers and the clients who never heard of them.
          </p>
        </motion.div>
      </section>

      {/* Origin Story */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-[18px] font-semibold text-white mb-6">The Origin</h2>
              <div className="space-y-5 text-[14px] text-white/60 leading-relaxed">
                <p>
                  Somewhere right now, a brilliant freelancer is staring at an inbox full of silence. They sent 50 cold emails this week. Well-crafted, honest, genuine. They spent hours on each one — researching the company, understanding what they do, trying to make it feel real. And still — nothing.
                </p>
                <p>
                  The problem wasn't the skill. It was the system. Cold outreach was never built for the freelancer in Lagos, Accra, Lahore, or Manila. It was built for people who already had the network, the tools, the time, and the team to do the research at scale. Everyone else was left guessing.
                </p>
                <p className="text-white/90 font-semibold text-[15px]">
                  SkryveAI was built to fix that.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Insight */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-[18px] font-semibold text-white mb-6">The Insight</h2>
              <div className="space-y-5 text-[14px] text-white/60 leading-relaxed">
                <p>
                  The freelancers landing clients consistently weren't more talented. They were better at showing up. They sent emails that proved they had done their homework — referencing a real problem the prospect had, showing they understood the business, making it impossible to ignore.
                </p>
                <p>
                  That kind of hyper-personalization used to take hours per prospect. Now it takes seconds. SkryveAI automates the research, the audit, and the pitch — so every freelancer can show up to the conversation already knowing the room.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-3 block">
              Purpose
            </span>
            <h2 className="text-[28px] font-extrabold text-white tracking-[-0.02em]">
              Mission & Vision
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border border-white/[0.06] bg-white/[0.02] rounded-2xl p-8"
            >
              <h3 className="text-[18px] font-semibold text-white mb-4">Our Mission</h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                To make high-converting cold outreach accessible to every skilled freelancer and startup founder — regardless of where they are in the world — by automating the research, audit, and personalization that turns cold emails into real conversations.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="border border-white/[0.06] bg-white/[0.02] rounded-2xl p-8"
            >
              <h3 className="text-[18px] font-semibold text-white mb-4">Our Vision</h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                A world where talent alone is enough. Where a developer in Port Harcourt competes on equal footing with an agency in New York. Where the door to opportunity is open to everyone who has the skill to walk through it.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-3 block">
              Principles
            </span>
            <h2 className="text-[28px] font-extrabold text-white tracking-[-0.02em]">
              Core Values
            </h2>
            <p className="text-[14px] text-white/40 mt-2">What drives every decision we make</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="border border-white/[0.06] bg-white/[0.02] rounded-2xl p-7 hover:border-white/[0.1] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center mb-5">
                  <value.icon className="w-5 h-5 text-[#2563EB]" />
                </div>
                <h3 className="text-[16px] font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-[13px] text-white/50 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Truth */}
      <section className="border-t border-white/[0.06]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto px-5 py-20 text-center"
        >
          <Sparkles className="w-8 h-8 mx-auto mb-5 text-[#2563EB]" />
          <p className="text-[20px] md:text-[24px] font-extrabold text-white tracking-[-0.02em] leading-snug max-w-3xl mx-auto">
            SkryveAI is the great equalizer — giving every freelancer, anywhere in the world, the same unfair advantage that used to belong only to the few with access, connections, and resources.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-[#09090b] text-[14px] font-semibold hover:bg-white/90 transition-all"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/blog"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/[0.12] text-[14px] font-medium text-white/70 hover:text-white hover:border-white/[0.2] transition-all"
            >
              Read our blog
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
