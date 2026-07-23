// EmptyState — helpful visual + headline + primary action for empty collections.

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  "data-ocid"?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  const ocid = rest["data-ocid"];
  return (
    <div
      data-ocid={ocid ?? "empty_state"}
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-border bg-card/50",
        className,
      )}
    >
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-1">
        {title}
      </h3>
      {description ? (
        <p className="text-sm text-muted-foreground max-w-sm mb-6 font-body">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
