import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const OPTIONS = [
  { value: "light", label: "Light", description: "Always use a light theme", icon: Sun },
  { value: "dark", label: "Dark", description: "Always use a dark theme", icon: Moon },
  { value: "system", label: "System", description: "Match your device settings", icon: Monitor },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  // next-themes is client-only; avoid hydration/SSR mismatch flicker
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {OPTIONS.map(({ value, label, description, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={`relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors ${
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40 hover:bg-muted/40"
            }`}
          >
            {active && (
              <Check className="absolute top-3 right-3 h-4 w-4 text-primary" />
            )}
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">{label}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
