// CategoryCard — clickable tile for the four DFW service categories.

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type ServiceCategory } from "@/types";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Truck } from "lucide-react";

interface CategoryCardProps {
  category: ServiceCategory;
  count?: number;
  className?: string;
  index?: number;
}

const categoryIcons: Record<ServiceCategory, typeof Truck> = {
  boxTruck: Truck,
  relocation: Truck,
  trashHaul: Truck,
  moving: Truck,
};

const categoryAccents: Record<ServiceCategory, string> = {
  boxTruck: "from-primary/10 to-primary/5",
  relocation: "from-accent/10 to-accent/5",
  trashHaul: "from-success/10 to-success/5",
  moving: "from-warning/10 to-warning/5",
};

export function CategoryCard({
  category,
  count,
  className,
  index = 0,
}: CategoryCardProps) {
  const Icon = categoryIcons[category];
  const label = CATEGORY_LABELS[category];

  return (
    <Link
      to="/search"
      search={{ category }}
      data-ocid={`category_card.${index + 1}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-smooth hover:shadow-md hover:-translate-y-0.5 border-border py-0",
          className,
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-60",
            categoryAccents[category],
          )}
          aria-hidden
        />
        <div className="relative p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border">
              <Icon className="w-6 h-6 text-primary" aria-hidden />
            </div>
            <ArrowRight
              className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth"
              aria-hidden
            />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {label}
            </h3>
            {count !== undefined ? (
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                {count} {count === 1 ? "provider" : "providers"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                Browse local pros
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
