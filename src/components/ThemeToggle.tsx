import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 rounded-full"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      )}
    </Button>
  )
}
