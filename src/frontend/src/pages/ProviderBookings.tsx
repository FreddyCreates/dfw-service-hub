// ProviderBookings — booking management for verified DFW providers.
// Incoming requests with accept/decline, active bookings with mark
// in-progress/complete, status filter tabs, booking details, message link.

import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAcceptBooking,
  useCompleteBooking,
  useDeclineBooking,
  useGetMyProvider,
  useListProviderBookings,
  useStartBooking,
} from "@/hooks/useQueries";
import { type Booking, type BookingStatus, CATEGORY_LABELS } from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  Play,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FilterTab = "all" | "requests" | "active" | "completed" | "cancelled";

const TAB_VALUES: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "requests", label: "Requests" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const REQUEST_STATUSES: BookingStatus[] = ["requested"];
const ACTIVE_STATUSES: BookingStatus[] = [
  "accepted",
  "scheduled",
  "inProgress",
];
const COMPLETED_STATUSES: BookingStatus[] = ["completed", "reviewed"];

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

function principalShort(principal: string): string {
  if (!principal) return "Customer";
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

// ─── SLA indicators ────────────────────────────────────────────────────────
// Compute response-time and on-time SLA badges from booking timestamps.
// Response time = how quickly the provider acted on a request (accepted or
// declined). On-time = whether an in-progress/completed job started on or
// before its scheduled start time.

const RESPONSE_SLA_MS = 4 * 60 * 60 * 1000; // 4 hours to respond
const ON_TIME_SLA_MS = 15 * 60 * 1000; // 15-minute grace window

type SlaTone = "success" | "warning" | "danger";

interface SlaIndicator {
  label: string;
  tone: SlaTone;
  detail: string;
}

function responseTimeSla(booking: Booking): SlaIndicator | null {
  // Only meaningful for bookings that were requested then acted on.
  if (booking.status === "requested" || booking.status === "cancelled") {
    return null;
  }
  const created = Number(booking.createdAt);
  const updated = Number(booking.updatedAt);
  if (!created || !updated || updated < created) return null;
  const elapsed = updated - created;
  const elapsedMin = Math.round(elapsed / 60000);
  const detail =
    elapsedMin >= 60
      ? `${Math.round(elapsedMin / 60)}h response`
      : `${elapsedMin}m response`;
  if (elapsed <= RESPONSE_SLA_MS) {
    return { label: "Fast response", tone: "success", detail };
  }
  if (elapsed <= RESPONSE_SLA_MS * 3) {
    return { label: "Slow response", tone: "warning", detail };
  }
  return { label: "Overdue response", tone: "danger", detail };
}

function onTimeSla(booking: Booking): SlaIndicator | null {
  // Only meaningful once the job has started or completed.
  if (
    booking.status !== "inProgress" &&
    booking.status !== "completed" &&
    booking.status !== "reviewed"
  ) {
    return null;
  }
  if (!booking.scheduledDate || !booking.scheduledTime) return null;
  const scheduled = new Date(
    `${booking.scheduledDate}T${booking.scheduledTime}`,
  );
  if (Number.isNaN(scheduled.getTime())) return null;
  const updated = Number(booking.updatedAt);
  if (!updated) return null;
  const startedOrUpdated = new Date(updated);
  const diffMs = startedOrUpdated.getTime() - scheduled.getTime();
  if (diffMs <= ON_TIME_SLA_MS) {
    return { label: "On time", tone: "success", detail: "Started on schedule" };
  }
  const lateMin = Math.round(diffMs / 60000);
  const detail =
    lateMin >= 60
      ? `${Math.round(lateMin / 60)}h late start`
      : `${lateMin}m late start`;
  if (diffMs <= ON_TIME_SLA_MS * 4) {
    return { label: "Slightly late", tone: "warning", detail };
  }
  return { label: "Late start", tone: "danger", detail };
}

const SLA_TONE_CLASSES: Record<SlaTone, string> = {
  success: "bg-success/10 text-success-foreground ring-success/20",
  warning: "bg-warning/10 text-warning-foreground ring-warning/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
};

interface BookingRowProps {
  booking: Booking;
  index: number;
}

function BookingRow({ booking, index }: BookingRowProps) {
  const acceptBooking = useAcceptBooking();
  const declineBooking = useDeclineBooking();
  const startBooking = useStartBooking();
  const completeBooking = useCompleteBooking();
  const navigate = useNavigate();

  const isRequest = booking.status === "requested";
  const canStart =
    booking.status === "accepted" || booking.status === "scheduled";
  const canComplete = booking.status === "inProgress";

  // SLA indicators for this booking (response time + on-time start).
  const responseSla = responseTimeSla(booking);
  const onTime = onTimeSla(booking);

  const handleAccept = () => {
    acceptBooking.mutate(booking.id, {
      onSuccess: () => toast.success("Booking accepted"),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not accept booking",
        ),
    });
  };

  const handleDecline = () => {
    declineBooking.mutate(booking.id, {
      onSuccess: () => toast.success("Booking declined"),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not decline booking",
        ),
    });
  };

  const handleStart = () => {
    startBooking.mutate(booking.id, {
      onSuccess: () => toast.success("Booking marked in progress"),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not update booking",
        ),
    });
  };

  const handleComplete = () => {
    completeBooking.mutate(booking.id, {
      onSuccess: () => toast.success("Booking completed"),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not update booking",
        ),
    });
  };

  const anyPending =
    acceptBooking.isPending ||
    declineBooking.isPending ||
    startBooking.isPending ||
    completeBooking.isPending;

  return (
    <Card
      className="py-0 animate-fade-in-up animate-card-hover-lift"
      data-ocid={`provider_bookings.item.${index + 1}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
              {CATEGORY_LABELS[booking.category]}
            </CardTitle>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              Customer {principalShort(booking.customerId.toString())}
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

        {responseSla || onTime ? (
          <div className="flex flex-wrap items-center gap-2">
            {responseSla ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-body font-medium ring-1 ${SLA_TONE_CLASSES[responseSla.tone]}`}
                title={responseSla.detail}
              >
                <Clock className="w-3 h-3" aria-hidden />
                {responseSla.label}
              </span>
            ) : null}
            {onTime ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-body font-medium ring-1 ${SLA_TONE_CLASSES[onTime.tone]}`}
                title={onTime.detail}
              >
                <Clock className="w-3 h-3" aria-hidden />
                {onTime.label}
              </span>
            ) : null}
          </div>
        ) : null}

        {booking.jobDetails ? (
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
              Job details
            </p>
            <p className="text-sm font-body text-foreground whitespace-pre-wrap">
              {booking.jobDetails}
            </p>
          </div>
        ) : null}

        {booking.customerNote ? (
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
              Customer note
            </p>
            <p className="text-sm font-body text-foreground whitespace-pre-wrap">
              {booking.customerNote}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: "/provider/messages" })}
            data-ocid={`provider_bookings.messages.${index + 1}`}
          >
            <MessageSquare className="w-4 h-4" aria-hidden />
            Message
          </Button>
          {isRequest ? (
            <>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={anyPending}
                data-ocid={`provider_bookings.accept.${index + 1}`}
              >
                <Check className="w-4 h-4" aria-hidden />
                {acceptBooking.isPending ? "Accepting…" : "Accept"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                disabled={anyPending}
                className="text-destructive hover:text-destructive"
                data-ocid={`provider_bookings.decline.${index + 1}`}
              >
                <X className="w-4 h-4" aria-hidden />
                {declineBooking.isPending ? "Declining…" : "Decline"}
              </Button>
            </>
          ) : null}
          {canStart ? (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={anyPending}
              data-ocid={`provider_bookings.start.${index + 1}`}
            >
              <Play className="w-4 h-4" aria-hidden />
              {startBooking.isPending ? "Starting…" : "Start job"}
            </Button>
          ) : null}
          {canComplete ? (
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={anyPending}
              data-ocid={`provider_bookings.complete.${index + 1}`}
            >
              <Check className="w-4 h-4" aria-hidden />
              {completeBooking.isPending ? "Completing…" : "Mark complete"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderBookings() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: bookings, isLoading: bookingsLoading } =
    useListProviderBookings(providerId);

  const [tab, setTab] = useState<FilterTab>("all");

  useEffect(() => {
    if (!isAuthenticated && !isInitializing) {
      // No-op — auth gate renders below.
    }
  }, [isAuthenticated, isInitializing]);

  const filtered = useMemo(() => {
    const list = [...(bookings ?? [])];
    list.sort((a, b) => Number(b.updatedAt - a.updatedAt));
    if (tab === "all") return list;
    if (tab === "requests")
      return list.filter((b) => REQUEST_STATUSES.includes(b.status));
    if (tab === "active")
      return list.filter((b) => ACTIVE_STATUSES.includes(b.status));
    if (tab === "completed")
      return list.filter((b) => COMPLETED_STATUSES.includes(b.status));
    if (tab === "cancelled")
      return list.filter((b) => b.status === "cancelled");
    return list;
  }, [bookings, tab]);

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.provider_bookings"
      >
        <SkeletonList
          count={3}
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_bookings"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to view bookings"
          description="You need to sign in with Internet Identity to manage incoming booking requests."
          data-ocid="provider_bookings.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_bookings"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to start receiving booking requests from DFW customers."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_bookings.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_bookings.not_registered"
        />
      </div>
    );
  }

  const allBookings = bookings ?? [];
  const requestCount = allBookings.filter((b) =>
    REQUEST_STATUSES.includes(b.status),
  ).length;

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_bookings"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_bookings.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
            Bookings
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Review incoming requests, manage active jobs, and mark work complete
            across the DFW metroplex.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8"
        data-ocid="provider_bookings.list"
      >
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as FilterTab)}
          className="mb-6"
        >
          <TabsList data-ocid="provider_bookings.tabs">
            {TAB_VALUES.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                data-ocid={`provider_bookings.tab.${t.value}`}
              >
                {t.label}
                {t.value === "requests" && requestCount > 0 ? (
                  <span
                    className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-body font-semibold"
                    aria-label={`${requestCount} pending`}
                  >
                    {requestCount}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {bookingsLoading ? (
          <SkeletonList
            count={3}
            className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={
              tab === "all"
                ? "No bookings yet"
                : `No ${TAB_VALUES.find((t) => t.value === tab)?.label.toLowerCase()} bookings`
            }
            description={
              tab === "requests"
                ? "When customers request your services, they'll appear here for you to accept or decline."
                : "Create listings and set availability so customers can find and book your services."
            }
            action={
              <Link to="/provider/listings">
                <Button data-ocid="provider_bookings.manage_listings">
                  Manage listings
                </Button>
              </Link>
            }
            data-ocid="provider_bookings.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((booking, i) => (
              <BookingRow key={booking.id} booking={booking} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
