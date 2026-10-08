// AdminProviders — provider verification & management for admins.
// Lists all providers with verification badges, a pending-approval queue with
// approve/reject (reason note), suspend/reinstate actions, search + status
// filter, and a detail dialog.

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StarRating } from "@/components/StarRating";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  useApproveProvider,
  useListProviders,
  useReinstateProvider,
  useRejectProvider,
  useSuspendProvider,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  CATEGORY_SHORT,
  type Provider,
  VERIFICATION_LABELS,
  type VerificationStatus,
} from "@/types";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

type StatusFilter = VerificationStatus | "all";

const statusStyles: Record<VerificationStatus, string> = {
  pending: "border-warning/30 bg-warning/10 text-warning-foreground",
  approved: "border-success/30 bg-success/10 text-success-foreground",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  suspended: "border-destructive/30 bg-destructive/10 text-destructive",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function averageRating(provider: Provider): number {
  const count = Number(provider.ratingCount);
  if (count === 0) return 0;
  return Number(provider.ratingSum) / count;
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const Icon =
    status === "approved"
      ? ShieldCheck
      : status === "pending"
        ? Clock
        : status === "rejected"
          ? ShieldX
          : ShieldQuestion;
  return (
    <Badge
      variant="outline"
      className={cn("font-body gap-1", statusStyles[status])}
      data-ocid="provider_status_badge"
    >
      <Icon className="w-3 h-3" aria-hidden />
      {VERIFICATION_LABELS[status]}
    </Badge>
  );
}

function ProviderRow({
  provider,
  index,
  onOpen,
}: {
  provider: Provider;
  index: number;
  onOpen: (p: Provider) => void;
}) {
  const rating = averageRating(provider);
  return (
    <button
      type="button"
      onClick={() => onOpen(provider)}
      data-ocid={`admin_providers.row.${index + 1}`}
      className="w-full text-left p-4 rounded-xl border border-border bg-card hover:shadow-sm hover:border-primary/30 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-11 h-11 rounded-xl border border-border shrink-0">
          {provider.logo ? (
            <AvatarImage src={provider.logo} alt={provider.companyName} />
          ) : null}
          <AvatarFallback className="rounded-xl bg-secondary text-primary font-display font-semibold">
            {initials(provider.companyName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-foreground truncate">
              {provider.companyName}
            </h3>
            <VerificationBadge status={provider.verificationStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground font-body">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden />
              {provider.serviceAreas[0] ?? "DFW"}
            </span>
            <span>Joined {formatDate(provider.createdAt)}</span>
            <StarRating
              value={rating}
              size="sm"
              showValue
              count={Number(provider.ratingCount)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {provider.serviceCategories.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="font-body text-xs"
              >
                {CATEGORY_SHORT[cat]}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

export function AdminProviders() {
  const { data: providers, isLoading } = useListProviders();
  const approveMutation = useApproveProvider();
  const rejectMutation = useRejectProvider();
  const suspendMutation = useSuspendProvider();
  const reinstateMutation = useReinstateProvider();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [suspendNote, setSuspendNote] = useState("");
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const filtered = useMemo(() => {
    if (!providers) return [];
    const q = search.trim().toLowerCase();
    return providers.filter((p) => {
      const matchesStatus =
        statusFilter === "all" || p.verificationStatus === statusFilter;
      const matchesSearch =
        q === "" ||
        p.companyName.toLowerCase().includes(q) ||
        p.serviceAreas.some((a) => a.toLowerCase().includes(q)) ||
        p.serviceCategories.some((c) =>
          CATEGORY_SHORT[c].toLowerCase().includes(q),
        );
      return matchesStatus && matchesSearch;
    });
  }, [providers, search, statusFilter]);

  const pending = useMemo(
    () => (providers ?? []).filter((p) => p.verificationStatus === "pending"),
    [providers],
  );

  const handleApprove = (provider: Provider) => {
    approveMutation.mutate(provider.id, {
      onSuccess: (updated) => setSelected(updated),
    });
  };

  const handleReject = (provider: Provider) => {
    if (!rejectNote.trim()) return;
    rejectMutation.mutate(
      { providerId: provider.id, note: rejectNote.trim() },
      {
        onSuccess: (updated) => {
          setSelected(updated);
          setRejectNote("");
        },
      },
    );
  };

  const handleSuspend = (provider: Provider) => {
    if (!suspendNote.trim()) return;
    suspendMutation.mutate(
      { providerId: provider.id, note: suspendNote.trim() },
      {
        onSuccess: (updated) => {
          setSelected(updated);
          setSuspendNote("");
          setConfirmSuspend(false);
        },
      },
    );
  };

  const handleReinstate = (provider: Provider) => {
    reinstateMutation.mutate(provider.id, {
      onSuccess: (updated) => setSelected(updated),
    });
  };

  const isPendingMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending ||
    reinstateMutation.isPending;

  return (
    <div className="bg-background" data-ocid="page.admin_providers">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium">Admin</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Provider verification
          </h1>
          <p className="text-muted-foreground font-body max-w-2xl">
            Review pending providers, approve or reject applications, and manage
            suspensions across the DFW marketplace.
          </p>
        </div>

        {/* Pending queue */}
        {pending.length > 0 ? (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-warning-foreground" aria-hidden />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Pending approval
              </h2>
              <Badge variant="secondary" className="font-body">
                {pending.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pending.map((p, i) => (
                <Card key={p.id} className="py-0">
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-11 h-11 rounded-xl border border-border shrink-0">
                        {p.logo ? (
                          <AvatarImage src={p.logo} alt={p.companyName} />
                        ) : null}
                        <AvatarFallback className="rounded-xl bg-secondary text-primary font-display font-semibold">
                          {initials(p.companyName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-foreground truncate">
                          {p.companyName}
                        </h3>
                        <p className="text-sm text-muted-foreground font-body line-clamp-2 mt-0.5">
                          {p.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.serviceCategories.map((cat) => (
                            <Badge
                              key={cat}
                              variant="secondary"
                              className="font-body text-xs"
                            >
                              {CATEGORY_SHORT[cat]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(p)}
                        disabled={isPendingMutating}
                        data-ocid={`admin_providers.approve.${i + 1}`}
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelected(p);
                          setRejectNote("");
                        }}
                        disabled={isPendingMutating}
                        data-ocid={`admin_providers.reject_open.${i + 1}`}
                      >
                        <XCircle className="w-4 h-4" aria-hidden />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(p)}
                        data-ocid={`admin_providers.view.${i + 1}`}
                      >
                        View details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {/* All providers */}
        <div className="mb-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            All providers
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company name, area, or category"
                className="pl-9"
                data-ocid="admin_providers.search_input"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger
                className="w-full sm:w-48"
                data-ocid="admin_providers.status_filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingSpinner label="Loading providers" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No providers found"
              description={
                search || statusFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "No providers have registered yet."
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((p, i) => (
                <ProviderRow
                  key={p.id}
                  provider={p}
                  index={i}
                  onOpen={setSelected}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Provider detail dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setRejectNote("");
            setSuspendNote("");
            setConfirmSuspend(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {selected.companyName}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <VerificationBadge status={selected.verificationStatus} />
                  <StarRating
                    value={averageRating(selected)}
                    size="sm"
                    showValue
                    count={Number(selected.ratingCount)}
                  />
                </div>

                <p className="text-sm text-foreground font-body leading-relaxed">
                  {selected.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm font-body">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Service areas
                    </p>
                    <p className="text-foreground">
                      {selected.serviceAreas.join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Joined</p>
                    <p className="text-foreground">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-body">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.serviceCategories.map((cat) => (
                      <Badge
                        key={cat}
                        variant="secondary"
                        className="font-body text-xs"
                      >
                        {CATEGORY_SHORT[cat]}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selected.verificationNote ? (
                  <div className="rounded-lg bg-secondary/60 border border-border p-3">
                    <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
                      Admin note
                    </p>
                    <p className="text-sm text-foreground font-body">
                      {selected.verificationNote}
                    </p>
                  </div>
                ) : null}

                {/* Reject note input — shown for pending/rejected */}
                {(selected.verificationStatus === "pending" ||
                  selected.verificationStatus === "rejected") && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="reject-note" className="text-xs">
                      Rejection reason (required to reject)
                    </Label>
                    <Textarea
                      id="reject-note"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Explain why this provider cannot be approved…"
                      rows={3}
                      data-ocid="admin_providers.reject_note"
                    />
                  </div>
                )}

                {/* Suspend note input — shown for approved */}
                {selected.verificationStatus === "approved" && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="suspend-note" className="text-xs">
                      Suspension reason (required to suspend)
                    </Label>
                    <Textarea
                      id="suspend-note"
                      value={suspendNote}
                      onChange={(e) => setSuspendNote(e.target.value)}
                      placeholder="Explain why this provider is being suspended…"
                      rows={3}
                      data-ocid="admin_providers.suspend_note"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {selected.verificationStatus === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(selected)}
                        disabled={
                          isPendingMutating || approveMutation.isPending
                        }
                        data-ocid="admin_providers.approve_button"
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(selected)}
                        disabled={
                          isPendingMutating ||
                          rejectMutation.isPending ||
                          !rejectNote.trim()
                        }
                        data-ocid="admin_providers.reject_button"
                      >
                        <XCircle className="w-4 h-4" aria-hidden />
                        Reject
                      </Button>
                    </>
                  )}
                  {selected.verificationStatus === "approved" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmSuspend(true)}
                      disabled={isPendingMutating || !suspendNote.trim()}
                      data-ocid="admin_providers.suspend_open"
                    >
                      <ShieldX className="w-4 h-4" aria-hidden />
                      Suspend provider
                    </Button>
                  )}
                  {selected.verificationStatus === "suspended" && (
                    <Button
                      size="sm"
                      onClick={() => handleReinstate(selected)}
                      disabled={
                        isPendingMutating || reinstateMutation.isPending
                      }
                      data-ocid="admin_providers.reinstate_button"
                    >
                      <UserCheck className="w-4 h-4" aria-hidden />
                      Reinstate
                    </Button>
                  )}
                  {selected.verificationStatus === "rejected" && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selected)}
                      disabled={isPendingMutating || approveMutation.isPending}
                      data-ocid="admin_providers.reapprove_button"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden />
                      Approve
                    </Button>
                  )}
                  <Link
                    to="/providers/$providerId"
                    params={{ providerId: selected.id }}
                    className="ml-auto"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      data-ocid="admin_providers.view_profile"
                    >
                      View public profile
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Suspend confirmation */}
      <AlertDialog
        open={confirmSuspend && !!selected}
        onOpenChange={setConfirmSuspend}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Suspend {selected?.companyName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The provider will be hidden from search and unable to receive new
              bookings. They can be reinstated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="admin_providers.suspend_cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selected && handleSuspend(selected)}
              disabled={suspendMutation.isPending}
              data-ocid="admin_providers.suspend_confirm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Suspend provider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
