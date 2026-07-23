// Frontend marketplace types — mirror the backend `marketplace-core` contract.
// These live in the frontend so UI, hooks, and pages share one source of truth
// while the generated backend bindings catch up to the marketplace canister.

import type { ExternalBlob } from "@caffeineai/object-storage";
import type { Principal } from "@icp-sdk/core/principal";

export type MarketplaceRole = "customer" | "provider" | "admin";

export type ServiceCategory =
  | "boxTruck"
  | "relocation"
  | "trashHaul"
  | "moving";

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type BookingStatus =
  | "requested"
  | "accepted"
  | "scheduled"
  | "inProgress"
  | "completed"
  | "cancelled"
  | "reviewed";

export type SlotStatus = "available" | "blocked";

export type PriceUnit = "hour" | "job" | "day" | "load";

// AI generation tone — mirrors the backend `Tone` variant. Optional on every
// AI text endpoint; null means "let the model pick a default tone".
export type Tone = "professional" | "friendly" | "concise";

export const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  concise: "Concise",
};

export interface User {
  principal: Principal;
  role: MarketplaceRole;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  // Work-portfolio photos (URL strings for display, matching the avatar
  // pattern). Adapters convert to/from ExternalBlob[] at the hook boundary.
  workPhotos: string[];
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Provider {
  id: string;
  ownerPrincipal: Principal;
  companyName: string;
  description: string;
  logo?: string;
  serviceCategories: ServiceCategory[];
  serviceAreas: string[];
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  ratingSum: bigint;
  ratingCount: bigint;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface ServiceListing {
  id: string;
  providerId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  priceCents: bigint;
  priceUnit: PriceUnit;
  photos: string[];
  serviceArea: string;
  active: boolean;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Booking {
  id: string;
  customerId: Principal;
  providerId: string;
  listingId: string;
  category: ServiceCategory;
  scheduledDate: string;
  scheduledTime: string;
  status: BookingStatus;
  jobDetails: string;
  address: string;
  customerNote?: string;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: Principal;
  providerId: string;
  rating: number;
  writtenText: string;
  providerResponse?: string;
  // Soft-hide flag set by admin moderation (#hide). Hidden reviews are
  // excluded from public lists and the provider's aggregate rating.
  hidden: boolean;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Message {
  id: string;
  bookingId: string;
  sender: Principal;
  content: string;
  read: boolean;
  sentAt: bigint;
}

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  date: string;
  time: string;
  status: SlotStatus;
  createdAt: bigint;
}

export interface SearchFilters {
  category?: ServiceCategory;
  serviceArea?: string;
  keyword?: string;
  minRating?: number;
  maxPriceCents?: bigint;
  availableOn?: string;
}

export interface SearchResult {
  listing: ServiceListing;
  provider: Provider;
}

// Input shapes for shared/update methods — frontend-facing forms.
// Adapters in `lib/adapters.ts` convert these to the backend input shapes
// (bigint IDs, ExternalBlob images) before calling the actor.
export interface UserInput {
  role: MarketplaceRole;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  // Work-portfolio photos. Each entry may be a persistent URL string (an
  // existing photo from ExternalBlob.getDirectURL()) or an ExternalBlob
  // produced by ExternalBlob.fromBytes() for a freshly uploaded file. The
  // adapter converts either form to the backend's ExternalBlob[] field via
  // urlsToBlobs, passing ExternalBlob inputs through unchanged so their bytes
  // survive to the backend. Optional so existing callers that don't set it
  // still compile; the adapter defaults to an empty array.
  workPhotos?: (string | ExternalBlob)[];
}

export interface ProviderInput {
  companyName: string;
  description?: string;
  // `logo` may be a persistent URL (existing provider logo from
  // ExternalBlob.getDirectURL()) or an ExternalBlob produced by
  // ExternalBlob.fromBytes() for a freshly uploaded file. The adapter
  // converts either form to the backend's ExternalBlob field.
  logo?: string | ExternalBlob;
  serviceCategories: ServiceCategory[];
  serviceAreas: string[];
}

export interface ServiceListingInput {
  category: ServiceCategory;
  title: string;
  description: string;
  priceCents: bigint;
  priceUnit: string;
  // `photos` may be persistent URL strings (existing photos from
  // ExternalBlob.getDirectURL()) or ExternalBlob objects produced by
  // ExternalBlob.fromBytes() for freshly uploaded files. The adapter
  // converts either form to the backend's ExternalBlob[] field.
  photos: (string | ExternalBlob)[];
  serviceArea: string;
  active: boolean;
}

export interface BookingInput {
  listingId: string;
  scheduledDate: string;
  scheduledTime: string;
  jobDetails: string;
  address: string;
  customerNote?: string;
}

export interface ReviewInput {
  bookingId: string;
  rating: bigint;
  writtenText: string;
}

export interface MessageInput {
  bookingId: bigint;
  content: string;
}

export interface AvailabilitySlotInput {
  date: string;
  time: string;
  status: SlotStatus;
}

export type ModerateReviewAction = "hide" | "restore";

// Human-readable labels for service categories (DFW marketplace)
export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  boxTruck: "Box Truck Services",
  relocation: "Relocation Services",
  trashHaul: "Trash Haul Services",
  moving: "Moving Services",
};

export const CATEGORY_SHORT: Record<ServiceCategory, string> = {
  boxTruck: "Box Truck",
  relocation: "Relocation",
  trashHaul: "Trash Haul",
  moving: "Moving",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  scheduled: "Scheduled",
  inProgress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  reviewed: "Reviewed",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  pending: "Pending Review",
  approved: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  hour: "hour",
  job: "job",
  day: "day",
  load: "load",
};

// ─── V3: Trust & Verification ──────────────────────────────────────────────

// Verification tier ladder — mirrors backend `VerificationTierStatus`.
export type VerificationTierStatus =
  | "unverified"
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

// A single tier record (background, insurance, business, identity).
export interface VerificationTierRecord {
  status: VerificationTierStatus;
  note?: string;
  verifiedAt?: bigint;
}

// The four verification tiers a provider can hold.
export interface VerificationTiers {
  background: VerificationTierRecord;
  insurance: VerificationTierRecord;
  business: VerificationTierRecord;
  identity: VerificationTierRecord;
}

// Which tier is being updated/queried — mirrors backend
// `Variant_background_insurance_business_identity`.
export type VerificationTierKey =
  | "background"
  | "insurance"
  | "business"
  | "identity";

// Composite trust score (0–100 per dimension, overall is the headline).
export interface TrustScore {
  overall: bigint;
  verification: bigint;
  reviews: bigint;
  responsiveness: bigint;
  longevity: bigint;
  disputeHistory: bigint;
  updatedAt: bigint;
}

export const VERIFICATION_TIER_LABELS: Record<VerificationTierKey, string> = {
  background: "Background Check",
  insurance: "Insurance",
  business: "Business License",
  identity: "Identity",
};

export const VERIFICATION_TIER_STATUS_LABELS: Record<
  VerificationTierStatus,
  string
> = {
  unverified: "Unverified",
  pending: "Pending",
  approved: "Verified",
  rejected: "Rejected",
  expired: "Expired",
};

// ─── V3: Disputes ───────────────────────────────────────────────────────────

export type DisputeStatus = "open" | "responded" | "escalated" | "resolved";

export interface Dispute {
  id: string;
  bookingId: string;
  openedBy: Principal;
  reason: string;
  status: DisputeStatus;
  providerResponse?: string;
  adminResolution?: string;
  aiTriageSuggestion?: string;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface DisputeInput {
  bookingId: string;
  reason: string;
}

// AI-generated triage suggestion for a dispute.
export interface DisputeTriage {
  disputeId: string;
  severity: string;
  rationale: string;
  suggestedResolution: string;
}

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Open",
  responded: "Responded",
  escalated: "Escalated",
  resolved: "Resolved",
};

// ─── V3: Community Reports ─────────────────────────────────────────────────

export type ReportTargetType = "user" | "provider" | "listing" | "review";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface CommunityReport {
  id: string;
  reporter: Principal;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  resolutionNote?: string;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface CommunityReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  user: "User",
  provider: "Provider",
  listing: "Listing",
  review: "Review",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

// ─── V3: Rewards & Referrals ───────────────────────────────────────────────

export type RewardTier = "bronze" | "silver" | "gold" | "platinum";

export interface RewardProfile {
  userId: Principal;
  tier: RewardTier;
  points: bigint;
  streak: bigint;
  badges: string[];
  referralCode: string;
  updatedAt: bigint;
}

export interface RewardLedgerEntry {
  id: string;
  userId: Principal;
  points: bigint;
  reason: string;
  timestamp: bigint;
}

export type ReferralStatus = "pending" | "awarded" | "expired";

export interface Referral {
  id: string;
  referrer: Principal;
  referee: Principal;
  status: ReferralStatus;
  createdAt: bigint;
  awardedAt?: bigint;
}

export const REWARD_TIER_LABELS: Record<RewardTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: "Pending",
  awarded: "Awarded",
  expired: "Expired",
};

// ─── V3: Provider Microsites ───────────────────────────────────────────────

export interface Microsite {
  id: string;
  providerId: string;
  slug: string;
  heroCopy: string;
  aboutCopy: string;
  servicesCopy: string;
  blockOrder: string[];
  accentColor?: string;
  coverImage?: string;
  published: boolean;
  generatedAt?: bigint;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface MicrositeInput {
  slug: string;
  heroCopy: string;
  aboutCopy: string;
  servicesCopy: string;
  blockOrder: string[];
  accentColor?: string;
  coverImage?: string;
  published: boolean;
}

// ─── V3: Docs (help center / knowledge base) ───────────────────────────────

export type DocStatus = "draft" | "published";

export type DocCategory =
  | "getting-started"
  | "booking"
  | "providers"
  | "trust-safety"
  | "rewards"
  | "disputes"
  | "billing"
  | "account";

export interface Doc {
  id: string;
  author: Principal;
  slug: string;
  title: string;
  content: string;
  category: string;
  status: DocStatus;
  readingTime: bigint;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface DocInput {
  slug: string;
  title: string;
  content: string;
  category: string;
  status: DocStatus;
}

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  draft: "Draft",
  published: "Published",
};

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  "getting-started": "Getting Started",
  booking: "Booking",
  providers: "Providers",
  "trust-safety": "Trust & Safety",
  rewards: "Rewards",
  disputes: "Disputes",
  billing: "Billing",
  account: "Account",
};

// ─── V3: AI Assistant ──────────────────────────────────────────────────────

export type AssistantRole = "user" | "assistant";

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
  context?: string;
  timestamp: bigint;
}

export interface AssistantInput {
  message: string;
  context?: string;
}

// ─── V3: AI Provider Matching & Search ─────────────────────────────────────

export interface ProviderMatch {
  providerId: string;
  score: bigint;
  rationale: string;
}

export interface MatchProvidersInput {
  need: string;
  category?: string;
  serviceArea?: string;
}

export interface AISearchResult {
  listingId: string;
  providerId: string;
  score: bigint;
  rationale: string;
}

// ─── V3: AI Review Summary & Provider Insights ─────────────────────────────

export interface ReviewSummary {
  providerId: string;
  summary: string;
  sentiment: string;
  themes: string[];
}

export interface ProviderInsights {
  providerId: string;
  insights: string;
  recommendations: string[];
}
