// Fires the once-a-day "daily_active" credit earn when an authenticated user
// opens the app. The server enforces the daily cap (so this is safe even if it
// runs twice); the localStorage guard just avoids a redundant RPC each render.
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { earnCredits } from "@/lib/credits/api";

const KEY = "skryve-daily-checkin";

export function DailyCheckIn() {
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || !session?.user) return;

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
      if (localStorage.getItem(KEY) === today) return;
      localStorage.setItem(KEY, today);

      const res = await earnCredits("daily_active");
      if (res.ok && res.credited) {
        toast.success(`+${res.credited} credits`, { description: "Daily check-in" });
      }
    })();
    return () => { active = false; };
  }, []);

  return null;
}
