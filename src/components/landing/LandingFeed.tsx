import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, BookOpen, CalendarDays, MapPin, Clock, ArrowRight,
  Users, PlayCircle,
} from "lucide-react";
import { AuthGateModal } from "./AuthGateModal";

/* ─── Tabs ────────────────────────────────────────────────── */
type TabKey = "gigs" | "learn" | "events";

const TABS: { key: TabKey; label: string; icon: typeof Briefcase }[] = [
  { key: "gigs",   label: "Gigs",   icon: Briefcase   },
  { key: "learn",  label: "Learn",  icon: BookOpen    },
  { key: "events", label: "Events", icon: CalendarDays },
];

/* ─── Mock data ───────────────────────────────────────────── */
const GIGS = [
  { title: "Senior React Developer",     company: "Northwind Digital", budget: "$45–60/hr",   location: "Remote",     tags: ["React", "TypeScript"],  posted: "2h ago" },
  { title: "Brand Identity Designer",     company: "Lumio Studio",      budget: "$1,200 fixed", location: "Lagos, NG",  tags: ["Branding", "Figma"],    posted: "5h ago" },
  { title: "Content Writer — Fintech",    company: "Vault Africa",      budget: "$25–35/hr",   location: "Remote",     tags: ["Writing", "Fintech"],   posted: "1d ago" },
  { title: "Social Media Manager",        company: "Bloom & Co",        budget: "$800/mo",      location: "Remote",     tags: ["Marketing"],            posted: "1d ago" },
  { title: "Backend Engineer (Node.js)",  company: "Pivota Labs",       budget: "$50–70/hr",   location: "Remote",     tags: ["Node.js", "Postgres"],  posted: "2d ago" },
  { title: "UI/UX Designer — Mobile App", company: "FlowBank",          budget: "$1,800 fixed", location: "Nairobi, KE", tags: ["UI/UX", "Mobile"],     posted: "3d ago" },
];

const COURSES = [
  { title: "Frontend Development with React",     level: "Beginner",     lessons: 24, duration: "6h 30m", students: "3.2k" },
  { title: "Freelancing 101: Land Your First Client", level: "Beginner",  lessons: 12, duration: "2h 45m", students: "5.8k" },
  { title: "Advanced Copywriting for SaaS",        level: "Intermediate", lessons: 18, duration: "4h 10m", students: "1.4k" },
  { title: "UI/UX Design Fundamentals",            level: "Beginner",     lessons: 30, duration: "8h 00m", students: "2.9k" },
  { title: "Data Analysis with Python",            level: "Intermediate", lessons: 22, duration: "7h 15m", students: "2.1k" },
  { title: "Personal Branding on LinkedIn",        level: "Beginner",     lessons: 9,  duration: "1h 50m", students: "4.6k" },
];

const EVENTS = [
  { title: "Remote Work Mastery Workshop",     date: "Jun 22", time: "4:00 PM WAT", format: "Online",    attendees: 412 },
  { title: "Freelancer Tax & Finance Q&A",     date: "Jun 25", time: "6:00 PM WAT", format: "Online",    attendees: 198 },
  { title: "Design Portfolio Review Night",    date: "Jun 28", time: "5:00 PM WAT", format: "Online",    attendees: 256 },
  { title: "Tech Networking Mixer — Lagos",    date: "Jul 02", time: "3:00 PM WAT", format: "In-person", attendees: 87  },
  { title: "AI Tools for Freelancers",         date: "Jul 05", time: "7:00 PM WAT", format: "Online",    attendees: 530 },
  { title: "Client Negotiation Masterclass",   date: "Jul 09", time: "5:30 PM WAT", format: "Online",    attendees: 311 },
];

/* ─── Cards ───────────────────────────────────────────────── */
function GigCard({ gig, onApply }: { gig: typeof GIGS[number]; onApply: () => void }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-white/30">{gig.posted}</span>
        <span className="text-[11px] font-mono text-[#2563EB]">{gig.budget}</span>
      </div>
      <h3 className="text-[15px] font-semibold text-white mb-1 leading-snug">{gig.title}</h3>
      <p className="text-[12px] text-white/40 mb-3">{gig.company}</p>
      <div className="flex items-center gap-1.5 text-[11px] text-white/35 mb-4">
        <MapPin className="w-3 h-3" /> {gig.location}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {gig.tags.map((t) => (
          <span key={t} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[11px] text-white/50">{t}</span>
        ))}
      </div>
      <button
        onClick={onApply}
        className="mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg border border-white/[0.1] text-[13px] font-medium text-white/80 hover:bg-white hover:text-[#09090b] transition-all"
      >
        Apply now <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function CourseCard({ course, onStart }: { course: typeof COURSES[number]; onStart: () => void }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-0.5 rounded-md bg-[#2563EB]/15 text-[11px] font-medium text-[#2563EB]">{course.level}</span>
        <span className="flex items-center gap-1 text-[11px] text-white/35"><Users className="w-3 h-3" /> {course.students}</span>
      </div>
      <h3 className="text-[15px] font-semibold text-white mb-3 leading-snug">{course.title}</h3>
      <div className="flex items-center gap-4 text-[11px] text-white/35 mb-5">
        <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> {course.lessons} lessons</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
      </div>
      <button
        onClick={onStart}
        className="mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg border border-white/[0.1] text-[13px] font-medium text-white/80 hover:bg-white hover:text-[#09090b] transition-all"
      >
        Start learning <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EventCard({ event, onRegister }: { event: typeof EVENTS[number]; onRegister: () => void }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[11px] font-medium text-white/50">{event.format}</span>
        <span className="flex items-center gap-1 text-[11px] text-white/35"><Users className="w-3 h-3" /> {event.attendees} going</span>
      </div>
      <h3 className="text-[15px] font-semibold text-white mb-3 leading-snug">{event.title}</h3>
      <div className="flex items-center gap-4 text-[11px] text-white/35 mb-5">
        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {event.date}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</span>
      </div>
      <button
        onClick={onRegister}
        className="mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg border border-white/[0.1] text-[13px] font-medium text-white/80 hover:bg-white hover:text-[#09090b] transition-all"
      >
        Register <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Feed ────────────────────────────────────────────────── */
export function LandingFeed() {
  const [tab, setTab] = useState<TabKey>("gigs");
  const [gateOpen, setGateOpen] = useState(false);
  const [gateAction, setGateAction] = useState("continue");

  const openGate = (action: string) => {
    setGateAction(action);
    setGateOpen(true);
  };

  return (
    <section className="relative bg-[#09090b] overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[#2563EB]/10 blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] text-white/60 text-[12px] font-medium mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
            Now live — the freelance OS for Africa
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-4">
            Your next gig, skill, or event —{" "}
            <span
              className="text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
              }}
            >
              already here
            </span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-white/40 leading-relaxed">
            Browse real opportunities before you sign up. When you're ready to apply, register, or start learning, creating a free account takes seconds.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                tab === key
                  ? "bg-white text-[#09090b]"
                  : "text-white/50 border border-white/[0.1] hover:text-white hover:border-white/25"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {tab === "gigs" && GIGS.map((g) => (
              <GigCard key={g.title} gig={g} onApply={() => openGate("apply for this gig")} />
            ))}
            {tab === "learn" && COURSES.map((c) => (
              <CourseCard key={c.title} course={c} onStart={() => openGate("start this course")} />
            ))}
            {tab === "events" && EVENTS.map((e) => (
              <EventCard key={e.title} event={e} onRegister={() => openGate("register for this event")} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <AuthGateModal open={gateOpen} onClose={() => setGateOpen(false)} actionLabel={gateAction} />
    </section>
  );
}
