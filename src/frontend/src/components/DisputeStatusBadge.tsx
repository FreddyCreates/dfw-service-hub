// DisputeStatusBadge — color-coded status pill for the dispute lifecycle.
// Maps each DisputeStatus to a semantic token so the pill communicates
// escalation level at a glance.

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DISPUTE_STATUS_LABELS, type DisputeStatus } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Scale,
} from "lucide-react";

const statusStyles: Record<
  DisputeStatus,
  { token: string; icon: typeof AlertTriangle }
> = {
  open: {
    token: "border-warning/40 bg-warning/15 text-warning-foreground",
    icon: AlertTriangle,
  },
  responded: {
    token: "border-primary/30 bg-primary/10 text-primary",
    icon: MessageSquare,
  },
  escalated: {
    token: "border-destructive/40 bg-destructive/15 text-destructive",
    icon: Scale,
  },
  resolved: {
    token: "border-success/40 bg-success/15 text-success-foreground",
    icon: CheckCircle2,
  },
};

interface DisputeStatusBadgeProps {
  status: DisputeStatus;
  className?: string;
}

export function DisputeStatusBadge({
  status,
  className,
}: DisputeStatusBadgeProps) {
  const style = statusStyles[status];
  const Icon = style.icon;
  return (
    <Badge
      variant="outline"
      className={cn("font-body gap-1.5", style.token, className)}
      data-ocid="dispute_status_badge"
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {DISPUTE_STATUS_LABELS[status]}
    </Badge>
  );
}

export { statusStyles as disputeStatusStyles };
