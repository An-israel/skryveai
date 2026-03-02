import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface PageGuardProps {
  children: React.ReactNode;
}

export function PageGuard({ children }: PageGuardProps) {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "enabled" | "disabled">("loading");

  useEffect(() => {
    const check = async () => {
      // Always allow admin and payment callback
      if (location.pathname === "/admin" || location.pathname === "/payment/callback") {
        setStatus("enabled");
        return;
      }

      const { data } = await supabase
        .from("site_pages")
        .select("is_enabled")
        .eq("route", location.pathname)
        .maybeSingle();

      // If page not in table, allow it (e.g. catch-all)
      if (!data) {
        setStatus("enabled");
        return;
      }

      setStatus(data.is_enabled ? "enabled" : "disabled");
    };

    check();
  }, [location.pathname]);

  if (status === "loading") return null;

  if (status === "disabled") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="max-w-md w-full border-0 shadow-xl text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Page Unavailable</h2>
            <p className="text-muted-foreground">
              This page is currently unavailable. Please check back later.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
