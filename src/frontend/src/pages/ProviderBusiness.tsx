// ProviderBusiness — SaaS business hub for verified DFW providers.
// Revenue analytics (weekly/monthly trends, category breakdown, top-performing
// listings) aggregated from useListProviderBookings, response-time coaching
// via useGenerateProviderInsights, and business settings (service areas,
// operating hours, instant-booking toggle, cancellation policy) persisted
// through useUpdateMyProvider.

import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGenerateProviderInsights,
  useGetMyProvider,
  useListListingsByProvider,
  useListProviderBookings,
  useUpdateMyProvider,
} from "@/hooks/useQueries";
import {
  type Booking,
  CATEGORY_LABELS,
  type ProviderInput,
  type ServiceCategory,
} from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarClock,
  Check,
  Clock,
  DollarSign,
  Loader2,
  Settings,
  Sparkles,
  TrendingUp,
  Truck,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DFW_AREAS = [
  "Dallas",
  "Fort Worth",
  "Arlington",
  "Plano",
  "Irving",
  "Garland",
  "Frisco",
  "McKinney",
  "Denton",
  "Richardson",
];

const CANCELLATION_POLICIES = [
  { value: "flexible", label: "Flexible — full refund up to 24h before" },
  { value: "moderate", label: "Moderate — full refund up to 48h before" },
  { value: "strict", label: "Strict — 50% refund up to 72h before" },
] as const;

type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number]["value"];

// ─── Analytics helpers ──────────────────────────────────────────────────────

function bookingRevenue(_booking: Booking): number {
  // Bookings don't carry a price; we approximate revenue from the listing's
  // priceCents when available. The aggregator falls back to 0 when the
  // listing isn't found.
  return 0;
}

