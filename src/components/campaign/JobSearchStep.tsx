import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, MapPin, Sparkles, Zap, Target, Clock } from "lucide-react";

interface JobSearchStepProps {
  onSearch: (expertise: string, location: string) => void;
  isLoading?: boolean;
}

const popularSkills = [
  "Graphic Design",
  "Web Development",
  "Video Editing",
  "Copywriting",
  "Social Media Marketing",
  "UI/UX Design",
  "Data Analysis",
  "Content Writing",
];

export function JobSearchStep({ onSearch, isLoading }: JobSearchStepProps) {
  const [expertise, setExpertise] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expertise.trim()) {
      onSearch(expertise.trim(), location.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="border-0 shadow-xl bg-gradient-card">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow">
            <Briefcase className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Find Jobs & Apply in Bulk</CardTitle>
          <CardDescription className="text-base">
            Search for jobs across LinkedIn, Indeed, Glassdoor & more. We'll find postings from the last 24 hours, scrape employer emails, tailor your CV, and send applications — all at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="expertise" className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Your Expertise / Job Title
              </Label>
              <Input
                id="expertise"
                placeholder="e.g., Graphic Designer, Frontend Developer, Video Editor"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                className="h-12 text-base"
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {popularSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setExpertise(skill)}
                    className="px-3 py-1 text-xs rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Location <span className="text-muted-foreground text-xs">(optional — leave empty for remote)</span>
              </Label>
              <Input
                id="location"
                placeholder="e.g., Remote, New York, London, Lagos"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={!expertise.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Searching job platforms...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Find Jobs (Last 24 Hours)
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        <div className="p-4">
          <div className="text-3xl font-bold text-primary flex items-center justify-center gap-1">
            <Zap className="w-6 h-6" /> 50
          </div>
          <div className="text-sm text-muted-foreground">Jobs per search</div>
        </div>
        <div className="p-4">
          <div className="text-3xl font-bold text-primary flex items-center justify-center gap-1">
            <Clock className="w-6 h-6" /> 24h
          </div>
          <div className="text-sm text-muted-foreground">Fresh postings only</div>
        </div>
        <div className="p-4">
          <div className="text-3xl font-bold text-primary">7+</div>
          <div className="text-sm text-muted-foreground">Job platforms</div>
        </div>
      </div>
    </motion.div>
  );
}
