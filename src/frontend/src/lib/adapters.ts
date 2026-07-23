// Backend ↔ frontend type adapters.
//
// The generated backend bindings (`@/backend`) use bigint IDs and
// `ExternalBlob` for image fields. The frontend types (`@/types`) use string
// IDs and URL strings for images. These mappers convert at the hook boundary
// so pages and components only ever see frontend types.
//
// `ExternalBlob.getDirectURL()` is synchronous and returns the HTTP URL the
// browser can load directly.

import type {
  AISearchResult as BackendAISearchResult,
  AssistantMessage as BackendAssistantMessage,
  AvailabilitySlot as BackendAvailabilitySlot,
  AvailabilitySlotInput as BackendAvailabilitySlotInput,
  Booking as BackendBooking,
  BookingInput as BackendBookingInput,
  CommunityReport as BackendCommunityReport,
  CommunityReportInput as BackendCommunityReportInput,
  Dispute as BackendDispute,
  DisputeInput as BackendDisputeInput,
  DisputeTriage as BackendDisputeTriage,
  Doc as BackendDoc,
  DocInput as BackendDocInput,
  DocStatus as BackendDocStatus,
  MarketplaceRole as BackendMarketplaceRole,
  Message as BackendMessage,
  MessageInput as BackendMessageInput,
  Microsite as BackendMicrosite,
  MicrositeInput as BackendMicrositeInput,
  Provider as BackendProvider,
  ProviderInput as BackendProviderInput,
  ProviderInsights as BackendProviderInsights,
  ProviderMatch as BackendProviderMatch,
  Referral as BackendReferral,
  ReportTargetType as BackendReportTargetType,
  Review as BackendReview,
  ReviewInput as BackendReviewInput,
  ReviewSummary as BackendReviewSummary,
  SearchFilters as BackendSearchFilters,
  SearchResult as BackendSearchResult,
  SeedResult as BackendSeedResult,
  ServiceCategory as BackendServiceCategory,
  ServiceListing as BackendServiceListing,
  ServiceListingInput as BackendServiceListingInput,
  SlotStatus as BackendSlotStatus,
  TrustScore as BackendTrustScore,
  User as BackendUser,
  UserInput as BackendUserInput,
  Variant_background_insurance_business_identity as BackendVerificationTierKey,
  VerificationTierStatus as BackendVerificationTierStatus,
  VerificationTiers as BackendVerificationTiers,
} from "@/backend";
import type { SeedResult } from "@/hooks/useBackend";
import type {
  AISearchResult,
  AssistantMessage,
  AvailabilitySlot,
  AvailabilitySlotInput,
  Booking,
  BookingInput,
  CommunityReport,
  CommunityReportInput,
  Dispute,
  DisputeInput,
  DisputeTriage,
  Doc,
  DocInput,
  DocStatus,
  MatchProvidersInput,
  Message,
  MessageInput,
  Microsite,
  MicrositeInput,
  Provider,
  ProviderInput,
  ProviderInsights,
  ProviderMatch,
  Referral,
  Review,
  ReviewInput,
  ReviewSummary,
  SearchFilters,
  SearchResult,
  ServiceListing,
  ServiceListingInput,
  SlotStatus,
  TrustScore,
  User,
  UserInput,
  VerificationTierKey,
  VerificationTierStatus,
  VerificationTiers,
} from "@/types";
import { ExternalBlob } from "@caffeineai/object-storage";
import type { Principal } from "@icp-sdk/core/principal";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a backend bigint ID to a frontend string ID. */
function id(n: bigint): string {
  return String(n);
}

/** Convert a frontend string ID to a backend bigint ID. */
function bid(s: string): bigint {
  return BigInt(s);
}

/** Convert an optional ExternalBlob to its direct URL string. */
function blobToUrl(blob: ExternalBlob | undefined | null): string | undefined {
  return blob ? blob.getDirectURL() : undefined;
}

