// ListingDetail — service listing detail page with provider info and booking.
// Pulls the listing and its provider from the marketplace canister, shows
// title/description/price/photos/provider name, and a booking dialog that
// collects date/time/address/job details/customer note and calls
// useCreateBooking. Same booking-dialog pattern as ProviderDetail.

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateBooking,
  useGetListing,
  useGetProvider,
} from "@/hooks/useQueries";
import {
  type BookingInput,
  CATEGORY_LABELS,
  CATEGORY_SHORT,
  PRICE_UNIT_LABELS,
  type PriceUnit,
  VERIFICATION_LABELS,
} from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
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

export function ListingDetail() {
  const { listingId } = useParams({ strict: false }) as {
    listingId?: string;
  };
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const {
    data: listing,
    isLoading: listingLoading,
    error: listingError,
  } = useGetListing(listingId ?? null);
  const { data: provider, isLoading: providerLoading } = useGetProvider(
    listing?.providerId ?? null,
  );

  const createBooking = useCreateBooking();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [jobDetails, setJobDetails] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  const handleOpenBooking = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    // Pre-fill the booking dialog from the listing.
    setJobDetails(listing?.description ?? "");
    setAddress(listing?.serviceArea ?? "");
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
    if (!listing) {
      toast.error("Listing is no longer available.");
      return;
    }
    if (!date || !time || !address || !jobDetails) {
      toast.error("Please fill in the date, time, address, and job details.");
      return;
    }
    const input: BookingInput = {
      listingId: listing.id,
      scheduledDate: date,
      scheduledTime: time,
      jobDetails,
      address,
      customerNote: customerNote || undefined,
    };
    createBooking.mutate(input, {
      onSuccess: () => {
        toast.success("Booking request sent to the provider.");
        setBookingOpen(false);
        handleResetForm();
        void navigate({ to: "/customer/bookings" });
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

  if (listingLoading || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.listing_detail"
      >
        <LoadingSpinner label="Loading listing" />
      </div>
    );
  }

  if (listingError || !listing) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.listing_detail"
      >
        <EmptyState
          icon={Package}
          title="Listing not found"
          description="This service listing may have been removed or is no longer available."
          action={
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/search" })}
              data-ocid="listing_detail.back"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Back to search
            </Button>
          }
        />
      </div>
    );
  }

  const rating = provider
    ? averageRating(provider.ratingSum, provider.ratingCount)
    : 0;
  const reviewCount = provider ? Number(provider.ratingCount) : 0;
  const isVerified = provider?.verificationStatus === "approved";

  return (
    <div className="bg-background min-h-screen" data-ocid="page.listing_detail">
      {/* Back link */}
      <div className="container mx-auto px-4 lg:px-6 pt-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/search" })}
          className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          data-ocid="listing_detail.back"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to search
        </button>
      </div>

      <div className="container mx-auto px-4 lg:px-6 grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
        {/* Main listing column */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          {/* Photos */}
          {listing.photos.length > 0 ? (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              data-ocid="listing_detail.photos"
            >
              {listing.photos.map((photo, i) => (
                <img
                  key={photo}
                  src={photo}
                  alt={`${listing.title} — view ${i + 1}`}
                  className="w-full h-56 sm:h-64 rounded-xl object-cover border border-border"
                  data-ocid={`listing_detail.photo.${i + 1}`}
                />
              ))}
            </div>
          ) : null}

          {/* Title + price card */}
          <Card className="py-0">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="font-body"
                      data-ocid="listing_detail.category"
                    >
                      {CATEGORY_SHORT[listing.category]}
                    </Badge>
                    {!listing.active ? (
                      <Badge
                        variant="outline"
                        className="font-body text-muted-foreground"
                      >
                        Inactive
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle
                    className="font-display text-2xl font-semibold text-foreground leading-tight"
                    data-ocid="listing_detail.title"
                  >
                    {listing.title}
                  </CardTitle>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-display text-2xl font-semibold text-foreground">
                    {formatPrice(listing.priceCents)}
                  </span>
                  <span className="text-sm text-muted-foreground font-body">
                    per{" "}
                    {PRICE_UNIT_LABELS[listing.priceUnit as PriceUnit] ??
                      listing.priceUnit}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-foreground mb-1.5">
                  About this service
                </h2>
                <p className="text-sm lg:text-base text-foreground font-body leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm font-body text-muted-foreground pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" aria-hidden />
                  <span>{listing.serviceArea}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4" aria-hidden />
                  <span>{CATEGORY_LABELS[listing.category]}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sidebar: provider + booking */}
        <aside className="lg:col-span-1 flex flex-col gap-6">
          <Card className="py-0 lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="font-display text-base font-semibold text-foreground">
                Offered by
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {provider ? (
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: "/providers/$providerId",
                      params: { providerId: provider.id },
                    })
                  }
                  className="flex items-center gap-3 text-left rounded-lg p-2 -m-2 hover:bg-secondary/50 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-ocid="listing_detail.provider_link"
                >
                  <Avatar className="w-12 h-12 rounded-xl border border-border shrink-0">
                    {provider.logo ? (
                      <AvatarImage
                        src={provider.logo}
                        alt={provider.companyName}
                      />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-secondary text-primary font-display text-lg font-semibold">
                      {initials(provider.companyName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-body font-medium text-foreground truncate">
                      {provider.companyName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating
                        value={rating}
                        size="sm"
                        showValue
                        count={reviewCount}
                      />
                    </div>
                  </div>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground font-body">
                  Provider information unavailable.
                </p>
              )}

              {provider && isVerified ? (
                <Badge
                  variant="outline"
                  className="border-success/30 bg-success/10 text-success-foreground font-body gap-1 w-fit"
                  data-ocid="listing_detail.verified_badge"
                >
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                  {VERIFICATION_LABELS.approved}
                </Badge>
              ) : provider ? (
                <Badge
                  variant="outline"
                  className="border-warning/30 bg-warning/10 text-warning-foreground font-body w-fit"
                >
                  {VERIFICATION_LABELS[provider.verificationStatus]}
                </Badge>
              ) : null}

              <Button
                onClick={handleOpenBooking}
                disabled={!listing.active}
                className="w-full"
                data-ocid="listing_detail.book_button"
              >
                <CalendarDays className="w-4 h-4" aria-hidden />
                Book this service
              </Button>
              {!listing.active ? (
                <p className="text-xs text-muted-foreground font-body text-center">
                  This listing is not currently accepting bookings.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Booking dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a booking</DialogTitle>
            <DialogDescription>
              {provider
                ? `Booking "${listing.title}" with ${provider.companyName}.`
                : `Booking "${listing.title}".`}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitBooking}
            className="flex flex-col gap-4"
            data-ocid="listing_detail.booking_form"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-date">Date</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  data-ocid="listing_detail.booking_date"
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
                  data-ocid="listing_detail.booking_time"
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
                data-ocid="listing_detail.booking_address"
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
                data-ocid="listing_detail.booking_details"
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
                data-ocid="listing_detail.booking_note"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBookingOpen(false)}
                disabled={createBooking.isPending}
                data-ocid="listing_detail.booking_cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBooking.isPending}
                data-ocid="listing_detail.booking_submit"
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