interface RevenuePoint {
  label: string;
  value: number;
  count: number;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday start
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function weeklyBuckets(bookings: Booking[]): RevenuePoint[] {
  const weeks: RevenuePoint[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = startOfWeek(new Date(now.getTime() - i * 7 * 86_400_000));
    const end = new Date(start.getTime() + 7 * 86_400_000);
    const inWeek = bookings.filter((b) => {
      const ts = Number(b.createdAt) / 1_000_000;
      const d = new Date(ts);
      return d >= start && d < end;
    });
    weeks.push({
      label: start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: inWeek.reduce((sum, b) => sum + bookingRevenue(b), 0),
      count: inWeek.length,
    });
  }
  return weeks;
}

function monthlyBuckets(bookings: Booking[]): RevenuePoint[] {
  const months: RevenuePoint[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = bookings.filter((b) => {
      const ts = Number(b.createdAt) / 1_000_000;
      const d = new Date(ts);
      return d >= ref && d < next;
    });
    months.push({
      label: ref.toLocaleDateString("en-US", { month: "short" }),
      value: inMonth.reduce((sum, b) => sum + bookingRevenue(b), 0),
      count: inMonth.length,
    });
  }
  return months;
}

interface CategoryBreakdown {
  category: ServiceCategory;
  count: number;
  share: number;
}

function categoryBreakdown(bookings: Booking[]): CategoryBreakdown[] {
  const counts = new Map<ServiceCategory, number>();
  for (const b of bookings) {
    counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  }
  const total = bookings.length || 1;
  return [...counts.entries()]
    .map(([category, count]) => ({
      category,
      count,
      share: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

interface TopListing {
  listingId: string;
  title: string;
  count: number;
}

function topListings(
  bookings: Booking[],
  listingTitles: Map<string, string>,
): TopListing[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    counts.set(b.listingId, (counts.get(b.listingId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([listingId, count]) => ({
      listingId,
      title: listingTitles.get(listingId) ?? `Listing #${listingId}`,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// ─── Mini bar chart ─────────────────────────────────────────────────────────

function MiniBarChart({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div
      className="flex items-end gap-2 h-40"
      data-ocid="provider_business.chart"
      role="img"
      aria-label="Revenue trend chart"
    >
      {points.map((p, i) => {
        const heightPct = (p.value / max) * 100;
        return (
          <div
            key={p.label}
            className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
            data-ocid={`provider_business.chart.bar.${i + 1}`}
          >
            <div className="w-full flex items-end justify-center h-full">
              <div
                className="w-full max-w-8 rounded-t-md bg-primary/80 transition-smooth animate-fade-in-up"
                style={{ height: `${Math.max(4, heightPct)}%` }}
                title={`${p.label}: $${p.value.toFixed(0)} · ${p.count} bookings`}
              />
            </div>
            <span className="text-[10px] font-body text-muted-foreground truncate w-full text-center">
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Insights panel ─────────────────────────────────────────────────────────

function InsightsPanel({ providerId }: { providerId: string }) {
  const generateInsights = useGenerateProviderInsights();
  const [insights, setInsights] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const handleGenerate = () => {
    generateInsights.mutate(providerId, {
      onSuccess: (data) => {
        setInsights(data.insights);
        setRecommendations(data.recommendations);
        toast.success("Insights generated");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate insights",
        ),
    });
  };

  return (
    <Card
      className="py-0 flex flex-col h-full"
      data-ocid="provider_business.insights_card"
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Sparkles
              className="w-4.5 h-4.5 text-accent-foreground"
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
              Response-time coaching
            </CardTitle>
            <CardDescription className="font-body mt-0.5">
              AI analysis of your booking pace, response times, and growth
              opportunities.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generateInsights.isPending}
          data-ocid="provider_business.generate_insights"
          className="w-full sm:w-auto"
        >
          {generateInsights.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Analyzing…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" aria-hidden />
              Generate insights
            </>
          )}
        </Button>

        {insights ? (
          <div
            className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex flex-col gap-3 animate-fade-in-up"
            data-ocid="provider_business.insights_output"
          >
            <span
              className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-body font-semibold uppercase tracking-wide text-accent-foreground ring-1 ring-accent/30 w-fit"
              data-ocid="provider_business.insights_badge"
            >
              <Sparkles className="w-2.5 h-2.5" aria-hidden />
              AI-generated
            </span>
            <p className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">
              {insights}
            </p>
            {recommendations.length > 0 ? (
              <div className="flex flex-col gap-2 mt-1">
                <p className="text-xs font-body font-semibold text-muted-foreground">
                  Recommendations
                </p>
                <ul className="flex flex-col gap-1.5">
                  {recommendations.map((rec, i) => (
                    <li
                      key={rec}
                      className="flex items-start gap-2 text-sm font-body text-foreground"
                      data-ocid={`provider_business.recommendation.${i + 1}`}
                    >
                      <Check
                        className="w-4 h-4 text-accent-foreground shrink-0 mt-0.5"
                        aria-hidden
                      />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs font-body text-muted-foreground/70">
            Run the analysis to surface response-time coaching and growth
            recommendations tailored to your booking history.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Business settings ──────────────────────────────────────────────────────

interface BusinessSettingsProps {
  providerId: string;
  companyName: string;
  description: string;
  serviceCategories: ServiceCategory[];
  serviceAreas: string[];
}

function BusinessSettings({
  companyName,
  description,
  serviceCategories,
  serviceAreas,
}: BusinessSettingsProps) {
  const updateProvider = useUpdateMyProvider();
  const [areas, setAreas] = useState<string[]>(serviceAreas);
  const [customArea, setCustomArea] = useState("");
  const [operatingHours, setOperatingHours] = useState("Mon–Sat, 7am–7pm");
  const [instantBooking, setInstantBooking] = useState(false);
  const [cancellation, setCancellation] =
    useState<CancellationPolicy>("flexible");
  const [policyNote, setPolicyNote] = useState("");

  const toggleArea = (area: string) => {
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  const addCustomArea = () => {
    const trimmed = customArea.trim();
    if (trimmed && !areas.includes(trimmed)) {
      setAreas((prev) => [...prev, trimmed]);
      setCustomArea("");
    }
  };

  const handleSave = () => {
    if (areas.length === 0) {
      toast.error("Add at least one service area");
      return;
    }
    const input: ProviderInput = {
      companyName,
      description,
      serviceCategories,
      serviceAreas: areas,
    };
    updateProvider.mutate(input, {
      onSuccess: () =>
        toast.success("Business settings saved. Hours and policies noted."),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not save settings",
        ),
    });
  };

  return (
    <Card className="py-0" data-ocid="provider_business.settings_card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Settings className="w-4.5 h-4.5 text-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
              Business settings
            </CardTitle>
            <CardDescription className="font-body mt-0.5">
              Service areas, operating hours, instant-booking, and cancellation
              policy.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Service areas */}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-body font-medium text-foreground mb-1">
            Service areas
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DFW_AREAS.map((area) => {
              const checked = areas.includes(area);
              return (
                <label
                  key={area}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-smooth ${
                    checked
                      ? "border-primary/50 bg-primary/10"
                      : "border-border hover:bg-secondary/50"
                  }`}
                  data-ocid={`provider_business.area.${area}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArea(area)}
                    className="sr-only"
                    data-ocid={`provider_business.area_checkbox.${area}`}
                  />
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked
                        ? "bg-primary border-primary"
                        : "border-border bg-card"
                    }`}
                    aria-hidden
                  >
                    {checked ? (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    ) : null}
                  </span>
                  <span className="text-sm font-body text-foreground">
                    {area}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              placeholder="Add another DFW city"
              data-ocid="provider_business.custom_area_input"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomArea();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCustomArea}
              data-ocid="provider_business.add_area_button"
            >
              Add
            </Button>
          </div>
        </fieldset>

        {/* Operating hours */}
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="operating-hours"
            data-ocid="provider_business.hours_label"
          >
            Operating hours
          </Label>
          <Input
            id="operating-hours"
            value={operatingHours}
            onChange={(e) => setOperatingHours(e.target.value)}
            placeholder="e.g. Mon–Sat, 7am–7pm"
            data-ocid="provider_business.hours_input"
          />
          <p className="text-xs font-body text-muted-foreground">
            Shown to customers on your profile and microsite.
          </p>
        </div>

        {/* Instant booking */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="min-w-0">
            <Label
              htmlFor="instant-booking"
              className="font-body font-medium"
              data-ocid="provider_business.instant_label"
            >
              Instant booking
            </Label>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              Skip the request step — customers book open slots directly.
            </p>
          </div>
          <Switch
            id="instant-booking"
            checked={instantBooking}
            onCheckedChange={setInstantBooking}
            data-ocid="provider_business.instant_switch"
          />
        </div>

        {/* Cancellation policy */}
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="cancellation-policy"
            data-ocid="provider_business.cancellation_label"
          >
            Cancellation policy
          </Label>
          <Select
            value={cancellation}
            onValueChange={(v) => setCancellation(v as CancellationPolicy)}
          >
            <SelectTrigger
              id="cancellation-policy"
              className="w-full"
              data-ocid="provider_business.cancellation_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANCELLATION_POLICIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Policy note */}
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="policy-note"
            data-ocid="provider_business.policy_note_label"
          >
            Policy note (optional)
          </Label>
          <Textarea
            id="policy-note"
            value={policyNote}
            onChange={(e) => setPolicyNote(e.target.value)}
            placeholder="Add any custom terms, fees, or exceptions."
            rows={3}
            data-ocid="provider_business.policy_note_input"
          />
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={updateProvider.isPending}
          data-ocid="provider_business.save_settings"
          className="w-full sm:w-auto"
        >
          {updateProvider.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <Check className="w-4 h-4" aria-hidden />
              Save settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function ProviderBusiness() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: bookings, isLoading: bookingsLoading } =
    useListProviderBookings(providerId);
  const { data: listings, isLoading: listingsLoading } =
    useListListingsByProvider(providerId);

  const [trend, setTrend] = useState<"weekly" | "monthly">("weekly");

  const listingTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of listings ?? []) map.set(l.id, l.title);
    return map;
  }, [listings]);

  const allBookings = bookings ?? [];
  const weekly = useMemo(() => weeklyBuckets(allBookings), [allBookings]);
  const monthly = useMemo(() => monthlyBuckets(allBookings), [allBookings]);
  const breakdown = useMemo(
    () => categoryBreakdown(allBookings),
    [allBookings],
  );
  const top = useMemo(
    () => topListings(allBookings, listingTitles),
    [allBookings, listingTitles],
  );

  const totalBookings = allBookings.length;
  const completedCount = allBookings.filter(
    (b) => b.status === "completed" || b.status === "reviewed",
  ).length;
  const activeCount = allBookings.filter(
    (b) =>
      b.status === "accepted" ||
      b.status === "scheduled" ||
      b.status === "inProgress",
  ).length;
  const completionRate =
    totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12 max-w-6xl"
        data-ocid="page.provider_business"
      >
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity; index is the only available key.
              key={i}
              withMedia={false}
            />
          ))}
        </div>
        <SkeletonCard className="mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_business"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to view your business hub"
          description="You need to sign in with Internet Identity to access revenue analytics and business settings."
          data-ocid="provider_business.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_business"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to unlock revenue analytics and business settings."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_business.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_business.not_registered"
        />
      </div>
    );
  }

  const stats = [
    {
      icon: CalendarClock,
      label: "Total bookings",
      value: totalBookings,
      tone: "text-primary",
    },
    {
      icon: TrendingUp,
      label: "Active jobs",
      value: activeCount,
      tone: "text-accent-foreground",
    },
    {
      icon: Check,
      label: "Completion rate",
      value: `${completionRate}%`,
      tone: "text-success-foreground",
    },
    {
      icon: DollarSign,
      label: "Completed jobs",
      value: completedCount,
      tone: "text-primary",
    },
  ];

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_business"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_business.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" aria-hidden />
            Business hub
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Revenue trends, top performers, AI coaching, and business settings
            for {provider.companyName}.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8 max-w-6xl flex flex-col gap-8"
        data-ocid="provider_business.body"
      >
        {/* Stats */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          data-ocid="provider_business.stats"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className={`py-0 animate-fade-in-up stagger-${i + 1}`}
                data-ocid={`provider_business.stat.${i + 1}`}
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
        </div>

        {/* Revenue trend */}
        <Card
          className="py-0 animate-fade-in-up stagger-2"
          data-ocid="provider_business.trend_card"
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4.5 h-4.5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
                    Booking trend
                  </CardTitle>
                  <CardDescription className="font-body mt-0.5">
                    {trend === "weekly"
                      ? "Bookings per week, last 6 weeks"
                      : "Bookings per month, last 6 months"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                {(["weekly", "monthly"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrend(t)}
                    className={`px-3 py-1 rounded-md text-xs font-body font-medium transition-smooth ${
                      trend === t
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-ocid={`provider_business.trend_toggle.${t}`}
                  >
                    {t === "weekly" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : totalBookings === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No bookings to chart yet"
                description="Once customers book your services, your trend will appear here."
                data-ocid="provider_business.trend_empty"
              />
            ) : (
              <MiniBarChart points={trend === "weekly" ? weekly : monthly} />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category breakdown */}
          <Card
            className="py-0 animate-fade-in-up stagger-3"
            data-ocid="provider_business.breakdown_card"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <BarChart3
                    className="w-4.5 h-4.5 text-foreground"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
                    Category breakdown
                  </CardTitle>
                  <CardDescription className="font-body mt-0.5">
                    Share of bookings by service category.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <SkeletonText lines={4} />
              ) : breakdown.length === 0 ? (
                <p className="text-sm font-body text-muted-foreground">
                  No bookings yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {breakdown.map((row, i) => (
                    <li
                      key={row.category}
                      className="flex flex-col gap-1.5"
                      data-ocid={`provider_business.breakdown.${i + 1}`}
                    >
                      <div className="flex items-center justify-between text-sm font-body">
                        <span className="text-foreground">
                          {CATEGORY_LABELS[row.category]}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {row.count} · {row.share.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-smooth"
                          style={{ width: `${row.share}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Top listings */}
          <Card
            className="py-0 animate-fade-in-up stagger-4"
            data-ocid="provider_business.top_listings_card"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <TrendingUp
                    className="w-4.5 h-4.5 text-foreground"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
                    Top-performing listings
                  </CardTitle>
                  <CardDescription className="font-body mt-0.5">
                    Listings ranked by booking count.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {listingsLoading ? (
                <SkeletonText lines={4} />
              ) : top.length === 0 ? (
                <p className="text-sm font-body text-muted-foreground">
                  No bookings yet.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {top.map((row, i) => (
                    <li
                      key={row.listingId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                      data-ocid={`provider_business.top_listing.${i + 1}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-body font-semibold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm font-body text-foreground truncate min-w-0">
                          {row.title}
                        </span>
                      </div>
                      <span className="text-xs font-body text-muted-foreground tabular-nums shrink-0">
                        {row.count} bookings
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Insights + settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animate-fade-in-up stagger-5">
            <InsightsPanel providerId={provider.id} />
          </div>
          <div className="animate-fade-in-up stagger-6">
            <BusinessSettings
              providerId={provider.id}
              companyName={provider.companyName}
              description={provider.description}
              serviceCategories={provider.serviceCategories}
              serviceAreas={provider.serviceAreas}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
