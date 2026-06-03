import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Quiz {
  id: string;
  course_id: string;
  module_name: string;
  title: string;
  pass_threshold: number;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_type: "multiple_choice" | "true_false";
  options: string[];
  correct_answer: string;
  explanation: string | null;
  order_index: number;
}

type QuizState = "loading" | "taking" | "results";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuizPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quizState, setQuizState] = useState<QuizState>("loading");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [talentId, setTalentId] = useState<string | null>(null);

  // Taking state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Results state
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [quizId]);

  async function init() {
    setQuizState("loading");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const [{ data: quizData }, { data: questionsData }, { data: courseData }, { data: profile }] =
      await Promise.all([
        (supabase as any).from("quizzes").select("*").eq("id", quizId).single(),
        (supabase as any)
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", quizId)
          .order("order_index", { ascending: true }),
        (supabase as any).from("courses").select("title").eq("id", courseId).single(),
        (supabase as any)
          .from("talent_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single(),
      ]);

    if (!quizData) {
      toast({ title: "Quiz not found", variant: "destructive" });
      navigate(`/learn/${courseId}`);
      return;
    }

    setQuiz(quizData as Quiz);
    const qs = (questionsData || []) as QuizQuestion[];
    setQuestions(qs);
    setCourseTitle(courseData?.title ?? "");
    const tid = profile?.id ?? null;
    setTalentId(tid);

    // Check if already passed
    if (tid) {
      const { data: existingAttempt } = await (supabase as any)
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("talent_id", tid)
        .eq("passed", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingAttempt) {
        setScore(existingAttempt.score);
        setPassed(true);
        setQuizState("results");
        return;
      }
    }

    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setAnswers({});
    setQuizState("taking");
  }

  const currentQuestion = questions[currentQuestionIdx] ?? null;
  const isLastQuestion = currentQuestionIdx === questions.length - 1;
  const progressPercent =
    questions.length > 0 ? ((currentQuestionIdx + 1) / questions.length) * 100 : 0;

  function handleSelectAnswer(option: string) {
    setSelectedAnswer((prev) => (prev === option ? null : option));
  }

  function handleNext() {
    if (!selectedAnswer || !currentQuestion) return;
    const newAnswers = { ...answers, [currentQuestion.id]: selectedAnswer };
    setAnswers(newAnswers);

    if (!isLastQuestion) {
      setCurrentQuestionIdx((i) => i + 1);
      setSelectedAnswer(null);
    }
  }

  async function handleSubmit() {
    if (!selectedAnswer || !currentQuestion || !quiz) return;
    setSubmitting(true);

    const finalAnswers = { ...answers, [currentQuestion.id]: selectedAnswer };
    setAnswers(finalAnswers);

    // Calculate score
    let correct = 0;
    for (const q of questions) {
      if (finalAnswers[q.id] === q.correct_answer) correct++;
    }

    const pct = Math.round((correct / questions.length) * 100);
    const didPass = pct >= quiz.pass_threshold;

    // Save attempt
    if (talentId) {
      await (supabase as any).from("quiz_attempts").insert({
        quiz_id: quizId,
        talent_id: talentId,
        score: correct,
        total: questions.length,
        passed: didPass,
        answers: finalAnswers,
      });
    }

    setScore(correct);
    setPassed(didPass);
    setSubmitting(false);
    setQuizState("results");
  }

  function handleRetry() {
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setAnswers({});
    setScore(0);
    setPassed(false);
    setReviewOpen(false);
    setQuizState("taking");
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (quizState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Results View ─────────────────────────────────────────────────────────

  if (quizState === "results") {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Result hero */}
        <div className="border border-border rounded-xl bg-card overflow-hidden mb-6">
          <div className="px-5 py-10 flex flex-col items-center text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
                passed ? "bg-emerald-500/10" : "bg-destructive/10"
              }`}
            >
              {passed ? (
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {passed ? "Great work!" : "Keep practicing!"}
            </h1>
            <p className="text-[13px] text-muted-foreground mb-4">
              {score}/{questions.length} correct — {pct}%
            </p>

            {/* Score bar */}
            <div className="w-full max-w-xs mb-4">
              <div className="h-1 bg-border rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${passed ? "bg-emerald-500" : "bg-destructive"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {!passed && quiz && (
              <p className="text-[12px] text-muted-foreground">
                You need {quiz.pass_threshold}% to pass.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {passed ? (
            <button
              className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              onClick={() => navigate(`/learn/${courseId}`)}
            >
              Continue to Next Module
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              onClick={handleRetry}
            >
              <RotateCcw className="h-4 w-4" />
              Retry Quiz
            </button>
          )}
          <Link
            to={`/learn/${courseId}`}
            className="flex-1 px-5 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>
        </div>

        {/* Answer Review */}
        {!passed && questions.length > 0 && (
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <button
              className="w-full px-5 py-3.5 flex items-center justify-between text-[13px] font-semibold text-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setReviewOpen(!reviewOpen)}
            >
              {reviewOpen ? "Hide" : "Review"} Answers
              <ChevronRight
                className={`h-4 w-4 text-muted-foreground transition-transform ${reviewOpen ? "rotate-90" : ""}`}
              />
            </button>

            {reviewOpen && (
              <div className="divide-y divide-border border-t border-border">
                {questions.map((q, i) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.correct_answer;
                  return (
                    <div key={q.id} className="px-5 py-4">
                      <p className="text-[13px] font-medium text-foreground mb-3">
                        {i + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] ${
                            isCorrect
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span>
                            Your answer: <strong>{userAnswer || "Not answered"}</strong>
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-[13px]">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            <span>
                              Correct: <strong>{q.correct_answer}</strong>
                            </span>
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-[12px] text-muted-foreground mt-1 px-3">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Taking View ──────────────────────────────────────────────────────────

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[13px] text-muted-foreground">No questions found for this quiz.</p>
      </div>
    );
  }

  const options: string[] =
    currentQuestion.question_type === "true_false"
      ? ["True", "False"]
      : Array.isArray(currentQuestion.options)
      ? currentQuestion.options
      : [];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            to={`/learn/${courseId}`}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {quiz?.pass_threshold}% to pass
          </span>
        </div>

        {/* Course + quiz label */}
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground">{courseTitle}</p>
          <p className="text-[14px] font-semibold text-foreground">{quiz?.title ?? "Module Quiz"}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-border rounded-full">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
            {currentQuestionIdx + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIdx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.22 }}
        >
          <div className="border border-border rounded-xl bg-card overflow-hidden mb-5">
            <div className="px-5 py-5">
              <p className="text-[16px] font-medium text-foreground mb-6 leading-relaxed">
                {currentQuestion.question}
              </p>

              {currentQuestion.question_type === "true_false" ? (
                /* True/False */
                <div className="grid grid-cols-2 gap-3">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSelectAnswer(opt)}
                      className={`h-14 rounded-xl text-[14px] font-semibold border transition-all ${
                        selectedAnswer === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                /* Multiple Choice */
                <div className="space-y-2.5">
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectAnswer(opt)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-[14px] cursor-pointer transition-all ${
                        selectedAnswer === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <span className="font-semibold mr-2 text-[13px]">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-end">
        {isLastQuestion ? (
          <button
            disabled={!selectedAnswer || submitting}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Quiz"
            )}
          </button>
        ) : (
          <button
            disabled={!selectedAnswer}
            onClick={handleNext}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next Question
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
