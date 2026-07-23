// StarRating — display + interactive star rating for reviews.

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
  showValue?: boolean;
  count?: number;
  className?: string;
}

const sizeMap = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function StarRating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  onChange,
  showValue = false,
  count,
  className,
}: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={`Rating: ${value} out of ${max} stars${
        count !== undefined ? ` from ${count} reviews` : ""
      }`}
    >
      <div className="flex items-center gap-0.5">
        {stars.map((star) => {
          const filled = star <= Math.round(value);
          const Icon = Star;
          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={interactive ? () => onChange?.(star) : undefined}
              aria-label={
                interactive ? `${star} star${star > 1 ? "s" : ""}` : undefined
              }
              role={interactive ? "radio" : undefined}
              aria-checked={
                interactive ? star === Math.round(value) : undefined
              }
              className={cn(
                "transition-smooth",
                interactive &&
                  "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
                !interactive && "cursor-default",
              )}
            >
              <Icon
                className={cn(
                  sizeMap[size],
                  filled
                    ? "fill-accent text-accent"
                    : "fill-transparent text-muted-foreground/40",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      {showValue ? (
        <span className="text-sm font-body font-medium text-foreground">
          {value.toFixed(1)}
          {count !== undefined ? (
            <span className="text-muted-foreground ml-1">({count})</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
