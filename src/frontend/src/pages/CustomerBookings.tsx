// CustomerBookings — booking dashboard for the signed-in customer.
// Lists bookings from useListMyBookings with status filter tabs, status badges,
// cancel (before accepted), leave review (after completed), and a link to messages.

import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
  useGetProvider,
  useListMyBookings,
  useListReviewsByBooking,
} from "@/hooks/useQueries";
import {
  BOOKING_STATUS_LABELS,
  type Booking,
  type BookingStatus,
  CATEGORY_LABELS,
  type ReviewInput,
} from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  Star,
  Trash2,
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

// Booking row with provider name resolved via a small provider lookup hook.
function BookingRow({
  booking,
  index,
  onReview,
}: {
  booking: Booking;
  index: number;
  onReview: (booking: Booking) => void;
}) {
  const { data: provider } = useGetProvider(booking.providerId);
  const { data: existingReviews } = useListReviewsByBooking(booking.id);
  const cancelBooking = useCancelBooking();
  const navigate = useNavigate();

  const canCancel = booking.status === "requested";
  const canReview = booking.status === "completed";
  const alreadyReviewed = canReview && (existingReviews?.length ?? 0) > 0;

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
    <Card className="py-0" data-ocid={`customer_bookings.item.${index + 1}`}>
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
          <BookingStatusBadge status={booking.status} />
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

  const [tab, setTab] = useState<FilterTab>("all");
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

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
            <Button
              onClick={() => login()}
              data-ocid="customer_bookings.signin"
            >
              Sign in
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.customer_bookings"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="customer_bookings.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
            My bookings
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Track your service requests, message providers, and leave reviews
            after completion.
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
          <LoadingSpinner label="Loading bookings" />
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
              <Label htmlFor="review-text">Your review</Label>
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
    </div>
  );
}
