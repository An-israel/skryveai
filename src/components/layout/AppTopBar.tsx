import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Menu, Search, Bell, Settings, CreditCard, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/jobs":         "Find Jobs",
  "/marketplace":  "Marketplace",
  "/applications": "Applications",
  "/projects":     "Projects",
  "/events":       "Events",
  "/learn":        "Learn",
  "/cv-builder":   "CV Builder",
  "/messages":     "Messages",
  "/notifications":"Notifications",
  "/settings":     "Settings",
  "/billing":      "Billing",
  "/profile":      "My Profile",
  "/referrals":    "Referrals",
  "/team":         "Team",
  "/ats-checker":  "ATS Score Checker",
  "/linkedin-analyzer": "LinkedIn Analyzer",
};

function getTitle(pathname: string): string {
  // exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // prefix match for dynamic routes
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return label;
  }
  return "Skryve";
}

interface AppTopBarProps {
  userName:     string;
  userAvatar?:  string;
  unreadCount:  number;
  onMenuClick:  () => void;
}

export function AppTopBar({ userName, userAvatar, unreadCount, onMenuClick }: AppTopBarProps) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const pageTitle = getTitle(location.pathname);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="font-display font-bold text-lg tracking-tight text-foreground hidden sm:block">
        {pageTitle}
      </h1>

      {/* Search */}
      <div className="flex-1 max-w-sm ml-auto sm:ml-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, talent, events…"
            className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 text-sm"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 ml-auto sm:ml-0">
        {/* Notifications bell */}
        <Link to="/notifications">
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-muted transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold uppercase overflow-hidden">
                {userAvatar
                  ? <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                  : (userName.charAt(0) || "U")
                }
              </div>
              <span className="text-sm font-medium text-foreground hidden lg:block max-w-[100px] truncate">
                {userName.split(" ")[0] || "Account"}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/billing" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
