// Profile completion drive: an animated bar + a checklist of remaining items,
// each worth points. Syncs the server-side percent (which awards the 'All Set'
// badge at 100%) on mount.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGamification } from "@/hooks/useGamification";

interface Item { key: string; label: string; href: string; done: boolean; }

export function ProfileCompletionCard({ userId }: { userId: string }) {
  const { recalcProfile } = useGamification();
  const [items, setItems] = useState<Item[]>([]);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: p } = await (supabase as any)
        .from("talent_profiles")
        .select("bio, profile_photo_url, primary_skill, hourly_rate")
        .eq("user_id", userId).maybeSingle();
      const { data: cv } = await (supabase as any)
        .from("skryve_cvs").select("id").eq("user_id", userId).maybeSingle();
      if (!active) return;
      const next: Item[] = [
        { key: "photo", label: "Add a profile photo",  href: "/profile",     done: !!p?.profile_photo_url },
        { key: "bio",   label: "Write your bio",        href: "/profile",     done: !!p?.bio },
        { key: "skill", label: "Set your primary skill",href: "/profile",     done: !!p?.primary_skill },
        { key: "rate",  label: "Set job preferences",   href: "/profile",     done: !!p?.hourly_rate },
        { key: "cv",    label: "Build your CV",          href: "/cv-builder",  done: !!cv },
      ];
      setItems(next);
      setPct(Math.round((next.filter((i) => i.done).length / next.length) * 100));
      // Keep the server stat + 'All Set' badge in sync with reality.
      void recalcProfile();
    })();
    return () => { active = false; };
  }, [userId, recalcProfile]);

  const complete = pct === 100;

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
          {complete && <Sparkles className="w-3.5 h-3.5 text-primary" />}
          Profile strength
        </span>
        <span className="font-mono text-[13px] text-primary">{pct}%</span>
      </div>

      <div className="h-1.5 bg-muted mx-5 mt-3 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>

      {complete ? (
        <div className="px-5 py-6 text-center">
          <p className="text-[13px] font-medium text-foreground">Your profile is complete 🎉</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Clients can now find and trust you. You earned the “All Set” badge.
          </p>
        </div>
      ) : (
        <div className="px-5 py-3 space-y-0.5">
          {items.map((it) => (
            <div key={it.key} className="flex items-center gap-2.5 py-1.5">
              {it.done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
              {it.done ? (
                <span className="text-[13px] text-muted-foreground line-through">{it.label}</span>
              ) : (
                <Link to={it.href} className="flex-1 flex items-center justify-between group">
                  <span className="text-[13px] text-foreground group-hover:text-primary transition-colors">{it.label}</span>
                  <span className="text-[11px] font-mono text-muted-foreground group-hover:text-primary transition-colors">+20 pts</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
