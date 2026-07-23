// CustomerRewards — loyalty wallet for the signed-in customer.
// Shows loyalty tier (RewardBadge), points balance, achievement badges grid,
// completion streak with streak-freeze indicator, referral program section
// (referral code with copy-to-clipboard, referral history), and rewards
// history ledger (timestamped list of points earned with reason and running
// balance). Uses useGetMyRewards, useGetRewardLedger, useGetMyReferralCode,
// useApplyReferral, useGetLeaderboard.

import { EmptyState } from "@/components/EmptyState";
import { RewardBadge } from "@/components/RewardBadge";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  useApplyReferral,
  useGetLeaderboard,
  useGetMyReferralCode,
  useGetMyRewards,
  useGetMyUser,
  useGetRewardLedger,
} from "@/hooks/useQueries";
import {
  REFERRAL_STATUS_LABELS,
  type ReferralStatus,
  type RewardLedgerEntry,
  type RewardProfile,
  type RewardTier,
} from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Award,
  Check,
  ClipboardCopy,
  Flame,
  Gift,
  Loader2,
  Medal,
  Snowflake,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// Achievement badge definitions — the six badges the rewards system tracks.
// Each maps a backend badge string to a label, icon, and description. The grid
// lights up earned badges and dims unearned ones.
interface BadgeDef {
  key: string;
  label: string;
  description: string;
  icon: typeof Award;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    key: "first_booking",
    label: "First Booking",
    description: "Completed your first service booking.",
    icon: Star,
  },
  {
    key: "repeat_customer",
    label: "Repeat Customer",
    description: "Booked three or more services.",
    icon: Medal,
  },
  {
    key: "top_reviewer",
    label: "Top Reviewer",
    description: "Left five or more helpful reviews.",
    icon: Sparkles,
  },
  {
    key: "referral_pro",
    label: "Referral Pro",
    description: "Successfully referred three or more customers.",
    icon: Users,
  },
  {
    key: "verified_profile",
    label: "Verified Profile",
    description: "Completed your profile with contact details.",
    icon: Check,
  },
  {
    key: "streak_freeze",
    label: "Streak Freeze",
    description: "Used a streak freeze to protect your streak.",
    icon: Snowflake,
  },
];

const TIER_ORDER: RewardTier[] = ["bronze", "silver", "gold", "platinum"];

function formatDateTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  if (Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPoints(points: bigint | number): string {
  const n = typeof points === "bigint" ? Number(points) : points;
  return n.toLocaleString("en-US");
}

function shortPrincipal(principal: string): string {
  if (!principal) return "—";
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

// Tier progress ladder — shows the customer's current tier and the next one
// with a points-to-next-tier indicator.
function TierLadder({
  tier,
  points,
}: {
  tier: RewardTier;
  points: bigint;
}) {
  const currentIndex = TIER_ORDER.indexOf(tier);
  const nextTier = TIER_ORDER[currentIndex + 1] ?? null;
  const currentPoints = Number(points);

  // Approximate tier thresholds (points). These are display heuristics; the
  // backend owns the authoritative tier assignment.
  const TIER_MIN: Record<RewardTier, number> = {
    bronze: 0,
    silver: 500,
    gold: 2000,
    platinum: 5000,
  };
  const nextMin = nextTier ? TIER_MIN[nextTier] : TIER_MIN[tier];
  const prevMin = TIER_MIN[tier];
  const span = Math.max(nextMin - prevMin, 1);
  const progress = nextTier
    ? Math.min(100, Math.round(((currentPoints - prevMin) / span) * 100))
    : 100;
  const pointsToNext = nextTier ? Math.max(0, nextMin - currentPoints) : 0;

  return (
    <Card
      className="py-0 shadow-subtle animate-fade-in-up"
      data-ocid="customer_rewards.tier_ladder"
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-semibold text-foreground">
          Tier progress
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          {TIER_ORDER.map((t, i) => {
            const reached = i <= currentIndex;
            const isCurrent = t === tier;
            return (
              <div
                key={t}
                className="flex-1 flex flex-col items-center gap-1.5"
                data-ocid={`customer_rewards.tier_step.${t}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-body font-semibold transition-smooth ${
                    isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2 ring-offset-card"
                      : reached
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-[0.6875rem] font-body capitalize ${
                    isCurrent
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {t}
                </span>
              </div>
            );
          })}
        </div>
        <div
          className="h-2 rounded-full bg-secondary overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to next tier"
          tabIndex={-1}
        >
          <div
            className="h-full gradient-tier transition-smooth"
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextTier ? (
          <p className="text-xs text-muted-foreground font-body text-center">
            <span className="font-mono text-foreground tabular-nums">
              {formatPoints(pointsToNext)}
            </span>{" "}
            points to{" "}
            <span className="capitalize text-foreground font-medium">
              {nextTier}
            </span>{" "}
            tier
          </p>
        ) : (
          <p className="text-xs text-foreground font-body text-center font-medium">
            You've reached the highest tier. Legendary.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Achievement badges grid — lights up earned badges, dims unearned ones.
function BadgesGrid({ badges }: { badges: string[] }) {
  return (
    <Card
      className="py-0 shadow-subtle animate-fade-in-up"
      data-ocid="customer_rewards.badges"
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-semibold text-foreground">
          Achievements
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          {badges.length} of {BADGE_DEFS.length} unlocked
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BADGE_DEFS.map((def, i) => {
            const earned = badges.includes(def.key);
            const Icon = def.icon;
            return (
              <div
                key={def.key}
                className={`flex flex-col items-center text-center gap-2 rounded-lg border p-4 transition-smooth ${
                  earned
                    ? "border-primary/30 bg-primary/5 animate-badge-pop"
                    : "border-border bg-secondary/40 opacity-60"
                }`}
                data-ocid={`customer_rewards.badge.${i + 1}`}
                title={def.description}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    earned
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-body font-medium text-foreground leading-tight">
                    {def.label}
                  </p>
                  <p className="text-[0.6875rem] text-muted-foreground font-body mt-0.5 line-clamp-2">
                    {def.description}
                  </p>
                </div>
                {earned ? (
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] font-body font-medium text-success-foreground">
                    <Check className="w-3 h-3" aria-hidden />
                    Earned
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Streak card — completion streak counter with streak-freeze indicator.
function StreakCard({
  streak,
  hasStreakFreezeBadge,
}: {
  streak: bigint;
  hasStreakFreezeBadge: boolean;
}) {
  const streakNum = Number(streak);
  return (
    <Card
      className="py-0 shadow-subtle animate-fade-in-up"
      data-ocid="customer_rewards.streak"
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
          <Flame className="w-7 h-7 text-accent-foreground" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-body">
            Completion streak
          </p>
          <p className="font-display text-2xl font-semibold text-foreground tabular-nums leading-tight">
            {streakNum} {streakNum === 1 ? "booking" : "bookings"}
          </p>
        </div>
        {hasStreakFreezeBadge ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-body font-medium text-primary"
            title="Streak freeze available — protects your streak if you miss a week."
            data-ocid="customer_rewards.streak_freeze"
          >
            <Snowflake className="w-3.5 h-3.5" aria-hidden />
            Freeze ready
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Referral program section — referral code with copy-to-clipboard, apply
// referral form, and referral history.
function ReferralSection({
  referralCode,
  onApply,
  isApplying,
}: {
  referralCode: string;
  onApply: (code: string) => void;
  isApplying: boolean;
}) {
  const [applyCode, setApplyCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("Referral code copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy code. Select and copy manually.");
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const code = applyCode.trim();
    if (!code) {
      toast.error("Enter a referral code to apply.");
      return;
    }
    onApply(code);
    setApplyCode("");
  };

  return (
    <Card
      className="py-0 shadow-subtle animate-fade-in-up"
      data-ocid="customer_rewards.referral"
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-semibold text-foreground">
          Referral program
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          Share your code. When a friend books their first service, you both
          earn points.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="referral-code">Your referral code</Label>
          <div className="flex items-center gap-2">
            <Input
              id="referral-code"
              readOnly
              value={referralCode || "—"}
              className="font-mono"
              data-ocid="customer_rewards.referral_code"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              disabled={!referralCode}
              aria-label="Copy referral code"
              data-ocid="customer_rewards.referral_copy"
              className="shrink-0"
            >
              {copied ? (
                <Check
                  className="w-4 h-4 text-success-foreground"
                  aria-hidden
                />
              ) : (
                <ClipboardCopy className="w-4 h-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <form
            onSubmit={handleApply}
            className="flex flex-col gap-2"
            data-ocid="customer_rewards.referral_apply_form"
          >
            <Label htmlFor="apply-code">Apply a referral code</Label>
            <div className="flex items-center gap-2">
              <Input
                id="apply-code"
                type="text"
                placeholder="Enter a friend's code"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value)}
                className="font-mono"
                data-ocid="customer_rewards.referral_apply_input"
              />
              <Button
                type="submit"
                disabled={isApplying || !applyCode.trim()}
                data-ocid="customer_rewards.referral_apply_button"
                className="shrink-0"
              >
                {isApplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Gift className="w-4 h-4" aria-hidden />
                )}
                Apply
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

// Rewards history ledger — timestamped list of points earned with reason and
// running balance. Computes the running balance from oldest to newest.
function RewardsLedger({ entries }: { entries: RewardLedgerEntry[] }) {
  // Compute running balance: oldest entry first, accumulate points.
  const withRunning = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => Number(a.timestamp) - Number(b.timestamp),
    );
    let running = 0;
    return sorted
      .map((entry) => {
        running += Number(entry.points);
        return { ...entry, runningBalance: BigInt(running) };
      })
      .reverse(); // newest first for display
  }, [entries]);

  if (entries.length === 0) {
    return (
      <Card
        className="py-0 shadow-subtle animate-fade-in-up"
        data-ocid="customer_rewards.ledger"
      >
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold text-foreground">
            Rewards history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Award className="w-6 h-6 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground font-body">
              No rewards activity yet. Book services and refer friends to earn
              points.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="py-0 shadow-subtle animate-fade-in-up"
      data-ocid="customer_rewards.ledger"
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-semibold text-foreground">
          Rewards history
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Reason</th>
                <th className="px-4 py-2.5 font-medium text-right">Points</th>
                <th className="px-4 py-2.5 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {withRunning.map((entry, i) => {
                const pts = Number(entry.points);
                const isPositive = pts >= 0;
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/40 transition-smooth"
                    data-ocid={`customer_rewards.ledger_row.${i + 1}`}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-foreground min-w-0">
                      <span className="line-clamp-2">{entry.reason}</span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium whitespace-nowrap ${
                        isPositive
                          ? "text-success-foreground"
                          : "text-destructive"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {formatPoints(entry.points)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground whitespace-nowrap">
                      {formatPoints(entry.runningBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Leaderboard — top customers by points. Surfaces the gamification ladder
// prominently per the "much more rewarding for users" preference.
function Leaderboard({
  entries,
  myPrincipal,
}: {
  entries: RewardProfile[];
  myPrincipal: string | null;
}) {
  if (entries.length === 0) return null;
  const sorted = [...entries]
    .sort((a, b) => Number(b.points) - Number(a.points))
    .slice(0, 10);

  return (
    <Card
      className="py-0 shadow-subtle animate-fade-in-up"
      data-ocid="customer_rewards.leaderboard"
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent-foreground" aria-hidden />
          Leaderboard
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          Top DFW customers this season
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ol className="divide-y divide-border">
          {sorted.map((entry, i) => {
            const isMe =
              !!myPrincipal && entry.userId.toString() === myPrincipal;
            return (
              <li
                key={entry.userId.toString()}
                className={`flex items-center gap-3 px-4 py-3 transition-smooth ${
                  isMe ? "bg-primary/10" : "hover:bg-secondary/40"
                }`}
                data-ocid={`customer_rewards.leaderboard_row.${i + 1}`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-body font-semibold shrink-0 ${
                    i === 0
                      ? "bg-tier-gold/20 text-tier-gold-foreground"
                      : i === 1
                        ? "bg-tier-silver/20 text-tier-silver-foreground"
                        : i === 2
                          ? "bg-tier-bronze/20 text-tier-bronze-foreground"
                          : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-foreground truncate">
                    {isMe ? "You" : shortPrincipal(entry.userId.toString())}
                  </p>
                  <p className="text-[0.6875rem] text-muted-foreground font-body capitalize">
                    {entry.tier} tier
                  </p>
                </div>
                <span className="font-mono text-sm text-foreground tabular-nums font-medium">
                  {formatPoints(entry.points)}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

// Skeleton for the rewards wallet — matches the page layout.
function RewardsSkeleton() {
  return (
    <div
      className="container mx-auto px-4 lg:px-6 py-8 flex flex-col gap-6"
      data-ocid="customer_rewards.loading_state"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard withMedia={false} />
        <SkeletonCard withMedia={false} />
        <SkeletonCard withMedia={false} />
      </div>
      <SkeletonCard withMedia={false} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard withMedia={false} />
        <SkeletonCard withMedia={false} />
      </div>
    </div>
  );
}

export function CustomerRewards() {
  const { isAuthenticated, login } = useAuth();
  const { identity } = useInternetIdentity();
  const { data: user } = useGetMyUser();
  const { data: rewards, isLoading: rewardsLoading } = useGetMyRewards();
  const { data: referralCode } = useGetMyReferralCode();
  const { data: leaderboard } = useGetLeaderboard(10);
  const applyReferral = useApplyReferral();

  // The ledger hook needs a Principal. We use the signed-in user's principal
  // (from the rewards profile or the identity) to fetch the customer's ledger.
  const ledgerPrincipal = rewards?.userId ?? identity?.getPrincipal() ?? null;
  const { data: ledger, isLoading: ledgerLoading } =
    useGetRewardLedger(ledgerPrincipal);

  const myPrincipal = identity?.getPrincipal().toString() ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      login();
    }
  }, [isAuthenticated, login]);

  const handleApplyReferral = (code: string) => {
    applyReferral.mutate(code, {
      onSuccess: () => {
        toast.success("Referral applied! Bonus points added to your wallet.");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not apply referral code.",
        ),
    });
  };

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.customer_rewards"
      >
        <EmptyState
          icon={Trophy}
          title="Sign in to view your rewards"
          description="Earn points for bookings, reviews, and referrals. Climb the loyalty tiers."
          action={
            <Button onClick={login} data-ocid="customer_rewards.signin">
              Sign in
            </Button>
          }
        />
      </div>
    );
  }

  const isLoading = rewardsLoading || ledgerLoading;
  const hasStreakFreezeBadge =
    rewards?.badges.includes("streak_freeze") ?? false;

  return (
    <div
      className="bg-background min-h-screen animate-page-transition"
      data-ocid="page.customer_rewards"
    >
      <section
        className="bg-card border-b border-border shadow-subtle"
        data-ocid="customer_rewards.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
            Rewards wallet
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            {user?.displayName ? `Welcome back, ${user.displayName}. ` : ""}
            Earn points for every booking, review, and referral — and climb the
            loyalty tiers.
          </p>
        </div>
      </section>

      {isLoading || !rewards ? (
        <RewardsSkeleton />
      ) : (
        <section
          className="container mx-auto px-4 lg:px-6 py-8 flex flex-col gap-6"
          data-ocid="customer_rewards.body"
        >
          {/* Top row: tier badge + tier ladder + streak */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RewardBadge
              tier={rewards.tier}
              points={rewards.points}
              streak={rewards.streak}
              className="animate-fade-in-up"
            />
            <TierLadder tier={rewards.tier} points={rewards.points} />
            <StreakCard
              streak={rewards.streak}
              hasStreakFreezeBadge={hasStreakFreezeBadge}
            />
          </div>

          {/* Badges grid */}
          <BadgesGrid badges={rewards.badges} />

          {/* Referral + leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReferralSection
              referralCode={referralCode ?? rewards.referralCode ?? ""}
              onApply={handleApplyReferral}
              isApplying={applyReferral.isPending}
            />
            <Leaderboard
              entries={leaderboard ?? []}
              myPrincipal={myPrincipal}
            />
          </div>

          {/* Rewards history ledger */}
          <RewardsLedger entries={ledger ?? []} />
        </section>
      )}
    </div>
  );
}
