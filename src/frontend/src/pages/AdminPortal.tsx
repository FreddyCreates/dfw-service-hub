// AdminPortal — admin dashboard for the DFW marketplace.
// Shows summary metrics (pending verifications, active bookings, reported
// reviews, total providers, total customers, open disputes, open reports) and
// quick action links to the provider verification, bookings, review
// moderation, dispute, and report pages. Dark portal theme, skeleton loading,
// and motion utilities.

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SkeletonCard } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { SeedResult } from "@/hooks/useBackend";
import {
  useGetEmailSettings,
  useIsOwnerSeeded,
  useListDisputes,
  useListMyBookings,
  useListProviders,
  useListReports,
  useListReviewsByProvider,
  useListUsers,
  useSeedOwnerServices,
  useSetEmailNotificationsEnabled,
} from "@/hooks/useQueries";
import type {
  Booking,
  Dispute,
  Provider,
  Review,
  ServiceCategory,
} from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  EyeOff,
  Flag,
  Mail,
  Package,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// A review is considered "reported"/hidden when the backend has set its
// hidden flag (hideReview sets hidden=true and preserves writtenText).
function isHidden(r: Review): boolean {
  return r.hidden;
}

function isActiveBooking(b: Booking): boolean {
  return (
    b.status === "requested" ||
    b.status === "accepted" ||
    b.status === "scheduled" ||
    b.status === "inProgress"
  );
}

function isOpenDispute(d: Dispute): boolean {
  return (
    d.status === "open" || d.status === "responded" || d.status === "escalated"
  );
}

function isOpenReport(r: { status: string }): boolean {
  return r.status === "open" || r.status === "reviewing";
}

