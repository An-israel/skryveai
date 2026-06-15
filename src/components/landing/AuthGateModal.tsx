import { Link } from "react-router-dom";
import { X, LogIn, UserPlus } from "lucide-react";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
  actionLabel?: string;
}

export function AuthGateModal({ open, onClose, actionLabel = "continue" }: AuthGateModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d0d0f] p-7 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 flex items-center justify-center mb-4">
          <UserPlus className="w-5 h-5 text-[#2563EB]" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1.5">
          Create a free account to {actionLabel}
        </h3>
        <p className="text-[13px] text-white/40 leading-relaxed mb-6">
          Sign up takes under a minute — then you can apply, register, and start learning right away.
        </p>

        <div className="flex flex-col gap-2">
          <Link
            to="/signup"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-[#09090b] text-[13px] font-semibold hover:bg-white/90 transition-all"
          >
            Create free account <UserPlus className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[0.12] text-white/70 text-[13px] font-medium hover:border-white/25 hover:text-white transition-all"
          >
            I already have an account <LogIn className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
