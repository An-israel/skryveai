import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Flame, BookOpen, Trophy, Sparkles, GraduationCap } from "lucide-react";

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string | null;
  achievement_description: string | null;
  skill_name: string | null;
  earned_at: string;
}

function iconFor(type: string) {
  if (type.startsWith("streak")) return Flame;
  if (type.startsWith("lessons") || type === "first_lesson") return BookOpen;
  if (type === "skill_complete") return GraduationCap;
  if (type === "assignment_passed") return Trophy;
  if (type === "first_submission") return Sparkles;
  return Award;
}

export function AchievementsCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("learning_achievements")
      .select("*")
      .eq("user_id", user!.id)
      .order("earned_at", { ascending: false })
      .limit(8);
    setItems((data as Achievement[]) || []);
    setLoading(false);
  }

  if (loading) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Learning Achievements</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tools/learn">Learn more</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            No badges yet. Start a learning path to earn your first one.
          </p>
          <Button size="sm" asChild>
            <Link to="/tools/learn">Browse skills</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((a) => {
            const Icon = iconFor(a.achievement_type);
            return (
              <div
                key={a.id}
                className="flex flex-col items-center text-center p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                title={a.achievement_description || ""}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium leading-tight line-clamp-2">
                  {a.achievement_name || a.achievement_type}
                </p>
                {a.skill_name && (
                  <Badge variant="outline" className="mt-1 text-[9px] truncate max-w-full">
                    {a.skill_name}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