interface MetricCardProps {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint?: string;
  accent?: "primary" | "warning" | "destructive" | "success";
  dataOcid: string;
  stagger?: number;
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
  stagger = 1,
}: MetricCardProps) {
  return (
    <Card
      className={`p-5 shadow-subtle animate-fade-in-up stagger-${stagger}`}
      data-ocid={dataOcid}
    >
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
  stagger?: number;
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  badge,
  dataOcid,
  stagger = 1,
}: QuickActionProps) {
  return (
    <Link
      to={to}
      className="block animate-fade-in-up"
      style={{ animationDelay: `${0.05 * stagger}s` }}
    >
      <Card
        className="p-5 shadow-subtle hover:shadow-md hover:border-primary/30 transition-smooth cursor-pointer h-full animate-card-hover-lift"
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

// Ordered list of the owner's four service categories — drives the
// per-category outcome list in the Marketplace Setup section.
const SEED_CATEGORIES: ServiceCategory[] = [
  "boxTruck",
  "relocation",
  "trashHaul",
  "moving",
];

// Marketplace Setup — owner-only surface for seeding the owner's four
// service categories. Shows seed status, a Seed Owner Services action, and a
// per-category outcome summary once seeding completes.
function MarketplaceSetup() {
  const { data: seeded, isLoading: seededLoading } = useIsOwnerSeeded();
  const seedMutation = useSeedOwnerServices();
  const [result, setResult] = useState<SeedResult | null>(null);

  const isSeeded = seeded === true;
  const isMutating = seedMutation.isPending;

  function handleSeed() {
    setResult(null);
    seedMutation.mutate(undefined, {
      onSuccess: (seedResult) => {
        setResult(seedResult);
      },
    });
  }

  return (
    <Card
      className="p-6 shadow-subtle animate-fade-in-up"
      data-ocid="admin.section.marketplace_setup"
    >
      <div className="flex flex-col gap-1 mb-5">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-4 h-4" aria-hidden />
          <span className="text-xs font-body font-medium uppercase tracking-wide">
            Marketplace setup
          </span>
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Seed owner services
        </h2>
        <p className="text-sm text-muted-foreground font-body max-w-2xl">
          Populate the marketplace with your own provider record and one listing
          for each of the four DFW service categories. Run this once when
          onboarding the marketplace.
        </p>
      </div>

      {/* Seed status indicator */}
      <div
        className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-4 mb-5"
        data-ocid="admin.marketplace_setup.status"
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            seededLoading
              ? "bg-muted"
              : isSeeded
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning-foreground"
          }`}
        >
          {seededLoading ? (
            <LoadingSpinner label="" />
          ) : isSeeded ? (
            <CheckCircle2 className="w-5 h-5" aria-hidden />
          ) : (
            <Sparkles className="w-5 h-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-body font-medium text-foreground">
            {seededLoading
              ? "Checking seed status…"
              : isSeeded
                ? "Owner services are seeded"
                : "Owner services not yet seeded"}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            {isSeeded
              ? "Your provider record and four listings already exist. Re-running will skip existing entries."
              : "Run the seed action below to create your provider record and listings."}
          </p>
        </div>
      </div>

      {/* Seed action */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Button
          onClick={handleSeed}
          disabled={isMutating || seededLoading}
          data-ocid="admin.marketplace_setup.seed_button"
        >
          {isMutating ? (
            <>
              <LoadingSpinner label="" />
              <span className="ml-2">Seeding…</span>
            </>
          ) : isSeeded ? (
            "Re-run seed"
          ) : (
            "Seed owner services"
          )}
        </Button>
        {seedMutation.isError ? (
          <p
            className="text-sm text-destructive font-body"
            data-ocid="admin.marketplace_setup.error_state"
            role="alert"
          >
            Seeding failed.{" "}
            {seedMutation.error instanceof Error
              ? seedMutation.error.message
              : "Please try again."}
          </p>
        ) : null}
      </div>

      {/* Seed result summary */}
      {result ? (
        <div
          className="rounded-lg border border-border bg-card p-5"
          data-ocid="admin.marketplace_setup.result"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-success" aria-hidden />
            <h3 className="font-display font-semibold text-foreground">
              Seed complete
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-body">
                Provider created:
              </span>
              <Badge
                variant="outline"
                className={
                  result.providerCreated
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-secondary text-muted-foreground"
                }
                data-ocid="admin.marketplace_setup.result.provider_created"
              >
                {result.providerCreated ? "Yes" : "No"}
              </Badge>
            </div>
            {result.providerId ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground font-body">
                  Provider ID:
                </span>
                <code
                  className="font-mono text-xs text-foreground bg-secondary px-2 py-0.5 rounded truncate max-w-[12rem]"
                  data-ocid="admin.marketplace_setup.result.provider_id"
                >
                  {result.providerId}
                </code>
              </div>
            ) : null}
          </div>

          <p className="text-xs font-body uppercase tracking-wide text-muted-foreground mb-2">
            Listing outcomes
          </p>
          <ul
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            data-ocid="admin.marketplace_setup.result.list"
          >
            {SEED_CATEGORIES.map((category, idx) => {
              const outcome = result.listingOutcomes.find(
                (o) => o.category === category,
              );
              const wasCreated = outcome?.outcome === "created";
              return (
                <li
                  key={category}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2"
                  data-ocid={`admin.marketplace_setup.result.item.${idx}`}
                >
                  <span className="font-body text-sm text-foreground">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      wasCreated
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-muted text-muted-foreground"
                    }
                    data-ocid={`admin.marketplace_setup.result.outcome.${idx}`}
                  >
                    {wasCreated ? "Created" : "Already existed"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

// Email Notifications — owner-only toggle for transactional email. Reads the
// current state via useGetEmailSettings and writes via
// useSetEmailNotificationsEnabled, with loading + success feedback.
function EmailNotifications() {
  const { data: settings, isLoading } = useGetEmailSettings();
  const toggleMutation = useSetEmailNotificationsEnabled();
  const [justChanged, setJustChanged] = useState(false);

  const enabled = settings?.emailNotificationsEnabled ?? false;
  const isMutating = toggleMutation.isPending;

  // Brief success confirmation after a successful toggle.
  useEffect(() => {
    if (!justChanged) return;
    const t = window.setTimeout(() => setJustChanged(false), 2500);
    return () => window.clearTimeout(t);
  }, [justChanged]);

  function handleToggle(next: boolean) {
    if (next === enabled || isMutating) return;
    toggleMutation.mutate(next, {
      onSuccess: () => setJustChanged(true),
    });
  }

  return (
    <Card
      className="p-6 shadow-subtle animate-fade-in-up stagger-2"
      data-ocid="admin.section.email_notifications"
      id="email-settings"
    >
      <div className="flex flex-col gap-1 mb-5">
        <div className="flex items-center gap-2 text-primary">
          <Mail className="w-4 h-4" aria-hidden />
          <span className="text-xs font-body font-medium uppercase tracking-wide">
            Notifications
          </span>
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Email notifications
        </h2>
        <p className="text-sm text-muted-foreground font-body max-w-2xl">
          When enabled, booking confirmations, status updates, and new message
          notifications are sent to customers and providers via email.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-4">
        <div className="min-w-0">
          <p className="font-body font-medium text-foreground">
            Transactional email
          </p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            {isLoading
              ? "Loading current setting…"
              : enabled
                ? "Currently enabled — notifications are being sent."
                : "Currently disabled — no notifications are sent."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {justChanged ? (
            <output
              className="text-xs font-body text-success flex items-center gap-1"
              data-ocid="admin.email_notifications.success_state"
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
              Saved
            </output>
          ) : null}
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || isMutating}
            aria-label="Toggle transactional email notifications"
            data-ocid="admin.email_notifications.toggle"
          />
          {isMutating ? (
            <LoadingSpinner label="" />
          ) : (
            <Badge
              variant="outline"
              className={
                enabled
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border bg-muted text-muted-foreground"
              }
              data-ocid="admin.email_notifications.state_badge"
            >
              {enabled ? "On" : "Off"}
            </Badge>
          )}
        </div>
      </div>

      {toggleMutation.isError ? (
        <p
          className="text-sm text-destructive font-body mt-3"
          data-ocid="admin.email_notifications.error_state"
          role="alert"
        >
          Could not update email setting.{" "}
          {toggleMutation.error instanceof Error
            ? toggleMutation.error.message
            : "Please try again."}
        </p>
      ) : null}
    </Card>
  );
}

export function AdminPortal() {
  const { data: providers, isLoading: providersLoading } = useListProviders();
  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: myBookings, isLoading: bookingsLoading } = useListMyBookings();
  const { data: disputes, isLoading: disputesLoading } = useListDisputes();
  const { data: reports, isLoading: reportsLoading } = useListReports();

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

  const openDisputes = useMemo(
    () => (disputes ?? []).filter(isOpenDispute).length,
    [disputes],
  );

  const openReports = useMemo(
    () => (reports ?? []).filter(isOpenReport).length,
    [reports],
  );

  const isLoading =
    providersLoading ||
    usersLoading ||
    bookingsLoading ||
    disputesLoading ||
    reportsLoading;

  return (
    <div className="bg-background" data-ocid="page.admin">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2 mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium">Admin</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Admin portal
          </h1>
          <p className="text-muted-foreground font-body max-w-2xl">
            Marketplace governance at a glance. Verify providers, monitor
            bookings, triage disputes, moderate reports, and review feedback to
            keep DFW Haul trusted across the metroplex.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonCard
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cards
                key={i}
                withMedia={false}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Marketplace setup + email notifications — owner-only controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
              <MarketplaceSetup />
              <EmailNotifications />
            </div>

            {/* Summary metrics — verification, bookings, reviews, disputes, reports, providers, customers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
              <MetricCard
                icon={ShieldCheck}
                label="Pending verifications"
                value={pendingVerifications}
                hint="Providers awaiting review"
                accent="warning"
                dataOcid="admin.metric.pending_verifications"
                stagger={1}
              />
              <MetricCard
                icon={Package}
                label="Active bookings"
                value={activeBookings}
                hint="In-progress across marketplace"
                accent="primary"
                dataOcid="admin.metric.active_bookings"
                stagger={2}
              />
              <MetricCard
                icon={EyeOff}
                label="Reported reviews"
                value={reportedReviewsCount}
                hint="Hidden / flagged for moderation"
                accent="destructive"
                dataOcid="admin.metric.reported_reviews"
                stagger={3}
              />
              <MetricCard
                icon={Scale}
                label="Open disputes"
                value={openDisputes}
                hint="Awaiting triage or resolution"
                accent="destructive"
                dataOcid="admin.metric.open_disputes"
                stagger={4}
              />
              <MetricCard
                icon={ShieldAlert}
                label="Open reports"
                value={openReports}
                hint="Community moderation queue"
                accent="warning"
                dataOcid="admin.metric.open_reports"
                stagger={1}
              />
              <MetricCard
                icon={Truck}
                label="Total providers"
                value={totalProviders}
                hint="Across all categories"
                accent="success"
                dataOcid="admin.metric.total_providers"
                stagger={2}
              />
              <MetricCard
                icon={Users}
                label="Total customers"
                value={totalCustomers}
                hint="Registered marketplace users"
                accent="primary"
                dataOcid="admin.metric.total_customers"
                stagger={3}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <QuickAction
                to="/admin/providers"
                icon={ShieldCheck}
                title="Verify providers"
                description="Review pending applications, approve, reject, or suspend."
                badge={pendingVerifications}
                dataOcid="admin.quick.providers"
                stagger={1}
              />
              <QuickAction
                to="/admin/bookings"
                icon={Package}
                title="Monitor bookings"
                description="Search and filter every booking across the marketplace."
                dataOcid="admin.quick.bookings"
                stagger={2}
              />
              <QuickAction
                to="/admin/reviews"
                icon={Star}
                title="Moderate reviews"
                description="Hide or restore reviews that violate community guidelines."
                badge={reportedReviewsCount}
                dataOcid="admin.quick.reviews"
                stagger={3}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <QuickAction
                to="/admin/disputes"
                icon={Scale}
                title="Resolve disputes"
                description="Triage booking disputes with AI suggestions and resolve or escalate."
                badge={openDisputes}
                dataOcid="admin.quick.disputes"
                stagger={1}
              />
              <QuickAction
                to="/admin/reports"
                icon={Flag}
                title="Moderate reports"
                description="Review community reports and resolve or dismiss them."
                badge={openReports}
                dataOcid="admin.quick.reports"
                stagger={2}
              />
              <QuickAction
                to="/admin/docs"
                icon={Sparkles}
                title="Manage docs"
                description="Author and publish help-center articles for customers and providers."
                dataOcid="admin.quick.docs"
                stagger={3}
              />
            </div>

            {/* Empty-state guidance when there's nothing to act on */}
            {totalProviders === 0 &&
            totalCustomers === 0 &&
            activeBookings === 0 ? (
              <div className="mt-10">
                <Card className="p-8 text-center shadow-subtle">
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
                    customers book services, pending verifications, disputes,
                    reports, and reviews will appear here for your review.
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
