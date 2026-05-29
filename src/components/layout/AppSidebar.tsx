import { NavLink, useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard, Briefcase, Store, ClipboardList, FolderOpen,
  CalendarDays, BookOpen, MessageSquare, FileText, Users,
  PlusCircle, Settings, LogOut, Bell, ChevronRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { SkryveRole } from "@/hooks/use-skryve-role";

interface NavItem {
  label: string;
  to:    string;
  icon:  React.ComponentType<{ className?: string }>;
}

const talentNav: NavItem[] = [
  { label: "Dashboard",    to: "/dashboard",   icon: LayoutDashboard },
  { label: "Find Jobs",    to: "/jobs",         icon: Briefcase       },
  { label: "Marketplace",  to: "/marketplace",  icon: Store           },
  { label: "Applications", to: "/applications", icon: ClipboardList   },
  { label: "Projects",     to: "/projects",     icon: FolderOpen      },
  { label: "Events",       to: "/events",       icon: CalendarDays    },
  { label: "Learn",        to: "/learn",        icon: BookOpen        },
  { label: "Messages",     to: "/messages",     icon: MessageSquare   },
  { label: "CV Builder",   to: "/cv-builder",   icon: FileText        },
];

const clientNav: NavItem[] = [
  { label: "Dashboard",     to: "/dashboard",         icon: LayoutDashboard },
  { label: "Post a Job",    to: "/marketplace/post",  icon: PlusCircle      },
  { label: "Browse Talent", to: "/talent",            icon: Users           },
  { label: "My Jobs",       to: "/marketplace/my-jobs", icon: Briefcase     },
  { label: "Applications",  to: "/applications",      icon: ClipboardList   },
  { label: "Projects",      to: "/projects",          icon: FolderOpen      },
  { label: "Events",        to: "/events",            icon: CalendarDays    },
  { label: "Messages",      to: "/messages",          icon: MessageSquare   },
];

interface AppSidebarProps {
  role:          SkryveRole;
  userName:      string;
  userAvatar?:   string;
  unreadCount:   number;
  mobileOpen:    boolean;
  onMobileClose: () => void;
}

function NavItem({ label, to, icon: Icon, unreadCount = 0, onClose }: NavItem & { unreadCount?: number; onClose?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-[7px] text-[13px] font-medium rounded-md transition-all duration-100 group relative ${
          isActive ? "nav-active" : "nav-inactive"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-[15px] h-[15px] shrink-0 transition-colors ${isActive ? "opacity-100" : "opacity-50 group-hover:opacity-75"}`} />
          <span className="truncate">{label}</span>
          {label === "Messages" && unreadCount > 0 && (
            <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ role, userName, userAvatar, unreadCount, onClose }: Omit<AppSidebarProps, "mobileOpen" | "onMobileClose"> & { onClose?: () => void }) {
  const navigate = useNavigate();
  const nav = role === "client" ? clientNav : talentNav;

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
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border select-none">

      {/* Logo */}
      <div className="h-14 flex items-center px-4 shrink-0">
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
          <span className="font-display font-bold text-[15px] tracking-tight text-sidebar-accent-foreground">
            Skryve
          </span>
        </NavLink>

        {/* Role chip */}
        <span className={`ml-auto text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded ${
          role === "client"
            ? "text-amber-400 bg-amber-400/10"
            : "text-primary bg-primary/10"
        }`}>
          {role === "client" ? "Client" : "Talent"}
        </span>
      </div>

      <div className="h-px bg-sidebar-border mx-0 shrink-0" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-px">
        {nav.map(({ label, to, icon }) => (
          <NavItem key={to} label={label} to={to} icon={icon} unreadCount={label === "Messages" ? unreadCount : 0} onClose={onClose} />
        ))}
      </nav>

      {/* Bottom utilities */}
      <div className="h-px bg-sidebar-border shrink-0" />
      <div className="py-3 px-2 space-y-px shrink-0">
        <NavItem label="Notifications" to="/notifications" icon={Bell} unreadCount={unreadCount} onClose={onClose} />
        <NavItem label="Settings" to="/settings" icon={Settings} onClose={onClose} />
      </div>

      {/* Profile row */}
      <div className="h-px bg-sidebar-border shrink-0" />
      <div className="p-3 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors group" onClick={() => { navigate("/profile"); onClose?.(); }}>
          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden ring-1 ring-sidebar-border">
            {userAvatar
              ? <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-sidebar-accent-foreground truncate leading-none mb-0.5">
              {userName.split(" ")[0] || "Account"}
            </p>
            <p className="text-[11px] text-sidebar-foreground truncate leading-none">View profile</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground/40 shrink-0 group-hover:text-sidebar-foreground/70 transition-colors" />
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-[7px] mt-1 text-[13px] font-medium text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/8 rounded-md transition-all duration-100"
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );
}

export function AppSidebar({ role, userName, userAvatar, unreadCount, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar — fixed */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[220px] z-40">
        <SidebarContent role={role} userName={userName} userAvatar={userAvatar} unreadCount={unreadCount} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="p-0 w-[220px] bg-sidebar border-sidebar-border">
          <SidebarContent role={role} userName={userName} userAvatar={userAvatar} unreadCount={unreadCount} onClose={onMobileClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
