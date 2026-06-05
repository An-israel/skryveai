import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase, MapPin, Send, Users, TrendingUp, Sparkles, ArrowRight,
  Menu, X, Twitter, Linkedin, Instagram, ChevronDown, ChevronUp,
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
const roles: {
  title: string;
  type: string;
  location: string;
  icon: typeof TrendingUp;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHaves: string[];
}[] = [
  {
    title: "Project Assistant",
    type: "Full-Time",
    location: "Remote",
    icon: Sparkles,
    description:
      "We're looking for a sharp, proactive Project Assistant to work directly with the founder. You'll act as a right hand — coordinating hiring, managing staff operations, driving brand growth initiatives, and ensuring the team runs like a well-oiled machine. This is a high-impact role for someone who thrives on ownership and wants to shape the future of SkryveAI.",
    responsibilities: [
      "Assist in recruiting, onboarding, and managing team members across departments",
      "Coordinate day-to-day operations and ensure projects stay on track",
      "Drive brand growth initiatives — partnerships, outreach, community building",
      "Act as a liaison between the founder and the rest of the team",
      "Monitor team performance, compile reports, and flag blockers early",
      "Help define and refine internal processes as the company scales",
    ],
    requirements: [
      "2+ years of experience in project management, operations, or a chief-of-staff type role",
      "Exceptional organizational and communication skills",
      "Ability to context-switch between hiring, strategy, and execution",
      "Strong leadership instincts — comfortable managing people and holding them accountable",
      "Self-motivated with a bias for action and getting things done",
    ],
    niceToHaves: [
      "Experience in a startup or early-stage tech company",
      "Familiarity with the African tech ecosystem",
      "Background in HR, talent acquisition, or people operations",
      "Experience with project management tools (Notion, Trello, Asana, etc.)",
    ],
  },
  {
    title: "Marketing Manager",
    type: "Full-Time",
    location: "Remote",
    icon: TrendingUp,
    description:
      "We're looking for a creative and data-driven Marketing Manager to lead our growth initiatives. You'll own our marketing strategy end-to-end — from brand positioning and content creation to paid campaigns and community engagement.",
    responsibilities: [
      "Develop and execute multi-channel marketing strategies (social media, email, content, paid ads)",
      "Create compelling brand narratives and messaging that resonate with freelancers and agencies",
      "Analyze campaign performance, optimize funnels, and report on key growth metrics",
      "Collaborate with product and engineering to align marketing with feature launches",
      "Build and nurture our online community across social platforms",
      "Manage influencer partnerships and co-marketing opportunities",
    ],
    requirements: [
      "2+ years of experience in digital marketing, growth marketing, or a related role",
      "Proven track record of running successful campaigns that drive user acquisition",
      "Strong copywriting and storytelling skills",
      "Experience with analytics tools (Google Analytics, social media insights, etc.)",
      "Self-starter mindset with the ability to thrive in a fast-paced startup environment",
    ],
    niceToHaves: [
      "Experience marketing SaaS or B2B products",
      "Familiarity with the African freelance/agency market",
      "Video content creation or editing skills",
      "Experience with email marketing automation platforms",
    ],
  },
  {
    title: "Customer Success Manager",
    type: "Full-Time",
    location: "Remote",
    icon: Users,
    description:
      "We're hiring a Customer Success Manager to be the voice of our users. You'll help onboard new customers, ensure they get maximum value from SkryveAI, and turn satisfied users into loyal advocates.",
    responsibilities: [
      "Onboard new users and guide them through the platform's features and best practices",
      "Proactively engage with customers to identify pain points and opportunities for improvement",
      "Handle support inquiries with empathy, speed, and clarity across email and social channels",
      "Collect and synthesize user feedback to inform product development priorities",
      "Create help documentation, tutorials, and FAQs to empower self-service",
      "Track customer health metrics and work to reduce churn",
    ],
    requirements: [
      "1+ years of experience in customer success, support, or account management",
      "Excellent written and verbal communication skills",
      "Strong problem-solving abilities with a customer-first mindset",
      "Comfortable with SaaS tools and quick to learn new platforms",
      "Organized and able to manage multiple customer relationships simultaneously",
    ],
    niceToHaves: [
      "Experience in a startup or early-stage company",
      "Familiarity with CRM tools (HubSpot, Intercom, Freshdesk, etc.)",
      "Understanding of email outreach or cold outreach workflows",
      "Background in the African tech or freelance ecosystem",
    ],
  },
];

