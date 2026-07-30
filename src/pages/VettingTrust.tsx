import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BadgeCheck, CheckCircle2, ClipboardCheck, MessageSquareText, ShieldCheck } from "lucide-react";
import { VettedBadge } from "@/components/vetting/VettedBadge";

// Public "why the badge means something" page — the answer to a client's
// "why should I trust your freelancers?" It's a demand-side sales asset.
export default function VettingTrust() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>How Skryve vetting works — vetted, professional freelancers</title>
        <meta name="description" content="Every Vetted freelancer on Skryve passed a real skill test and a professionalism check. Here's exactly how — so you can hire with confidence." />
      </Helmet>

      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Skryve" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold">Skryve</span>
        </Link>
        <Link to="/talent" className="text-sm text-muted-foreground hover:text-foreground">Browse vetted talent</Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20">
        <section className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Every Vetted freelancer earned it</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Other platforms flood you with unvetted applicants. On Skryve, the{" "}
            <VettedBadge size="sm" /> badge means a real person passed a real test — skill <em>and</em> professionalism —
            so you interview two great people, not two hundred randoms.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardCheck, title: "1. Skill test", body: "A practical, replicable test for their skill — recreate a design, build a component, edit a cut, write a piece. Scored by a reviewer against clear criteria. Most applicants don't pass." },
            { icon: MessageSquareText, title: "2. Professionalism check", body: "Communication, reliability and attitude — how they handle scope changes, deadlines and unclear briefs. The thing skill tests miss and clients feel." },
            { icon: BadgeCheck, title: "3. The badge", body: "Pass both and they earn a Vetted badge for that skill. It's visible on their profile and in search — and we can revoke it if standards slip." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><s.icon className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border bg-muted/40 p-6">
          <h2 className="text-lg font-semibold">What the badge guarantees you</h2>
          <ul className="mt-3 space-y-2">
            {[
              "The work is theirs — they proved the skill on a real test, not just a portfolio.",
              "They communicate clearly and professionally in English.",
              "They handle the messy parts — changing briefs, deadlines — like a pro.",
              "The badge is live: it can be revoked if a client reports a serious issue.",
            ].map((t) => (
              <li key={t} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />{t}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 text-center">
          <Link to="/talent" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">
            Browse vetted talent
          </Link>
        </section>
      </main>
    </div>
  );
}
