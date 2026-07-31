import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  CalendarDays, User, Loader2, CheckCircle2, ArrowRight, MessageCircle, ShieldCheck, Users2,
} from "lucide-react";
import { SKILL_CATEGORIES } from "@/lib/skills";
import {
  fetchWebinarBySlug, registerForEvent, markCommunityClick, sendMagicLink,
  type Webinar, type RegisterResult,
} from "@/lib/events/api";

export default function EventRegister() {
  const { slug = "" } = useParams();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [skill, setSkill] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    fetchWebinarBySlug(slug).then((w) => { setWebinar(w); setLoading(false); });
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.includes("@")) { setError("Name and a valid email are required."); return; }
    if (!consent) { setError("Please tick the consent box to continue."); return; }
    setSubmitting(true);
    const res = await registerForEvent({
      slug, name: name.trim(), email: email.trim(), phone: phone.trim(),
      country: country.trim(), skill, consent,
    });
    setSubmitting(false);
    if (!res.ok) { setError(res.error || "Couldn't register. Try again."); return; }
    setResult(res);
  };

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" }) : null;

  // Modern ambient background shared across states.
  const Backdrop = () => (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[560px] w-[880px] -translate-x-1/2 rounded-full bg-[#2563EB]/25 blur-[130px]" />
      <div className="absolute -bottom-32 -right-24 h-[440px] w-[440px] rounded-full bg-[#7C3AED]/20 blur-[130px]" />
      <div className="absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full bg-[#0EA5E9]/15 blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,0.18),transparent_55%)]" />
    </div>
  );

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#070B16]">
        <Backdrop />
        <Loader2 className="h-8 w-8 animate-spin text-white/80" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#070B16] px-5 text-center text-white">
        <Backdrop />
        <p className="text-lg font-semibold">This event isn't available.</p>
        <Link to="/" className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Go to Skryve</Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070B16] text-white">
      <Backdrop />
      <Helmet>
        <title>{webinar.title} — Skryve</title>
        <meta name="description" content={webinar.description?.slice(0, 155) || "Register for this free Skryve event."} />
      </Helmet>

      <header className="mx-auto flex max-w-2xl items-center gap-2 px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Skryve" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold">Skryve</span>
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16">
        {result ? (
          <SuccessScreen result={result} />
        ) : (
          <>
            {webinar.cover_image_url && (
              <img src={webinar.cover_image_url} alt="" className="mb-5 max-h-52 w-full rounded-2xl object-cover" />
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <CalendarDays className="h-3.5 w-3.5" /> Free event
            </span>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{webinar.title}</h1>
            <div className="mt-3 space-y-1 text-sm text-white/75">
              {fmtDate(webinar.event_datetime) && <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{fmtDate(webinar.event_datetime)}</p>}
              {webinar.host_name && <p className="flex items-center gap-2"><User className="h-4 w-4" />Hosted by {webinar.host_name}</p>}
            </div>
            {webinar.description && <p className="mt-4 whitespace-pre-wrap text-white/80">{webinar.description}</p>}

            <form onSubmit={submit} className="mt-7 rounded-3xl bg-white p-6 text-gray-900 shadow-2xl ring-1 ring-black/5 sm:p-7">
              <h2 className="text-xl font-bold">Register free</h2>
              <p className="mb-4 text-sm text-gray-500">Save your spot — takes 20 seconds.</p>
              <div className="space-y-3">
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (WhatsApp)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]" />
                  <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]" />
                </div>
                <select value={skill} onChange={(e) => setSkill(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]">
                  <option value="">Your main skill (optional)</option>
                  {SKILL_CATEGORIES.map((c) => (
                    <optgroup key={c.category} label={c.category}>
                      {c.skills.map((s) => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                  ))}
                </select>

                <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs text-gray-600">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                  <span>Registering also creates your free Skryve profile so we can match you with opportunities and send you event details.</span>
                </label>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button type="submit" disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-3 font-semibold text-white hover:bg-[#1d4fd7] disabled:opacity-70">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Registering…</> : <>Save my spot<ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function SuccessScreen({ result }: { result: RegisterResult }) {
  const link = result.community_link;
  const type = result.community_type === "telegram" ? "Telegram" : "WhatsApp";
  const [vetSending, setVetSending] = useState(false);
  const [vetSent, setVetSent] = useState(false);
  const [vetError, setVetError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  // Passwordless: email a one-click sign-in link (via Resend) straight to vetting.
  const startVetting = async () => {
    const email = result.account_email;
    if (!email) return;
    setVetSending(true);
    setVetError(null);
    const res = await sendMagicLink(email, "/vetting");
    setVetSending(false);
    if (res.ok) setVetSent(true);
    else setVetError(res.error || "Couldn't send the link.");
  };
  return (
    <div className="rounded-3xl bg-white p-6 text-gray-900 shadow-2xl ring-1 ring-black/5 sm:p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-[#059669]" />
        </div>
        <h2 className="text-2xl font-bold">You're in! 🎉</h2>
        <p className="mt-1 text-sm text-gray-500">
          Details for <strong>{result.event_title}</strong> are on their way to your email.
        </p>
      </div>

      {/* Community link — impossible to miss */}
      {link && (
        <a href={link} target="_blank" rel="noreferrer"
          onClick={() => result.registration_id && markCommunityClick(result.registration_id)}
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 text-base font-bold text-white hover:opacity-90">
          <MessageCircle className="h-5 w-5" /> Join the {type} group
        </a>
      )}
      <p className="mt-2 text-center text-xs text-gray-400">This is where everything happens — join now so you don't miss it.</p>

      {/* Vetting offer — skippable */}
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4">
        <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4 text-[#2563EB]" />Want to get hired through Skryve?</p>
        {vetSent ? (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Check your email — we sent a one-click link to sign in and start vetting. No password needed.
          </p>
        ) : skipped ? (
          <p className="mt-2 text-sm text-gray-500">
            No problem — the {type} group is enough for now. You can get vetted anytime from your dashboard.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              Get vetted and start receiving international opportunities. We'll email you a one-click sign-in link — no password to set up.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button onClick={startVetting} disabled={vetSending}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4fd7] disabled:opacity-70">
                {vetSending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : "Start vetting"}
              </button>
              <button onClick={() => setSkipped(true)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Maybe later
              </button>
            </div>
            {vetError && <p className="mt-2 text-sm text-red-600">{vetError}</p>}
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <Users2 className="h-3.5 w-3.5" /> {result.is_new_account ? "Free Skryve profile created" : "Welcome back — you're registered"}
      </div>
    </div>
  );
}