/** Convert an array of ExternalBlob to an array of URL strings. */
function blobsToUrls(blobs: BackendServiceListing["photos"]): string[] {
  return blobs.map((b) => b.getDirectURL());
}

/** Convert an optional URL string to an ExternalBlob, or undefined. */
function urlToBlob(url: string | undefined): ExternalBlob | undefined {
  return url ? ExternalBlob.fromURL(url) : undefined;
}

/**
 * Convert a provider logo input to an ExternalBlob. Accepts either a
 * persistent URL string (existing logo) or an ExternalBlob produced by
 * ExternalBlob.fromBytes() for a freshly uploaded file. The blob is
 * uploaded to object storage when the backend actor receives it.
 */
function logoInputToBlob(
  logo: string | ExternalBlob | undefined,
): ExternalBlob | undefined {
  if (!logo) return undefined;
  if (typeof logo === "string") return ExternalBlob.fromURL(logo);
  return logo;
}

/**
 * Convert an array of photo inputs to an array of ExternalBlob. Each input
 * may be a persistent URL string (existing photo from
 * ExternalBlob.getDirectURL()) or an ExternalBlob produced by
 * ExternalBlob.fromBytes() for a freshly uploaded file. ExternalBlob inputs
 * pass through unchanged so their bytes survive to the backend; URL strings
 * are wrapped via ExternalBlob.fromURL. Mirrors logoInputToBlob.
 */
function urlsToBlobs(photos: (string | ExternalBlob)[]): ExternalBlob[] {
  return photos.map((p) =>
    typeof p === "string" ? ExternalBlob.fromURL(p) : p,
  );
}

// ─── Backend → Frontend ────────────────────────────────────────────────────

