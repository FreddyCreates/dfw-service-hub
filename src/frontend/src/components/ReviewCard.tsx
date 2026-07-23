// ReviewCard — customer review display with optional provider response.

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Review } from "@/types";
import { StarRating } from "./StarRating";

interface ReviewCardProps {
  review: Review;
  customerName?: string;
  index?: number;
  className?: string;
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ReviewCard({
  review,
  customerName = "Customer",
  index = 0,
  className,
}: ReviewCardProps) {
  return (
    <Card
      data-ocid={`review_card.${index + 1}`}
      className={cn("py-0", className)}
    >
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-secondary text-primary font-display text-sm font-semibold">
              {initials(customerName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-body font-medium text-foreground truncate">
                {customerName}
              </h4>
              <span className="text-xs text-muted-foreground font-body shrink-0">
                {formatDate(review.createdAt)}
              </span>
            </div>
            <StarRating value={review.rating} size="sm" className="mt-1" />
          </div>
        </div>
        <p className="text-sm text-foreground font-body leading-relaxed">
          {review.writtenText}
        </p>
        {review.providerResponse ? (
          <div className="mt-1 rounded-lg bg-secondary/60 border border-border p-3">
            <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
              Provider response
            </p>
            <p className="text-sm text-foreground font-body leading-relaxed">
              {review.providerResponse}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
