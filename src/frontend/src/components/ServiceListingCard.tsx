// ServiceListingCard — marketplace listing preview card with price + area.
// Used on the Home featured-services section and reusable across browse views.

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CATEGORY_SHORT,
  PRICE_UNIT_LABELS,
  type PriceUnit,
  type ServiceListing,
} from "@/types";
import { Link } from "@tanstack/react-router";
import { MapPin, Package } from "lucide-react";

interface ServiceListingCardProps {
  listing: ServiceListing;
  index?: number;
  className?: string;
}

function formatPrice(cents: bigint): string {
  const dollars = Number(cents) / 100;
  return dollars % 1 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}

export function ServiceListingCard({
  listing,
  index = 0,
  className,
}: ServiceListingCardProps) {
  const cover = listing.photos[0];
  const unit = PRICE_UNIT_LABELS[listing.priceUnit as PriceUnit] ?? "job";

  return (
    <Link
      to="/listings/$listingId"
      params={{ listingId: listing.id }}
      data-ocid={`listing_card.${index + 1}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card
        className={cn(
          "group h-full overflow-hidden transition-smooth hover:shadow-md hover:-translate-y-0.5 cursor-pointer py-0",
          className,
        )}
      >
        {/* Cover image */}
        <div className="relative h-40 bg-secondary overflow-hidden">
          {cover ? (
            <img
              src={cover}
              alt={listing.title}
              loading="lazy"
              className="w-full h-full object-cover transition-smooth group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package
                className="w-10 h-10 text-muted-foreground/40"
                aria-hidden
              />
            </div>
          )}
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 bg-card/90 backdrop-blur font-body text-xs"
          >
            {CATEGORY_SHORT[listing.category]}
          </Badge>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3 h-full">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground leading-tight line-clamp-1">
              {listing.title}
            </h3>
            <p className="text-sm text-muted-foreground font-body line-clamp-2 mt-1 min-h-[2.5rem]">
              {listing.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex flex-col">
              <span className="font-display text-lg font-semibold text-foreground leading-none">
                {formatPrice(listing.priceCents)}
              </span>
              <span className="text-xs text-muted-foreground font-body mt-0.5">
                per {unit}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              <span className="truncate max-w-[8rem]">
                {listing.serviceArea}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
