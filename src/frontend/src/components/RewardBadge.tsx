// RewardBadge — loyalty tier badge (Bronze/Silver/Gold/Platinum) plus points
// balance, using the tier-* token palette. Surfaces the gamification ladder
// prominently per the "much more rewarding for users" preference.

import { cn } from "@/lib/utils";
import { REWARD_TIER_LABELS, type RewardTier } from "@/types";
import { Award, Sparkles } from "lucide-react";

interface RewardBadgeProps {
  tier: RewardTier;
  points: bigint | number;
  /** Show the streak flame alongside points. */
  streak?: bigint | number;
  className?: string;
  /** Compact mode renders an inline pill without the points block. */
  compact?: boolean;
}

const tierStyles: Record<
  RewardTier,
  { token: string; ring: string; glow: string; icon: typeof Award }
> = {
  bronze: {
    token:
      "border-tier-bronze/40 bg-tier-bronze/15 text-tier-bronze-foreground",
    ring: "ring-tier-bronze/30",
    glow: "shadow-[0_4px_12px_-2px_var(--tier-bronze)]",
    icon: Award,
  },
  silver: {
    token:
      "border-tier-silver/40 bg-tier-silver/15 text-tier-silver-foreground",
    ring: "ring-tier-silver/30",
    glow: "shadow-[0_4px_12px_-2px_var(--tier-silver)]",
    icon: Award,
  },
  gold: {
    token: "border-tier-gold/40 bg-tier-gold/15 text-tier-gold-foreground",
    ring: "ring-tier-gold/30",
    glow: "shadow-[0_4px_12px_-2px_var(--tier-gold)]",
    icon: Sparkles,
  },
  platinum: {
    token:
      "border-tier-platinum/40 bg-tier-platinum/15 text-tier-platinum-foreground",
    ring: "ring-tier-platinum/30",
    glow: "shadow-[0_4px_12px_-2px_var(--tier-platinum)]",
    icon: Sparkles,
  },
};

function formatPoints(points: bigint | number): string {
  const n = typeof points === "bigint" ? Number(points) : points;
  return n.toLocaleString("en-US");
}

export function RewardBadge({
  tier,
  points,
  streak,
  className,
  compact = false,
}: RewardBadgeProps) {
  const style = tierStyles[tier];
  const Icon = style.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-body font-medium",
          style.token,
          className,
        )}
        data-ocid="reward_badge"
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {REWARD_TIER_LABELS[tier]}
      </span>
    );
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-subtle",
        className,
      )}
      data-ocid="reward_badge"
      aria-label="Loyalty rewards"
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex items-center justify-center rounded-full ring-2 w-14 h-14 shrink-0",
            style.token,
            style.ring,
          )}
        >
          <Icon className="w-7 h-7" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-body">
            Loyalty tier
          </p>
          <h3 className="font-display text-xl font-semibold text-foreground leading-tight">
            {REWARD_TIER_LABELS[tier]}
          </h3>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground font-body">
            Points balance
          </p>
          <p className="font-display text-2xl font-semibold text-foreground tabular-nums">
            {formatPoints(points)}
          </p>
        </div>
        {streak != null ? (
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-body">
              Day streak
            </p>
            <p className="font-mono text-lg text-foreground tabular-nums">
              {typeof streak === "bigint" ? Number(streak) : streak}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { tierStyles as rewardTierStyles };
