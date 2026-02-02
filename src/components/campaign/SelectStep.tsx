import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Globe, MapPin, Phone, Star, ArrowRight, ArrowLeft } from "lucide-react";
import type { Business } from "@/types/campaign";

interface SelectStepProps {
  businesses: Business[];
  onSelect: (selectedBusinesses: Business[]) => void;
  onBack: () => void;
}

export function SelectStep({ businesses, onSelect, onBack }: SelectStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else if (newSelected.size < 15) {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set(businesses.slice(0, 15).map((b) => b.id));
    setSelected(newSelected);
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleContinue = () => {
    const selectedBusinesses = businesses.filter((b) => selected.has(b.id));
    onSelect(selectedBusinesses);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Select Businesses</h2>
          <p className="text-muted-foreground">
            Choose 10-15 businesses to analyze and pitch. Selected: {selected.size}/15
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear All
          </Button>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select First 15
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {businesses.map((business, index) => (
          <motion.div
            key={business.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card
              className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                selected.has(business.id)
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => toggleSelection(business.id)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected.has(business.id)}
                  onCheckedChange={() => toggleSelection(business.id)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={!selected.has(business.id) && selected.size >= 15}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold truncate">{business.name}</h3>
                    {business.rating && (
                      <div className="flex items-center gap-1 text-sm shrink-0">
                        <Star className="w-4 h-4 fill-warning text-warning" />
                        <span>{business.rating}</span>
                      </div>
                    )}
                  </div>
                  {business.category && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {business.category}
                    </Badge>
                  )}
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {business.address && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{business.address}</span>
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{business.phone}</span>
                      </div>
                    )}
                    {business.website && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-primary">{business.website}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={selected.size < 1}
          size="lg"
        >
          Analyze {selected.size} Businesses
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
