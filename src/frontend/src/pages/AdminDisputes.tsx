// AdminDisputes — dispute resolution queue for admins.
// Lists all disputes with status, booking context, AI triage suggestion
// (via useTriageDispute), and resolution actions (respond, resolve, escalate).
// Uses the dark portal theme tokens, skeleton loading, and motion utilities.

import { DisputeStatusBadge } from "@/components/DisputeStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
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
import {
  useEscalateDispute,
  useListDisputes,
  useListProviders,
  useResolveDispute,
  useRespondToDispute,
  useTriageDispute,
} from "@/hooks/useQueries";
import type { Dispute, DisputeStatus, DisputeTriage } from "@/types";
import { DISPUTE_STATUS_LABELS } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  MessageSquare,
  Package,
  Scale,
  Sparkles,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

type StatusFilter = DisputeStatus | "all";

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

// Severity pill — color-coded by AI triage severity band.
function SeverityPill({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  const token =
    s.includes("high") || s.includes("critical")
      ? "border-destructive/40 bg-destructive/15 text-destructive"
      : s.includes("medium") || s.includes("moderate")
        ? "border-warning/40 bg-warning/15 text-warning-foreground"
        : "border-success/40 bg-success/15 text-success-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-body font-medium ${token}`}
    >
      <AlertTriangle className="w-3 h-3" aria-hidden />
      {severity}
    </span>
  );
}

