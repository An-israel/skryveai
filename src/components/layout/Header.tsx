import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X, Settings, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export function Header({ isAuthenticated, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkAdminRole();
    }
  }, [isAuthenticated]);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const hasAdminRole = roles?.some(r => 
        ["super_admin", "content_editor", "support_agent"].includes(r.role)
      );
      setIsAdmin(!!hasAdminRole);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-accent flex items-center justify-center shadow-md group-hover:shadow-glow transition-shadow">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-foreground">OutreachPro</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/campaigns/new" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                New Campaign
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Shield className="w-4 h-4" />
                </Link>
              )}
              <Link to="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="w-4 h-4" />
              </Link>
              <Button variant="ghost" onClick={onLogout}>
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Button asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link to="/pricing" className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Pricing
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    Dashboard
                  </Link>
                  <Link to="/campaigns/new" className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    New Campaign
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <Link to="/settings" className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    Settings
                  </Link>
                  <Button variant="ghost" onClick={onLogout} className="justify-start">
                    Log Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    Sign In
                  </Link>
                  <Button asChild className="w-full">
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
