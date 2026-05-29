import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Bell, Settings, CreditCard, LogOut, User, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ROUTES: Record<string, string[]> = {
  "/dashboard":          ["Dashboard"],
  "/jobs":               ["Jobs"],
  "/jobs/preferences":   ["Jobs", "Preferences"],
  "/jobs/saved":         ["Jobs", "Saved"],
  "/marketplace":        ["Marketplace"],
  "/marketplace/post":   ["Marketplace", "Post a Job"],
  "/marketplace/my-jobs":["Marketplace", "My Jobs"],
  "/talent":             ["Talent"],
  "/applications":       ["Applications"],
  "/projects":           ["Projects"],
  "/events":             ["Events"],
  "/events/post":        ["Events", "Post Event"],
  "/events/my-events":   ["Events", "My Events"],
  "/learn":              ["Learn"],
  "/learn/my-courses":   ["Learn", "My Courses"],
  "/cv-builder":         ["CV Builder"],
  "/cv-builder/new":     ["CV Builder", "New CV"],
  "/ats-checker":        ["Tools", "ATS Checker"],
  "/linkedin-analyzer":  ["Tools", "LinkedIn Analyzer"],
  "/messages":           ["Messages"],
  "/notifications":      ["Notifications"],
  "/settings":           ["Settings"],
  "/billing":            ["Billing"],
  "/profile":            ["Profile"],
  "/referrals":          ["Referrals"],
  "/team":               ["Team"],
  "/admin":              ["Admin"],
};

function getBreadcrumbs(pathname: string): string[] {
  if (ROUTES[pathname]) return ROUTES[pathname];
  for (const [key, crumbs] of Object.entries(ROUTES)) {
    if (pathname.startsWith(key + "/")) return crumbs;
  }
  return ["Skryve"];
}

interface AppTopBarProps {
  userName:    string;
  userAvatar?: string;
  unreadCount: number;
  onMenuClick: () => void;
}

export function AppTopBar({ userName, userAvatar, unreadCount, onMenuClick }: AppTopBarProps) {
  const location    = useLocation();
  const navigate    = useNavigate();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="h-12 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-3 sticky top-0 z-30">

      {/* Mobile menu trigger */}
      <button
        className="md:hidden -ml-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Breadcrumb path */}
      <nav className="flex items-center gap-1.5 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={`text-[13px] truncate ${
                i === breadcrumbs.length - 1
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex items-center gap-0.5">

        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="w-px h-4 bg-border mx-1.5" />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden ring-1 ring-border shrink-0">
                {userAvatar
                  ? <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              <span className="text-[13px] font-medium text-foreground hidden lg:block max-w-[96px] truncate">
                {userName.split(" ")[0] || "Account"}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44 text-[13px]">
            <div className="px-2 py-1.5 border-b border-border mb-1">
              <p className="font-medium text-foreground truncate">{userName || "Account"}</p>
            </div>
            <DropdownMenuItem asChild className="text-[13px]">
              <Link to="/profile" className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 opacity-60" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-[13px]">
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 opacity-60" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-[13px]">
              <Link to="/billing" className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 opacity-60" /> Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-[13px] text-destructive focus:text-destructive flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
