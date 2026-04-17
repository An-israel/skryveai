import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Forces light mode while mounted, and restores the user's prior theme
 * preference on unmount. Use to wrap public/marketing/auth routes so
 * those pages always render light, while authenticated app pages keep
 * the user's chosen theme (light or dark).
 */
export function PublicThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Snapshot whatever the user had set before we forced light
    const previous = theme;
    setTheme("light");
    return () => {
      // Restore on unmount (when user navigates into the app)
      if (previous && previous !== "light") {
        setTheme(previous);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
