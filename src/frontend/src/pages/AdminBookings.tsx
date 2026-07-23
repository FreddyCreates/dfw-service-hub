// AdminBookings — platform-wide bookings overview for admins.
// Lists all bookings across providers with customer/provider info and status,
// search + filter by status/date/category, dispute indicators, and a detail
// dialog with the booking's message thread for dispute resolution.
// Dark portal theme tokens, skeleton loading, and motion utilities.

import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { DisputeStatusBadge } from "@/components/DisputeStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MessageBubble } from "@/components/MessageBubble";
import { SkeletonList } from "@/components/Skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetThread,
  useListDisputesByBooking,
  useListProviderBookings,
  useListProviders,
} from "@/hooks/useQueries";
import {
  BOOKING_STATUS_LABELS,
  type Booking,
  type BookingStatus,
  CATEGORY_LABELS,
  CATEGORY_SHORT,
  type ServiceCategory,
} from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Flag,
  MapPin,
  MessageSquare,
  Package,
  Search,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StatusFilter = BookingStatus | "all";
type CategoryFilter = ServiceCategory | "all";

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortPrincipal(p: { toString: () => string }): string {
  const s = p.toString();
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

// Per-booking disputes fetcher — calls useListDisputesByBooking once at the
// top level of a component (one hook per instance, never in a loop) and
// reports whether the booking has any disputes up through a stable callback.
function BookingDisputesFetcher({
  bookingId,
  onDisputes,
}: {
  bookingId: string;
  onDisputes: (bookingId: string, hasDisputes: boolean) => void;
}) {
  const { data } = useListDisputesByBooking(bookingId);
  useEffect(() => {
    onDisputes(bookingId, (data ?? []).length > 0);
  }, [data, bookingId, onDisputes]);
  return null;
}

function BookingRow({
  booking,
  index,
  providerName,
  hasDispute,
  onOpen,
}: {
  booking: Booking;
  index: number;
  providerName: string;
  hasDispute: boolean;
  onOpen: (b: Booking) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(booking)}
      data-ocid={`admin_bookings.row.${index + 1}`}
      className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-subtle hover:shadow-md hover:border-primary/30 animate-card-hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-body font-semibold text-foreground">
              {CATEGORY_SHORT[booking.category]}
            </span>
            <BookingStatusBadge status={booking.status} />
            {hasDispute ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/15 px-2 py-0.5 text-xs font-body font-medium text-destructive">
                <AlertTriangle className="w-3 h-3" aria-hidden />
                Disputed
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground font-body mt-1 truncate">
            {booking.jobDetails}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground font-body">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" aria-hidden />
              {providerName}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" aria-hidden />
              {shortPrincipal(booking.customerId)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" aria-hidden />
              {booking.scheduledDate}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden />
              {booking.address}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Per-provider bookings fetcher — calls useListProviderBookings once at the
// top level of a component (one hook per instance, never in a loop) and
// reports its data up through a stable callback.
function ProviderBookingsFetcher({
  providerId,
  onBookings,
}: {
  providerId: string;
  onBookings: (providerId: string, bookings: Booking[]) => void;
}) {
  const { data } = useListProviderBookings(providerId);
  useEffect(() => {
    onBookings(providerId, data ?? []);
  }, [data, providerId, onBookings]);
  return null;
}

export function AdminBookings() {
  const { data: providers, isLoading: providersLoading } = useListProviders();
  const { identity } = useInternetIdentity();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [disputedOnly, setDisputedOnly] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of providers ?? []) {
      map.set(p.id, p.companyName);
    }
    return map;
  }, [providers]);

  // Aggregate bookings across all providers. Each ProviderBookingsFetcher
  // component calls useListProviderBookings once at its top level (no hooks in
  // loops) and reports its data up through a stable callback. We track a
  // version counter so consumers re-derive when the map mutates.
  const bookingsByProvider = useMemo(() => new Map<string, Booking[]>(), []);
  const [, setBookingsVersion] = useState(0);
  const handleProviderBookings = useMemo(
    () => (providerId: string, bookings: Booking[]) => {
      const prev = bookingsByProvider.get(providerId);
      if (
        prev &&
        prev.length === bookings.length &&
        prev.every((b, i) => b.id === bookings[i]?.id)
      ) {
        return;
      }
      bookingsByProvider.set(providerId, bookings);
      setBookingsVersion((v) => v + 1);
    },
    [bookingsByProvider],
  );

  const allBookings = useMemo(() => {
    const merged: Booking[] = [];
    for (const bookings of bookingsByProvider.values()) {
      merged.push(...bookings);
    }
    return merged;
  }, [bookingsByProvider]);

  const perProviderLoading = useMemo(() => {
    // Once providers are loaded, we consider bookings loaded when every
    // provider has reported its bookings at least once.
    if (!providers) return false;
    if (providers.length === 0) return false;
    return bookingsByProvider.size < providers.length;
  }, [providers, bookingsByProvider]);

  // Track which bookings have disputes via a callback-driven Set. Each
  // BookingDisputesFetcher calls useListDisputesByBooking once at its top
  // level (no hooks in loops) and reports up through a stable callback.
  const disputedBookings = useMemo(() => new Set<string>(), []);
  const [, setDisputedVersion] = useState(0);
  const handleBookingDisputes = useMemo(
    () => (bookingId: string, hasDisputes: boolean) => {
      const prev = disputedBookings.has(bookingId);
      if (prev === hasDisputes) return;
      if (hasDisputes) disputedBookings.add(bookingId);
      else disputedBookings.delete(bookingId);
      setDisputedVersion((v) => v + 1);
    },
    [disputedBookings],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allBookings.filter((b) => {
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || b.category === categoryFilter;
      const matchesDate = dateFilter === "" || b.scheduledDate === dateFilter;
      const matchesDisputed = !disputedOnly || disputedBookings.has(b.id);
      const matchesSearch =
        q === "" ||
        b.jobDetails.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        (providerNameById.get(b.providerId) ?? "").toLowerCase().includes(q) ||
        b.customerId.toString().toLowerCase().includes(q);
      return (
        matchesStatus &&
        matchesCategory &&
        matchesDate &&
        matchesDisputed &&
        matchesSearch
      );
    });
  }, [
    allBookings,
    search,
    statusFilter,
    categoryFilter,
    dateFilter,
    disputedOnly,
    providerNameById,
    disputedBookings,
  ]);

  const { data: thread, isLoading: threadLoading } = useGetThread(
    selected?.id ?? null,
  );

  // Disputes for the selected booking — shown in the detail dialog.
  const { data: selectedDisputes } = useListDisputesByBooking(
    selected?.id ?? null,
  );

  const isLoading = providersLoading || perProviderLoading;

  return (
    <div className="bg-background" data-ocid="page.admin_bookings">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2 mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium">Admin</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Bookings overview
          </h1>
          <p className="text-muted-foreground font-body max-w-2xl">
            Monitor every booking across the DFW marketplace. Search, filter,
            flag disputed bookings, and open any booking to review its message
            thread for dispute resolution.
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bookings"
              className="pl-9"
              data-ocid="admin_bookings.search_input"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger data-ocid="admin_bookings.status_filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {BOOKING_STATUS_LABELS[s]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
          >
            <SelectTrigger data-ocid="admin_bookings.category_filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_SHORT[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            data-ocid="admin_bookings.date_filter"
          />
          <Select
            value={disputedOnly ? "disputed" : "all"}
            onValueChange={(v) => setDisputedOnly(v === "disputed")}
          >
            <SelectTrigger data-ocid="admin_bookings.disputed_filter">
              <SelectValue placeholder="Disputes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All bookings</SelectItem>
              <SelectItem value="disputed">Disputed only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <SkeletonList
            count={4}
            withMedia={false}
            className="grid-cols-1 lg:grid-cols-2"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No bookings found"
            description={
              search ||
              statusFilter !== "all" ||
              categoryFilter !== "all" ||
              dateFilter !== "" ||
              disputedOnly
                ? "Try adjusting your filters."
                : "No bookings have been created yet."
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((b, i) => (
              <div key={b.id} className="animate-fade-in-up">
                <BookingRow
                  booking={b}
                  index={i}
                  providerName={
                    providerNameById.get(b.providerId) ?? "Provider"
                  }
                  hasDispute={disputedBookings.has(b.id)}
                  onOpen={setSelected}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Booking detail dialog with message thread */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2 flex-wrap">
                  {CATEGORY_SHORT[selected.category]} booking
                  <BookingStatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-body">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Provider
                    </p>
                    <p className="text-foreground font-medium">
                      {providerNameById.get(selected.providerId) ?? "Provider"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Customer
                    </p>
                    <p className="text-foreground font-medium font-mono text-xs">
                      {shortPrincipal(selected.customerId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" aria-hidden /> Date
                    </p>
                    <p className="text-foreground">{selected.scheduledDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden /> Time
                    </p>
                    <p className="text-foreground">{selected.scheduledTime}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" aria-hidden /> Address
                    </p>
                    <p className="text-foreground">{selected.address}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-body">
                    Job details
                  </p>
                  <p className="text-sm text-foreground font-body leading-relaxed">
                    {selected.jobDetails}
                  </p>
                </div>

                {selected.customerNote ? (
                  <div className="rounded-lg bg-secondary/60 border border-border p-3">
                    <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
                      Customer note
                    </p>
                    <p className="text-sm text-foreground font-body">
                      {selected.customerNote}
                    </p>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground font-body">
                  Created {formatDate(selected.createdAt)}
                </p>

                {/* Dispute indicators for this booking */}
                {selectedDisputes && selectedDisputes.length > 0 ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Flag className="w-4 h-4 text-destructive" aria-hidden />
                      <h3 className="font-display font-semibold text-foreground">
                        Disputes on this booking
                      </h3>
                      <span className="ml-auto text-xs font-body text-muted-foreground">
                        {selectedDisputes.length}{" "}
                        {selectedDisputes.length === 1 ? "dispute" : "disputes"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedDisputes.map((d, i) => (
                        <div
                          key={d.id}
                          className="rounded-md border border-border bg-card p-3"
                          data-ocid={`admin_bookings.dispute.${i + 1}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-body text-xs text-muted-foreground">
                              Dispute #{i + 1}
                            </span>
                            <DisputeStatusBadge status={d.status} />
                          </div>
                          <p className="text-sm text-foreground font-body line-clamp-2">
                            {d.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Message thread for dispute resolution */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare
                      className="w-4 h-4 text-primary"
                      aria-hidden
                    />
                    <h3 className="font-display font-semibold text-foreground">
                      Message thread
                    </h3>
                  </div>
                  {threadLoading ? (
                    <LoadingSpinner size="sm" label="Loading messages" />
                  ) : !thread || thread.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-body py-4 text-center">
                      No messages in this thread.
                    </p>
                  ) : (
                    <div
                      className="flex flex-col gap-2 max-h-64 overflow-y-auto p-2 rounded-lg bg-secondary/30 border border-border"
                      data-ocid="admin_bookings.thread"
                    >
                      {thread.map((m, i) => (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          currentPrincipal={identity?.getPrincipal() ?? null}
                          index={i}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Hidden per-provider bookings fetchers — one hook per component, no loops */}
      {(providers ?? []).map((p) => (
        <ProviderBookingsFetcher
          key={p.id}
          providerId={p.id}
          onBookings={handleProviderBookings}
        />
      ))}

      {/* Hidden per-booking disputes fetchers — one hook per component, no loops */}
      {allBookings.map((b) => (
        <BookingDisputesFetcher
          key={`disputes-${b.id}`}
          bookingId={b.id}
          onDisputes={handleBookingDisputes}
        />
      ))}
    </div>
  );
}
