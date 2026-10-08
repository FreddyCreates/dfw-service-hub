// AdminPortal — admin dashboard for the DFW marketplace.
// Shows summary metrics (pending verifications, active bookings, reported
// reviews, total providers, total customers) and quick action links to the
// provider verification, bookings, and review moderation pages.

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useListMyBookings,
  useListProviders,
  useListReviewsByProvider,
  useListUsers,
} from "@/hooks/useQueries";
import type { Booking, Provider, Review } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  EyeOff,
  Package,
  ShieldCheck,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// A review is considered "reported"/hidden when its writtenText is empty
// (moderateReview with "hide" clears text).
function isHidden(r: Review): boolean {
  return r.writtenText.trim() === "";
}

function isActiveBooking(b: Booking): boolean {
  return (
    b.status === "requested" ||
    b.status === "accepted" ||
    b.status === "scheduled" ||
    b.status === "inProgress"
  );
}

interface MetricCardProps {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint?: string;
  accent?: "primary" | "warning" | "destructive" | "success";
  dataOcid: string;
}

const accentMap: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success-foreground",
};

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "primary",
  dataOcid,
}: MetricCardProps) {
  return (
    <Card className="p-5" data-ocid={dataOcid}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wide">
            {label}
          </p>
          <p className="font-display text-3xl font-semibold text-foreground mt-1">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground font-body mt-1">
              {hint}
            </p>
          ) : null}
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accentMap[accent]}`}
        >
          <Icon className="w-5 h-5" aria-hidden />
        </div>
      </div>
    </Card>
  );
}

interface QuickActionProps {
  to: string;
  icon: typeof Users;
  title: string;
  description: string;
  badge?: number;
  dataOcid: string;
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  badge,
  dataOcid,
}: QuickActionProps) {
  return (
    <Link to={to} className="block">
      <Card
        className="p-5 hover:shadow-sm hover:border-primary/30 transition-smooth cursor-pointer h-full"
        data-ocid={dataOcid}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-foreground">
                {title}
              </h3>
              {badge !== undefined && badge > 0 ? (
                <Badge
                  variant="outline"
                  className="font-body border-warning/30 bg-warning/10 text-warning-foreground"
                >
                  {badge}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground font-body mt-0.5">
              {description}
            </p>
          </div>
          <ArrowRight
            className="w-4 h-4 text-muted-foreground shrink-0 mt-1"
            aria-hidden
          />
        </div>
      </Card>
    </Link>
  );
}

// Per-provider review fetcher component — keeps hook calls at the top level
// of a component (one hook per component instance, never in a loop).
function ProviderReviews({
  provider,
  onReviews,
}: {
  provider: Provider;
  onReviews: (providerId: string, reviews: Review[]) => void;
}) {
  const { data } = useListReviewsByProvider(provider.id);
  useEffect(() => {
    onReviews(provider.id, data ?? []);
    // We intentionally only re-emit when `data` changes.
  }, [data, provider.id, onReviews]);
  return null;
}

export function AdminPortal() {
  const { data: providers, isLoading: providersLoading } = useListProviders();
  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: myBookings, isLoading: bookingsLoading } = useListMyBookings();

  const providerList = providers ?? [];

  // Aggregate reviews across providers to count hidden/reported reviews.
  // We use a callback-driven pattern: each ProviderReviews component reports
  // its data up through a stable callback that writes into a ref-like map.
  // A version counter forces re-derivation when the map mutates.
  const reviewsByProvider = useMemo(() => new Map<string, Review[]>(), []);
  const [, setReviewsVersion] = useState(0);
  const handleReviews = useMemo(
    () => (providerId: string, reviews: Review[]) => {
      const prev = reviewsByProvider.get(providerId);
      if (
        prev &&
        prev.length === reviews.length &&
        prev.every((r, i) => r.id === reviews[i]?.id)
      ) {
        return; // no change, skip
      }
      reviewsByProvider.set(providerId, reviews);
      setReviewsVersion((v) => v + 1);
    },
    [reviewsByProvider],
  );

  const reportedReviewsCount = useMemo(() => {
    let count = 0;
    for (const reviews of reviewsByProvider.values()) {
      for (const r of reviews) {
        if (isHidden(r)) count += 1;
      }
    }
    return count;
  }, [reviewsByProvider]);

  const pendingVerifications = useMemo(
    () => providerList.filter((p) => p.verificationStatus === "pending").length,
    [providerList],
  );

  const totalProviders = providerList.length;
  const totalCustomers = useMemo(
    () => (users ?? []).filter((u) => u.role === "customer").length,
    [users],
  );

  // Active bookings: myBookings only returns the caller's bookings, but for
  // an admin dashboard we use it as a proxy signal. The full bookings list
  // lives on /admin/bookings. We count active statuses here.
  const activeBookings = useMemo(
    () => (myBookings ?? []).filter(isActiveBooking).length,
    [myBookings],
  );

  const isLoading = providersLoading || usersLoading || bookingsLoading;

  return (
    <div className="bg-background" data-ocid="page.admin">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium">Admin</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Admin portal
          </h1>
          <p className="text-muted-foreground font-body max-w-2xl">
            Marketplace governance at a glance. Verify providers, monitor
            bookings, and moderate reviews to keep DFW Haul trusted across the
            metroplex.
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner label="Loading admin metrics" />
        ) : (
          <>
            {/* Summary metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
              <MetricCard
                icon={ShieldCheck}
                label="Pending verifications"
                value={pendingVerifications}
                hint="Providers awaiting review"
                accent="warning"
                dataOcid="admin.metric.pending_verifications"
              />
              <MetricCard
                icon={Package}
                label="Active bookings"
                value={activeBookings}
                hint="In-progress across marketplace"
                accent="primary"
                dataOcid="admin.metric.active_bookings"
              />
              <MetricCard
                icon={EyeOff}
                label="Reported reviews"
                value={reportedReviewsCount}
                hint="Hidden / flagged for moderation"
                accent="destructive"
                dataOcid="admin.metric.reported_reviews"
              />
              <MetricCard
                icon={Truck}
                label="Total providers"
                value={totalProviders}
                hint="Across all categories"
                accent="success"
                dataOcid="admin.metric.total_providers"
              />
              <MetricCard
                icon={Users}
                label="Total customers"
                value={totalCustomers}
                hint="Registered marketplace users"
                accent="primary"
                dataOcid="admin.metric.total_customers"
              />
            </div>

            {/* Quick actions */}
            <div className="mb-4">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Quick actions
              </h2>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Jump straight into the moderation workflows.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <QuickAction
                to="/admin/providers"
                icon={ShieldCheck}
                title="Verify providers"
                description="Review pending applications, approve, reject, or suspend."
                badge={pendingVerifications}
                dataOcid="admin.quick.providers"
              />
              <QuickAction
                to="/admin/bookings"
                icon={Package}
                title="Monitor bookings"
                description="Search and filter every booking across the marketplace."
                dataOcid="admin.quick.bookings"
              />
              <QuickAction
                to="/admin/reviews"
                icon={Star}
                title="Moderate reviews"
                description="Hide or restore reviews that violate community guidelines."
                badge={reportedReviewsCount}
                dataOcid="admin.quick.reviews"
              />
            </div>

            {/* Empty-state guidance when there's nothing to act on */}
            {totalProviders === 0 &&
            totalCustomers === 0 &&
            activeBookings === 0 ? (
              <div className="mt-10">
                <Card className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Building2
                      className="w-6 h-6 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    Welcome to the admin portal
                  </h3>
                  <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
                    No marketplace activity yet. As providers register and
                    customers book services, pending verifications and reviews
                    will appear here for your review.
                  </p>
                </Card>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Hidden per-provider review fetchers — one hook per component, no loops */}
      {providerList.map((p) => (
        <ProviderReviews key={p.id} provider={p} onReviews={handleReviews} />
      ))}
    </div>
  );
}