/* ─── Role Card ───────────────────────────────────────────── */
function RoleCard({ role, index }: { role: typeof roles[number]; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const handleApply = () => {
    const subject = encodeURIComponent(`Application — ${role.title} at SkryveAI`);
    const body = encodeURIComponent(
      `Hi SkryveAI Team,\n\nI'm applying for the ${role.title} role.\n\n- Full Name: \n- Email: \n- LinkedIn / Portfolio: \n\n[Attach your CV/Resume]\n\nBest regards`
    );
    window.open(`mailto:skryveai@gmail.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="border border-white/[0.06] bg-white/[0.02] rounded-2xl overflow-hidden hover:border-white/[0.1] transition-colors"
    >
      {/* Header */}
      <div className="p-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center shrink-0">
              <role.icon className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-white">{role.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[12px] text-white/40">
                  <Briefcase className="w-3 h-3" /> {role.type}
                </span>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-1 text-[12px] text-white/40">
                  <MapPin className="w-3 h-3" /> {role.location}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#09090b] text-[12px] font-semibold hover:bg-white/90 transition-all"
            >
              <Send className="w-3 h-3" /> Apply
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-2 rounded-lg border border-white/[0.1] text-white/40 hover:text-white hover:border-white/[0.2] transition-all"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <p className="text-[14px] text-white/60 leading-relaxed mt-5">{role.description}</p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-7 py-6 space-y-7">
          <div>
            <h4 className="text-[13px] font-semibold text-white/90 uppercase tracking-[0.1em] mb-4">What You'll Do</h4>
            <ul className="space-y-2.5">
              {role.responsibilities.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-white/60">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#2563EB] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-white/90 uppercase tracking-[0.1em] mb-4">What We're Looking For</h4>
            <ul className="space-y-2.5">
              {role.requirements.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-white/60">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#2563EB] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-white/90 uppercase tracking-[0.1em] mb-4">Nice to Have</h4>
            <ul className="space-y-2.5">
              {role.niceToHaves.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-white/50">
                  <span className="mt-2 h-1 w-1 rounded-full bg-white/20 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 text-[13px] text-white/40">
            <Send className="w-3.5 h-3.5 text-[#2563EB]" />
            Send your CV and application letter to{" "}
            <a
              href="mailto:skryveai@gmail.com"
              className="font-semibold text-white/80 hover:text-white transition-colors underline underline-offset-2"
            >
              skryveai@gmail.com
            </a>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function Careers() {
  const perks = [
    { label: "Remote-First", desc: "Work from anywhere in the world" },
    { label: "Early Stage", desc: "Shape the product and culture from day one" },
    { label: "Impact-Driven", desc: "Build tools that change how Africa does business" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b]">
      <Helmet>
        <title>Careers at SkryveAI — Join Our Remote Team</title>
        <meta
          name="description"
          content="Join SkryveAI and help empower freelancers and startups worldwide. We're hiring for remote roles in marketing, customer success, and more."
        />
        <meta name="keywords" content="SkryveAI careers, SkryveAI jobs, remote jobs AI startup" />
        <link rel="canonical" href="https://skryveai.com/careers" />
        <meta property="og:title" content="Careers at SkryveAI — Join Our Remote Team" />
        <meta property="og:description" content="Help us democratize cold outreach for freelancers worldwide. Remote-first, impact-driven." />
        <meta property="og:url" content="https://skryveai.com/careers" />
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 mb-5">
            <Sparkles className="w-3 h-3 text-[#2563EB]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2563EB]">
              We're Hiring
            </span>
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-5">
            Join the SkryveAI<br />team
          </h1>
          <p className="text-[16px] text-white/40 leading-relaxed">
            Help us empower freelancers and agencies across Africa to land more clients with smart, AI-powered outreach. We're building something big — and we want you on the team.
          </p>
        </motion.div>
      </section>

      {/* Perks */}
      <section className="border-t border-white/[0.06] py-16">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid sm:grid-cols-3 gap-4">
            {perks.map((perk, i) => (
              <motion.div
                key={perk.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="border border-white/[0.06] bg-white/[0.02] rounded-2xl p-7 hover:border-white/[0.1] transition-colors"
              >
                <h3 className="text-[16px] font-semibold text-white mb-2">{perk.label}</h3>
                <p className="text-[13px] text-white/50">{perk.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section className="border-t border-white/[0.06] py-16">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-3 block">
              Openings
            </span>
            <h2 className="text-[28px] font-extrabold text-white tracking-[-0.02em]">
              Open Positions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {roles.map((role, i) => (
              <RoleCard key={role.title} role={role} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* General Application CTA */}
      <section className="border-t border-white/[0.06]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto px-5 py-20 text-center"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-4 block">
            Open Application
          </span>
          <h2 className="text-4xl font-extrabold text-white tracking-[-0.03em] mb-4">
            Don't see your role?
          </h2>
          <p className="text-[15px] text-white/40 mb-8 max-w-lg mx-auto leading-relaxed">
            We're always open to hearing from talented people. Send us your CV and a note about how you'd contribute to SkryveAI.
          </p>
          <button
            onClick={() => {
              const subject = encodeURIComponent("General Application — SkryveAI");
              const body = encodeURIComponent(
                "Hi SkryveAI Team,\n\nI'd love to be part of the team! Here are my details:\n\n- Full Name: \n- Email: \n- LinkedIn / Portfolio: \n- Area of expertise: \n\n[Attach your CV/Resume]\n\nBest regards"
              );
              window.open(`mailto:skryveai@gmail.com?subject=${subject}&body=${body}`, "_blank");
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#09090b] text-[14px] font-semibold hover:bg-white/90 transition-all"
          >
            <Send className="w-4 h-4" />
            Send a General Application
          </button>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
