import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Building2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SearchStepProps {
  onSearch: (businessType: string, location: string) => void;
  isLoading?: boolean;
}

const popularCategories = [
  "Restaurants",
  "Real Estate Agents",
  "Law Firms",
  "Dental Clinics",
  "Fitness Studios",
  "Auto Repair Shops",
];

export function SearchStep({ onSearch, isLoading }: SearchStepProps) {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessType.trim() && location.trim()) {
      onSearch(businessType.trim(), location.trim());
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
            <Search className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Find Your Ideal Clients</CardTitle>
          <CardDescription className="text-base">
            Search for businesses by type and location. We'll find potential clients that could benefit from your services.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessType" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Business Type
              </Label>
              <Input
                id="businessType"
                placeholder="e.g., Restaurants, Law Firms, Dental Clinics"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="h-12 text-base"
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {popularCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setBusinessType(category)}
                    className="px-3 py-1 text-xs rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, CA or New York City"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={!businessType.trim() || !location.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Find Businesses
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        <div className="p-4">
          <div className="text-3xl font-bold text-primary">50+</div>
          <div className="text-sm text-muted-foreground">Businesses per search</div>
        </div>
        <div className="p-4">
          <div className="text-3xl font-bold text-primary">AI</div>
          <div className="text-sm text-muted-foreground">Powered analysis</div>
        </div>
        <div className="p-4">
          <div className="text-3xl font-bold text-primary">80%</div>
          <div className="text-sm text-muted-foreground">Time saved</div>
        </div>
      </div>
    </motion.div>
  );
}
