// LoadingSpinner — accessible inline + full-section loading indicator.

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  fullPage?: boolean;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function LoadingSpinner({
  size = "md",
  label = "Loading",
  className,
  fullPage = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        "flex items-center justify-center gap-3 text-muted-foreground",
        fullPage && "min-h-screen",
        className,
      )}
    >
      <Loader2 className={cn("animate-spin text-primary", sizeMap[size])} />
      <output className="text-sm font-body sr-only" aria-live="polite">
        {label}
      </output>
    </div>
  );

  return spinner;
}
