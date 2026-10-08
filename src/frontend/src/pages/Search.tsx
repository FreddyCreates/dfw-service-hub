// Search — provider/browse page with URL-synced filters.
// Category, keyword, service area, rating, price range, and sort options
// all flow through TanStack Router search params so results are shareable.

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ServiceProviderCard } from "@/components/ServiceProviderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useSearchProviders } from "@/hooks/useQueries";
import {
  CATEGORY_LABELS,
  type SearchResult,
  type ServiceCategory,
} from "@/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Filter, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

// Route search params (must match App.tsx validateSearch + extensions).
interface SearchPageParams {
  category?: string;
  serviceArea?: string;
  keyword?: string;
  minRating?: string;
  maxPrice?: string;
  sort?: string;
}

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: "boxTruck", label: CATEGORY_LABELS.boxTruck },
  { value: "relocation", label: CATEGORY_LABELS.relocation },
  { value: "trashHaul", label: CATEGORY_LABELS.trashHaul },
  { value: "moving", label: CATEGORY_LABELS.moving },
];

const RATING_OPTIONS = [
  { value: "0", label: "Any rating" },
  { value: "3", label: "3.0+" },
  { value: "4", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Highest rated" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
];

const MAX_PRICE_CENTS = 100000; // $1,000 cap for the slider

function averageRating(result: SearchResult): number {
  const count = Number(result.provider.ratingCount);
  if (count === 0) return 0;
  return Number(result.provider.ratingSum) / count;
}

function priceCents(result: SearchResult): number {
  return Number(result.listing.priceCents);
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function SearchPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as SearchPageParams;

  // Local state mirrors URL for the keyword + area inputs (debounced via submit).
  const [keyword, setKeyword] = useState(search.keyword ?? "");
  const [serviceArea, setServiceArea] = useState(search.serviceArea ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const category = search.category as ServiceCategory | undefined;
  const minRating = search.minRating ? Number(search.minRating) : undefined;
  const maxPrice = search.maxPrice ? Number(search.maxPrice) : undefined;
  const sort = search.sort ?? "rating";

  const filters = useMemo(
    () => ({
      category: category,
      serviceArea: search.serviceArea,
      keyword: search.keyword,
      minRating: minRating,
      maxPriceCents: maxPrice !== undefined ? BigInt(maxPrice) : undefined,
    }),
    [category, search.serviceArea, search.keyword, minRating, maxPrice],
  );

  const { data: results, isLoading } = useSearchProviders(filters);

  const sortedResults = useMemo(() => {
    const list = [...(results ?? [])];
    if (sort === "rating") {
      list.sort((a, b) => averageRating(b) - averageRating(a));
    } else if (sort === "priceAsc") {
      list.sort((a, b) => priceCents(a) - priceCents(b));
    } else if (sort === "priceDesc") {
      list.sort((a, b) => priceCents(b) - priceCents(a));
    }
    return list;
  }, [results, sort]);

  const updateSearch = (patch: Partial<SearchPageParams>) => {
    void navigate({
      to: "/search",
      search: {
        category: search.category,
        serviceArea: search.serviceArea,
        keyword: search.keyword,
        minRating: search.minRating,
        maxPrice: search.maxPrice,
        sort: search.sort,
        ...patch,
      },
    });
  };

  const handleKeywordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearch({
      keyword: keyword || undefined,
      serviceArea: serviceArea || undefined,
    });
  };

  const handleCategoryChange = (value: string) => {
    updateSearch({
      category: value === "all" ? undefined : value,
    });
  };

  const handleRatingChange = (value: string) => {
    updateSearch({
      minRating: value === "0" ? undefined : value,
    });
  };

  const handleSortChange = (value: string) => {
    updateSearch({ sort: value });
  };

  const handlePriceChange = (value: number[]) => {
    const v = value[0];
    updateSearch({
      maxPrice: v >= MAX_PRICE_CENTS ? undefined : String(v),
    });
  };

  const handleClearFilters = () => {
    setKeyword("");
    setServiceArea("");
    void navigate({
      to: "/search",
      search: { sort: "rating" },
    });
  };

  const hasActiveFilters =
    !!category ||
    !!search.keyword ||
    !!search.serviceArea ||
    minRating !== undefined ||
    maxPrice !== undefined;

  return (
    <div className="bg-background min-h-screen" data-ocid="page.search">
      {/* Search header */}
      <section
        className="bg-card border-b border-border"
        data-ocid="search.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
            Find a provider
          </h1>
          <p className="text-sm text-muted-foreground font-body mb-6">
            Browse verified box truck, relocation, trash haul, and moving
            professionals across Dallas-Fort Worth.
          </p>

          {/* Keyword + area search bar */}
          <form
            onSubmit={handleKeywordSubmit}
            className="flex flex-col sm:flex-row gap-3"
            data-ocid="search.search_form"
          >
            <div className="relative flex-1">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="text"
                placeholder="What do you need hauled?"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10"
                aria-label="Search keyword"
                data-ocid="search.keyword_input"
              />
            </div>
            <div className="relative sm:w-48">
              <Input
                type="text"
                placeholder="DFW area (e.g. Plano)"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                aria-label="Service area"
                data-ocid="search.area_input"
              />
            </div>
            <Button type="submit" data-ocid="search.submit_button">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              data-ocid="search.filters_toggle"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden />
              Filters
            </Button>
          </form>

          {/* Filter row */}
          {showFilters ? (
            <div
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-secondary/40 border border-border"
              data-ocid="search.filters_panel"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-category" className="text-xs">
                  Category
                </Label>
                <Select
                  value={category ?? "all"}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger
                    id="filter-category"
                    className="w-full"
                    data-ocid="search.category_select"
                  >
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-rating" className="text-xs">
                  Minimum rating
                </Label>
                <Select
                  value={String(minRating ?? 0)}
                  onValueChange={handleRatingChange}
                >
                  <SelectTrigger
                    id="filter-rating"
                    className="w-full"
                    data-ocid="search.rating_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-sort" className="text-xs">
                  Sort by
                </Label>
                <Select value={sort} onValueChange={handleSortChange}>
                  <SelectTrigger
                    id="filter-sort"
                    className="w-full"
                    data-ocid="search.sort_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-price" className="text-xs">
                  Max price:{" "}
                  {maxPrice !== undefined ? formatPrice(maxPrice) : "Any"}
                </Label>
                <Slider
                  id="filter-price"
                  min={0}
                  max={MAX_PRICE_CENTS}
                  step={5000}
                  value={[maxPrice ?? MAX_PRICE_CENTS]}
                  onValueChange={handlePriceChange}
                  data-ocid="search.price_slider"
                />
              </div>
            </div>
          ) : null}

          {/* Active filter chips */}
          {hasActiveFilters ? (
            <div
              className="mt-4 flex flex-wrap items-center gap-2"
              data-ocid="search.active_filters"
            >
              {category ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-body text-primary">
                  {CATEGORY_LABELS[category]}
                </span>
              ) : null}
              {search.keyword ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-3 py-1 text-xs font-body text-foreground">
                  “{search.keyword}”
                </span>
              ) : null}
              {search.serviceArea ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-3 py-1 text-xs font-body text-foreground">
                  {search.serviceArea}
                </span>
              ) : null}
              {minRating !== undefined ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-3 py-1 text-xs font-body text-foreground">
                  {minRating}+ stars
                </span>
              ) : null}
              {maxPrice !== undefined ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-3 py-1 text-xs font-body text-foreground">
                  Under {formatPrice(maxPrice)}
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground hover:text-foreground"
                data-ocid="search.clear_filters"
              >
                <X className="w-3.5 h-3.5" aria-hidden />
                Clear all
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Results */}
      <section
        className="container mx-auto px-4 lg:px-6 py-8"
        data-ocid="search.results"
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground font-body">
            {isLoading
              ? "Searching…"
              : `${sortedResults.length} provider${sortedResults.length === 1 ? "" : "s"} found`}
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner label="Loading providers" />
        ) : sortedResults.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No providers match your search"
            description="Try adjusting your filters — broaden the service area, lower the minimum rating, or clear all filters to see every provider."
            action={
              hasActiveFilters ? (
                <Button
                  onClick={handleClearFilters}
                  data-ocid="search.empty_clear"
                >
                  Clear all filters
                </Button>
              ) : undefined
            }
            data-ocid="search.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedResults.map((result, i) => (
              <ServiceProviderCard
                key={result.provider.id}
                provider={result.provider}
                index={i}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
