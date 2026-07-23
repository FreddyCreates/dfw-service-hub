import { createActor } from "@/backend";
import type { Backend } from "@/backend";
import type {
  AvailabilitySlot,
  AvailabilitySlotInput,
  AISearchResult as BackendAISearchResult,
  AssistantInput as BackendAssistantInput,
  AssistantMessage as BackendAssistantMessage,
  CommunityReport as BackendCommunityReport,
  CommunityReportInput as BackendCommunityReportInput,
  Dispute as BackendDispute,
  DisputeInput as BackendDisputeInput,
  DisputeTriage as BackendDisputeTriage,
  Doc as BackendDoc,
  DocInput as BackendDocInput,
  DocStatus as BackendDocStatus,
  MatchProvidersInput as BackendMatchProvidersInput,
  Microsite as BackendMicrosite,
  MicrositeInput as BackendMicrositeInput,
  ProviderInsights as BackendProviderInsights,
  ProviderMatch as BackendProviderMatch,
  Referral as BackendReferral,
  ReviewSummary as BackendReviewSummary,
  SeedResult as BackendSeedResult,
  Tone as BackendTone,
  TrustScore as BackendTrustScore,
  Variant_background_insurance_business_identity as BackendVerificationTierKey,
  VerificationTierStatus as BackendVerificationTierStatus,
  VerificationTiers as BackendVerificationTiers,
  Booking,
  BookingInput,
  Message,
  MessageInput,
  Provider,
  ProviderInput,
  Review,
  ReviewInput,
  SearchFilters,
  SearchResult,
  ServiceCategory,
  ServiceListing,
  ServiceListingInput,
  User,
  UserInput,
  Variant_created_skipped,
  Variant_hide_restore,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import type { ExternalBlob } from "@caffeineai/object-storage";
import type { Principal } from "@icp-sdk/core/principal";

/**
 * useBackend — top-level access to the marketplace canister actor.
 *
 * The generated `Backend` class implements `backendInterface` with the real
 * backend types: bigint IDs, `ExternalBlob` image fields, and the backend
 * input shapes. `MarketplaceActor` re-declares the marketplace-core surface
 * using those backend types so hooks import the correct contract. Adapters in
 * `lib/adapters.ts` convert backend results to frontend types at the hook
 * boundary. `useActor(createActor)` is called at the top of every hook that
 * needs the actor (never inside query callbacks).
 */
export type MarketplaceActor = {
  // User
  getMyUser(): Promise<User | null>;
  getUser(userId: Principal): Promise<User | null>;
  upsertMyUser(input: UserInput): Promise<User>;
  listUsers(): Promise<User[]>;
  // Provider
  getMyProvider(): Promise<Provider | null>;
  getProvider(providerId: bigint): Promise<Provider | null>;
  registerProvider(input: ProviderInput): Promise<Provider>;
  updateMyProvider(input: ProviderInput): Promise<Provider>;
  listProviders(): Promise<Provider[]>;
  listProvidersByCategory(category: ServiceCategory): Promise<Provider[]>;
  // Listings
  getListing(listingId: bigint): Promise<ServiceListing | null>;
  createListing(input: ServiceListingInput): Promise<ServiceListing>;
  updateListing(
    listingId: bigint,
    input: ServiceListingInput,
  ): Promise<ServiceListing>;
  deleteListing(listingId: bigint): Promise<void>;
  listListingsByProvider(providerId: bigint): Promise<ServiceListing[]>;
  listListingsByCategory(category: ServiceCategory): Promise<ServiceListing[]>;
  // Bookings
  createBooking(input: BookingInput): Promise<Booking>;
  acceptBooking(bookingId: bigint): Promise<Booking>;
  declineBooking(bookingId: bigint): Promise<Booking>;
  cancelBooking(bookingId: bigint): Promise<Booking>;
  startBooking(bookingId: bigint): Promise<Booking>;
  completeBooking(bookingId: bigint): Promise<Booking>;
  scheduleBooking(bookingId: bigint): Promise<Booking>;
  listMyBookings(): Promise<Booking[]>;
  listProviderBookings(providerId: bigint): Promise<Booking[]>;
  // Reviews
  createReview(input: ReviewInput): Promise<Review>;
  respondToReview(reviewId: bigint, response: string): Promise<Review>;
  listReviewsByProvider(providerId: bigint): Promise<Review[]>;
  listReviewsByBooking(bookingId: bigint): Promise<Review[]>;
  moderateReview(
    reviewId: bigint,
    action: Variant_hide_restore,
  ): Promise<Review>;
  // Messaging
  getThread(bookingId: bigint): Promise<Message[]>;
  sendMessage(input: MessageInput): Promise<Message>;
  markThreadRead(bookingId: bigint): Promise<void>;
  // Availability
  setAvailabilitySlot(input: AvailabilitySlotInput): Promise<AvailabilitySlot>;
  blockAvailabilitySlot(slotId: bigint): Promise<AvailabilitySlot>;
  checkAvailability(
    providerId: bigint,
    date: string,
    time: string | null,
  ): Promise<boolean>;
  listAvailabilitySlots(providerId: bigint): Promise<AvailabilitySlot[]>;
  // Search + admin
  searchProviders(filters: SearchFilters): Promise<SearchResult[]>;
  approveProvider(providerId: bigint): Promise<Provider>;
  rejectProvider(providerId: bigint, note: string): Promise<Provider>;
  suspendProvider(providerId: bigint, note: string): Promise<Provider>;
  reinstateProvider(providerId: bigint): Promise<Provider>;
  // AI generation tools. `category` and `tone` are optional on every text
  // endpoint; null means "let the model pick a default". `bookingId` is
  // required for the booking-context endpoints (suggestReply, generateReviewDraft)
  // so the backend can pull the booking record.
  generateListingDescription(
    bulletPoints: string,
    category: ServiceCategory | null,
    tone: BackendTone | null,
  ): Promise<string>;
  generateTitleAndTagline(
    keywords: string,
    category: ServiceCategory | null,
  ): Promise<string[]>;
  generatePromotionalContent(
    offerDetails: string,
    category: ServiceCategory,
    tone: BackendTone | null,
  ): Promise<string>;
  // AI vision analysis (each accepts an uploaded image as ExternalBlob)
  analyzeImageDescription(image: ExternalBlob): Promise<string>;
  analyzeImageWork(image: ExternalBlob): Promise<string>;
  analyzeImageSafety(image: ExternalBlob): Promise<string>;
  // AI text generation (profile, booking, review)
  generateBio(profileInfo: string, tone: BackendTone | null): Promise<string>;
  generateCompanyDescription(
    companyInfo: string,
    tone: BackendTone | null,
  ): Promise<string>;
  generateBookingMessage(bookingContext: string): Promise<string>;
  suggestReply(
    bookingId: bigint,
    conversationContext: string | null,
  ): Promise<string>;
  generateReviewDraft(
    bookingId: bigint,
    rating: bigint,
    extraNotes: string | null,
  ): Promise<string>;
  getUnreadMessageCount(bookingId: bigint): Promise<bigint>;
  // Owner seeding + email settings (admin/owner-only)
  seedOwnerServices(): Promise<BackendSeedResult>;
  isOwnerSeeded(): Promise<boolean>;
  getEmailSettings(): Promise<EmailSettings>;
  setEmailNotificationsEnabled(enabled: boolean): Promise<void>;
  // ─── V3: Trust & Verification ────────────────────────────────────────────
  getTrustScore(providerId: bigint): Promise<BackendTrustScore>;
  getVerification(providerId: bigint): Promise<BackendVerificationTiers>;
  updateVerificationTier(
    providerId: bigint,
    tier: BackendVerificationTierKey,
    status: BackendVerificationTierStatus,
    note: string | null,
  ): Promise<BackendVerificationTiers>;
  // ─── V3: Disputes ───────────────────────────────────────────────────────
  openDispute(input: BackendDisputeInput): Promise<BackendDispute>;
  respondToDispute(
    disputeId: bigint,
    response: string,
  ): Promise<BackendDispute>;
  resolveDispute(
    disputeId: bigint,
    resolution: string,
  ): Promise<BackendDispute>;
  escalateDispute(disputeId: bigint): Promise<BackendDispute>;
  listDisputes(): Promise<BackendDispute[]>;
  listDisputesByBooking(bookingId: bigint): Promise<BackendDispute[]>;
  triageDispute(disputeId: bigint): Promise<BackendDisputeTriage>;
  // ─── V3: Community Reports ──────────────────────────────────────────────
  reportTarget(
    input: BackendCommunityReportInput,
  ): Promise<BackendCommunityReport>;
  listReports(): Promise<BackendCommunityReport[]>;
  resolveReport(
    reportId: bigint,
    resolutionNote: string,
    dismiss: boolean,
  ): Promise<BackendCommunityReport>;
  // ─── V3: Rewards & Referrals ────────────────────────────────────────────
  getMyRewards(): Promise<import("@/backend").RewardProfile | null>;
  getRewardsByUser(
    userId: Principal,
  ): Promise<import("@/backend").RewardProfile | null>;
  awardPoints(
    userId: Principal,
    points: bigint,
    reason: string,
  ): Promise<import("@/backend").RewardLedgerEntry>;
  getRewardLedger(
    userId: Principal,
  ): Promise<import("@/backend").RewardLedgerEntry[]>;
  getMyReferralCode(): Promise<string>;
  applyReferral(referralCode: string): Promise<BackendReferral>;
  getLeaderboard(limit: bigint): Promise<import("@/backend").RewardProfile[]>;
  // ─── V3: Provider Microsites ────────────────────────────────────────────
  getMicrosite(micrositeId: bigint): Promise<BackendMicrosite | null>;
  getMicrositeBySlug(slug: string): Promise<BackendMicrosite | null>;
  upsertMyMicrosite(input: BackendMicrositeInput): Promise<BackendMicrosite>;
  publishMicrosite(
    micrositeId: bigint,
    published: boolean,
  ): Promise<BackendMicrosite>;
  generateMicrosite(providerId: bigint): Promise<BackendMicrosite>;
  // ─── V3: Docs (help center / knowledge base) ────────────────────────────
  listDocs(): Promise<BackendDoc[]>;
  getDoc(docId: bigint): Promise<BackendDoc | null>;
  getDocBySlug(slug: string): Promise<BackendDoc | null>;
  createDoc(input: BackendDocInput): Promise<BackendDoc>;
  updateDoc(docId: bigint, input: BackendDocInput): Promise<BackendDoc>;
  publishDoc(docId: bigint, status: BackendDocStatus): Promise<BackendDoc>;
  listDocsByCategory(category: string): Promise<BackendDoc[]>;
  // ─── V3: AI Provider Matching & Search ──────────────────────────────────
  matchProviders(
    input: BackendMatchProvidersInput,
  ): Promise<BackendProviderMatch[]>;
  aiAssistant(input: BackendAssistantInput): Promise<BackendAssistantMessage>;
  aiSearch(searchQuery: string): Promise<BackendAISearchResult[]>;
  // ─── V3: AI Review Summary & Provider Insights ───────────────────────────
  generateReviewSummary(providerId: bigint): Promise<BackendReviewSummary>;
  generateProviderInsights(
    providerId: bigint,
  ): Promise<BackendProviderInsights>;
};

// Owner-seeding result — mirrors the backend `SeedResult` record. The outcome
// field uses the backend `Variant_created_skipped` enum so the value passes
// through the adapter without a string-literal cast.
export interface SeedListingOutcome {
  category: ServiceCategory;
  outcome: Variant_created_skipped;
}

export interface SeedResult {
  listingOutcomes: SeedListingOutcome[];
  providerId: string;
  providerCreated: boolean;
}

// Email notification settings returned by getEmailSettings.
export interface EmailSettings {
  emailNotificationsEnabled: boolean;
}

export function useBackend(): {
  actor: MarketplaceActor | null;
  isFetching: boolean;
} {
  const { actor, isFetching } = useActor(createActor);
  return {
    actor: actor ? (actor as unknown as MarketplaceActor) : null,
    isFetching,
  };
}
