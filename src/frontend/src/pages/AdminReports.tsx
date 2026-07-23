// AdminReports — community report moderation queue for admins.
// Lists all community reports with target type, target id, reporter, reason,
// and resolve/dismiss actions. Uses useListReports and useResolveReport.
// Dark portal theme tokens, skeleton loading, and motion utilities.

import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useListReports, useResolveReport } from "@/hooks/useQueries";
import type { CommunityReport, ReportStatus, ReportTargetType } from "@/types";
import { REPORT_STATUS_LABELS, REPORT_TARGET_LABELS } from "@/types";
import {
  CheckCircle2,
  Clock,
  Flag,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

type StatusFilter = ReportStatus | "all";
type TargetFilter = ReportTargetType | "all";

function shortPrincipal(p: { toString: () => string }): string {
  const s = p.toString();
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const statusStyles: Record<ReportStatus, string> = {
  open: "border-warning/40 bg-warning/15 text-warning-foreground",
  reviewing: "border-primary/30 bg-primary/10 text-primary",
  resolved: "border-success/40 bg-success/15 text-success-foreground",
  dismissed: "border-border bg-muted text-muted-foreground",
};

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge
      variant="outline"
      className={`font-body gap-1.5 ${statusStyles[status]}`}
      data-ocid="report_status_badge"
    >
      {status === "open" ? (
        <Flag className="w-3.5 h-3.5" aria-hidden />
      ) : status === "resolved" ? (
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
      ) : status === "dismissed" ? (
        <XCircle className="w-3.5 h-3.5" aria-hidden />
      ) : (
        <ShieldAlert className="w-3.5 h-3.5" aria-hidden />
      )}
      {REPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

function ReportCard({
  report,
  index,
  onOpen,
}: {
  report: CommunityReport;
  index: number;
  onOpen: (r: CommunityReport) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(report)}
      data-ocid={`admin_reports.row.${index + 1}`}
      className="w-full text-left p-5 rounded-xl border border-border bg-card shadow-subtle hover:shadow-md hover:border-primary/30 animate-card-hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert
            className="w-4 h-4 text-warning-foreground"
            aria-hidden
          />
          <span className="font-body font-semibold text-foreground">
            {REPORT_TARGET_LABELS[report.targetType]} report
          </span>
        </div>
        <ReportStatusBadge status={report.status} />
      </div>

      <p className="text-sm text-foreground font-body leading-relaxed line-clamp-2 mb-3">
        {report.reason}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" aria-hidden />
          {shortPrincipal(report.reporter)}
        </span>
        <span>Target: {report.targetId}</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden />
          {formatDate(report.createdAt)}
        </span>
      </div>
    </button>
  );
}

export function AdminReports() {
  const { data: reports, isLoading } = useListReports();
  const resolveMutation = useResolveReport();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [targetFilter, setTargetFilter] = useState<TargetFilter>("all");
  const [selected, setSelected] = useState<CommunityReport | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const filtered = useMemo(() => {
    if (!reports) return [];
    return reports.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesTarget =
        targetFilter === "all" || r.targetType === targetFilter;
      return matchesStatus && matchesTarget;
    });
  }, [reports, statusFilter, targetFilter]);

  const counts = useMemo(() => {
    const list = reports ?? [];
    return {
      open: list.filter((r) => r.status === "open").length,
      reviewing: list.filter((r) => r.status === "reviewing").length,
      resolved: list.filter((r) => r.status === "resolved").length,
      dismissed: list.filter((r) => r.status === "dismissed").length,
    };
  }, [reports]);

  const handleResolve = (report: CommunityReport, dismiss: boolean) => {
    if (!resolutionNote.trim()) return;
    resolveMutation.mutate(
      {
        reportId: report.id,
        resolutionNote: resolutionNote.trim(),
        dismiss,
      },
      {
        onSuccess: (updated) => {
          setSelected(updated);
          setResolutionNote("");
        },
      },
    );
  };

  return (
    <div className="bg-background" data-ocid="page.admin_reports">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2 mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium">Admin</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Community reports
          </h1>
          <p className="text-muted-foreground font-body max-w-2xl">
            Moderate community-submitted reports across users, providers,
            listings, and reviews. Resolve with action or dismiss when no
            violation is found.
          </p>
        </div>

        {/* Status summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Open",
              value: counts.open,
              token: "text-warning-foreground",
            },
            {
              label: "Reviewing",
              value: counts.reviewing,
              token: "text-primary",
            },
            {
              label: "Resolved",
              value: counts.resolved,
              token: "text-success-foreground",
            },
            {
              label: "Dismissed",
              value: counts.dismissed,
              token: "text-muted-foreground",
            },
          ].map((c, i) => (
            <div
              key={c.label}
              className={`rounded-xl border border-border bg-card p-4 shadow-subtle animate-fade-in-up stagger-${i + 1}`}
              data-ocid={`admin_reports.metric.${c.label.toLowerCase()}`}
            >
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wide">
                {c.label}
              </p>
              <p
                className={`font-display text-2xl font-semibold mt-1 ${c.token}`}
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-48"
              data-ocid="admin_reports.status_filter"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(REPORT_STATUS_LABELS) as ReportStatus[]).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {REPORT_STATUS_LABELS[s]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Select
            value={targetFilter}
            onValueChange={(v) => setTargetFilter(v as TargetFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-48"
              data-ocid="admin_reports.target_filter"
            >
              <SelectValue placeholder="Target type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All targets</SelectItem>
              {(Object.keys(REPORT_TARGET_LABELS) as ReportTargetType[]).map(
                (t) => (
                  <SelectItem key={t} value={t}>
                    {REPORT_TARGET_LABELS[t]}
                  </SelectItem>
                ),
              )}
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
            icon={ShieldCheck}
            title="No reports found"
            description={
              statusFilter !== "all" || targetFilter !== "all"
                ? "Try adjusting your filters."
                : "No community reports have been submitted yet."
            }
            data-ocid="admin_reports.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((r, i) => (
              <div key={r.id} className="animate-fade-in-up">
                <ReportCard report={r} index={i} onOpen={setSelected} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Report detail + resolution dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setResolutionNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  Report moderation
                  <ReportStatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="text-xs text-muted-foreground font-body mb-1 flex items-center gap-1">
                    <Flag className="w-3 h-3" aria-hidden />
                    Reason for report
                  </p>
                  <p className="text-sm text-foreground font-body leading-relaxed">
                    {selected.reason}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-body">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Target type
                    </p>
                    <p className="text-foreground font-medium">
                      {REPORT_TARGET_LABELS[selected.targetType]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Target ID
                    </p>
                    <p className="text-foreground font-mono text-xs">
                      {selected.targetId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Reporter
                    </p>
                    <p className="text-foreground font-mono text-xs">
                      {shortPrincipal(selected.reporter)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden /> Reported
                    </p>
                    <p className="text-foreground">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>

                {selected.resolutionNote ? (
                  <div className="rounded-lg bg-success/10 border border-success/30 p-3">
                    <p className="text-xs font-body font-semibold text-success-foreground mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" aria-hidden />
                      Resolution note
                    </p>
                    <p className="text-sm text-foreground font-body leading-relaxed">
                      {selected.resolutionNote}
                    </p>
                  </div>
                ) : null}

                {/* Resolution input — only for open/reviewing reports */}
                {(selected.status === "open" ||
                  selected.status === "reviewing") && (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="report-resolution" className="text-xs">
                        Resolution note (required)
                      </Label>
                      <Textarea
                        id="report-resolution"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="Describe the action taken or why this report is dismissed…"
                        rows={3}
                        data-ocid="admin_reports.resolution_input"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => handleResolve(selected, false)}
                        disabled={
                          resolveMutation.isPending || !resolutionNote.trim()
                        }
                        data-ocid="admin_reports.resolve_button"
                        className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-body font-medium text-success-foreground hover:bg-success/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-smooth disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden />
                        Resolve with action
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(selected, true)}
                        disabled={
                          resolveMutation.isPending || !resolutionNote.trim()
                        }
                        data-ocid="admin_reports.dismiss_button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-body font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-smooth disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" aria-hidden />
                        Dismiss report
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
