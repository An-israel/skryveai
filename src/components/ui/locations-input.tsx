import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationsInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxLocations?: number;
  id?: string;
  className?: string;
}

/**
 * Chip-style multi-location input. Press Enter or comma to add.
 * Click × on a chip to remove. Hard cap at maxLocations (default 5)
 * to keep search fan-out under control.
 */
export function LocationsInput({
  values,
  onChange,
  placeholder = "e.g., Lagos, Nigeria",
  maxLocations = 5,
  id,
  className,
}: LocationsInputProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim().replace(/,$/, "").trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setDraft("");
      return;
    }
    if (values.length >= maxLocations) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const remove = (loc: string) => onChange(values.filter((v) => v !== loc));

  const atLimit = values.length >= maxLocations;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
        {values.map((loc) => (
          <Badge
            key={loc}
            variant="secondary"
            className="pl-2.5 pr-1 py-1 gap-1 text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
          >
            <MapPin className="w-3 h-3" />
            {loc}
            <button
              type="button"
              onClick={() => remove(loc)}
              aria-label={`Remove ${loc}`}
              className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={atLimit ? `Up to ${maxLocations} locations` : placeholder}
          disabled={atLimit}
          className="h-12 text-base flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={commit}
          disabled={!draft.trim() || atLimit}
          className="h-12 w-12 shrink-0"
          aria-label="Add location"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        {values.length === 0
          ? `Add up to ${maxLocations} locations. Press Enter or comma to add each.`
          : `${values.length} of ${maxLocations} locations · We'll search each and merge results.`}
      </p>
    </div>
  );
}
