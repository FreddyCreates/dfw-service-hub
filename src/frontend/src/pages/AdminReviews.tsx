// AdminReviews — review moderation for admins.
// Lists all reviews across providers with rating + provider info, filter by
// reported/flagged status, remove (hide) review with reason, view provider
// responses, and search.

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ReviewCard } from "@/components/ReviewCard";
import { StarRating } from "@/components/StarRating";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useListProviders,
  useListReviewsByProvider,
  useModerateReview,
} from "@/hooks/useQueries";
import type { Provider, Review } from "@/types";
import { EyeOff, MessageSquare, RotateCcw, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type VisibilityFilter = "all" | "hidden" | "visible";

function shortPrincipal(p: { toString: () => string }): string {
  const s = p.toString();
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

// A review is considered "flagged"/hidden when its writtenText is empty AND
// providerResponse is empty (moderateReview with "hide" clears text), or when
// the backend marks it moderated. We treat empty writtenText as hidden.
function isHidden(r: Review): boolean {
  return r.writtenText.trim() === "";
}

interface ReviewWithProvider {
  review: Review;
  provider: Provider | undefined;
}

// Per-provider reviews fetcher — calls useListReviewsByProvider once at the
// top level of a component (one hook per instance, never in a loop) and
// reports its data up through a stable callback. Mirrors the
// ProviderBookingsFetcher pattern in AdminBookings.tsx and the ProviderReviews
// pattern in AdminPortal.tsx.
function ProviderReviewsFetcher({
  providerId,
  onReviews,
}: {
  providerId: string;
  onReviews: (providerId: string, reviews: Review[]) => void;
}) {
  const { data, isLoading } = useListReviewsByProvider(providerId);
  useEffect(() => {
    onReviews(providerId, data ?? []);
  }, [data, providerId, onReviews]);
  // Surface per-provider loading state through the same callback channel so
  // the parent can derive a global loading flag without calling hooks in a
  // loop. We emit an empty list while loading to keep the contract simple.
  useEffect(() => {
    if (isLoading) onReviews(providerId, []);
  }, [isLoading, providerId, onReviews]);
  return null;
}

export function AdminReviews() {
  const { data: providers, isLoading: providersLoading } = useListProviders();
  const moderateMutation = useModerateReview();

  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ReviewWithProvider | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [confirmHide, setConfirmHide] = useState(false);

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    for (const p of providers ?? []) map.set(p.id, p);
    return map;
  }, [providers]);

  // Aggregate reviews across providers via a callback-driven Map. Each
  // ProviderReviewsFetcher component calls useListReviewsByProvider once at
  // its top level (no hooks in loops) and reports its data up through a
  // stable callback. A version counter forces re-derivation on mutation.
  const reviewsByProvider = useMemo(() => new Map<string, Review[]>(), []);
  const loadedProviders = useMemo(() => new Set<string>(), []);
  const [, setReviewsVersion] = useState(0);
  const handleProviderReviews = useMemo(
    () => (providerId: string, reviews: Review[]) => {
      const prev = reviewsByProvider.get(providerId);
      if (
        prev &&
        prev.length === reviews.length &&
        prev.every((r, i) => r.id === reviews[i]?.id)
      ) {
        loadedProviders.add(providerId);
        return;
      }
      reviewsByProvider.set(providerId, reviews);
      loadedProviders.add(providerId);
      setReviewsVersion((v) => v + 1);
    },
    [reviewsByProvider, loadedProviders],
  );

  const allReviews: ReviewWithProvider[] = useMemo(() => {
    const merged: ReviewWithProvider[] = [];
    for (const [providerId, reviews] of reviewsByProvider) {
      const provider = providerById.get(providerId);
      for (const review of reviews) {
        merged.push({ review, provider });
      }
    }
    return merged;
  }, [reviewsByProvider, providerById]);

  const perProviderLoading = useMemo(() => {
    if (!providers) return false;
    if (providers.length === 0) return false;
    return loadedProviders.size < providers.length;
  }, [providers, loadedProviders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minRating = ratingFilter === "all" ? 0 : Number(ratingFilter);
    return allReviews.filter(({ review, provider }) => {
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "hidden" && isHidden(review)) ||
        (visibilityFilter === "visible" && !isHidden(review));
      const matchesRating = review.rating >= minRating;
      const matchesSearch =
        q === "" ||
        review.writtenText.toLowerCase().includes(q) ||
        (review.providerResponse ?? "").toLowerCase().includes(q) ||
        (provider?.companyName ?? "").toLowerCase().includes(q) ||
        shortPrincipal(review.customerId).toLowerCase().includes(q);
      return matchesVisibility && matchesRating && matchesSearch;
    });
  }, [allReviews, search, visibilityFilter, ratingFilter]);

  const handleHide = (review: Review) => {
    moderateMutation.mutate(
      { reviewId: review.id, action: "hide" },
      {
        onSuccess: (updated) => {
          setSelected((prev) =>
            prev && prev.review.id === updated.id
              ? { review: updated, provider: prev.provider }
              : prev,
          );
          setHideReason("");
          setConfirmHide(false);
        },
      },
    );
  };

  const handleRestore = (review: Review) => {
    moderateMutation.mutate(
      { reviewId: review.id, action: "restore" },
      {
        onSuccess: (updated) => {
          setSelected((prev) =>
            prev && prev.review.id === updated.id
              ? { review: updated, provider: prev.provider }
              : prev,
          );
        },
      },
    );
  };

  const isLoading = providersLoading || perProviderLoading;

  return (
    <div className="bg-background" data-ocid="page.admin_reviews">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-primary">
            <Star className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium">Admin</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Review moderation
          </h1>
          <p className="text-muted-foreground font-body max-w-2xl">
            Review all customer feedback across the marketplace. Hide reviews
            that violate community guidelines and restore them when appropriate.
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviews, providers, customers"
              className="pl-9"
              data-ocid="admin_reviews.search_input"
            />
          </div>
          <Select
            value={visibilityFilter}
            onValueChange={(v) => setVisibilityFilter(v as VisibilityFilter)}
          >
            <SelectTrigger data-ocid="admin_reviews.visibility_filter">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reviews</SelectItem>
              <SelectItem value="visible">Visible only</SelectItem>
              <SelectItem value="hidden">Hidden / flagged</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger data-ocid="admin_reviews.rating_filter">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any rating</SelectItem>
              <SelectItem value="1">1+ stars</SelectItem>
              <SelectItem value="2">2+ stars</SelectItem>
              <SelectItem value="3">3+ stars</SelectItem>
              <SelectItem value="4">4+ stars</SelectItem>
              <SelectItem value="5">5 stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingSpinner label="Loading reviews" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews found"
            description={
              search || visibilityFilter !== "all" || ratingFilter !== "all"
                ? "Try adjusting your filters."
                : "No reviews have been submitted yet."
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(({ review, provider }, i) => {
              const hidden = isHidden(review);
              return (
                <div key={review.id} className="relative">
                  {hidden ? (
                    <Badge
                      variant="outline"
                      className="absolute top-3 right-3 z-10 border-destructive/30 bg-destructive/10 text-destructive font-body gap-1"
                    >
                      <EyeOff className="w-3 h-3" aria-hidden />
                      Hidden
                    </Badge>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelected({ review, provider: provider })}
                    data-ocid={`admin_reviews.row.${i + 1}`}
                    className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                  >
                    <ReviewCard
                      review={review}
                      customerName={shortPrincipal(review.customerId)}
                      index={i}
                      className="hover:shadow-md transition-smooth"
                    />
                  </button>
                  {provider ? (
                    <p className="text-xs text-muted-foreground font-body mt-1.5 px-1">
                      on{" "}
                      <span className="text-foreground font-medium">
                        {provider.companyName}
                      </span>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Review detail + moderation dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setHideReason("");
            setConfirmHide(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Review moderation
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                {selected.provider ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground font-body">
                        Provider
                      </p>
                      <p className="font-body font-semibold text-foreground">
                        {selected.provider.companyName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        isHidden(selected.review)
                          ? "border-destructive/30 bg-destructive/10 text-destructive font-body gap-1"
                          : "border-success/30 bg-success/10 text-success-foreground font-body gap-1"
                      }
                    >
                      {isHidden(selected.review) ? (
                        <>
                          <EyeOff className="w-3 h-3" aria-hidden /> Hidden
                        </>
                      ) : (
                        "Visible"
                      )}
                    </Badge>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs text-muted-foreground font-body mb-1">
                    Customer
                  </p>
                  <p className="text-sm font-mono text-foreground">
                    {shortPrincipal(selected.review.customerId)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating
                    value={selected.review.rating}
                    size="md"
                    showValue
                  />
                </div>

                {selected.review.writtenText ? (
                  <div>
                    <p className="text-xs text-muted-foreground font-body mb-1">
                      Review
                    </p>
                    <p className="text-sm text-foreground font-body leading-relaxed">
                      {selected.review.writtenText}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-body italic">
                    This review's content has been hidden.
                  </p>
                )}

                {selected.review.providerResponse ? (
                  <div className="rounded-lg bg-secondary/60 border border-border p-3">
                    <p className="text-xs font-body font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" aria-hidden />
                      Provider response
                    </p>
                    <p className="text-sm text-foreground font-body leading-relaxed">
                      {selected.review.providerResponse}
                    </p>
                  </div>
                ) : null}

                {/* Hide reason input */}
                {!isHidden(selected.review) ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="hide-reason" className="text-xs">
                      Reason for hiding (required)
                    </Label>
                    <Textarea
                      id="hide-reason"
                      value={hideReason}
                      onChange={(e) => setHideReason(e.target.value)}
                      placeholder="Explain why this review is being removed…"
                      rows={3}
                      data-ocid="admin_reviews.hide_reason"
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {!isHidden(selected.review) ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmHide(true)}
                      disabled={
                        moderateMutation.isPending || !hideReason.trim()
                      }
                      data-ocid="admin_reviews.hide_open"
                    >
                      <EyeOff className="w-4 h-4" aria-hidden />
                      Remove review
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleRestore(selected.review)}
                      disabled={moderateMutation.isPending}
                      data-ocid="admin_reviews.restore_button"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden />
                      Restore review
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Hide confirmation */}
      <AlertDialog
        open={confirmHide && !!selected}
        onOpenChange={setConfirmHide}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Remove this review?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The review content will be hidden from the provider's public
              profile. You can restore it later from the moderation queue.
              {hideReason.trim() ? ` Reason: "${hideReason.trim()}"` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="admin_reviews.hide_cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selected && handleHide(selected.review)}
              disabled={moderateMutation.isPending}
              data-ocid="admin_reviews.hide_confirm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden per-provider review fetchers — one hook per component, no loops */}
      {(providers ?? []).map((p) => (
        <ProviderReviewsFetcher
          key={p.id}
          providerId={p.id}
          onReviews={handleProviderReviews}
        />
      ))}
    </div>
  );
}
