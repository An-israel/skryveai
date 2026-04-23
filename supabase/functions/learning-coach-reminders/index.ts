// Scheduled coach reminders — runs via pg_cron daily.
// For each active learner, classifies their state (inactive, on streak, stalled before assignment, etc.)
// and writes a contextual nudge into coach_messages + notifications. No credit cost (system-generated).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface UlRow {
  id: string;
  user_id: string;
  current_module: number;
  current_lesson: number;
  completed_lessons: number;
  total_lessons: number;
  streak_days: number;
  last_activity_date: string | null;
  reminders_enabled: boolean;
  reminder_inactivity_days: number;
  last_reminder_sent_at: string | null;
  learning_paths: { display_name: string; skill_name: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date();

    const { data: rows, error } = await admin
      .from("user_learning")
      .select(
        "id, user_id, current_module, current_lesson, completed_lessons, total_lessons, streak_days, last_activity_date, reminders_enabled, reminder_inactivity_days, last_reminder_sent_at, learning_paths(display_name, skill_name)"
      )
      .eq("is_active", true)
      .eq("reminders_enabled", true);

    if (error) {
      console.error("query error", error);
      return json({ error: error.message }, 500);
    }

    const learners = (rows || []) as unknown as UlRow[];
    let nudged = 0;
    let skipped = 0;

    for (const ul of learners) {
      const skill = ul.learning_paths?.display_name || "your skill";

      // Compute last activity from EITHER lesson activity OR last user-sent coach message
      const { data: lastUserMsg } = await admin
        .from("coach_messages")
        .select("sent_at")
        .eq("user_learning_id", ul.id)
        .eq("sent_by", "user")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lessonActivity = ul.last_activity_date ? new Date(ul.last_activity_date) : null;
      const messageActivity = lastUserMsg?.sent_at ? new Date(lastUserMsg.sent_at) : null;
      const lastActivity =
        lessonActivity && messageActivity
          ? lessonActivity > messageActivity ? lessonActivity : messageActivity
          : lessonActivity || messageActivity;

      const daysSince = lastActivity
        ? Math.floor((today.getTime() - lastActivity.getTime()) / 86400000)
        : 999;

      // Honor per-user inactivity threshold
      const threshold = Math.max(1, Math.min(30, ul.reminder_inactivity_days || 3));
      if (daysSince < threshold) {
        skipped++;
        continue;
      }

      // Avoid duplicate nudge within last 24h (prefer last_reminder_sent_at, fall back to coach_messages)
      if (ul.last_reminder_sent_at) {
        const hours = (today.getTime() - new Date(ul.last_reminder_sent_at).getTime()) / 3_600_000;
        if (hours < 24) {
          skipped++;
          continue;
        }
      }

      const since = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await admin
        .from("coach_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ul.user_id)
        .eq("user_learning_id", ul.id)
        .eq("is_proactive", true)
        .gte("sent_at", since);

      if ((recentCount || 0) > 0) {
        skipped++;
        continue;
      }

      const pct = ul.total_lessons
        ? Math.round((ul.completed_lessons / ul.total_lessons) * 100)
        : 0;

      let title: string;
      let message: string;

      if (daysSince >= 14) {
        title = `Still want to learn ${skill}?`;
        message = `It's been ${daysSince} days since your last activity. Even 15 minutes today rebuilds momentum. Pick up at Module ${ul.current_module}, Lesson ${ul.current_lesson}.`;
      } else if (daysSince >= 7) {
        title = `${skill} is waiting`;
        message = `You're ${pct}% through ${skill}. Don't lose your progress — jump back into Lesson ${ul.current_lesson} today (just 20 minutes).`;
      } else if (pct >= 80 && pct < 100) {
        title = `So close to completing ${skill}!`;
        message = `You're ${pct}% done. ${ul.total_lessons - ul.completed_lessons} lessons left to a portfolio-ready skill. Finish strong this week.`;
      } else {
        title = `One quick lesson today?`;
        message = `Your last ${skill} activity was ${daysSince} day${daysSince === 1 ? "" : "s"} ago. A 20-minute session today keeps you on track.`;
      }

      await admin.from("coach_messages").insert({
        user_id: ul.user_id,
        user_learning_id: ul.id,
        message_type: "reminder",
        message_text: message,
        sent_by: "coach",
        is_proactive: true,
        credits_used: 0,
        context: {
          skill,
          daysSince,
          inactivityThreshold: threshold,
          progressPct: pct,
          currentModule: ul.current_module,
          currentLesson: ul.current_lesson,
        },
      });

      await admin.from("notifications").insert({
        user_id: ul.user_id,
        type: "coach",
        title,
        message,
        data: {
          link: `/tools/learn/${ul.id}`,
          skill,
          userLearningId: ul.id,
        },
      });

      // Mark reminder timestamp so we don't re-nudge for 24h
      await admin
        .from("user_learning")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("id", ul.id);

      nudged++;
    }

    return json({ success: true, nudged, skipped, total: learners.length });
  } catch (e) {
    console.error("learning-coach-reminders fatal", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
