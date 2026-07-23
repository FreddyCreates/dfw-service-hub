// BookingStatusBadge — color-coded status pill for booking lifecycle states.

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/types";

const statusStyles: Record<BookingStatus, string> = {
  requested: "border-warning/30 bg-warning/10 text-warning-foreground",
  accepted: "border-primary/30 bg-primary/10 text-primary",
  scheduled: "border-primary/40 bg-primary/15 text-primary",
  inProgress: "border-accent/40 bg-accent/15 text-accent-foreground",
  completed: "border-success/30 bg-success/10 text-success-foreground",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
  reviewed: "border-success/40 bg-success/15 text-success-foreground",
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function BookingStatusBadge({
  status,
  className,
}: BookingStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status], "font-body", className)}
      data-ocid="booking_status_badge"
    >
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
