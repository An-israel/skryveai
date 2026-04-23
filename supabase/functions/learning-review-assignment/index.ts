// Assignment review using Lovable AI Gateway (Gemini 2.5 Pro)
// - Validates JWT in code
// - Loads assignment + user submission, calls Gemini Pro for rubric grading
// - Persists score, status, strengths, improvements, ai_feedback to learning_submissions
// - Deducts 0.5 credits for non-staff/non-lifetime users
// - Awards "first_submission" + "assignment_passed" achievements via RPC
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
const REVIEW_CREDITS_COST = 0.5;
const PASS_THRESHOLD = 70;

interface ReviewBody {
  submissionId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth token" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid auth" }, 401);
    const user = userData.user;

    const body = (await req.json()) as ReviewBody;
    if (!body?.submissionId) return json({ error: "submissionId required" }, 400);

    // Load submission + assignment + path
    const { data: sub, error: subErr } = await admin
      .from("learning_submissions")
      .select(
        "id, user_id, assignment_id, user_learning_id, submission_data, submission_url, file_path, status, revision_count"
      )
      .eq("id", body.submissionId)
      .maybeSingle();

    if (subErr || !sub) return json({ error: "Submission not found" }, 404);
    if (sub.user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (sub.status === "approved") {
      return json({ error: "Already approved" }, 400);
    }

    const { data: assignment } = await admin
      .from("learning_assignments")
      .select(
        "id, title, description, instructions, passing_criteria, submission_type, lesson_id"
      )
      .eq("id", sub.assignment_id)
      .maybeSingle();

    if (!assignment) return json({ error: "Assignment not found" }, 404);

    // Load lesson resources for revision linkbacks
    const { data: lesson } = await admin
      .from("learning_lessons")
      .select("id, title, content_url, content_type, lesson_number, module_id")
      .eq("id", assignment.lesson_id)
      .maybeSingle();

    // Load user_learning for skill context
    let skillName = "freelancing";
    let userLearningId: string | null = sub.user_learning_id;
    if (userLearningId) {
      const { data: ul } = await admin
        .from("user_learning")
        .select("learning_paths(display_name, skill_name)")
        .eq("id", userLearningId)
        .maybeSingle();
      const path: any = ul?.learning_paths;
      skillName = path?.display_name || path?.skill_name || skillName;
    }

    // Credits + role check
    const [{ data: roles }, { data: subRow }] = await Promise.all([
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
    const isLifetime = subRow?.plan === "lifetime";
    const isFree = isStaff || isLifetime;

    if (!isFree && (!subRow || (subRow.credits ?? 0) < REVIEW_CREDITS_COST)) {
      return json(
        { error: "Not enough credits to submit for review (0.5 credits needed)." },
        402
      );
    }

    // If a file was uploaded, generate a short-lived signed URL so the model can reference it
    let signedFileUrl: string | null = null;
    if (sub.file_path) {
      const { data: signed } = await admin.storage
        .from("learning-submissions")
        .createSignedUrl(sub.file_path, 60 * 30);
      signedFileUrl = signed?.signedUrl || null;
    }

    const submissionContext = [
      sub.submission_data ? `Text submission:\n${sub.submission_data}` : null,
      sub.submission_url ? `URL submission: ${sub.submission_url}` : null,
      signedFileUrl
        ? `Uploaded file (signed URL, valid 30 min): ${signedFileUrl}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `You are a senior ${skillName} mentor reviewing a learner's assignment on the SkryveAI platform.

Be thorough, specific, and kind but honest. Use ${skillName}-specific terminology.
Return ONLY valid JSON matching this schema (no markdown fences, no prose outside JSON):

{
  "score": number (0-100),
  "status": "approved" | "needs_revision",
  "summary": string (2-3 sentence overall verdict),
  "strengths": string[] (3-5 concrete things they did well),
  "improvements": string[] (3-5 specific actionable improvements),
  "rubric": {
    "criteria_met": string[],
    "criteria_missed": string[]
  },
  "next_step": string (one sentence telling the learner what to do next)
}

Pass threshold is ${PASS_THRESHOLD}. If score >= ${PASS_THRESHOLD} → status "approved", else "needs_revision".`;

    const userPrompt = `ASSIGNMENT
Title: ${assignment.title}
Description: ${assignment.description}
Instructions: ${assignment.instructions}
Passing criteria: ${assignment.passing_criteria || "Demonstrate clear understanding of the lesson topic with original work."}
Submission type expected: ${assignment.submission_type}

LEARNER SUBMISSION (revision #${sub.revision_count + 1})
${submissionContext || "(no content provided)"}

Review this submission and return the JSON verdict.`;

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("AI gateway error:", upstream.status, text);
      if (upstream.status === 429) {
        return json({ error: "Rate limit reached. Try again in a moment." }, 429);
      }
      if (upstream.status === 402) {
        return json(
          { error: "AI workspace credits exhausted. Please contact support." },
          402
        );
      }
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await upstream.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let verdict: any = {};
    try {
      verdict = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error("verdict parse error", e, raw);
      return json({ error: "Could not parse AI verdict" }, 500);
    }

    const score = Math.max(0, Math.min(100, Math.round(Number(verdict.score) || 0)));
    const passed = score >= PASS_THRESHOLD;
    const status = passed ? "approved" : "needs_revision";

    const strengths: string[] = Array.isArray(verdict.strengths)
      ? verdict.strengths.slice(0, 6).map(String)
      : [];
    const improvements: string[] = Array.isArray(verdict.improvements)
      ? verdict.improvements.slice(0, 6).map(String)
      : [];

    const formattedFeedback = [
      verdict.summary ? `**Verdict:** ${verdict.summary}` : "",
      strengths.length ? `\n**✅ Strengths**\n- ${strengths.join("\n- ")}` : "",
      improvements.length
        ? `\n**⚠️ Improvements**\n- ${improvements.join("\n- ")}`
        : "",
      verdict?.rubric?.criteria_met?.length
        ? `\n**Criteria met**\n- ${verdict.rubric.criteria_met.join("\n- ")}`
        : "",
      verdict?.rubric?.criteria_missed?.length
        ? `\n**Criteria missed**\n- ${verdict.rubric.criteria_missed.join("\n- ")}`
        : "",
      verdict.next_step ? `\n**Next step:** ${verdict.next_step}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Persist verdict
    const updatePayload: Record<string, unknown> = {
      ai_feedback: formattedFeedback,
      score,
      status,
      strengths,
      improvements,
      revision_count: sub.revision_count + 1,
      reviewed_at: new Date().toISOString(),
    };
    if (passed) updatePayload.passed_at = new Date().toISOString();

    const { error: updErr } = await admin
      .from("learning_submissions")
      .update(updatePayload)
      .eq("id", sub.id);

    if (updErr) console.error("submission update error", updErr);

    // Deduct credits + mirror to coach_messages for thread continuity
    if (!isFree && subRow) {
      const newCredits = Math.max(
        0,
        (subRow.credits ?? 0) - REVIEW_CREDITS_COST
      );
      await admin
        .from("subscriptions")
        .update({ credits: newCredits })
        .eq("user_id", user.id);
    }

    if (userLearningId) {
      await admin.from("coach_messages").insert({
        user_id: user.id,
        user_learning_id: userLearningId,
        message_type: "feedback",
        message_text: formattedFeedback || "(no feedback)",
        sent_by: "coach",
        context: {
          assignmentId: assignment.id,
          submissionId: sub.id,
          score,
          status,
          model: "google/gemini-2.5-pro",
        },
        credits_used: isFree ? 0 : REVIEW_CREDITS_COST,
      });

      // Extra coaching nudge specifically when learner needs to revise.
      if (!passed) {
        const fixList = improvements.length
          ? improvements.map((i, idx) => `${idx + 1}. ${i}`).join("\n")
          : "Re-read the brief, address each passing criterion, and add concrete examples.";

        const lessonLink = `${SUPABASE_URL.replace(".supabase.co", "")
          ? ""
          : ""}/tools/learn/${userLearningId}`;
        const lessonResource = lesson?.content_url
          ? `\n\n📚 **Revisit this lesson** before resubmitting:\n[${lesson.title}](${lesson.content_url})`
          : "";
        const nextStepStr = verdict?.next_step
          ? `\n\n👉 **Next step:** ${verdict.next_step}`
          : "";

        const revisionMessage = `Your submission scored **${score}/100** — close, but not over the line yet. Here's exactly what to change:\n\n${fixList}${lessonResource}${nextStepStr}\n\n[Open the assignment to revise →](${lessonLink}/assignment/${assignment.id})`;

        await admin.from("coach_messages").insert({
          user_id: user.id,
          user_learning_id: userLearningId,
          message_type: "revision_guidance",
          message_text: revisionMessage,
          sent_by: "coach",
          is_proactive: true,
          credits_used: 0,
          context: {
            assignmentId: assignment.id,
            submissionId: sub.id,
            score,
            improvements,
            lessonId: lesson?.id || null,
            lessonUrl: lesson?.content_url || null,
          },
        });

        // Header notification so they see it immediately
        await admin.from("notifications").insert({
          user_id: user.id,
          type: "coach",
          title: `Revision needed — ${score}/100`,
          message: improvements[0]
            ? `Top fix: ${improvements[0]}`
            : "Open your assignment to see what to change.",
          data: {
            link: `/tools/learn/${userLearningId}/assignment/${assignment.id}`,
            assignmentId: assignment.id,
            submissionId: sub.id,
            lessonUrl: lesson?.content_url || null,
          },
        });
      }
    }

    // Achievements
    await admin.rpc("award_learning_achievement", {
      _user_id: user.id,
      _user_learning_id: userLearningId,
      _achievement_type: "first_submission",
      _achievement_name: "First Submission",
      _achievement_description: "Submitted your first assignment for AI review.",
      _skill_name: skillName,
    });
    if (passed) {
      await admin.rpc("award_learning_achievement", {
        _user_id: user.id,
        _user_learning_id: userLearningId,
        _achievement_type: "assignment_passed",
        _achievement_name: "Assignment Passed",
        _achievement_description: `Passed an assignment in ${skillName}.`,
        _skill_name: skillName,
      });
    }

    return json({
      success: true,
      score,
      status,
      strengths,
      improvements,
      feedback: formattedFeedback,
      passed,
    });
  } catch (e) {
    console.error("learning-review-assignment fatal", e);
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
