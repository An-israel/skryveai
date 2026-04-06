import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Settings, Shield, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export function Header({ isAuthenticated: isAuthenticatedProp, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authState, setAuthState] = useState<boolean>(isAuthenticatedProp ?? false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAutoPilotActive = location.pathname === "/auto-pilot";

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthState(!!session);
      if (session) {
        checkAdminRole(session.user.id);
      }
    };

    if (isAuthenticatedProp !== undefined) {
      setAuthState(isAuthenticatedProp);
      if (isAuthenticatedProp) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) checkAdminRole(user.id);
        });
      }
    } else {
      checkAuth();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(!!session);
      if (session) checkAdminRole(session.user.id);
      else setIsAdmin(false);
    });

    return () => subscription.unsubscribe();
  }, [isAuthenticatedProp]);

  const checkAdminRole = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const hasAdminRole = roles?.some(r => 
      ["super_admin", "content_editor", "support_agent"].includes(r.role)
    );
    setIsAdmin(!!hasAdminRole);
  };

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await supabase.auth.signOut();
      navigate("/");
    }
  };

  const isAuthenticated = authState;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
      <div className="container mx-auto px-4 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="SkryveAI logo" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-xl text-foreground tracking-tight">SkryveAI</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Public links */}
          <div className="flex items-center gap-0.5 mr-3">
            <Link to="/about" className="px-3 py-1.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors rounded-lg hover:bg-muted/40">
              About
            </Link>
            <Link to="/pricing" className="px-3 py-1.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors rounded-lg hover:bg-muted/40">
              Pricing
            </Link>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-0.5">
              <Link to="/dashboard" className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                Dashboard
              </Link>
              <Link to="/campaigns/new" className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                New Campaign
              </Link>
              <Link to="/team" className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                Team
              </Link>

              {/* ── Auto-Pilot CTA ── */}
              <Link
                to="/auto-pilot"
                className={`
                  relative ml-2 flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold
                  transition-all duration-300 hover:scale-[1.05]
                  ${isAutoPilotActive
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.6)] ring-2 ring-primary/30"
                    : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_4px_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_4px_28px_hsl(var(--primary)/0.6)] ring-1 ring-primary/20 animate-[pulse-glow_2s_ease-in-out_infinite]"
                  }
                `}
              >
                <Zap className="w-4 h-4" fill="currentColor" />
                Auto-Pilot
                {!isAutoPilotActive && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                  </span>
                )}
              </Link>

              {isAdmin && (
                <Link to="/admin" className="p-2 ml-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                  <Shield className="w-4 h-4" />
                </Link>
              )}
              <NotificationBell />
              <Link to="/settings" className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                <Settings className="w-4 h-4" />
              </Link>
              <ThemeToggle />
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" onClick={handleLogout} className="text-sm font-medium text-muted-foreground hover:text-foreground px-3">
                Log Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <ThemeToggle />
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Button asChild className="rounded-full px-6 font-bold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02]">
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
              <Link to="/about" className="py-2 px-3 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground rounded-lg hover:bg-muted/40 transition-colors">
                About
              </Link>
              <Link to="/pricing" className="py-2 px-3 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground rounded-lg hover:bg-muted/40 transition-colors">
                Pricing
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
                    Dashboard
                  </Link>
                  <Link to="/campaigns/new" className="py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
                    New Campaign
                  </Link>
                  <Link to="/team" className="py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
                    Team
                  </Link>

                  {/* Mobile Auto-Pilot CTA */}
                  <Link
                    to="/auto-pilot"
                    className="mt-1 mx-0 py-3 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Zap className="w-4 h-4" fill="currentColor" />
                    Auto-Pilot
                    <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">NEW</span>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 flex items-center gap-2 transition-colors">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <div className="flex items-center gap-2 py-2 px-3">
                    <NotificationBell />
                    <span className="text-sm font-medium text-muted-foreground">Notifications</span>
                  </div>
                  <Link to="/settings" className="py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
                    Settings
                  </Link>
                  <div className="h-px bg-border my-1" />
                  <Button variant="ghost" onClick={handleLogout} className="justify-start px-3">
                    Log Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
                    Sign In
                  </Link>
                  <div className="pt-2">
                    <Button asChild className="w-full rounded-full font-bold shadow-glow">
                      <Link to="/signup">Get Started</Link>
                    </Button>
                  </div>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
