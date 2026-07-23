// ServiceProviderCard — marketplace provider preview card with rating + areas.

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CATEGORY_SHORT, type Provider, VERIFICATION_LABELS } from "@/types";
import { Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck } from "lucide-react";
import { StarRating } from "./StarRating";

interface ServiceProviderCardProps {
  provider: Provider;
  index?: number;
  className?: string;
}

function averageRating(provider: Provider): number {
  const count = Number(provider.ratingCount);
  if (count === 0) return 0;
  return Number(provider.ratingSum) / count;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ServiceProviderCard({
  provider,
  index = 0,
  className,
}: ServiceProviderCardProps) {
  const rating = averageRating(provider);
  const reviewCount = Number(provider.ratingCount);
  const isVerified = provider.verificationStatus === "approved";

  return (
    <Link
      to="/providers/$providerId"
      params={{ providerId: provider.id }}
      data-ocid={`provider_card.${index + 1}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card
        className={cn(
          "group h-full transition-smooth hover:shadow-md hover:-translate-y-0.5 cursor-pointer py-0",
          className,
        )}
      >
        <div className="p-5 flex flex-col gap-4 h-full">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12 rounded-xl border border-border">
              {provider.logo ? (
                <AvatarImage src={provider.logo} alt={provider.companyName} />
              ) : null}
              <AvatarFallback className="rounded-xl bg-secondary text-primary font-display font-semibold">
                {initials(provider.companyName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-foreground truncate leading-tight">
                {provider.companyName}
              </h3>
              {isVerified ? (
                <div className="flex items-center gap-1 mt-1">
                  <ShieldCheck
                    className="w-3.5 h-3.5 text-success"
                    aria-hidden
                  />
                  <span className="text-xs text-success font-body font-medium">
                    {VERIFICATION_LABELS.approved}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground font-body mt-1 block">
                  {VERIFICATION_LABELS[provider.verificationStatus]}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-body line-clamp-2 min-h-[2.5rem]">
            {provider.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {provider.serviceCategories.slice(0, 3).map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="font-body text-xs"
              >
                {CATEGORY_SHORT[cat]}
              </Badge>
            ))}
          </div>

          <div className="mt-auto pt-2 flex items-center justify-between border-t border-border">
            <StarRating
              value={rating}
              size="sm"
              showValue
              count={reviewCount}
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              <span className="truncate max-w-[8rem]">
                {provider.serviceAreas[0] ?? "DFW"}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
