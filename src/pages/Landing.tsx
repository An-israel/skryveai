import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Menu, X, Twitter, Linkedin, Instagram,
  Briefcase, Store, CalendarDays, BookOpen,
  Users, CheckCircle2, ArrowRight, Star, Quote,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

const stats = [
  { value: "10,000+", label: "Talents" },
  { value: "2,000+", label: "Companies" },
  { value: "50,000+", label: "Jobs Aggregated" },
];

const talentSteps = [
  { n: 1, title: "Sign Up", desc: "Create your free account in under 2 minutes." },
  { n: 2, title: "Build Profile", desc: "Showcase your skills, portfolio, and experience." },
  { n: 3, title: "Get Daily Jobs", desc: "Receive curated job matches from 10+ platforms." },
  { n: 4, title: "Apply & Get Hired", desc: "Send proposals and land your next opportunity." },
];

const clientSteps = [
  { n: 1, title: "Sign Up", desc: "Create a client account for free." },
  { n: 2, title: "Post a Job", desc: "Describe what you need — it takes minutes." },
  { n: 3, title: "Review Applicants", desc: "Browse profiles and AI-matched talent." },
  { n: 4, title: "Hire & Pay", desc: "Hire securely and pay through the platform." },
];

const features = [
  {
    icon: Briefcase,
    title: "Job Aggregator",
    desc: "Jobs from 10+ platforms in one daily feed.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Store,
    title: "Marketplace",
    desc: "Clients post. Talents apply. AI matches both.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: CalendarDays,
    title: "Events Hub",
    desc: "Discover webinars, workshops, and networking events.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: BookOpen,
    title: "Learn + CV",
    desc: "Learn a skill. Build a CV. Get hired.",
    color: "bg-amber-50 text-amber-600",
  },
];

const testimonials = [
  {
    name: "Amara O.",
    role: "Freelance Designer",
    quote: "Within two weeks of joining, I landed two clients through the marketplace. The job aggregator alone saved me hours every day.",
  },
  {
    name: "David K.",
    role: "Product Manager, TechCo",
    quote: "Finding quality talent used to take us weeks. With Skryve we hired our UI designer in three days. The AI matching is genuinely impressive.",
  },
  {
    name: "Chisom N.",
    role: "Full-Stack Developer",
    quote: "I finished the React course, added the certificate to my profile, and started getting inbound messages from clients. This platform is the real deal.",
  },
];

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Skryve" className="w-8 h-8 object-contain" />
            <span className="font-bold text-xl text-[#1E3A5F]">Skryve</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                className="text-sm font-medium text-gray-600 hover:text-[#2563EB] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>

          <button
            className="md:hidden p-2 rounded-md text-gray-600"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                className="text-sm font-medium text-gray-700"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" size="sm" asChild>
                <Link to="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
              </Button>
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white" asChild>
                <Link to="/signup" onClick={() => setMobileOpen(false)}>Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative bg-[#0B162B] pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#2563EB]/20 blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/20 mb-6">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              Built for the modern professional
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.1]">
              The Platform Where<br />
              <span className="text-[#2563EB]">Talent Meets Opportunity</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              Learn skills, build your portfolio, find clients, and get hired — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-white text-[#1E3A5F] hover:bg-gray-100 font-bold px-8 rounded-full text-base"
                asChild
              >
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 hover:text-white font-semibold px-8 rounded-full text-base bg-transparent"
                asChild
              >
                <Link to="/signup?role=client">Post a Job</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/40 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              Free to join · No credit card required
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────── */}
      <section className="py-12 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((s, i) => (
              <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <div className="text-4xl font-extrabold text-[#1E3A5F]">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E3A5F] mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Simple steps to get started — whether you're a talent or a client.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
            <motion.div {...fadeUp} className="bg-blue-50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-[#2563EB]" />
                <h3 className="text-xl font-bold text-[#1E3A5F]">For Talents</h3>
              </div>
              <ol className="space-y-5">
                {talentSteps.map((s) => (
                  <li key={s.n} className="flex items-start gap-4">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-[#2563EB] text-white text-sm font-bold flex items-center justify-center">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-[#1E3A5F]">{s.title}</p>
                      <p className="text-sm text-gray-500">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }} className="bg-violet-50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Briefcase className="w-6 h-6 text-violet-600" />
                <h3 className="text-xl font-bold text-[#1E3A5F]">For Clients</h3>
              </div>
              <ol className="space-y-5">
                {clientSteps.map((s) => (
                  <li key={s.n} className="flex items-start gap-4">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-[#1E3A5F]">{s.title}</p>
                      <p className="text-sm text-gray-500">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E3A5F] mb-4">Everything You Need</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Four powerful tools built into one platform.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1E3A5F] mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E3A5F] mb-4">Loved by Professionals</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Here's what our members say.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                {...fadeUp}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm"
              >
                <Quote className="w-6 h-6 text-[#2563EB] mb-4" />
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-[#1E3A5F] text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#1E3A5F]">
        <div className="container mx-auto px-4 text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Ready to get started? It's free.
            </h2>
            <p className="text-white/60 mb-10 text-lg max-w-xl mx-auto">
              Join thousands of talents and clients already on Skryve.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-white text-[#1E3A5F] hover:bg-gray-100 font-bold px-8 rounded-full text-base"
                asChild
              >
                <Link to="/signup">Find Work</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 hover:text-white font-semibold px-8 rounded-full text-base bg-transparent"
                asChild
              >
                <Link to="/signup?role=client">Hire Talent</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Skryve" className="w-8 h-8 object-contain" />
              <span className="font-bold text-xl text-[#1E3A5F]">Skryve</span>
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-5 text-sm text-gray-500">
              <Link to="/about" className="hover:text-[#2563EB] transition-colors">About</Link>
              <Link to="/blog" className="hover:text-[#2563EB] transition-colors">Blog</Link>
              <Link to="/pricing" className="hover:text-[#2563EB] transition-colors">Pricing</Link>
              <Link to="/contact" className="hover:text-[#2563EB] transition-colors">Contact</Link>
              <Link to="/privacy-policy" className="hover:text-[#2563EB] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[#2563EB] transition-colors">Terms</Link>
            </nav>
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#2563EB] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#2563EB] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#2563EB] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">© 2026 Skryve. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
