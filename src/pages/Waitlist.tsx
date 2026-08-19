import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle2, ArrowRight, Globe, ShieldCheck, Loader2, Copy, Check, Users2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SKILL_CATEGORIES } from "@/lib/skills";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => (supabase as any).rpc(name, args);

interface JoinResult { referral_code: string; position: number; referral_count?: number; }

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [skill, setSkill] = useState("");
  const [country, setCountry] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [years, setYears] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refParam = new URLSearchParams(window.location.search).get("ref") || "";

  useEffect(() => {
    rpc("waitlist_count").then(({ data }: { data: number | null }) => {
      if (typeof data === "number") setCount(data);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) { setError("Enter a valid email."); return; }
    if (!skill) { setError("Pick your main skill."); return; }
    setSubmitting(true);
    try {
      const source = new URLSearchParams(window.location.search).get("utm_source") || document.referrer || null;
      const { data, error: rpcError } = await rpc("join_waitlist", {
        _email: email.trim(),
        _full_name: fullName.trim() || null,
        _primary_skill: skill,
        _portfolio_url: portfolio.trim() || null,
        _years_experience: years ? Number(years) : null,
        _source: source,
        _country: country.trim() || null,
        _referred_by: refParam || null,
      });
      if (rpcError || !data?.ok) {
        setError(data?.reason === "rate_limited" ? "Too many attempts. Please try again in a bit." : "Something went wrong. Please try again.");
        return;
      }
      setCount(data.total ?? null);
      setResult({ referral_code: data.referral_code, position: data.position });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const referralUrl = result ? `${window.location.origin}/waitlist?ref=${result.referral_code}` : "";
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(referralUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const joined = count != null ? count.toLocaleString() : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-[#132840] text-white">
      <Helmet>
        <title>Get hired by companies abroad — Skryve waitlist</title>
        <meta name="description" content="Join the waitlist. Skryve connects vetted African freelancers with international companies hiring remotely — work abroad, get paid well." />
      </Helmet>

      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Skryve" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold">Skryve</span>
        </Link>
        <Link to="/login" className="text-sm text-white/70 hover:text-white">Sign in</Link>
      </header>

      <main className="mx-auto grid max-w-5xl items-center gap-10 px-5 pb-20 pt-8 lg:grid-cols-2 lg:gap-14 lg:pt-16">
        {/* Pitch */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            <Globe className="h-3.5 w-3.5" /> For African freelancers
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Get hired by <span className="text-[#4F9CF9]">companies abroad</span>. Work remotely. Get paid well.
          </h1>
          <p className="mt-4 text-lg text-white/75">
            Skryve vets you once, then puts you in front of international companies hiring remote talent —
            no more shouting into a sea of DMs.
          </p>

          <ul className="mt-6 space-y-3 text-white/85">
            {[
              ["International remote roles", "Real jobs with companies abroad that pay in dollars and pounds."],
              ["A vetting badge that means something", "Pass once; clients trust it, so you skip the endless screening."],
              ["Get matched, not lost", "Vetted talent gets sent to real buyers — you don't compete with 200 randoms."],
            ].map(([title, sub]) => (
              <li key={title} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#4F9CF9]" />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-white/60">{sub}</p>
                </div>
              </li>
            ))}
          </ul>

          {joined && (
            <p className="mt-7 flex items-center gap-2 text-sm text-white/70">
              <ShieldCheck className="h-4 w-4 text-[#4F9CF9]" />
              <span><strong className="text-white">{joined}</strong> freelancers already joined</span>
            </p>
          )}
        </motion.div>

        {/* Form / success */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="rounded-2xl bg-white p-6 text-gray-900 shadow-2xl [color-scheme:light] sm:p-8">
            {result ? (
              <div className="py-2 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-[#059669]" />
                </div>
                <h2 className="text-xl font-bold">You're on the list</h2>
                <p className="mt-1 text-sm text-gray-500">
                  You're <strong className="text-gray-900">#{result.position.toLocaleString()}</strong> in line. We'll email you when vetting opens for your skill.
                </p>

                <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Users2 className="h-4 w-4 text-[#2563EB]" /> Skip the line
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Invite other freelancers with your link. Each one who joins moves you up.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      readOnly value={referralUrl}
                      className="min-w-0 flex-1 truncate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                    />
                    <button
                      onClick={copyLink}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-sm font-medium text-white hover:bg-[#1d4fd7]"
                    >
                      {copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold">Join the waitlist</h2>
                  <p className="text-sm text-gray-500">
                    {refParam ? "A friend invited you — join and move up together." : "Takes 20 seconds. No spam."}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Full name <span className="text-gray-400">(optional)</span></label>
                    <input
                      value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name"
                      className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Country</label>
                    <input
                      value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria"
                      className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Your main skill</label>
                  <select
                    required value={skill} onChange={(e) => setSkill(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="" disabled>Select a skill…</option>
                    {SKILL_CATEGORIES.map((c) => (
                      <optgroup key={c.category} label={c.category}>
                        {c.skills.map((s) => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium">Portfolio link <span className="text-gray-400">(optional)</span></label>
                    <input
                      value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="behance.net/you"
                      className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Years</label>
                    <input
                      type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} placeholder="3"
                      className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit" disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#1d4fd7] disabled:opacity-70"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Joining…</> : <>Join the waitlist<ArrowRight className="h-4 w-4" /></>}
                </button>
                <p className="text-center text-xs text-gray-400">
                  We only email you about early access. Unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
