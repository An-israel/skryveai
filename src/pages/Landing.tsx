import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Menu, X, ArrowRight, Twitter, Linkedin, Instagram,
  Briefcase, Users, Search, Sparkles, GraduationCap, CalendarDays,
  FileText, Target,
} from "lucide-react";
import { LandingFeed } from "@/components/landing/LandingFeed";

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

/* ─── Features ────────────────────────────────────────────── */
const PILLARS = [
  {
    icon: Search,
    title: "Job aggregator + AI applications",
    desc: "Fresh remote jobs from 10+ platforms in one daily feed. Apply in one click with an AI proposal tailored to each role.",
  },
  {
    icon: Briefcase,
    title: "Two-sided marketplace",
    desc: "Clients post projects, AI matches them to the right talent. Chat, accept offers, deliver work, and get paid securely.",
  },
  {
    icon: GraduationCap,
    title: "Learning platform",
    desc: "Structured courses with an AI coach, graded assignments, and certificates — then put new skills straight to work.",
  },
  {
    icon: CalendarDays,
    title: "Events hub",
    desc: "Workshops, Q&As, and networking — online and in-person — to grow your skills and your network.",
  },
];

const TOOLS = [
  { icon: FileText, title: "AI CV Builder",        desc: "Build or optimize an ATS-ready CV in minutes." },
  { icon: Target,   title: "ATS Score Checker",    desc: "Score your CV against any job and fix the gaps." },
  { icon: Linkedin, title: "LinkedIn Analyzer",    desc: "Get a scored profile review and a rewrite plan." },
];

function Features() {
  return (
    <section id="features" className="bg-[#09090b] py-24 border-t border-white/[0.06] scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5">

        <motion.div {...fadeUp()} className="mb-16 text-center max-w-2xl mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-4">Everything in one place</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.05]">
            One platform for your whole career
          </h2>
          <p className="text-[15px] md:text-[16px] text-white/40 leading-relaxed mt-4">
            Find work, get hired, sharpen your skills, and grow your network — without juggling a dozen tools.
          </p>
        </motion.div>

        {/* Four pillars */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {PILLARS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              {...fadeUp(i * 0.06)}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 hover:border-white/[0.12] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-[#2563EB]/15 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-[#2563EB]" />
              </div>
              <h3 className="text-[16px] font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Free tools */}
        <div className="grid sm:grid-cols-3 gap-4">
          {TOOLS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              {...fadeUp(i * 0.06)}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-[14px] font-semibold text-white">{title}</h3>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-white/30">Free</span>
              </div>
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
      <LandingFeed />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
