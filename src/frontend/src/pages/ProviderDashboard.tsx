// ProviderDashboard — overview for verified DFW marketplace providers.
// Verification status banner, stats summary, recent bookings, recent reviews,
// and quick links to listings / availability / messages / AI tools.

import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ReviewCard } from "@/components/ReviewCard";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetMyProvider,
  useListProviderBookings,
  useListReviewsByProvider,
} from "@/hooks/useQueries";
import type { Booking } from "@/types";
import {
  CATEGORY_SHORT,
  VERIFICATION_LABELS,
  type VerificationStatus,
} from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Sparkles,
  Star,
  Truck,
  XCircle,
} from "lucide-react";

const STATUS_META: Record<
  VerificationStatus,
  { icon: typeof BadgeCheck; tone: string; bg: string }
> = {
  pending: {
    icon: Clock,
    tone: "text-warning-foreground",
    bg: "bg-warning/10 border-warning/30",
  },
  approved: {
    icon: BadgeCheck,
    tone: "text-success-foreground",
    bg: "bg-success/10 border-success/30",
  },
  rejected: {
    icon: XCircle,
    tone: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
  },
  suspended: {
    icon: AlertCircle,
    tone: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
  },
};

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProviderDashboard() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: bookings, isLoading: bookingsLoading } =
    useListProviderBookings(providerId);
  const { data: reviews, isLoading: reviewsLoading } =
    useListReviewsByProvider(providerId);

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.provider_dashboard"
      >
        <LoadingSpinner fullPage label="Loading provider dashboard" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_dashboard"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to view your dashboard"
          description="You need to sign in to access your provider dashboard."
          data-ocid="provider_dashboard.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_dashboard"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to start offering services across the DFW metroplex."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_dashboard.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_dashboard.not_registered"
        />
      </div>
    );
  }

  const status = provider.verificationStatus;
  const StatusIcon = STATUS_META[status].icon;
  const isApproved = status === "approved";

  const allBookings = bookings ?? [];
  const pendingRequests = allBookings.filter((b) => b.status === "requested");
  const activeBookings = allBookings.filter(
    (b) =>
      b.status === "accepted" ||
      b.status === "scheduled" ||
      b.status === "inProgress",
  );

  const ratingCount = Number(provider.ratingCount);
  const averageRating =
    ratingCount > 0 ? Number(provider.ratingSum) / ratingCount : 0;

  const recentBookings = [...allBookings]
    .sort((a, b) => Number(b.updatedAt - a.updatedAt))
    .slice(0, 5);

  const recentReviews = (reviews ?? []).slice(0, 3);

  const stats = [
    {
      icon: ClipboardList,
      label: "Total bookings",
      value: allBookings.length,
      tone: "text-primary",
    },
    {
      icon: Inbox,
      label: "Pending requests",
      value: pendingRequests.length,
      tone: "text-warning-foreground",
    },
    {
      icon: CalendarClock,
      label: "Active bookings",
      value: activeBookings.length,
      tone: "text-accent-foreground",
    },
    {
      icon: Star,
      label: "Average rating",
      value: ratingCount > 0 ? averageRating.toFixed(1) : "—",
      tone: "text-accent",
    },
  ];

  const quickLinks = [
    {
      to: "/provider/listings" as const,
      icon: LayoutGrid,
      label: "Manage listings",
      description: "Create and edit your service offerings",
      ocid: "provider_dashboard.link.listings",
    },
    {
      to: "/provider/availability" as const,
      icon: CalendarDays,
      label: "Set availability",
      description: "Open time slots for customers to book",
      ocid: "provider_dashboard.link.availability",
    },
    {
      to: "/provider/messages" as const,
      icon: MessageSquare,
      label: "Messages",
      description: "Reply to customer inquiries",
      ocid: "provider_dashboard.link.messages",
    },
    {
      to: "/provider/ai-tools" as const,
      icon: Sparkles,
      label: "AI tools",
      description: "Generate listing copy and promotions",
      ocid: "provider_dashboard.link.ai_tools",
    },
  ];

  return (
    <div
      className="container mx-auto px-4 lg:px-6 py-12 max-w-6xl"
      data-ocid="page.provider_dashboard"
    >
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Provider dashboard
        </h1>
        <p className="mt-2 text-muted-foreground font-body">
          Welcome back, {provider.companyName}. Here's your marketplace
          overview.
        </p>
      </header>

      {/* Verification status banner */}
      <Card
        className={`py-0 mb-8 border ${STATUS_META[status].bg}`}
        data-ocid="provider_dashboard.status_banner"
      >
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shrink-0">
            <StatusIcon
              className={`w-6 h-6 ${STATUS_META[status].tone}`}
              aria-hidden
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg font-semibold text-foreground">
              Verification status:{" "}
              <span className={STATUS_META[status].tone}>
                {VERIFICATION_LABELS[status]}
              </span>
            </p>
            <p className="text-sm text-muted-foreground font-body mt-0.5">
              {status === "pending"
                ? "Your application is under review. You'll be able to create listings once approved."
                : status === "approved"
                  ? "You're verified. You can create listings and receive bookings."
                  : status === "rejected"
                    ? "Your application was rejected. Review the admin note and update your details."
                    : "Your provider account is suspended. Contact support for assistance."}
            </p>
            {provider.verificationNote ? (
              <div className="mt-2 rounded-lg border border-border bg-card/60 p-3">
                <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
                  Admin note
                </p>
                <p className="text-sm font-body text-foreground">
                  {provider.verificationNote}
                </p>
              </div>
            ) : null}
          </div>
          <Link to="/provider/register">
            <Button
              variant="outline"
              data-ocid="provider_dashboard.edit_profile"
            >
              Edit profile
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Stats summary */}
      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        aria-label="Dashboard stats"
        data-ocid="provider_dashboard.stats"
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="py-0"
              data-ocid={`provider_dashboard.stat.${i + 1}`}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${stat.tone}`} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-display font-bold text-foreground leading-none">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-1 truncate">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <section
          className="lg:col-span-2"
          aria-label="Recent bookings"
          data-ocid="provider_dashboard.recent_bookings"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Recent bookings
            </h2>
            <Link to="/provider/bookings">
              <Button
                variant="outline"
                size="sm"
                data-ocid="provider_dashboard.view_all_bookings"
              >
                View all
              </Button>
            </Link>
          </div>
          {bookingsLoading ? (
            <LoadingSpinner label="Loading bookings" />
          ) : recentBookings.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No bookings yet"
              description={
                isApproved
                  ? "Once customers request your services, they'll appear here."
                  : "Get verified to start receiving booking requests."
              }
              data-ocid="provider_dashboard.no_bookings"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {recentBookings.map((booking, i) => (
                <RecentBookingRow
                  key={booking.id}
                  booking={booking}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent reviews */}
        <section
          aria-label="Recent reviews"
          data-ocid="provider_dashboard.recent_reviews"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Recent reviews
            </h2>
            {ratingCount > 0 ? (
              <StarRating
                value={averageRating}
                size="sm"
                showValue
                count={ratingCount}
              />
            ) : null}
          </div>
          {reviewsLoading ? (
            <LoadingSpinner label="Loading reviews" />
          ) : recentReviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Reviews from completed bookings will appear here."
              data-ocid="provider_dashboard.no_reviews"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {recentReviews.map((review, i) => (
                <ReviewCard key={review.id} review={review} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick links */}
      <section
        className="mt-10"
        aria-label="Quick links"
        data-ocid="provider_dashboard.quick_links"
      >
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">
          Quick links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.to} to={link.to}>
                <Card
                  className="py-0 h-full transition-smooth hover:border-primary/50 hover:shadow-md cursor-pointer"
                  data-ocid={link.ocid}
                >
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" aria-hidden />
                    </div>
                    <p className="font-display font-semibold text-foreground">
                      {link.label}
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      {link.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

interface RecentBookingRowProps {
  booking: Booking;
  index: number;
}

function RecentBookingRow({ booking, index }: RecentBookingRowProps) {
  return (
    <Card
      className="py-0"
      data-ocid={`provider_dashboard.booking.${index + 1}`}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-body font-medium text-foreground truncate">
              {CATEGORY_SHORT[booking.category]} service
            </p>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-xs text-muted-foreground font-body mt-1 truncate">
            {formatDate(booking.createdAt)} · {booking.scheduledDate} at{" "}
            {booking.scheduledTime} · {booking.address}
          </p>
        </div>
        <Link to="/provider/bookings">
          <Button
            variant="outline"
            size="sm"
            data-ocid={`provider_dashboard.booking.view.${index + 1}`}
          >
            View
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
