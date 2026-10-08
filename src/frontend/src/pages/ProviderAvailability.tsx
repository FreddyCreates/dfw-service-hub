// ProviderAvailability — manage available time slots for booking.
// Set slots via useSetAvailabilitySlot, block slots via useBlockAvailabilitySlot,
// list existing slots from useListAvailabilitySlots with remove option.

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  useBlockAvailabilitySlot,
  useGetMyProvider,
  useListAvailabilitySlots,
  useSetAvailabilitySlot,
} from "@/hooks/useQueries";
import type { AvailabilitySlot } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  Clock,
  Loader2,
  Trash2,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

interface SlotRowProps {
  slot: AvailabilitySlot;
  index: number;
}

function SlotRow({ slot, index }: SlotRowProps) {
  const blockSlot = useBlockAvailabilitySlot();
  const isBlocked = slot.status === "blocked";

  const handleBlock = () => {
    blockSlot.mutate(slot.id, {
      onSuccess: () => toast.success("Slot blocked"),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not block slot",
        ),
    });
  };

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
      data-ocid={`provider_availability.slot.${index + 1}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-body font-medium text-foreground truncate">
            {formatDate(slot.date)}
          </p>
          <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden />
            {formatTime(slot.time)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-body font-medium ${
            isBlocked
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success-foreground"
          }`}
        >
          {isBlocked ? "Blocked" : "Available"}
        </span>
        {!isBlocked ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleBlock}
            disabled={blockSlot.isPending}
            className="text-destructive hover:text-destructive"
            data-ocid={`provider_availability.block.${index + 1}`}
            aria-label={`Block slot on ${slot.date} at ${slot.time}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            {blockSlot.isPending ? "Blocking…" : "Block"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ProviderAvailability() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: slots, isLoading: slotsLoading } =
    useListAvailabilitySlots(providerId);
  const setSlot = useSetAvailabilitySlot();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const sortedSlots = useMemo(() => {
    const list = [...(slots ?? [])];
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    return list;
  }, [slots]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    if (!time) {
      toast.error("Pick a time");
      return;
    }
    if (date < today) {
      toast.error("Date cannot be in the past");
      return;
    }
    setSlot.mutate(
      { date, time, status: "available" },
      {
        onSuccess: () => {
          toast.success("Availability slot added");
          setDate("");
          setTime("");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not add slot",
          ),
      },
    );
  };

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.provider_availability"
      >
        <LoadingSpinner fullPage label="Loading availability" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_availability"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to manage availability"
          description="You need to sign in to set available time slots."
          data-ocid="provider_availability.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_availability"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to start setting availability for DFW customers."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_availability.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_availability.not_registered"
        />
      </div>
    );
  }

  const allSlots = slots ?? [];
  const availableCount = allSlots.filter(
    (s) => s.status === "available",
  ).length;
  const blockedCount = allSlots.filter((s) => s.status === "blocked").length;

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_availability"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_availability.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
            Availability
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Open time slots so DFW customers can request your services. Block a
            slot if your schedule changes.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8"
        data-ocid="provider_availability.body"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add slot form */}
          <Card
            className="py-0 lg:col-span-1 h-fit"
            data-ocid="provider_availability.form_card"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarPlus className="w-5 h-5 text-primary" aria-hidden />
                </div>
                <div>
                  <CardTitle className="font-display text-base">
                    Add a slot
                  </CardTitle>
                  <CardDescription className="font-body">
                    Pick a date and time customers can book.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
                data-ocid="provider_availability.form"
              >
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="slot-date"
                    data-ocid="provider_availability.date_label"
                  >
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="slot-date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    data-ocid="provider_availability.date_input"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="slot-time"
                    data-ocid="provider_availability.time_label"
                  >
                    Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="slot-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    data-ocid="provider_availability.time_input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={setSlot.isPending}
                  data-ocid="provider_availability.submit"
                >
                  {setSlot.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      Adding…
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4" aria-hidden />
                      Add slot
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing slots */}
          <div
            className="lg:col-span-2"
            data-ocid="provider_availability.list_section"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Existing slots
              </h2>
              <div className="flex items-center gap-3 text-sm font-body">
                <span className="text-success-foreground">
                  {availableCount} available
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-destructive">{blockedCount} blocked</span>
              </div>
            </div>
            {slotsLoading ? (
              <LoadingSpinner label="Loading slots" />
            ) : sortedSlots.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No slots yet"
                description="Add your first available time slot using the form on the left."
                data-ocid="provider_availability.empty_state"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedSlots.map((slot, i) => (
                  <SlotRow key={slot.id} slot={slot} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