export function toFrontendUser(user: BackendUser): User {
  return {
    principal: user.principal,
    role: user.role,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    avatar: blobToUrl(user.avatar),
    workPhotos: blobsToUrls(user.workPhotos),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toFrontendProvider(provider: BackendProvider): Provider {
  return {
    id: id(provider.id),
    ownerPrincipal: provider.ownerPrincipal,
    companyName: provider.companyName,
    description: provider.description ?? "",
    logo: blobToUrl(provider.logo),
    serviceCategories: provider.serviceCategories,
    serviceAreas: provider.serviceAreas,
    verificationStatus: provider.verificationStatus,
    verificationNote: provider.verificationNote,
    ratingSum: provider.ratingSum,
    ratingCount: provider.ratingCount,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

export function toFrontendListing(
  listing: BackendServiceListing,
): ServiceListing {
  return {
    id: id(listing.id),
    providerId: id(listing.providerId),
    category: listing.category,
    title: listing.title,
    description: listing.description,
    priceCents: listing.priceCents,
    priceUnit: listing.priceUnit as ServiceListing["priceUnit"],
    photos: blobsToUrls(listing.photos),
    serviceArea: listing.serviceArea,
    active: listing.active,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export function toFrontendBooking(booking: BackendBooking): Booking {
  return {
    id: id(booking.id),
    customerId: booking.customerId,
    providerId: id(booking.providerId),
    listingId: id(booking.listingId),
    category: booking.category,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime ?? "",
    status: booking.status,
    jobDetails: booking.jobDetails,
    address: booking.address,
    customerNote: booking.customerNote,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export function toFrontendReview(review: BackendReview): Review {
  return {
    id: id(review.id),
    bookingId: id(review.bookingId),
    customerId: review.customerId,
    providerId: id(review.providerId),
    rating: Number(review.rating),
    writtenText: review.writtenText,
    providerResponse: review.providerResponse,
    hidden: review.hidden,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export function toFrontendMessage(message: BackendMessage): Message {
  return {
    id: id(message.id),
    bookingId: id(message.bookingId),
    sender: message.sender,
    content: message.content,
    read: message.read,
    sentAt: message.sentAt,
  };
}

export function toFrontendSlot(
  slot: BackendAvailabilitySlot,
): AvailabilitySlot {
  return {
    id: id(slot.id),
    providerId: id(slot.providerId),
    date: slot.date,
    time: slot.time ?? "",
    status: slot.status,
    createdAt: slot.createdAt,
  };
}

export function toFrontendSearchResult(
  result: BackendSearchResult,
): SearchResult {
  return {
    listing: toFrontendListing(result.listing),
    provider: toFrontendProvider(result.provider),
  };
}

/**
 * Convert the backend SeedResult (bigint providerId, enum outcome) to the
 * frontend-friendly shape (string providerId). The Variant_created_skipped
 * enum values are already "created"/"skipped" and the frontend
 * SeedListingOutcome.outcome is typed as Variant_created_skipped, so the
 * outcome passes through unchanged.
 */
export function toFrontendSeedResult(result: BackendSeedResult): SeedResult {
  return {
    listingOutcomes: result.listingOutcomes.map((o) => ({
      category: o.category,
      outcome: o.outcome,
    })),
    providerId: id(result.providerId),
    providerCreated: result.providerCreated,
  };
}

// ─── Frontend → Backend (inputs) ───────────────────────────────────────────

export function toBackendUserInput(input: UserInput): BackendUserInput {
  return {
    role: input.role as BackendMarketplaceRole,
    displayName: input.displayName,
    email: input.email,
    phone: input.phone,
    avatar: urlToBlob(input.avatar),
    workPhotos: urlsToBlobs(input.workPhotos ?? []),
  };
}

export function toBackendProviderInput(
  input: ProviderInput,
): BackendProviderInput {
  return {
    companyName: input.companyName,
    description: input.description,
    logo: logoInputToBlob(input.logo),
    serviceCategories: input.serviceCategories as BackendServiceCategory[],
    serviceAreas: input.serviceAreas,
  };
}

export function toBackendListingInput(
  input: ServiceListingInput,
): BackendServiceListingInput {
  return {
    category: input.category as BackendServiceCategory,
    title: input.title,
    description: input.description,
    priceCents: input.priceCents,
    priceUnit: input.priceUnit,
    photos: urlsToBlobs(input.photos),
    serviceArea: input.serviceArea,
    active: input.active,
  };
}

export function toBackendBookingInput(
  input: BookingInput,
): BackendBookingInput {
  return {
    listingId: bid(input.listingId),
    scheduledDate: input.scheduledDate,
    scheduledTime: input.scheduledTime,
    jobDetails: input.jobDetails,
    address: input.address,
    customerNote: input.customerNote,
  };
}

export function toBackendReviewInput(input: ReviewInput): BackendReviewInput {
  return {
    bookingId: bid(input.bookingId),
    rating: input.rating,
    writtenText: input.writtenText,
  };
}

export function toBackendMessageInput(
  input: MessageInput,
): BackendMessageInput {
  return {
    bookingId: input.bookingId,
    content: input.content,
  };
}

export function toBackendAvailabilitySlotInput(
  input: AvailabilitySlotInput,
): BackendAvailabilitySlotInput {
  return {
    date: input.date,
    time: input.time,
    status: input.status as BackendSlotStatus,
  };
}

export function toBackendSearchFilters(
  filters: SearchFilters,
): BackendSearchFilters {
  return {
    category: filters.category as BackendServiceCategory | undefined,
    serviceArea: filters.serviceArea,
    keyword: filters.keyword,
    minRating:
      filters.minRating !== undefined ? BigInt(filters.minRating) : undefined,
    maxPriceCents: filters.maxPriceCents,
    availableOn: filters.availableOn,
  };
}

// Re-export the Principal type for callers that need it alongside adapters.
export type { Principal, SlotStatus };

// ─── V3: Trust & Verification ──────────────────────────────────────────────

export function toFrontendTrustScore(score: BackendTrustScore): TrustScore {
  return {
    overall: score.overall,
    verification: score.verification,
    reviews: score.reviews,
    responsiveness: score.responsiveness,
    longevity: score.longevity,
    disputeHistory: score.disputeHistory,
    updatedAt: score.updatedAt,
  };
}

export function toFrontendVerificationTiers(
  tiers: BackendVerificationTiers,
): VerificationTiers {
  const map = (t: {
    status: BackendVerificationTierStatus;
    note?: string;
    verifiedAt?: bigint;
  }) => ({
    status: t.status as VerificationTierStatus,
    note: t.note,
    verifiedAt: t.verifiedAt,
  });
  return {
    background: map(tiers.background),
    insurance: map(tiers.insurance),
    business: map(tiers.business),
    identity: map(tiers.identity),
  };
}

export function toBackendVerificationTierKey(
  key: VerificationTierKey,
): BackendVerificationTierKey {
  return key as BackendVerificationTierKey;
}

export function toBackendVerificationTierStatus(
  status: VerificationTierStatus,
): BackendVerificationTierStatus {
  return status as BackendVerificationTierStatus;
}

// ─── V3: Disputes ───────────────────────────────────────────────────────────

export function toFrontendDispute(dispute: BackendDispute): Dispute {
  return {
    id: id(dispute.id),
    bookingId: id(dispute.bookingId),
    openedBy: dispute.openedBy,
    reason: dispute.reason,
    status: dispute.status,
    providerResponse: dispute.providerResponse,
    adminResolution: dispute.adminResolution,
    aiTriageSuggestion: dispute.aiTriageSuggestion,
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt,
  };
}

export function toBackendDisputeInput(
  input: DisputeInput,
): BackendDisputeInput {
  return {
    bookingId: bid(input.bookingId),
    reason: input.reason,
  };
}

export function toFrontendDisputeTriage(
  triage: BackendDisputeTriage,
): DisputeTriage {
  return {
    disputeId: id(triage.disputeId),
    severity: triage.severity,
    rationale: triage.rationale,
    suggestedResolution: triage.suggestedResolution,
  };
}

// ─── V3: Community Reports ─────────────────────────────────────────────────

export function toFrontendCommunityReport(
  report: BackendCommunityReport,
): CommunityReport {
  return {
    id: id(report.id),
    reporter: report.reporter,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    status: report.status,
    resolutionNote: report.resolutionNote,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export function toBackendCommunityReportInput(
  input: CommunityReportInput,
): BackendCommunityReportInput {
  return {
    targetType: input.targetType as BackendReportTargetType,
    targetId: input.targetId,
    reason: input.reason,
  };
}

// ─── V3: Rewards & Referrals ───────────────────────────────────────────────

export function toFrontendRewardProfile(profile: {
  userId: Principal;
  tier: { toString: () => string };
  points: bigint;
  streak: bigint;
  badges: string[];
  referralCode: string;
  updatedAt: bigint;
}): import("@/types").RewardProfile {
  return {
    userId: profile.userId,
    tier: profile.tier.toString() as import("@/types").RewardTier,
    points: profile.points,
    streak: profile.streak,
    badges: profile.badges,
    referralCode: profile.referralCode,
    updatedAt: profile.updatedAt,
  };
}

export function toFrontendRewardLedgerEntry(entry: {
  id: bigint;
  userId: Principal;
  points: bigint;
  reason: string;
  timestamp: bigint;
}): import("@/types").RewardLedgerEntry {
  return {
    id: id(entry.id),
    userId: entry.userId,
    points: entry.points,
    reason: entry.reason,
    timestamp: entry.timestamp,
  };
}

export function toFrontendReferral(referral: BackendReferral): Referral {
  return {
    id: id(referral.id),
    referrer: referral.referrer,
    referee: referral.referee,
    status: referral.status,
    createdAt: referral.createdAt,
    awardedAt: referral.awardedAt,
  };
}

// ─── V3: Provider Microsites ───────────────────────────────────────────────

function bytesToDataUrl(bytes: Uint8Array | undefined): string | undefined {
  if (!bytes || bytes.length === 0) return undefined;
  // Encode as base64 data URL for display. Microsite cover images are stored
  // as raw bytes on the backend; pages can re-upload via ExternalBlob.
  try {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  } catch {
    return undefined;
  }
}

function dataUrlToBytes(dataUrl: string | undefined): Uint8Array | undefined {
  if (!dataUrl) return undefined;
  // Only convert data URLs; pass other URL forms through as undefined (the
  // backend expects raw bytes for coverImage).
  if (!dataUrl.startsWith("data:")) return undefined;
  try {
    const base64 = dataUrl.split(",")[1] ?? "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

export function toFrontendMicrosite(site: BackendMicrosite): Microsite {
  return {
    id: id(site.id),
    providerId: id(site.providerId),
    slug: site.slug,
    heroCopy: site.heroCopy,
    aboutCopy: site.aboutCopy,
    servicesCopy: site.servicesCopy,
    blockOrder: site.blockOrder,
    accentColor: site.accentColor,
    coverImage: bytesToDataUrl(site.coverImage),
    published: site.published,
    generatedAt: site.generatedAt,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

export function toBackendMicrositeInput(
  input: MicrositeInput,
): BackendMicrositeInput {
  return {
    slug: input.slug,
    heroCopy: input.heroCopy,
    aboutCopy: input.aboutCopy,
    servicesCopy: input.servicesCopy,
    blockOrder: input.blockOrder,
    accentColor: input.accentColor,
    coverImage: dataUrlToBytes(input.coverImage),
    published: input.published,
  };
}

// ─── V3: Docs ──────────────────────────────────────────────────────────────

export function toFrontendDoc(doc: BackendDoc): Doc {
  return {
    id: id(doc.id),
    author: doc.author,
    slug: doc.slug,
    title: doc.title,
    content: doc.content,
    category: doc.category,
    status: doc.status as DocStatus,
    readingTime: doc.readingTime,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toBackendDocInput(input: DocInput): BackendDocInput {
  return {
    slug: input.slug,
    title: input.title,
    content: input.content,
    category: input.category,
    status: input.status as BackendDocStatus,
  };
}

// ─── V3: AI Assistant ──────────────────────────────────────────────────────

export function toFrontendAssistantMessage(
  msg: BackendAssistantMessage,
): AssistantMessage {
  return {
    role: msg.role,
    content: msg.content,
    context: msg.context,
    timestamp: msg.timestamp,
  };
}

// ─── V3: AI Provider Matching & Search ─────────────────────────────────────

export function toFrontendProviderMatch(
  match: BackendProviderMatch,
): ProviderMatch {
  return {
    providerId: id(match.providerId),
    score: match.score,
    rationale: match.rationale,
  };
}

export function toBackendMatchProvidersInput(input: MatchProvidersInput): {
  need: string;
  category?: string;
  serviceArea?: string;
} {
  return {
    need: input.need,
    category: input.category,
    serviceArea: input.serviceArea,
  };
}

export function toFrontendAISearchResult(
  result: BackendAISearchResult,
): AISearchResult {
  return {
    listingId: id(result.listingId),
    providerId: id(result.providerId),
    score: result.score,
    rationale: result.rationale,
  };
}

// ─── V3: AI Review Summary & Provider Insights ─────────────────────────────

export function toFrontendReviewSummary(
  summary: BackendReviewSummary,
): ReviewSummary {
  return {
    providerId: id(summary.providerId),
    summary: summary.summary,
    sentiment: summary.sentiment,
    themes: summary.themes,
  };
}

export function toFrontendProviderInsights(
  insights: BackendProviderInsights,
): ProviderInsights {
  return {
    providerId: id(insights.providerId),
    insights: insights.insights,
    recommendations: insights.recommendations,
  };
}
