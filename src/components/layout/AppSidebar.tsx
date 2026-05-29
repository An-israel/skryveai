import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Briefcase, Store, ClipboardList, FolderOpen,
  CalendarDays, BookOpen, MessageSquare, FileText, Users,
  PlusCircle, Settings, LogOut, Bell, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { SkryveRole } from "@/hooks/use-skryve-role";

interface NavItem {
  label:  string;
  to:     string;
  icon:   React.ComponentType<{ className?: string }>;
}

const talentNav: NavItem[] = [
  { label: "Dashboard",    to: "/dashboard",     icon: LayoutDashboard },
  { label: "Find Jobs",    to: "/jobs",           icon: Briefcase       },
  { label: "Marketplace",  to: "/marketplace",    icon: Store           },
  { label: "Applications", to: "/applications",   icon: ClipboardList   },
  { label: "Projects",     to: "/projects",       icon: FolderOpen      },
  { label: "Events",       to: "/events",         icon: CalendarDays    },
  { label: "Learn",        to: "/learn",          icon: BookOpen        },
  { label: "Messages",     to: "/messages",       icon: MessageSquare   },
  { label: "CV Builder",   to: "/cv-builder",     icon: FileText        },
];

const clientNav: NavItem[] = [
  { label: "Dashboard",       to: "/dashboard",            icon: LayoutDashboard },
  { label: "Post a Job",      to: "/marketplace/new",       icon: PlusCircle      },
  { label: "Browse Talent",   to: "/marketplace?view=talent", icon: Users         },
  { label: "My Jobs",         to: "/marketplace",            icon: Briefcase      },
  { label: "Applications",    to: "/applications",           icon: ClipboardList  },
  { label: "Projects",        to: "/projects",               icon: FolderOpen     },
  { label: "Events",          to: "/events",                 icon: CalendarDays   },
  { label: "Messages",        to: "/messages",               icon: MessageSquare  },
];

interface AppSidebarProps {
  role:          SkryveRole;
  userName:      string;
  userAvatar?:   string;
  unreadCount:   number;
  mobileOpen:    boolean;
  onMobileClose: () => void;
}

function SidebarContent({ role, userName, userAvatar, unreadCount, onClose }: Omit<AppSidebarProps, "mobileOpen" | "onMobileClose"> & { onClose?: () => void }) {
  const navigate = useNavigate();
  const nav = role === "client" ? clientNav : talentNav;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
    }`;

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <NavLink to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Skryve" className="w-7 h-7 object-contain" />
          <span className="font-display font-bold text-lg text-sidebar-foreground tracking-tight">Skryve</span>
        </NavLink>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4 pb-2">
        <Badge
          variant="outline"
          className={`text-[10px] font-bold uppercase tracking-wider ${
            role === "client"
              ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
              : "border-primary/40 text-primary bg-primary/10"
          }`}
        >
          {role === "client" ? "Client" : "Talent"} account
        </Badge>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {nav.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/dashboard"} className={linkClass} onClick={onClose}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
            {label === "Messages" && unreadCount > 0 && (
              <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5 shrink-0">
        <NavLink
          to="/notifications"
          className={linkClass}
          onClick={onClose}
        >
          <Bell className="w-4 h-4 shrink-0" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-[10px] p-0 px-1">
              {unreadCount}
            </Badge>
          )}
        </NavLink>

        <NavLink to="/settings" className={linkClass} onClick={onClose}>
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </NavLink>

        {/* Profile row */}
        <NavLink to="/profile" className={`${linkClass({ isActive: false })} mt-2`} onClick={onClose}>
          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0 overflow-hidden">
            {userAvatar
              ? <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              : userName.charAt(0) || "U"
            }
          </div>
          <span className="flex-1 min-w-0 truncate text-sm">{userName.split(" ")[0] || "Profile"}</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
        </NavLink>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 px-3 h-10"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Log Out
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar({ role, userName, userAvatar, unreadCount, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar — fixed */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-40">
        <SidebarContent role={role} userName={userName} userAvatar={userAvatar} unreadCount={unreadCount} />
      </aside>

      {/* Mobile sidebar — sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent role={role} userName={userName} userAvatar={userAvatar} unreadCount={unreadCount} onClose={onMobileClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
