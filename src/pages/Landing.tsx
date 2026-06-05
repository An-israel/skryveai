import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Menu, X, ArrowRight, Twitter, Linkedin, Instagram,
  Briefcase, Store, CalendarDays, BookOpen, FileText,
  Zap, Users, Shield, ChevronRight,
} from "lucide-react";

/* ─── Animation presets ───────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

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
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
          <span className="font-bold text-[15px] text-white tracking-tight">Skryve</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {[
            { label: "Features", href: "#features" },
            { label: "Pricing",  href: "/pricing"  },
            { label: "Blog",     href: "/blog"     },
            { label: "About",    href: "/about"    },
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

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all"
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

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#09090b]/98 border-t border-white/[0.06] px-5 py-5 flex flex-col gap-4">
          {[
            { label: "Features", href: "#features" },
            { label: "Pricing",  href: "/pricing"  },
            { label: "Blog",     href: "/blog"     },
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

/* ─── Hero ────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-[#09090b] overflow-hidden pt-14">

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-[#2563EB]/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-500/8 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] text-white/60 text-[12px] font-medium mb-8 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
          Now live — the freelance OS for Africa
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[0.95] tracking-[-0.04em] mb-6"
        >
          The platform where<br />
          <span
            className="text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            talent meets
          </span>{" "}
          <span className="text-white">opportunity</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="text-[17px] md:text-xl text-white/40 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Learn skills. Build your portfolio. Find clients. Get hired. One platform, zero friction.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/signup"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#09090b] text-[14px] font-semibold hover:bg-white/90 transition-all shadow-lg shadow-white/10"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/signup?role=client"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.12] text-white/70 text-[14px] font-medium hover:border-white/25 hover:text-white transition-all bg-white/[0.03]"
          >
            Post a job
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 text-[12px] text-white/25"
        >
          Free to join · No credit card required · Cancel anytime
        </motion.p>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#09090b] to-transparent pointer-events-none" />
    </section>
  );
}

/* ─── Stats ───────────────────────────────────────────────── */
function Stats() {
  const items = [
    { value: "10,000+", label: "Registered talents"    },
    { value: "2,000+",  label: "Active companies"      },
    { value: "50,000+", label: "Jobs aggregated"       },
    { value: "98%",     label: "Satisfaction rate"     },
  ];

  return (
    <section className="bg-[#09090b] border-y border-white/[0.06]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/[0.06]">
        {items.map(({ value, label }, i) => (
          <motion.div
            key={label}
            {...fadeUp(i * 0.06)}
            className="px-8 py-10 text-center"
          >
            <p
              className="text-3xl md:text-4xl font-extrabold text-white mb-1 font-mono tracking-tight"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {value}
            </p>
            <p className="text-[12px] text-white/35 uppercase tracking-widest">{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── Features ────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Briefcase,
    title: "Job Aggregator",
    desc: "Jobs from Upwork, LinkedIn, Remote OK, Jobberman and more — delivered in one daily feed, scored to your profile.",
  },
  {
    icon: Store,
    title: "Marketplace",
    desc: "Post a job as a client or browse and apply as talent. Built-in AI matching surfaces the right fit on both sides.",
  },
  {
    icon: CalendarDays,
    title: "Events Hub",
    desc: "Discover industry webinars, networking events, and workshops. RSVP, get reminders, connect with organisers.",
  },
  {
    icon: BookOpen,
    title: "Learning Platform",
    desc: "Structured courses with an AI coach, quizzes, and verifiable certificates you can share on your profile.",
  },
  {
    icon: FileText,
    title: "CV Builder",
    desc: "Six ATS-optimised templates, AI-written summaries, one-click PDF export, and a live ATS score checker.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    desc: "Milestone-based escrow via Paystack. Funds only release when work is approved — protecting both parties.",
  },
];

function Features() {
  return (
    <section id="features" className="bg-[#09090b] py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-5">

        <motion.div {...fadeUp()} className="mb-16 max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-4">Platform</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-5">
            Everything you need.<br />Nothing you don't.
          </h2>
          <p className="text-[15px] text-white/40 leading-relaxed">
            Six purpose-built tools in one cohesive platform — no switching between apps.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              {...fadeUp(i * 0.05)}
              className="bg-[#09090b] p-7 hover:bg-white/[0.03] transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl border border-white/[0.08] flex items-center justify-center mb-5 group-hover:border-[#2563EB]/40 transition-colors">
                <Icon className="w-4.5 h-4.5 text-white/50 group-hover:text-[#2563EB] transition-colors" style={{ width: "18px", height: "18px" }} />
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ────────────────────────────────────────── */
function HowItWorks() {
  const talentSteps = [
    { n: "01", title: "Create your profile",     desc: "Set up in under 2 minutes. Add skills, rate, and portfolio." },
    { n: "02", title: "Get curated job matches",  desc: "Daily digest from 10+ platforms, scored to your profile." },
    { n: "03", title: "Apply with AI proposals",  desc: "One-click AI-drafted cover letters, tailored per job."   },
    { n: "04", title: "Get hired & get paid",     desc: "Secure escrow payments. Milestone-based, always protected."  },
  ];
  const clientSteps = [
    { n: "01", title: "Post your job",            desc: "Describe what you need — AI improves your description."    },
    { n: "02", title: "Review AI-matched talent", desc: "Profiles scored and ranked for your requirements."         },
    { n: "03", title: "Send an offer",            desc: "In-platform contracts, milestones, and messaging."         },
    { n: "04", title: "Release payment",          desc: "Funds release once you approve the work. No risk."        },
  ];

  return (
    <section className="bg-[#09090b] py-24 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-5">

        <motion.div {...fadeUp()} className="mb-16 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.05]">
            Up and running in minutes
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Talent */}
          <motion.div
            {...fadeUp(0.05)}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-6 h-6 rounded-md bg-[#2563EB]/15 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <span className="text-[13px] font-semibold text-white">For Talents</span>
            </div>
            <ol className="space-y-6">
              {talentSteps.map(({ n, title, desc }) => (
                <li key={n} className="flex items-start gap-4">
                  <span className="font-mono text-[12px] font-semibold text-white/25 shrink-0 pt-0.5 w-6">{n}</span>
                  <div>
                    <p className="text-[14px] font-semibold text-white/90 mb-0.5">{title}</p>
                    <p className="text-[13px] text-white/35 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>

          {/* Client */}
          <motion.div
            {...fadeUp(0.1)}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-6 h-6 rounded-md bg-purple-500/15 flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-[13px] font-semibold text-white">For Clients</span>
            </div>
            <ol className="space-y-6">
              {clientSteps.map(({ n, title, desc }) => (
                <li key={n} className="flex items-start gap-4">
                  <span className="font-mono text-[12px] font-semibold text-white/25 shrink-0 pt-0.5 w-6">{n}</span>
                  <div>
                    <p className="text-[14px] font-semibold text-white/90 mb-0.5">{title}</p>
                    <p className="text-[13px] text-white/35 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: "Within two weeks I landed two clients through the marketplace. The job aggregator alone saved me hours every day.",
    name: "Amara O.",
    role: "Freelance Designer",
  },
  {
    quote: "Finding quality talent used to take us weeks. With Skryve we hired our UI designer in three days. The AI matching is impressive.",
    name: "David K.",
    role: "Product Manager, TechCo",
  },
  {
    quote: "Finished the React course, got my certificate, and started getting inbound messages from clients. This platform is the real deal.",
    name: "Chisom N.",
    role: "Full-Stack Developer",
  },
];

function Testimonials() {
  return (
    <section className="bg-[#09090b] py-24 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-5">

        <motion.div {...fadeUp()} className="mb-14 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-4">Testimonials</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em]">
            Trusted by professionals
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map(({ quote, name, role }, i) => (
            <motion.div
              key={name}
              {...fadeUp(i * 0.07)}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 flex flex-col"
            >
              <p className="text-[14px] text-white/55 leading-relaxed flex-1 mb-6">
                "{quote}"
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-white/[0.06]">
                <div className="w-8 h-8 rounded-full bg-[#2563EB]/15 flex items-center justify-center text-[12px] font-bold text-[#2563EB]">
                  {name[0]}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{name}</p>
                  <p className="text-[11px] text-white/35">{role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className="bg-[#09090b] py-24 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          {...fadeUp()}
          className="relative rounded-3xl overflow-hidden border border-white/[0.08] p-14 md:p-20 text-center"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37,99,235,0.15) 0%, transparent 70%), #0d0d0d",
          }}
        >
          {/* Dot grid inside */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.04em] leading-[1.0] mb-5">
              Ready to get started?<br />It's free.
            </h2>
            <p className="text-[16px] text-white/40 max-w-md mx-auto mb-10">
              Join thousands of talents and clients building their futures on Skryve.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#09090b] text-[14px] font-bold hover:bg-white/90 transition-all shadow-lg"
              >
                Find work <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/signup?role=client"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/[0.15] text-white/70 text-[14px] font-medium hover:border-white/30 hover:text-white transition-all bg-white/[0.03]"
              >
                Hire talent
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
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

/* ─── Page ────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
