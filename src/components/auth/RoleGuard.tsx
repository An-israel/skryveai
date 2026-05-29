import { Navigate } from "react-router-dom";
import { useSkryveRole, type SkryveRole } from "@/hooks/use-skryve-role";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRole: "talent" | "client";
  userId: string | null | undefined;
  fallback?: string;
}

export function RoleGuard({ children, allowedRole, userId, fallback = "/dashboard" }: RoleGuardProps) {
  const role = useSkryveRole(userId);

  if (role === "loading") {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (role !== allowedRole && role !== "none") {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
