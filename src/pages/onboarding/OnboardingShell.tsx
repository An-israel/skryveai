import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  showSkip?: boolean;
  onSkip?: () => void;
}

export default function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  isLoading = false,
  children,
  showSkip = false,
  onSkip,
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Skryve" className="h-8 w-8 object-contain" />
            <span className="font-bold text-gray-900 text-lg">Skryve</span>
          </div>
          <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
        </div>
        <div className="h-1 bg-gray-100 w-full">
          <div
            className="h-1 bg-[#2563EB] transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
          {subtitle && <p className="text-gray-500 mb-6">{subtitle}</p>}
          {children}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            {step > 1 && onBack && (
              <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showSkip && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Skip for now
              </button>
            )}
            <Button
              onClick={onNext}
              disabled={nextDisabled || isLoading}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white min-w-[120px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : nextLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
