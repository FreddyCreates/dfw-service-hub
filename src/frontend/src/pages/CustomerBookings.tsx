// CustomerBookings — booking dashboard for the signed-in customer.
// Lists bookings from useListMyBookings with status filter tabs, status badges,
// cancel (before accepted), leave review (after completed), open dispute
// (in-progress/completed), SLA indicators, skeleton loading, and motion.

import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { DisputeStatusBadge } from "@/components/DisputeStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";
import { StarRating } from "@/components/StarRating";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCancelBooking,
  useCreateReview,
  useGenerateReviewDraft,
  useGetProvider,
  useListDisputesByBooking,
  useListMyBookings,
  useListReviewsByBooking,
  useOpenDispute,
} from "@/hooks/useQueries";
import {
  BOOKING_STATUS_LABELS,
  type Booking,
  type BookingStatus,
  CATEGORY_LABELS,
  type DisputeInput,
  type ReviewInput,
} from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  ShieldCheck,
  Star,
  Timer,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FilterTab = "all" | "active" | "completed" | "cancelled";

const TAB_VALUES: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const ACTIVE_STATUSES: BookingStatus[] = [
  "requested",
  "accepted",
  "scheduled",
  "inProgress",
];

// SLA thresholds (hours) per status — surfaced as on-track / at-risk / breached
// indicators. The customer sees a compact SLA chip on each booking card.
const SLA_THRESHOLDS: Partial<Record<BookingStatus, number>> = {
  requested: 24, // provider should accept within 24h
  accepted: 48, // provider should schedule within 48h
  scheduled: 0, // waiting on the scheduled date — no SLA clock
  inProgress: 72, // provider should complete within 72h of start
};

function formatDate(date: string): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  if (!time) return "—";
  const parsed = new Date(`1970-01-01T${time}`);
  if (Number.isNaN(parsed.getTime())) return time;
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Compute SLA state from the booking's updatedAt and its status threshold.
// Returns null when there is no SLA clock for the current status.
function computeSla(
  status: BookingStatus,
  updatedAt: bigint,
): {
  label: string;
  state: "onTrack" | "atRisk" | "breached" | "neutral";
  hoursRemaining: number;
} | null {
  const thresholdHours = SLA_THRESHOLDS[status];
  if (thresholdHours === undefined || thresholdHours === 0) return null;
  const updatedMs = Number(updatedAt) / 1_000_000;
  const elapsedHours = (Date.now() - updatedMs) / 3_600_000;
  const hoursRemaining = thresholdHours - elapsedHours;
  if (hoursRemaining <= 0) {
    return {
      label: "SLA breached",
      state: "breached",
      hoursRemaining: Math.round(hoursRemaining),
    };
  }
  if (hoursRemaining <= thresholdHours * 0.25) {
    return {
      label: "SLA at risk",
      state: "atRisk",
      hoursRemaining: Math.round(hoursRemaining),
    };
  }
  return {
    label: "On track",
    state: "onTrack",
    hoursRemaining: Math.round(hoursRemaining),
  };
}

const SLA_STYLES: Record<
  "onTrack" | "atRisk" | "breached" | "neutral",
  { token: string; icon: typeof Timer }
> = {
  onTrack: {
    token: "border-success/40 bg-success/10 text-success-foreground",
    icon: ShieldCheck,
  },
  atRisk: {
    token: "border-warning/40 bg-warning/15 text-warning-foreground",
    icon: Timer,
  },
  breached: {
    token: "border-destructive/40 bg-destructive/15 text-destructive",
    icon: AlertTriangle,
  },
  neutral: {
    token: "border-border bg-secondary text-muted-foreground",
    icon: Clock,
  },
};

