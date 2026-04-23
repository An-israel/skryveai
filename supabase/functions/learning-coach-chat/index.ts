// Streaming AI coach chat using Lovable AI Gateway (Gemini Flash)
// - Validates JWT in code (verify_jwt = false in config)
// - Loads lesson/assignment context if provided
// - Persists user + assistant messages to coach_messages
// - Deducts 0.1 credits for non-staff/non-lifetime users (skips on rate-limit/payment errors)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const STAFF_ROLES = ["super_admin", "content_editor", "support_agent", "staff"];
const COACH_CREDITS_COST = 0.1;

interface ProgressSnapshot {
  completedLessons?: number;
  totalLessons?: number;
  streakDays?: number;
  currentModuleNumber?: number | null;
  currentModuleTitle?: string | null;
  moduleDoneCount?: number;
  moduleTotal?: number;
  moduleAllDone?: boolean;
  completedLessonTitles?: string[];
  remainingInModule?: string[];
  nextLessonTitle?: string | null;
}

interface ChatBody {
  userLearningId: string;
  message: string;
  lessonId?: string | null;
  assignmentId?: string | null;
  history?: { role: "user" | "assistant"; content: string }[];
  progress?: ProgressSnapshot;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "Missing auth token" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "Invalid auth" }, 401);
    }
    const user = userData.user;

    const body = (await req.json()) as ChatBody;
    if (!body?.userLearningId || !body?.message?.trim()) {
      return json({ error: "userLearningId and message are required" }, 400);
    }

    // Confirm ownership of user_learning row
    const { data: ul, error: ulErr } = await admin
      .from("user_learning")
      .select(
        "id, user_id, current_level, current_module, current_lesson, coach_tone, learning_path_id, learning_paths(skill_name, display_name)"
      )
      .eq("id", body.userLearningId)
      .maybeSingle();

    if (ulErr || !ul || ul.user_id !== user.id) {
      return json({ error: "Learning path not found" }, 404);
    }

    // Credit check (skip staff/lifetime)
    const [{ data: roles }, { data: sub }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin
        .from("subscriptions")
        .select("credits, plan, status")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const isStaff = (roles || []).some((r: { role: string }) =>
      STAFF_ROLES.includes(r.role)
    );
    const isLifetime = sub?.plan === "lifetime";
    const isFree = isStaff || isLifetime;

    if (!isFree) {
      if (!sub || (sub.credits ?? 0) < COACH_CREDITS_COST) {
        return json(
          {
            error:
              "Not enough credits to chat with the coach. Upgrade your plan to continue.",
          },
          402
        );
      }
    }

    // Optional lesson + assignment context
    let lessonCtx: any = null;
    let assignmentCtx: any = null;
    if (body.lessonId) {
      const { data } = await admin
        .from("learning_lessons")
        .select("id, title, description, content_type, lesson_number")
        .eq("id", body.lessonId)
        .maybeSingle();
      lessonCtx = data;
    }
    if (body.assignmentId) {
      const { data } = await admin
        .from("learning_assignments")
        .select("id, title, description, instructions, passing_criteria, submission_type")
        .eq("id", body.assignmentId)
        .maybeSingle();
      assignmentCtx = data;
    }

    const path: any = ul.learning_paths;
    const skillName = path?.display_name || path?.skill_name || "freelancing";
    const tone = ul.coach_tone || "moderate";

    const systemPrompt = `You are an expert ${skillName} coach mentoring a learner on the SkryveAI platform.

Learner context:
- Skill: ${skillName}
- Current level: ${ul.current_level}/10
- Current module: ${ul.current_module}, lesson: ${ul.current_lesson}
- Coaching tone: ${tone} (lenient = warm/forgiving, moderate = balanced, strict = direct/high standards)

${lessonCtx ? `Current lesson: "${lessonCtx.title}" (${lessonCtx.content_type})\nLesson summary: ${lessonCtx.description || "n/a"}` : ""}
${assignmentCtx ? `Current assignment: "${assignmentCtx.title}"\nInstructions: ${assignmentCtx.instructions}\nPassing criteria: ${assignmentCtx.passing_criteria || "n/a"}` : ""}

Guidelines:
- Use ${skillName}-specific terminology, tools, and examples.
- Give concrete, actionable advice — never vague.
- Use short paragraphs and markdown (lists, **bold**, code blocks) for readability.
- Encourage practice, real projects, and reflection.
- Match the ${tone} tone.
- If the learner's question is off-topic, gently steer them back to ${skillName}.`;

    // Persist user message immediately
    await admin.from("coach_messages").insert({
      user_id: user.id,
      user_learning_id: ul.id,
      message_type: assignmentCtx ? "feedback" : lessonCtx ? "lesson" : "check_in",
      message_text: body.message,
      sent_by: "user",
      context: {
        lessonId: body.lessonId || null,
        assignmentId: body.assignmentId || null,
      },
      credits_used: 0,
    });

    // Build messages
    const history = (body.history || []).slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: body.message },
    ];

    // Call Lovable AI Gateway (streaming)
    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          stream: true,
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      console.error("AI gateway error:", upstream.status, text);
      if (upstream.status === 429) {
        return json({ error: "Rate limit reached. Please try again in a moment." }, 429);
      }
      if (upstream.status === 402) {
        return json({ error: "AI workspace credits exhausted. Please contact support." }, 402);
      }
      return json({ error: "AI gateway error" }, 500);
    }

    // Tee the stream: forward to client + capture full text for persistence
    let assistantText = "";
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            controller.enqueue(encoder.encode(chunk));

            // Parse SSE for our own capture
            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, nl);
              buffer = buffer.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;
              try {
                const j = JSON.parse(payload);
                const delta = j.choices?.[0]?.delta?.content;
                if (delta) assistantText += delta;
              } catch {
                // ignore parse partials
              }
            }
          }
        } catch (e) {
          console.error("stream relay error", e);
        } finally {
          controller.close();

          // Persist assistant message + deduct credits (best-effort, after stream)
          try {
            await admin.from("coach_messages").insert({
              user_id: user.id,
              user_learning_id: ul.id,
              message_type: assignmentCtx ? "feedback" : lessonCtx ? "lesson" : "check_in",
              message_text: assistantText || "(no response)",
              sent_by: "coach",
              context: {
                lessonId: body.lessonId || null,
                assignmentId: body.assignmentId || null,
                model: "google/gemini-2.5-flash",
              },
              credits_used: isFree ? 0 : COACH_CREDITS_COST,
            });

            if (!isFree && sub) {
              const newCredits = Math.max(0, (sub.credits ?? 0) - COACH_CREDITS_COST);
              await admin
                .from("subscriptions")
                .update({ credits: newCredits })
                .eq("user_id", user.id);
            }
          } catch (e) {
            console.error("post-stream persist error", e);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("learning-coach-chat fatal", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
