import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, Users, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { switchActiveRole, type SkryveRole } from "@/hooks/use-skryve-role";
import { useToast } from "@/hooks/use-toast";

interface RoleSwitcherProps {
  userId: string;
  role: SkryveRole;
}

const LABEL: Record<"talent" | "client", string> = {
  talent: "Talent",
  client: "Client",
};

export function RoleSwitcher({ userId, role }: RoleSwitcherProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(false);

  if (role !== "talent" && role !== "client") return null;
  const current = role as "talent" | "client";
  const Icon = current === "client" ? Users : Briefcase;

  const handleSwitch = async (target: "talent" | "client") => {
    if (target === current || switching) return;
    setSwitching(true);
    try {
      const { navigateTo } = await switchActiveRole(userId, target);
      if (navigateTo === "/dashboard") {
        // Hard reload so every component re-reads the new active role.
        window.location.assign("/dashboard");
      } else if (navigateTo) {
        navigate(navigateTo);
      }
    } catch (e) {
      console.error("role switch failed", e);
      toast({ title: "Couldn't switch mode", description: "Please try again.", variant: "destructive" });
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 py-1 px-2 rounded-md border border-border hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Switch mode"
        >
          {switching
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-[12px] font-medium text-foreground hidden sm:block">{LABEL[current]}</span>
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 text-[13px]">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Switch mode
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleSwitch("talent")} className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#2563EB]" />
          <div className="flex-1">
            <p className="font-medium">Talent</p>
            <p className="text-[11px] text-muted-foreground">Find work &amp; get hired</p>
          </div>
          {current === "talent" && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleSwitch("client")} className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <div className="flex-1">
            <p className="font-medium">Client</p>
            <p className="text-[11px] text-muted-foreground">Hire &amp; manage talent</p>
          </div>
          {current === "client" && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
