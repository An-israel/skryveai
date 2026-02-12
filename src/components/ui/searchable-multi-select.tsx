import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: string;
}

export function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Search skills...",
  className,
  maxHeight = "200px",
}: SearchableMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (skill: string) => {
    onChange(
      selected.includes(skill)
        ? selected.filter((s) => s !== skill)
        : [...selected, skill]
    );
  };

  const remove = (skill: string) => {
    onChange(selected.filter((s) => s !== skill));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((skill) => (
            <Badge key={skill} variant="default" className="gap-1 pr-1">
              {skill}
              <button
                type="button"
                onClick={() => remove(skill)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary-foreground/20"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-8"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-y-auto"
          style={{ maxHeight }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No skills found for "{search}"
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((skill) => {
                const isSelected = selected.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggle(skill)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-sm transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent"
                    )}
                  >
                    {skill}
                    {isSelected && " ✓"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1.5">
          {selected.length} skill{selected.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
