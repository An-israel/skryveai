import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Clock, Flame, Sparkles, Loader2 } from "lucide-react";

interface Path {
  id: string;
  skill_name: string;
  display_name: string;
  short_description: string | null;
  description: string | null;
  total_lessons: number;
  total_modules: number;
  estimated_weeks: number | null;
  popular_rank: number | null;
  difficulty_level: string | null;
}

interface ActivePath {
  id: string; // user_learning id
  learning_path_id: string;
  current_level: number;
  current_module: number;
  current_lesson: number;
  completed_lessons: number;
  total_lessons: number;
  streak_days: number;
  total_time_minutes: number;
  learning_paths: { skill_name: string; display_name: string };
}

export default function LearnHub() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paths, setPaths] = useState<Path[]>([]);
  const [active, setActive] = useState<ActivePath[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user]);

  async function loadData() {
    setLoadingData(true);
    const [{ data: pathsData }, { data: activeData }] = await Promise.all([
      supabase
        .from("learning_paths")
        .select("*")
        .eq("is_active", true)
        .order("popular_rank", { ascending: true }),
      supabase
        .from("user_learning")
        .select(
          "id, learning_path_id, current_level, current_module, current_lesson, completed_lessons, total_lessons, streak_days, total_time_minutes, learning_paths(skill_name, display_name)"
        )
        .eq("user_id", user!.id)
        .eq("is_active", true),
    ]);
    setPaths((pathsData as Path[]) || []);
    setActive((activeData as unknown as ActivePath[]) || []);
    setLoadingData(false);
  }

  async function startPath(p: Path) {
    if (!user) return;
    setStarting(p.id);
    try {
      // If already active, just go to it
      const existing = active.find((a) => a.learning_path_id === p.id);
      if (existing) {
        navigate(`/tools/learn/${existing.id}`);
        return;
      }
      const { data, error } = await supabase
        .from("user_learning")
        .insert({
          user_id: user.id,
          learning_path_id: p.id,
          total_lessons: p.total_lessons,
          coach_tone: "moderate",
          learning_pace: "2hr/day",
        })
        .select("id")
        .single();
      if (error) throw error;
      toast({ title: `Welcome to ${p.display_name}!`, description: "Your coach is ready." });
      navigate(`/tools/learn/${data.id}`);
    } catch (e: any) {
      toast({
        title: "Could not start path",
        description: e.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setStarting(null);
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Learn Freelance Skills | SkryveAI"
        description="Learn web design, copywriting, video editing, SEO and more with your AI coach. Affordable, structured paths for African freelancers."
      />
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Badge variant="secondary">AI Learning Coach</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Learn any freelance skill</h1>
          <p className="text-muted-foreground max-w-2xl">
            10 structured paths, AI-powered coaching, project-based assignments. Build a real
            portfolio in weeks, not months.
          </p>
        </div>

        {active.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Currently learning</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((a) => {
                const pct = a.total_lessons
                  ? Math.round((a.completed_lessons / a.total_lessons) * 100)
                  : 0;
                return (
                  <Card key={a.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {a.learning_paths.display_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Module {a.current_module} · Lesson {a.current_lesson}
                        </p>
                      </div>
                      <Badge variant="outline">Level {a.current_level}</Badge>
                    </div>
                    <Progress value={pct} className="mb-3" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5" /> {a.streak_days}d streak
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />{" "}
                        {Math.floor(a.total_time_minutes / 60)}h logged
                      </span>
                      <span>
                        {a.completed_lessons}/{a.total_lessons} lessons
                      </span>
                    </div>
                    <Button asChild className="w-full">
                      <Link to={`/tools/learn/${a.id}`}>Continue learning</Link>
                    </Button>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-4">All skills</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paths.map((p) => {
              const isActive = active.some((a) => a.learning_path_id === p.id);
              return (
                <Card key={p.id} className="p-6 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{p.display_name}</h3>
                    {p.popular_rank && p.popular_rank <= 3 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    {p.short_description || p.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {p.total_lessons} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {p.estimated_weeks}w
                    </span>
                    {p.difficulty_level && (
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {p.difficulty_level}
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => startPath(p)}
                    disabled={starting === p.id}
                    variant={isActive ? "outline" : "default"}
                    className="w-full"
                  >
                    {starting === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isActive ? (
                      "Continue"
                    ) : (
                      "Start learning"
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