function SlaIndicator({
  status,
  updatedAt,
}: { status: BookingStatus; updatedAt: bigint }) {
  const sla = computeSla(status, updatedAt);
  if (!sla) return null;
  const style = SLA_STYLES[sla.state];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-body font-medium ${style.token}`}
      title={`SLA: ${sla.label}${
        sla.hoursRemaining >= 0
          ? ` · ${sla.hoursRemaining}h remaining`
          : ` · ${Math.abs(sla.hoursRemaining)}h overdue`
      }`}
      data-ocid="customer_bookings.sla"
    >
      <Icon className="w-3 h-3" aria-hidden />
      {sla.label}
    </span>
  );
}

// Booking row with provider name resolved via a small provider lookup hook.
function BookingRow({
  booking,
  index,
  onReview,
  onDispute,
}: {
  booking: Booking;
  index: number;
  onReview: (booking: Booking) => void;
  onDispute: (booking: Booking) => void;
}) {
  const { data: provider } = useGetProvider(booking.providerId);
  const { data: existingReviews } = useListReviewsByBooking(booking.id);
  const { data: existingDisputes } = useListDisputesByBooking(booking.id);
  const cancelBooking = useCancelBooking();
  const navigate = useNavigate();

  const canCancel = booking.status === "requested";
  const canReview = booking.status === "completed";
  const alreadyReviewed = canReview && (existingReviews?.length ?? 0) > 0;
  // Dispute is available for in-progress and completed bookings, but only if
  // there is no open/responded/escalated dispute already on this booking.
  const canDispute =
    booking.status === "inProgress" || booking.status === "completed";
  const hasOpenDispute = (existingDisputes ?? []).some(
    (d) => d.status !== "resolved",
  );

  const handleCancel = () => {
    cancelBooking.mutate(booking.id, {
      onSuccess: () => toast.success("Booking cancelled."),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not cancel booking.",
        ),
    });
  };

  return (
    <Card
      className="py-0 animate-card-hover-lift animate-fade-in-up shadow-subtle"
      data-ocid={`customer_bookings.item.${index + 1}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
              {provider?.companyName ?? "Provider"}
            </CardTitle>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              {CATEGORY_LABELS[booking.category]}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <BookingStatusBadge status={booking.status} />
            <SlaIndicator
              status={booking.status}
              updatedAt={booking.updatedAt}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm font-body">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="w-4 h-4 shrink-0" aria-hidden />
            <span className="text-foreground">
              {formatDate(booking.scheduledDate)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" aria-hidden />
            <span className="text-foreground">
              {formatTime(booking.scheduledTime)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden />
            <span className="text-foreground truncate">{booking.address}</span>
          </div>
        </div>

        {booking.jobDetails ? (
          <p className="text-sm text-muted-foreground font-body line-clamp-2">
            {booking.jobDetails}
          </p>
        ) : null}

        {/* Existing dispute badge, if any */}
        {hasOpenDispute ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2">
            <AlertTriangle
              className="w-4 h-4 text-warning-foreground"
              aria-hidden
            />
            <span className="text-xs font-body text-muted-foreground">
              Dispute open on this booking
            </span>
            {existingDisputes && existingDisputes.length > 0 ? (
              <DisputeStatusBadge
                status={existingDisputes[0].status}
                className="ml-auto"
              />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: "/customer/messages" })}
            data-ocid={`customer_bookings.messages.${index + 1}`}
          >
            <MessageSquare className="w-4 h-4" aria-hidden />
            Messages
          </Button>
          {canCancel ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={cancelBooking.isPending}
              className="text-destructive hover:text-destructive"
              data-ocid={`customer_bookings.cancel.${index + 1}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden />
              {cancelBooking.isPending ? "Cancelling…" : "Cancel"}
            </Button>
          ) : null}
          {canDispute && !hasOpenDispute ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDispute(booking)}
              className="text-warning-foreground border-warning/40 hover:bg-warning/10"
              data-ocid={`customer_bookings.dispute.${index + 1}`}
            >
              <AlertTriangle className="w-4 h-4" aria-hidden />
              Open dispute
            </Button>
          ) : null}
          {canReview && !alreadyReviewed ? (
            <Button
              size="sm"
              onClick={() => onReview(booking)}
              data-ocid={`customer_bookings.review.${index + 1}`}
            >
              <Star className="w-4 h-4" aria-hidden />
              Leave review
            </Button>
          ) : null}
          {alreadyReviewed ? (
            <span className="inline-flex items-center gap-1 text-xs font-body text-success-foreground">
              <Star
                className="w-3.5 h-3.5 fill-accent text-accent"
                aria-hidden
              />
              Reviewed
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerBookings() {
  const { isAuthenticated, login } = useAuth();
  const { data: bookings, isLoading } = useListMyBookings();
  const createReview = useCreateReview();
  const generateReviewDraft = useGenerateReviewDraft();
  const openDispute = useOpenDispute();

  const [tab, setTab] = useState<FilterTab>("all");
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [disputeBooking, setDisputeBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  // Resolve provider for the booking currently in the review dialog so we can
  // build rich booking-details context for the AI review draft generator.
  const { data: reviewProvider } = useGetProvider(
    reviewBooking?.providerId ?? "",
  );

  useEffect(() => {
    if (!isAuthenticated) {
      login();
    }
  }, [isAuthenticated, login]);

  const filtered = useMemo(() => {
    const list = [...(bookings ?? [])];
    list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    if (tab === "all") return list;
    if (tab === "active")
      return list.filter((b) => ACTIVE_STATUSES.includes(b.status));
    if (tab === "completed")
      return list.filter(
        (b) => b.status === "completed" || b.status === "reviewed",
      );
    if (tab === "cancelled")
      return list.filter((b) => b.status === "cancelled");
    return list;
  }, [bookings, tab]);

  const openReview = (booking: Booking) => {
    setReviewBooking(booking);
    setRating(5);
    setReviewText("");
  };

  const openDisputeDialog = (booking: Booking) => {
    setDisputeBooking(booking);
    setDisputeReason("");
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    if (!reviewText.trim()) {
      toast.error("Please write a few words about your experience.");
      return;
    }
    const input: ReviewInput = {
      bookingId: reviewBooking.id,
      rating: BigInt(rating),
      writtenText: reviewText.trim(),
    };
    createReview.mutate(input, {
      onSuccess: () => {
        toast.success("Thanks — your review was posted.");
        setReviewBooking(null);
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not submit review.",
        ),
    });
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeBooking) return;
    if (!disputeReason.trim()) {
      toast.error("Please describe the issue you're reporting.");
      return;
    }
    const input: DisputeInput = {
      bookingId: disputeBooking.id,
      reason: disputeReason.trim(),
    };
    openDispute.mutate(input, {
      onSuccess: () => {
        toast.success(
          "Dispute opened. The provider and our team have been notified.",
        );
        setDisputeBooking(null);
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not open dispute.",
        ),
    });
  };

  const handleGenerateReviewDraft = () => {
    if (!reviewBooking) return;
    const providerName = reviewProvider?.companyName ?? "the provider";
    const categoryLabel = CATEGORY_LABELS[reviewBooking.category] ?? "service";
    const details = [
      `Provider: ${providerName}`,
      `Service: ${categoryLabel}`,
      `Scheduled: ${formatDate(reviewBooking.scheduledDate)} at ${formatTime(reviewBooking.scheduledTime)}`,
      `Address: ${reviewBooking.address}`,
      reviewBooking.jobDetails
        ? `Job details: ${reviewBooking.jobDetails}`
        : null,
      `Rating: ${rating} out of 5`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");

    generateReviewDraft.mutate(
      { bookingId: reviewBooking.id, rating, extraNotes: details },
      {
        onSuccess: (draft) => {
          setReviewText(draft);
          toast.success("Review draft generated — edit as you like.");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : "Could not generate a review draft.",
          ),
      },
    );
  };

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.customer_bookings"
      >
        <EmptyState
          icon={Package}
          title="Sign in to view your bookings"
          description="Track requests, message providers, and leave reviews once you're signed in."
          action={
            <Button onClick={login} data-ocid="customer_bookings.signin">
              Sign in
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen animate-page-transition"
      data-ocid="page.customer_bookings"
    >
      <section
        className="bg-card border-b border-border shadow-subtle"
        data-ocid="customer_bookings.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
            My bookings
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Track your service requests, message providers, leave reviews, and
            open disputes if something goes wrong.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8"
        data-ocid="customer_bookings.list"
      >
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as FilterTab)}
          className="mb-6"
        >
          <TabsList data-ocid="customer_bookings.tabs">
            {TAB_VALUES.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                data-ocid={`customer_bookings.tab.${t.value}`}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            data-ocid="customer_bookings.loading_state"
          >
            <SkeletonCard withMedia={false} />
            <SkeletonCard withMedia={false} />
            <SkeletonCard withMedia={false} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={
              tab === "all"
                ? "No bookings yet"
                : `No ${TAB_VALUES.find((t) => t.value === tab)?.label.toLowerCase()} bookings`
            }
            description="Browse verified providers across DFW and book your first service."
            action={
              <Link to="/search">
                <Button data-ocid="customer_bookings.browse">
                  Browse services
                </Button>
              </Link>
            }
            data-ocid="customer_bookings.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((booking, i) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                index={i}
                onReview={openReview}
                onDispute={openDisputeDialog}
              />
            ))}
          </div>
        )}
      </section>

      {/* Review dialog */}
      <Dialog
        open={!!reviewBooking}
        onOpenChange={(open) => !open && setReviewBooking(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a review</DialogTitle>
            <DialogDescription>
              How was your experience? Your review helps other DFW customers.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmitReview}
            className="flex flex-col gap-4"
            data-ocid="customer_bookings.review_form"
          >
            <div className="flex flex-col gap-2">
              <Label>Rating</Label>
              <StarRating
                value={rating}
                interactive
                size="lg"
                onChange={setRating}
                showValue
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="review-text">Your review</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateReviewDraft}
                  disabled={generateReviewDraft.isPending || !reviewBooking}
                  className="text-primary border-primary/30 hover:bg-primary/10"
                  data-ocid="customer_bookings.review_generate_ai"
                >
                  {generateReviewDraft.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  ) : (
                    <Wand2 className="w-4 h-4" aria-hidden />
                  )}
                  Generate Review with AI
                </Button>
              </div>
              <Textarea
                id="review-text"
                placeholder="Tell others about the service, punctuality, and care."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                required
                data-ocid="customer_bookings.review_text"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewBooking(null)}
                disabled={createReview.isPending}
                data-ocid="customer_bookings.review_cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReview.isPending}
                data-ocid="customer_bookings.review_submit"
              >
                {createReview.isPending ? "Submitting…" : "Post review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dispute dialog */}
      <Dialog
        open={!!disputeBooking}
        onOpenChange={(open) => !open && setDisputeBooking(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open a dispute</DialogTitle>
            <DialogDescription>
              Describe the issue with this booking. The provider and our
              moderation team will be notified, and our AI will triage severity.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmitDispute}
            className="flex flex-col gap-4"
            data-ocid="customer_bookings.dispute_form"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dispute-reason">What went wrong?</Label>
              <Textarea
                id="dispute-reason"
                placeholder="Describe the issue — missed appointment, incomplete work, damage, etc."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={5}
                required
                data-ocid="customer_bookings.dispute_reason"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisputeBooking(null)}
                disabled={openDispute.isPending}
                data-ocid="customer_bookings.dispute_cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={openDispute.isPending}
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
                data-ocid="customer_bookings.dispute_submit"
              >
                {openDispute.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Opening…
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" aria-hidden />
                    Open dispute
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
