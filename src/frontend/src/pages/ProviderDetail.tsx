// ProviderDetail — provider profile page with listings, reviews, and booking.
// Pulls the provider, their listings, and reviews from the marketplace canister.
// A booking dialog collects date/time/address/details and calls useCreateBooking.

import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ReviewCard } from "@/components/ReviewCard";
import { StarRating } from "@/components/StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateBooking,
  useGetProvider,
  useListListingsByProvider,
  useListReviewsByProvider,
} from "@/hooks/useQueries";
import {
  type BookingInput,
  CATEGORY_LABELS,
  CATEGORY_SHORT,
  PRICE_UNIT_LABELS,
  type PriceUnit,
  type ServiceListing,
  VERIFICATION_LABELS,
} from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function averageRating(ratingSum: bigint, ratingCount: bigint): number {
  const count = Number(ratingCount);
  if (count === 0) return 0;
  return Number(ratingSum) / count;
}

function formatPrice(cents: bigint): string {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProviderDetail() {
  const { providerId } = useParams({ strict: false }) as {
    providerId?: string;
  };
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const {
    data: provider,
    isLoading: providerLoading,
    error: providerError,
  } = useGetProvider(providerId ?? null);
  const { data: listings, isLoading: listingsLoading } =
    useListListingsByProvider(providerId ?? null);
  const { data: reviews, isLoading: reviewsLoading } = useListReviewsByProvider(
    providerId ?? null,
  );

  const createBooking = useCreateBooking();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ServiceListing | null>(
    null,
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [jobDetails, setJobDetails] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  // Pre-fill the booking dialog when a listing is chosen.
  useEffect(() => {
    if (selectedListing) {
      setJobDetails(selectedListing.description);
      setAddress(selectedListing.serviceArea);
    }
  }, [selectedListing]);

  const rating = provider
    ? averageRating(provider.ratingSum, provider.ratingCount)
    : 0;
  const reviewCount = provider ? Number(provider.ratingCount) : 0;
  const isVerified = provider?.verificationStatus === "approved";

  const sortedListings = useMemo(() => {
    const list = [...(listings ?? [])];
    list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return list;
  }, [listings]);

  const sortedReviews = useMemo(() => {
    const list = [...(reviews ?? [])];
    list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return list;
  }, [reviews]);

  const handleOpenBooking = (listing: ServiceListing) => {
    if (!isAuthenticated) {
      login();
      return;
    }
    setSelectedListing(listing);
    setBookingOpen(true);
  };

  const handleOpenBookingDefault = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    setSelectedListing(sortedListings[0] ?? null);
    setBookingOpen(true);
  };

  const handleResetForm = () => {
    setDate("");
    setTime("");
    setAddress("");
    setJobDetails("");
    setCustomerNote("");
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) {
      toast.error("Choose a service to book.");
      return;
    }
    if (!date || !time || !address || !jobDetails) {
      toast.error("Please fill in the date, time, address, and job details.");
      return;
    }
    const input: BookingInput = {
      listingId: selectedListing.id,
      scheduledDate: date,
      scheduledTime: time,
      jobDetails,
      address,
      customerNote: customerNote || undefined,
    };
    createBooking.mutate(input, {
      onSuccess: (booking) => {
        toast.success("Booking request sent to the provider.");
        setBookingOpen(false);
        handleResetForm();
        void navigate({
          to: "/customer/bookings",
        });
        void booking;
      },
      onError: (err) => {
        toast.error(
          err instanceof Error
            ? err.message
            : "Could not send booking request. Please try again.",
        );
      },
    });
  };

  if (providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.provider_detail"
      >
        <LoadingSpinner label="Loading provider" />
      </div>
    );
  }

  if (providerError || !provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_detail"
      >
        <EmptyState
          icon={Package}
          title="Provider not found"
          description="This provider profile may have been removed or is no longer available."
          action={
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/search" })}
              data-ocid="provider_detail.back"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Back to search
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_detail"
    >
      {/* Back link */}
      <div className="container mx-auto px-4 lg:px-6 pt-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/search" })}
          className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          data-ocid="provider_detail.back"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to search
        </button>
      </div>

      {/* Header / hero */}
      <section
        className="container mx-auto px-4 lg:px-6 py-6"
        data-ocid="provider_detail.header"
      >
        <Card className="py-0 overflow-hidden">
          <div className="p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
            <Avatar className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl border border-border shrink-0">
              {provider.logo ? (
                <AvatarImage src={provider.logo} alt={provider.companyName} />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-secondary text-primary font-display text-2xl font-semibold">
                {initials(provider.companyName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
                  {provider.companyName}
                </h1>
                {isVerified ? (
                  <Badge
                    variant="outline"
                    className="border-success/30 bg-success/10 text-success-foreground font-body gap-1"
                    data-ocid="provider_detail.verified_badge"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                    {VERIFICATION_LABELS.approved}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-warning/30 bg-warning/10 text-warning-foreground font-body"
                    data-ocid="provider_detail.verification_badge"
                  >
                    {VERIFICATION_LABELS[provider.verificationStatus]}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <StarRating
                  value={rating}
                  size="md"
                  showValue
                  count={reviewCount}
                />
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-body">
                  <MessageSquare className="w-4 h-4" aria-hidden />
                  {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </div>
              </div>

              {provider.description ? (
                <p className="text-sm lg:text-base text-foreground font-body leading-relaxed max-w-2xl mb-4">
                  {provider.description}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 mb-5">
                {provider.serviceCategories.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="font-body"
                    data-ocid={`provider_detail.category.${cat}`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 text-sm font-body text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" aria-hidden />
                  <span>{provider.serviceAreas.join(", ") || "DFW area"}</span>
                </div>
              </div>
            </div>

            <div className="lg:self-start">
              <Button
                onClick={handleOpenBookingDefault}
                disabled={sortedListings.length === 0}
                data-ocid="provider_detail.book_button"
                className="w-full lg:w-auto"
              >
                <CalendarDays className="w-4 h-4" aria-hidden />
                Book this provider
              </Button>
              {sortedListings.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body mt-2 lg:text-right">
                  No active services yet.
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      </section>

      <div className="container mx-auto px-4 lg:px-6 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        {/* Listings */}
        <section className="lg:col-span-2" data-ocid="provider_detail.listings">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Services
            </h2>
            <span className="text-sm text-muted-foreground font-body">
              {sortedListings.length} listing
              {sortedListings.length === 1 ? "" : "s"}
            </span>
          </div>

          {listingsLoading ? (
            <LoadingSpinner label="Loading services" />
          ) : sortedListings.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No services listed"
              description="This provider hasn't published any services yet. Check back soon."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedListings.map((listing, i) => (
                <Card
                  key={listing.id}
                  className="py-0 flex flex-col"
                  data-ocid={`provider_detail.listing.${i + 1}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
                        {listing.title}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="font-body text-xs shrink-0"
                      >
                        {CATEGORY_SHORT[listing.category]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-3">
                      {listing.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                      <MapPin className="w-3.5 h-3.5" aria-hidden />
                      {listing.serviceArea}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex flex-col">
                        <span className="font-display text-lg font-semibold text-foreground">
                          {formatPrice(listing.priceCents)}
                        </span>
                        <span className="text-xs text-muted-foreground font-body">
                          per{" "}
                          {PRICE_UNIT_LABELS[listing.priceUnit as PriceUnit] ??
                            listing.priceUnit}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenBooking(listing)}
                        disabled={!listing.active}
                        data-ocid={`provider_detail.book_listing.${i + 1}`}
                      >
                        Book
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section data-ocid="provider_detail.reviews">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Reviews
            </h2>
            {reviewCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm font-body text-foreground">
                <Star className="w-4 h-4 fill-accent text-accent" aria-hidden />
                {rating.toFixed(1)}
              </span>
            ) : null}
          </div>

          {reviewsLoading ? (
            <LoadingSpinner label="Loading reviews" />
          ) : sortedReviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Be the first to book and review this provider."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {sortedReviews.map((review, i) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  index={i}
                  customerName="Customer"
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Booking dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a booking</DialogTitle>
            <DialogDescription>
              {selectedListing
                ? `Booking "${selectedListing.title}" with ${provider.companyName}.`
                : `Booking with ${provider.companyName}.`}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitBooking}
            className="flex flex-col gap-4"
            data-ocid="provider_detail.booking_form"
          >
            {sortedListings.length > 1 ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-listing">Service</Label>
                <select
                  id="booking-listing"
                  value={selectedListing?.id ?? ""}
                  onChange={(e) => {
                    const found = sortedListings.find(
                      (l) => l.id === e.target.value,
                    );
                    setSelectedListing(found ?? null);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm font-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-ocid="provider_detail.booking_listing_select"
                >
                  {sortedListings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} — {formatPrice(l.priceCents)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-date">Date</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  data-ocid="provider_detail.booking_date"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-time">Time</Label>
                <Input
                  id="booking-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  data-ocid="provider_detail.booking_time"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-address">Service address</Label>
              <Input
                id="booking-address"
                type="text"
                placeholder="123 Main St, Plano, TX 75075"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                data-ocid="provider_detail.booking_address"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-details">Job details</Label>
              <Textarea
                id="booking-details"
                placeholder="Describe what you need — e.g. one-bedroom apartment move, 10 miles, second-floor walk-up."
                value={jobDetails}
                onChange={(e) => setJobDetails(e.target.value)}
                rows={3}
                required
                data-ocid="provider_detail.booking_details"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-note">Note to provider (optional)</Label>
              <Textarea
                id="booking-note"
                placeholder="Anything else the provider should know?"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={2}
                data-ocid="provider_detail.booking_note"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBookingOpen(false)}
                disabled={createBooking.isPending}
                data-ocid="provider_detail.booking_cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBooking.isPending}
                data-ocid="provider_detail.booking_submit"
              >
                {createBooking.isPending ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden />
                    Request booking
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
