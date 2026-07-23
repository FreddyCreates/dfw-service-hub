// ProviderClients — client management for verified DFW providers.
// Aggregates repeat-customer flags, lifetime value per customer, and booking
// history per client from useListProviderBookings. Customer display names come
// from useGetUser per principal.

import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetMyProvider,
  useGetUser,
  useListProviderBookings,
} from "@/hooks/useQueries";
import { type Booking, CATEGORY_LABELS } from "@/types";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock,
  Heart,
  Repeat,
  Search,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

// ─── Aggregation ────────────────────────────────────────────────────────────

interface ClientRecord {
  principal: Principal;
  bookingCount: number;
  completedCount: number;
  repeat: boolean;
  firstBooking: bigint;
  lastBooking: bigint;
  bookings: Booking[];
}

function aggregateClients(bookings: Booking[]): ClientRecord[] {
  const map = new Map<string, ClientRecord>();
  for (const b of bookings) {
    const key = b.customerId.toString();
    const existing = map.get(key);
    if (existing) {
      existing.bookingCount += 1;
      if (b.status === "completed" || b.status === "reviewed")
        existing.completedCount += 1;
      if (b.createdAt < existing.firstBooking)
        existing.firstBooking = b.createdAt;
      if (b.updatedAt > existing.lastBooking)
        existing.lastBooking = b.updatedAt;
      existing.bookings.push(b);
    } else {
      map.set(key, {
        principal: b.customerId,
        bookingCount: 1,
        completedCount:
          b.status === "completed" || b.status === "reviewed" ? 1 : 0,
        repeat: false,
        firstBooking: b.createdAt,
        lastBooking: b.updatedAt,
        bookings: [b],
      });
    }
  }
  for (const rec of map.values()) {
    rec.repeat = rec.bookingCount >= 2;
    rec.bookings.sort((a, b) => Number(b.updatedAt - a.updatedAt));
  }
  return [...map.values()].sort((a, b) => b.bookingCount - a.bookingCount);
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function principalShort(principal: string): string {
  if (!principal) return "Customer";
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

// ─── Client row ──────────────────────────────────────────────────────────────

interface ClientRowProps {
  record: ClientRecord;
  index: number;
  onSelect: (record: ClientRecord) => void;
}

function ClientRow({ record, index, onSelect }: ClientRowProps) {
  const { data: user } = useGetUser(record.principal);
  const name = user?.displayName ?? principalShort(record.principal.toString());

  return (
    <Card
      className="py-0 animate-card-hover-lift cursor-pointer"
      data-ocid={`provider_clients.item.${index + 1}`}
    >
      <button
        type="button"
        onClick={() => onSelect(record)}
        className="w-full text-left"
        aria-label={`View ${name}'s booking history`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="font-display font-semibold text-primary">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-body font-medium text-foreground truncate">
                {name}
              </p>
              {record.repeat ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-body font-semibold uppercase tracking-wide text-accent-foreground ring-1 ring-accent/30"
                  data-ocid={`provider_clients.repeat_badge.${index + 1}`}
                >
                  <Repeat className="w-2.5 h-2.5" aria-hidden />
                  Repeat
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground font-body mt-0.5 truncate">
              {principalShort(record.principal.toString())} ·{" "}
              {record.bookingCount} booking
              {record.bookingCount === 1 ? "" : "s"} · {record.completedCount}{" "}
              completed
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground font-body">Last seen</p>
            <p className="text-xs font-body text-foreground">
              {formatDate(record.lastBooking)}
            </p>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}

// ─── Client detail ───────────────────────────────────────────────────────────

interface ClientDetailProps {
  record: ClientRecord;
  onBack: () => void;
}

function ClientDetail({ record, onBack }: ClientDetailProps) {
  const { data: user } = useGetUser(record.principal);
  const name = user?.displayName ?? principalShort(record.principal.toString());

  const lifetimeBookings = record.bookingCount;
  const completedRate =
    record.bookingCount > 0
      ? Math.round((record.completedCount / record.bookingCount) * 100)
      : 0;

  return (
    <div
      className="flex flex-col gap-6 animate-fade-in-up"
      data-ocid="provider_clients.detail"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to client list"
          data-ocid="provider_clients.back"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="font-display text-lg font-semibold text-primary">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-foreground truncate">
              {name}
            </h2>
            <p className="text-xs text-muted-foreground font-body truncate">
              {principalShort(record.principal.toString())}
            </p>
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-3"
        data-ocid="provider_clients.detail_stats"
      >
        <Card className="py-0" data-ocid="provider_clients.stat_bookings">
          <CardContent className="flex flex-col gap-1 p-4">
            <Wallet className="w-4 h-4 text-primary" aria-hidden />
            <p className="text-2xl font-display font-bold text-foreground leading-none mt-1">
              {lifetimeBookings}
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Lifetime bookings
            </p>
          </CardContent>
        </Card>
        <Card className="py-0" data-ocid="provider_clients.stat_completed">
          <CardContent className="flex flex-col gap-1 p-4">
            <Heart className="w-4 h-4 text-accent-foreground" aria-hidden />
            <p className="text-2xl font-display font-bold text-foreground leading-none mt-1">
              {completedRate}%
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Completion rate
            </p>
          </CardContent>
        </Card>
        <Card className="py-0" data-ocid="provider_clients.stat_repeat">
          <CardContent className="flex flex-col gap-1 p-4">
            <Repeat className="w-4 h-4 text-foreground" aria-hidden />
            <p className="text-2xl font-display font-bold text-foreground leading-none mt-1">
              {record.repeat ? "Yes" : "No"}
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Repeat customer
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="py-0" data-ocid="provider_clients.history_card">
        <CardHeader>
          <CardTitle className="font-display text-base font-semibold text-foreground">
            Booking history
          </CardTitle>
          <CardDescription className="font-body">
            Most recent first.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {record.bookings.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              data-ocid={`provider_clients.history.${i + 1}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <CalendarDays
                    className="w-4 h-4 text-foreground"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-body font-medium text-foreground truncate">
                    {CATEGORY_LABELS[b.category]}
                  </p>
                  <p className="text-xs text-muted-foreground font-body flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3" aria-hidden />
                    {formatDate(b.createdAt)} · {b.scheduledDate}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-body font-medium ${
                  b.status === "completed" || b.status === "reviewed"
                    ? "bg-success/10 text-success-foreground"
                    : b.status === "cancelled"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-accent/10 text-accent-foreground"
                }`}
              >
                {b.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type SortKey = "recent" | "frequent" | "repeat";

export function ProviderClients() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: bookings, isLoading: bookingsLoading } =
    useListProviderBookings(providerId);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selected, setSelected] = useState<ClientRecord | null>(null);

  const clients = useMemo(() => aggregateClients(bookings ?? []), [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = clients;
    if (q) {
      list = list.filter((c) =>
        c.principal.toString().toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sort === "frequent")
      sorted.sort((a, b) => b.bookingCount - a.bookingCount);
    else if (sort === "recent")
      sorted.sort((a, b) => Number(b.lastBooking - a.lastBooking));
    else if (sort === "repeat")
      sorted.sort(
        (a, b) =>
          Number(b.repeat) - Number(a.repeat) ||
          b.bookingCount - a.bookingCount,
      );
    return sorted;
  }, [clients, search, sort]);

  const repeatCount = clients.filter((c) => c.repeat).length;

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12 max-w-5xl"
        data-ocid="page.provider_clients"
      >
        <Skeleton className="h-9 w-56 mb-2" />
        <Skeleton className="h-4 w-80 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity; index is the only available key.
              key={i}
              withMedia={false}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_clients"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to view your clients"
          description="You need to sign in with Internet Identity to manage your customer relationships."
          data-ocid="provider_clients.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_clients"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to start building client relationships across DFW."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_clients.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_clients.not_registered"
        />
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_clients"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_clients.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" aria-hidden />
            Clients
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            {clients.length} client{clients.length === 1 ? "" : "s"} ·{" "}
            {repeatCount} repeat customer{repeatCount === 1 ? "" : "s"} across
            your DFW bookings.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8 max-w-5xl"
        data-ocid="provider_clients.body"
      >
        {selected ? (
          <ClientDetail record={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            {/* Filters */}
            <div
              className="flex flex-col sm:flex-row gap-3 mb-6"
              data-ocid="provider_clients.filters"
            >
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by customer principal…"
                  className="pl-9"
                  data-ocid="provider_clients.search_input"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger
                  className="sm:w-48"
                  data-ocid="provider_clients.sort_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="frequent">Most frequent</SelectItem>
                  <SelectItem value="repeat">Repeat customers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bookingsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity; index is the only available key.
                    key={i}
                    withMedia={false}
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title={
                  clients.length === 0
                    ? "No clients yet"
                    : "No clients match your search"
                }
                description={
                  clients.length === 0
                    ? "Once customers book your services, their profiles and booking history will appear here."
                    : "Try a different search term or sort order."
                }
                action={
                  clients.length === 0 ? (
                    <Link to="/provider/listings">
                      <Button data-ocid="provider_clients.manage_listings">
                        Manage listings
                      </Button>
                    </Link>
                  ) : undefined
                }
                data-ocid="provider_clients.empty_state"
              />
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                data-ocid="provider_clients.list"
              >
                {filtered.map((record, i) => (
                  <ClientRow
                    key={record.principal.toString()}
                    record={record}
                    index={i}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
