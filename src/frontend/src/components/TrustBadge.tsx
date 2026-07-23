// TrustBadge — renders a provider's composite trust score as a circular gauge
// and verification-tier pills using the embedded-protocol token palette.
// Tokens: trust-verified/checked/bound for the gauge, verify-basic/confirmed/
// guaranteed for the tier ladder.

import { cn } from "@/lib/utils";
import {
  type TrustScore,
  VERIFICATION_TIER_LABELS,
  VERIFICATION_TIER_STATUS_LABELS,
  type VerificationTierKey,
  type VerificationTierRecord,
  type VerificationTierStatus,
  type VerificationTiers,
} from "@/types";
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  type ShieldCheck,
  XCircle,
} from "lucide-react";

interface TrustBadgeProps {
  trustScore: TrustScore | null;
  verificationTiers: VerificationTiers | null;
  /** Compact mode hides the dimension breakdown, showing only the gauge. */
  compact?: boolean;
  className?: string;
}

// Map a tier status to its semantic token + icon. The verify-* tokens encode
// the credibility ladder: basic (neutral) → confirmed (ink-blue) → guaranteed
// (green). Pending uses the warning/trust-pending token.
const tierStatusStyles: Record<
  VerificationTierStatus,
  { token: string; icon: typeof ShieldCheck }
> = {
  unverified: {
    token:
      "border-verify-basic/30 bg-verify-basic/10 text-verify-basic-foreground",
    icon: ShieldAlert,
  },
  pending: {
    token:
      "border-trust-pending/40 bg-trust-pending/15 text-trust-pending-foreground",
    icon: Clock,
  },
  approved: {
    token:
      "border-verify-guaranteed/40 bg-verify-guaranteed/15 text-verify-guaranteed-foreground",
    icon: CheckCircle2,
  },
  rejected: {
    token: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  expired: {
    token: "border-warning/30 bg-warning/10 text-warning-foreground",
    icon: Clock,
  },
};

// Map each tier key to its accent token (the gauge ring color per dimension).
const tierAccentToken: Record<VerificationTierKey, string> = {
  identity: "var(--trust-checked)",
  business: "var(--trust-bound)",
  insurance: "var(--trust-verified)",
  background: "var(--trust-checked)",
};

const tierOrder: VerificationTierKey[] = [
  "identity",
  "business",
  "insurance",
  "background",
];

// Circular gauge rendered with two stacked SVG circles. The track uses the
// muted token; the progress arc uses the trust-verified token so the gauge
// reads as "verified trust" at a glance.
function TrustGauge({
  value,
  size = 96,
  label,
}: {
  value: number;
  size?: number;
  label: string;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  // Color shifts with the score band so the gauge communicates trust level
  // through hue, not just arc length.
  const arcColor =
    clamped >= 80
      ? "var(--trust-verified)"
      : clamped >= 50
        ? "var(--trust-bound)"
        : "var(--trust-pending)";

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${clamped} out of 100`}
    >
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative svg, parent has role=img with aria-label */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-semibold text-foreground leading-none"
          style={{ fontSize: size * 0.28 }}
        >
          {clamped}
        </span>
        <span
          className="font-body text-muted-foreground leading-none mt-0.5"
          style={{ fontSize: size * 0.11 }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

function TierPill({
  tierKey,
  record,
}: {
  tierKey: VerificationTierKey;
  record: VerificationTierRecord;
}) {
  const style = tierStatusStyles[record.status];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-body font-medium",
        style.token,
      )}
      data-ocid={`trust.tier.${tierKey}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {VERIFICATION_TIER_LABELS[tierKey]}
      <span className="opacity-70">·</span>
      <span className="opacity-80">
        {VERIFICATION_TIER_STATUS_LABELS[record.status]}
      </span>
    </span>
  );
}

export function TrustBadge({
  trustScore,
  verificationTiers,
  compact = false,
  className,
}: TrustBadgeProps) {
  const overall = trustScore != null ? Number(trustScore.overall) : null;

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-subtle",
        className,
      )}
      data-ocid="trust_badge"
      aria-label="Provider trust and verification"
    >
      <div className="flex items-start gap-5">
        {overall != null ? (
          <TrustGauge value={overall} label="Trust score" />
        ) : (
          <div
            className="flex items-center justify-center rounded-full bg-muted text-muted-foreground font-body text-sm"
            style={{ width: 96, height: 96 }}
            aria-label="Trust score unavailable"
          >
            N/A
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Trust &amp; Verification
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground font-body">
            Composite score from verification, reviews, responsiveness, and
            dispute history.
          </p>

          {!compact && trustScore != null ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-body">
              <DimensionRow
                label="Verification"
                value={Number(trustScore.verification)}
                token="var(--trust-checked)"
              />
              <DimensionRow
                label="Reviews"
                value={Number(trustScore.reviews)}
                token="var(--trust-verified)"
              />
              <DimensionRow
                label="Responsiveness"
                value={Number(trustScore.responsiveness)}
                token="var(--trust-bound)"
              />
              <DimensionRow
                label="Longevity"
                value={Number(trustScore.longevity)}
                token="var(--trust-checked)"
              />
              <DimensionRow
                label="Dispute history"
                value={Number(trustScore.disputeHistory)}
                token="var(--trust-pending)"
              />
            </dl>
          ) : null}
        </div>
      </div>

      {verificationTiers != null ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tierOrder.map((key) => (
            <TierPill key={key} tierKey={key} record={verificationTiers[key]} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DimensionRow({
  label,
  value,
  token,
}: {
  label: string;
  value: number;
  token: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2">
        <span
          className="h-1.5 w-16 rounded-full bg-muted overflow-hidden"
          aria-hidden
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${clamped}%`,
              backgroundColor: token,
              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </span>
        <span className="font-mono text-foreground tabular-nums w-7 text-right">
          {clamped}
        </span>
      </dd>
    </div>
  );
}

export { tierAccentToken, tierStatusStyles };