// AI triage panel — fetches and displays the AI-generated triage suggestion
// for a single dispute. Calls useTriageDispute on demand (button click) so we
// don't burn AI calls for every dispute in the list on render.
function TriagePanel({ dispute }: { dispute: Dispute }) {
  const triageMutation = useTriageDispute();
  const [triage, setTriage] = useState<DisputeTriage | null>(
    dispute.aiTriageSuggestion
      ? {
          disputeId: dispute.id,
          severity: "—",
          rationale: dispute.aiTriageSuggestion,
          suggestedResolution: "",
        }
      : null,
  );

  function handleTriage() {
    triageMutation.mutate(dispute.id, {
      onSuccess: (result) => setTriage(result),
    });
  }

  return (
    <div
      className="rounded-lg border border-primary/20 bg-primary/5 p-4"
      data-ocid={`admin_disputes.triage.${dispute.id}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-4 h-4" aria-hidden />
          <h4 className="font-display text-sm font-semibold">AI triage</h4>
        </div>
        {triage ? <SeverityPill severity={triage.severity} /> : null}
      </div>

      {triageMutation.isError ? (
        <p
          className="text-sm text-destructive font-body"
          role="alert"
          data-ocid={`admin_disputes.triage.error.${dispute.id}`}
        >
          Triage failed.{" "}
          {triageMutation.error instanceof Error
            ? triageMutation.error.message
            : "Try again."}
        </p>
      ) : null}

      {triage ? (
        <div className="flex flex-col gap-2 text-sm font-body">
          {triage.rationale ? (
            <p className="text-foreground leading-relaxed">
              <span className="text-muted-foreground font-medium">
                Rationale:{" "}
              </span>
              {triage.rationale}
            </p>
          ) : null}
          {triage.suggestedResolution ? (
            <p className="text-foreground leading-relaxed">
              <span className="text-muted-foreground font-medium">
                Suggested resolution:{" "}
              </span>
              {triage.suggestedResolution}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground font-body">
          Run AI triage to get a severity assessment and suggested resolution.
        </p>
      )}

      <button
        type="button"
        onClick={handleTriage}
        disabled={triageMutation.isPending}
        data-ocid={`admin_disputes.triage_button.${dispute.id}`}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-body font-medium text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-smooth disabled:opacity-50"
      >
        <Sparkles className="w-3.5 h-3.5" aria-hidden />
        {triageMutation.isPending
          ? "Triaging…"
          : triage
            ? "Re-run triage"
            : "Run AI triage"}
      </button>
    </div>
  );
}

function DisputeCard({
  dispute,
  index,
  providerName,
  onOpen,
}: {
  dispute: Dispute;
  index: number;
  providerName: string;
  onOpen: (d: Dispute) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(dispute)}
      data-ocid={`admin_disputes.row.${index + 1}`}
      className="w-full text-left p-5 rounded-xl border border-border bg-card shadow-subtle hover:shadow-md hover:border-primary/30 animate-card-hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-warning-foreground" aria-hidden />
          <span className="font-body font-semibold text-foreground">
            Dispute #{index + 1}
          </span>
        </div>
        <DisputeStatusBadge status={dispute.status} />
      </div>

      <p className="text-sm text-foreground font-body leading-relaxed line-clamp-2 mb-3">
        {dispute.reason}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body">
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3" aria-hidden />
          {providerName}
        </span>
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" aria-hidden />
          {shortPrincipal(dispute.openedBy)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden />
          {formatDate(dispute.createdAt)}
        </span>
      </div>
    </button>
  );
}

export function AdminDisputes() {
  const { data: disputes, isLoading } = useListDisputes();
  const { data: providers } = useListProviders();
  const respondMutation = useRespondToDispute();
  const resolveMutation = useResolveDispute();
  const escalateMutation = useEscalateDispute();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [responseText, setResponseText] = useState("");
  const [resolutionText, setResolutionText] = useState("");

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of providers ?? []) map.set(p.id, p.companyName);
    return map;
  }, [providers]);

  const filtered = useMemo(() => {
    if (!disputes) return [];
    if (statusFilter === "all") return disputes;
    return disputes.filter((d) => d.status === statusFilter);
  }, [disputes, statusFilter]);

  const counts = useMemo(() => {
    const list = disputes ?? [];
    return {
      open: list.filter((d) => d.status === "open").length,
      responded: list.filter((d) => d.status === "responded").length,
      escalated: list.filter((d) => d.status === "escalated").length,
      resolved: list.filter((d) => d.status === "resolved").length,
    };
  }, [disputes]);

  const handleRespond = (dispute: Dispute) => {
    if (!responseText.trim()) return;
    respondMutation.mutate(
      { disputeId: dispute.id, response: responseText.trim() },
      {
        onSuccess: (updated) => {
          setSelected(updated);
          setResponseText("");
        },
      },
    );
  };

  const handleResolve = (dispute: Dispute) => {
    if (!resolutionText.trim()) return;
    resolveMutation.mutate(
      { disputeId: dispute.id, resolution: resolutionText.trim() },
      {
        onSuccess: (updated) => {
          setSelected(updated);
          setResolutionText("");
        },
      },
    );
  };

  const handleEscalate = (dispute: Dispute) => {
    escalateMutation.mutate(dispute.id, {
      onSuccess: (updated) => setSelected(updated),
    });
  };

  const isMutating =
    respondMutation.isPending ||
    resolveMutation.isPending ||
    escalateMutation.isPending;

  return (
    <div className="bg-background" data-ocid="page.admin_disputes">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2 mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 text-primary">
            <Scale className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium">Admin</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Dispute resolution
          </h1>
          <p className="text-muted-foreground font-body max-w-2xl">
            Triage and resolve booking disputes across the marketplace. Use AI
            triage to assess severity, then respond, resolve, or escalate as
            needed.
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
              label: "Responded",
              value: counts.responded,
              token: "text-primary",
            },
            {
              label: "Escalated",
              value: counts.escalated,
              token: "text-destructive",
            },
            {
              label: "Resolved",
              value: counts.resolved,
              token: "text-success-foreground",
            },
          ].map((c, i) => (
            <div
              key={c.label}
              className={`rounded-xl border border-border bg-card p-4 shadow-subtle animate-fade-in-up stagger-${i + 1}`}
              data-ocid={`admin_disputes.metric.${c.label.toLowerCase()}`}
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

        {/* Filter */}
        <div className="mb-6">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-56"
              data-ocid="admin_disputes.status_filter"
            >
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All disputes</SelectItem>
              {(Object.keys(DISPUTE_STATUS_LABELS) as DisputeStatus[]).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {DISPUTE_STATUS_LABELS[s]}
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
            icon={Scale}
            title="No disputes found"
            description={
              statusFilter !== "all"
                ? "Try a different status filter."
                : "No disputes have been opened yet."
            }
            data-ocid="admin_disputes.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((d, i) => (
              <div key={d.id} className="animate-fade-in-up">
                <DisputeCard
                  dispute={d}
                  index={i}
                  providerName={providerNameById.get(d.bookingId) ?? "Booking"}
                  onOpen={setSelected}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dispute detail + resolution dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setResponseText("");
            setResolutionText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  Dispute resolution
                  <DisputeStatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                {/* Dispute context */}
                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="text-xs text-muted-foreground font-body mb-1 flex items-center gap-1">
                    <Flag className="w-3 h-3" aria-hidden />
                    Reason for dispute
                  </p>
                  <p className="text-sm text-foreground font-body leading-relaxed">
                    {selected.reason}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-body">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Booking ID
                    </p>
                    <p className="text-foreground font-mono text-xs">
                      {selected.bookingId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Opened by
                    </p>
                    <p className="text-foreground font-mono text-xs">
                      {shortPrincipal(selected.openedBy)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden /> Opened
                    </p>
                    <p className="text-foreground">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Provider response (if any) */}
                {selected.providerResponse ? (
                  <div className="rounded-lg bg-secondary/60 border border-border p-3">
                    <p className="text-xs font-body font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" aria-hidden />
                      Provider response
                    </p>
                    <p className="text-sm text-foreground font-body leading-relaxed">
                      {selected.providerResponse}
                    </p>
                  </div>
                ) : null}

                {/* Admin resolution (if any) */}
                {selected.adminResolution ? (
                  <div className="rounded-lg bg-success/10 border border-success/30 p-3">
                    <p className="text-xs font-body font-semibold text-success-foreground mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" aria-hidden />
                      Resolution
                    </p>
                    <p className="text-sm text-foreground font-body leading-relaxed">
                      {selected.adminResolution}
                    </p>
                  </div>
                ) : null}

                {/* AI triage */}
                {selected.status !== "resolved" ? (
                  <TriagePanel dispute={selected} />
                ) : null}

                {/* Action inputs — only for non-resolved disputes */}
                {selected.status !== "resolved" ? (
                  <>
                    {/* Respond */}
                    {selected.status === "open" ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="dispute-response" className="text-xs">
                          Respond to dispute
                        </Label>
                        <Textarea
                          id="dispute-response"
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Acknowledge the dispute and request more info or propose a fix…"
                          rows={3}
                          data-ocid="admin_disputes.response_input"
                        />
                      </div>
                    ) : null}

                    {/* Resolve */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="dispute-resolution" className="text-xs">
                        Resolution note (required to resolve)
                      </Label>
                      <Textarea
                        id="dispute-resolution"
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="Describe the final resolution: refund, partial credit, no action, etc…"
                        rows={3}
                        data-ocid="admin_disputes.resolution_input"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {selected.status === "open" ? (
                        <button
                          type="button"
                          onClick={() => handleRespond(selected)}
                          disabled={isMutating || !responseText.trim()}
                          data-ocid="admin_disputes.respond_button"
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-body font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-smooth disabled:opacity-50"
                        >
                          <MessageSquare className="w-4 h-4" aria-hidden />
                          Respond
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleResolve(selected)}
                        disabled={isMutating || !resolutionText.trim()}
                        data-ocid="admin_disputes.resolve_button"
                        className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-body font-medium text-success-foreground hover:bg-success/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-smooth disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden />
                        Resolve
                      </button>
                      {selected.status !== "escalated" ? (
                        <button
                          type="button"
                          onClick={() => handleEscalate(selected)}
                          disabled={isMutating}
                          data-ocid="admin_disputes.escalate_button"
                          className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-body font-medium text-destructive hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-smooth disabled:opacity-50"
                        >
                          <Scale className="w-4 h-4" aria-hidden />
                          Escalate
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
