import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
        <div className="text-center mb-8">
          {passed ? (
            <CheckCircle className="h-20 w-20 text-[#059669] mx-auto mb-4" />
          ) : (
            <XCircle className="h-20 w-20 text-destructive mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold mb-2">
            {passed ? "Great work!" : "Keep practicing!"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {score}/{questions.length} correct ({pct}%)
          </p>
          {!passed && quiz && (
            <p className="text-sm text-muted-foreground mt-2">
              You need {quiz.pass_threshold}% to pass.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          {passed ? (
            <Button
              size="lg"
              className="bg-[#059669] hover:bg-[#047857] text-white"
              onClick={() => navigate(`/learn/${courseId}`)}
            >
              Continue to Next Module
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              size="lg"
              variant="default"
              onClick={handleRetry}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Quiz
            </Button>
          )}
          <Button variant="outline" size="lg" asChild>
            <Link to={`/learn/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Link>
          </Button>
        </div>

        {!passed && questions.length > 0 && (
          <div>
            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={() => setReviewOpen(!reviewOpen)}
            >
              {reviewOpen ? "Hide" : "Review"} Answers
            </Button>

            {reviewOpen && (
              <div className="space-y-4">
                {questions.map((q, i) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.correct_answer;
                  return (
                    <Card key={q.id} className="p-4">
                      <p className="font-semibold text-sm mb-3">
                        {i + 1}. {q.question}
                      </p>
                      <div className="space-y-2 text-sm">
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                            isCorrect
                              ? "bg-[#059669]/10 text-[#059669]"
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
                          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#059669]/10 text-[#059669]">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            <span>
                              Correct answer: <strong>{q.correct_answer}</strong>
                            </span>
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-muted-foreground text-xs mt-2 px-3">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    </Card>
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
        <p className="text-muted-foreground">No questions found for this quiz.</p>
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
        <div className="flex items-center gap-3 mb-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/learn/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">{courseTitle}</p>
            <h2 className="text-sm font-semibold">{quiz?.title ?? "Module Quiz"}</h2>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>
            Question {currentQuestionIdx + 1} of {questions.length}
          </span>
          <Badge variant="outline">
            {quiz?.pass_threshold}% to pass
          </Badge>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIdx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-6 mb-6">
            <p className="text-lg font-semibold mb-6 leading-relaxed">
              {currentQuestion.question}
            </p>

            {currentQuestion.question_type === "true_false" ? (
              /* True/False */
              <div className="grid grid-cols-2 gap-4">
                {options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSelectAnswer(opt)}
                    className={`h-16 rounded-xl text-lg font-semibold border-2 transition-all ${
                      selectedAnswer === opt
                        ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
                        : "border-border hover:border-[#2563EB]/50 hover:bg-muted"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              /* Multiple Choice */
              <div className="space-y-3">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectAnswer(opt)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                      selectedAnswer === opt
                        ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] font-medium"
                        : "border-border hover:border-[#2563EB]/50 hover:bg-muted"
                    }`}
                  >
                    <span className="font-semibold mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-end">
        {isLastQuestion ? (
          <Button
            size="lg"
            disabled={!selectedAnswer || submitting}
            onClick={handleSubmit}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Quiz"
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={!selectedAnswer}
            onClick={handleNext}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          >
            Next Question
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
