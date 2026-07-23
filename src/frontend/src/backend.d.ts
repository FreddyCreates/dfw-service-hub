import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface ProviderInsights {
    insights: string;
    recommendations: Array<string>;
    providerId: bigint;
}
export interface AssistantMessage {
    content: string;
    context?: string;
    role: AssistantRole;
    timestamp: Timestamp;
}
export interface Microsite {
    id: bigint;
    blockOrder: Array<string>;
    generatedAt?: Timestamp;
    published: boolean;
    createdAt: Timestamp;
    slug: string;
    heroCopy: string;
    accentColor?: string;
    coverImage?: Uint8Array;
    updatedAt: Timestamp;
    servicesCopy: string;
    aboutCopy: string;
    providerId: bigint;
}
export interface Dispute {
    id: bigint;
    status: DisputeStatus;
    bookingId: bigint;
    createdAt: Timestamp;
    aiTriageSuggestion?: string;
    updatedAt: Timestamp;
    providerResponse?: string;
    adminResolution?: string;
    openedBy: UserId;
    reason: string;
}
export interface ReviewSummary {
    sentiment: string;
    summary: string;
    themes: Array<string>;
    providerId: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface VerificationTiers {
    background: VerificationTierRecord;
    insurance: VerificationTierRecord;
    business: VerificationTierRecord;
    identity: VerificationTierRecord;
}
export interface VerificationTierRecord {
    status: VerificationTierStatus;
    note?: string;
    verifiedAt?: Timestamp;
}
export interface SearchFilters {
    serviceArea?: string;
    minRating?: bigint;
    category?: ServiceCategory;
    keyword?: string;
    maxPriceCents?: bigint;
    availableOn?: string;
}
export interface BookingInput {
    customerNote?: string;
    scheduledDate: string;
    scheduledTime?: string;
    listingId: bigint;
    jobDetails: string;
    address: string;
}
export interface TrustScore {
    reviews: bigint;
    longevity: bigint;
    updatedAt: Timestamp;
    responsiveness: bigint;
    overall: bigint;
    disputeHistory: bigint;
    verification: bigint;
}
export interface DisputeInput {
    bookingId: bigint;
    reason: string;
}
export interface DocInput {
    status: DocStatus;
    title: string;
    content: string;
    slug: string;
    category: string;
}
export interface MatchProvidersInput {
    serviceArea?: string;
    need: string;
    category?: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface RewardProfile {
    streak: bigint;
    referralCode: string;
    userId: UserId;
    badges: Array<string>;
    tier: RewardTier;
    updatedAt: Timestamp;
    points: bigint;
}
export interface ProviderInput {
    logo?: ExternalBlob;
    serviceCategories: Array<ServiceCategory>;
    description?: string;
    companyName: string;
    serviceAreas: Array<string>;
}
export interface AvailabilitySlot {
    id: bigint;
    status: SlotStatus;
    date: string;
    createdAt: Timestamp;
    time?: string;
    providerId: bigint;
}
export type UserId = Principal;
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface AssistantInput {
    context?: string;
    message: string;
}
export interface ServiceListing {
    id: bigint;
    serviceArea: string;
    title: string;
    active: boolean;
    createdAt: Timestamp;
    description: string;
    updatedAt: Timestamp;
    category: ServiceCategory;
    priceUnit: string;
    priceCents: bigint;
    providerId: bigint;
    photos: Array<ExternalBlob>;
}
export interface DisputeTriage {
    suggestedResolution: string;
    rationale: string;
    severity: string;
    disputeId: bigint;
}
export interface CommunityReportInput {
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
}
export interface Doc {
    id: bigint;
    status: DocStatus;
    title: string;
    readingTime: bigint;
    content: string;
    createdAt: Timestamp;
    slug: string;
    author: UserId;
    updatedAt: Timestamp;
    category: string;
}
export interface ReviewInput {
    bookingId: bigint;
    rating: bigint;
    writtenText: string;
}
export interface Provider {
    id: bigint;
    ratingSum: bigint;
    verificationNote?: string;
    ratingCount: bigint;
    ownerPrincipal: UserId;
    logo?: ExternalBlob;
    createdAt: Timestamp;
    serviceCategories: Array<ServiceCategory>;
    description?: string;
    updatedAt: Timestamp;
    companyName: string;
    serviceAreas: Array<string>;
    verificationStatus: VerificationStatus;
}
export interface SearchResult {
    listing: ServiceListing;
    provider: Provider;
}
export type Timestamp = bigint;
export interface SeedResult {
    listingOutcomes: Array<SeedListingOutcome>;
    providerId: bigint;
    providerCreated: boolean;
}
export interface AISearchResult {
    listingId: bigint;
    score: bigint;
    rationale: string;
    providerId: bigint;
}
export interface Referral {
    id: bigint;
    status: ReferralStatus;
    referrer: UserId;
    createdAt: Timestamp;
    awardedAt?: Timestamp;
    referee: UserId;
}
export interface Booking {
    id: bigint;
    customerNote?: string;
    status: BookingStatus;
    scheduledDate: string;
    scheduledTime?: string;
    listingId: bigint;
    createdAt: Timestamp;
    jobDetails: string;
    updatedAt: Timestamp;
    address: string;
    category: ServiceCategory;
    customerId: UserId;
    providerId: bigint;
}
export interface RewardLedgerEntry {
    id: bigint;
    userId: UserId;
    timestamp: Timestamp;
    points: bigint;
    reason: string;
}
export interface UserInput {
    displayName: string;
    role: MarketplaceRole;
    email?: string;
    phone?: string;
    workPhotos: Array<ExternalBlob>;
    avatar?: ExternalBlob;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface Review {
    id: bigint;
    bookingId: bigint;
    createdAt: Timestamp;
    hidden: boolean;
    updatedAt: Timestamp;
    providerResponse?: string;
    customerId: UserId;
    rating: bigint;
    writtenText: string;
    providerId: bigint;
}
export interface AvailabilitySlotInput {
    status: SlotStatus;
    date: string;
    time?: string;
}
export interface MicrositeInput {
    blockOrder: Array<string>;
    published: boolean;
    slug: string;
    heroCopy: string;
    accentColor?: string;
    coverImage?: Uint8Array;
    servicesCopy: string;
    aboutCopy: string;
}
export interface User {
    principal: UserId;
    displayName: string;
    createdAt: Timestamp;
    role: MarketplaceRole;
    email?: string;
    updatedAt: Timestamp;
    phone?: string;
    workPhotos: Array<ExternalBlob>;
    avatar?: ExternalBlob;
}
export interface ProviderMatch {
    score: bigint;
    rationale: string;
    providerId: bigint;
}
export interface CommunityReport {
    id: bigint;
    status: ReportStatus;
    resolutionNote?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    targetType: ReportTargetType;
    targetId: string;
    reporter: UserId;
    reason: string;
}
export interface ServiceListingInput {
    serviceArea: string;
    title: string;
    active: boolean;
    description: string;
    category: ServiceCategory;
    priceUnit: string;
    priceCents: bigint;
    photos: Array<ExternalBlob>;
}
export interface SeedListingOutcome {
    category: ServiceCategory;
    outcome: Variant_created_skipped;
}
export interface Message {
    id: bigint;
    content: string;
    bookingId: bigint;
    read: boolean;
    sender: UserId;
    sentAt: Timestamp;
}
export interface MessageInput {
    content: string;
    bookingId: bigint;
}
export enum AssistantRole {
    user = "user",
    assistant = "assistant"
}
export enum BookingStatus {
    scheduled = "scheduled",
    requested = "requested",
    cancelled = "cancelled",
    completed = "completed",
    reviewed = "reviewed",
    accepted = "accepted",
    inProgress = "inProgress"
}
export enum DisputeStatus {
    resolved = "resolved",
    responded = "responded",
    escalated = "escalated",
    open = "open"
}
export enum DocStatus {
    published = "published",
    draft = "draft"
}
export enum MarketplaceRole {
    admin = "admin",
    provider = "provider",
    customer = "customer"
}
export enum ReferralStatus {
    expired = "expired",
    pending = "pending",
    awarded = "awarded"
}
export enum ReportStatus {
    resolved = "resolved",
    reviewing = "reviewing",
    open = "open",
    dismissed = "dismissed"
}
export enum ReportTargetType {
    review = "review",
    listing = "listing",
    provider = "provider",
    user = "user"
}
export enum RewardTier {
    bronze = "bronze",
    gold = "gold",
    platinum = "platinum",
    silver = "silver"
}
export enum ServiceCategory {
    boxTruck = "boxTruck",
    relocation = "relocation",
    moving = "moving",
    trashHaul = "trashHaul"
}
export enum SlotStatus {
    blocked = "blocked",
    available = "available"
}
export enum Tone {
    concise = "concise",
    professional = "professional",
    friendly = "friendly"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_background_insurance_business_identity {
    background = "background",
    insurance = "insurance",
    business = "business",
    identity = "identity"
}
export enum Variant_created_skipped {
    created = "created",
    skipped = "skipped"
}
export enum Variant_hide_restore {
    hide = "hide",
    restore = "restore"
}
export enum VerificationStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected",
    suspended = "suspended"
}
export enum VerificationTierStatus {
    expired = "expired",
    pending = "pending",
    approved = "approved",
    unverified = "unverified",
    rejected = "rejected"
}
export interface backendInterface {
    acceptBooking(bookingId: bigint): Promise<Booking>;
    aiAssistant(input: AssistantInput): Promise<AssistantMessage>;
    aiSearch(searchQuery: string): Promise<Array<AISearchResult>>;
    analyzeImageDescription(image: ExternalBlob): Promise<string>;
    analyzeImageSafety(image: ExternalBlob): Promise<string>;
    analyzeImageWork(image: ExternalBlob): Promise<string>;
    applyReferral(referralCode: string): Promise<Referral>;
    approveProvider(providerId: bigint): Promise<Provider>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    awardPoints(userId: UserId, points: bigint, reason: string): Promise<RewardLedgerEntry>;
    blockAvailabilitySlot(slotId: bigint): Promise<AvailabilitySlot>;
    cancelBooking(bookingId: bigint): Promise<Booking>;
    checkAvailability(providerId: bigint, date: string, time: string | null): Promise<boolean>;
    completeBooking(bookingId: bigint): Promise<Booking>;
    createBooking(input: BookingInput): Promise<Booking>;
    createDoc(input: DocInput): Promise<Doc>;
    createListing(input: ServiceListingInput): Promise<ServiceListing>;
    createReview(input: ReviewInput): Promise<Review>;
    declineBooking(bookingId: bigint): Promise<Booking>;
    deleteListing(listingId: bigint): Promise<void>;
    escalateDispute(disputeId: bigint): Promise<Dispute>;
    execute(qJson: string): Promise<Result>;
    generateBio(profileInfo: string, tone: Tone | null): Promise<string>;
    generateBookingMessage(bookingContext: string): Promise<string>;
    generateCompanyDescription(companyInfo: string, tone: Tone | null): Promise<string>;
    generateListingDescription(bulletPoints: string, category: ServiceCategory | null, tone: Tone | null): Promise<string>;
    generateMicrosite(providerId: bigint): Promise<Microsite>;
    generatePromotionalContent(offerDetails: string, category: ServiceCategory | null, tone: Tone | null): Promise<string>;
    generateProviderInsights(providerId: bigint): Promise<ProviderInsights>;
    generateReviewDraft(bookingId: bigint, rating: bigint, extraNotes: string | null): Promise<string>;
    generateReviewSummary(providerId: bigint): Promise<ReviewSummary>;
    generateTitleAndTagline(keywords: string, category: ServiceCategory | null): Promise<Array<string>>;
    getBooking(bookingId: bigint): Promise<Booking | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDoc(docId: bigint): Promise<Doc | null>;
    getDocBySlug(slug: string): Promise<Doc | null>;
    getEmailSettings(): Promise<{
        emailNotificationsEnabled: boolean;
    }>;
    getLeaderboard(limit: bigint): Promise<Array<RewardProfile>>;
    getListing(listingId: bigint): Promise<ServiceListing | null>;
    getMicrosite(micrositeId: bigint): Promise<Microsite | null>;
    getMicrositeBySlug(slug: string): Promise<Microsite | null>;
    getMyBooking(bookingId: bigint): Promise<Booking | null>;
    getMyProvider(): Promise<Provider | null>;
    getMyReferralCode(): Promise<string>;
    getMyRewards(): Promise<RewardProfile | null>;
    getMyUser(): Promise<User | null>;
    getProvider(providerId: bigint): Promise<Provider | null>;
    getReview(reviewId: bigint): Promise<Review | null>;
    getRewardLedger(userId: UserId): Promise<Array<RewardLedgerEntry>>;
    getRewardsByUser(userId: UserId): Promise<RewardProfile | null>;
    getThread(bookingId: bigint): Promise<Array<Message>>;
    getTrustScore(providerId: bigint): Promise<TrustScore>;
    getUnreadMessageCount(bookingId: bigint): Promise<bigint>;
    getUser(userId: UserId): Promise<User | null>;
    getVerification(providerId: bigint): Promise<VerificationTiers>;
    isCallerAdmin(): Promise<boolean>;
    isOpenAIConfigured(): Promise<boolean>;
    isOwnerSeeded(): Promise<boolean>;
    listAvailabilitySlots(providerId: bigint): Promise<Array<AvailabilitySlot>>;
    listDisputes(): Promise<Array<Dispute>>;
    listDisputesByBooking(bookingId: bigint): Promise<Array<Dispute>>;
    listDocs(): Promise<Array<Doc>>;
    listDocsByCategory(category: string): Promise<Array<Doc>>;
    listListingsByCategory(category: ServiceCategory): Promise<Array<ServiceListing>>;
    listListingsByProvider(providerId: bigint): Promise<Array<ServiceListing>>;
    listMyBookings(): Promise<Array<Booking>>;
    listProviderBookings(providerId: bigint): Promise<Array<Booking>>;
    listProviders(): Promise<Array<Provider>>;
    listProvidersByCategory(category: ServiceCategory): Promise<Array<Provider>>;
    listReports(): Promise<Array<CommunityReport>>;
    listReviewsByBooking(bookingId: bigint): Promise<Array<Review>>;
    listReviewsByProvider(providerId: bigint): Promise<Array<Review>>;
    listUsers(): Promise<Array<User>>;
    markThreadRead(bookingId: bigint): Promise<void>;
    matchProviders(input: MatchProvidersInput): Promise<Array<ProviderMatch>>;
    moderateReview(reviewId: bigint, action: Variant_hide_restore): Promise<Review>;
    openDispute(input: DisputeInput): Promise<Dispute>;
    publishDoc(docId: bigint, status: DocStatus): Promise<Doc>;
    publishMicrosite(micrositeId: bigint, published: boolean): Promise<Microsite>;
    registerProvider(input: ProviderInput): Promise<Provider>;
    reinstateProvider(providerId: bigint): Promise<Provider>;
    rejectProvider(providerId: bigint, note: string): Promise<Provider>;
    reportTarget(input: CommunityReportInput): Promise<CommunityReport>;
    resolveDispute(disputeId: bigint, resolution: string): Promise<Dispute>;
    resolveReport(reportId: bigint, resolutionNote: string, dismiss: boolean): Promise<CommunityReport>;
    respondToDispute(disputeId: bigint, response: string): Promise<Dispute>;
    respondToReview(reviewId: bigint, response: string): Promise<Review>;
    scheduleBooking(bookingId: bigint): Promise<Booking>;
    schema(): Promise<string>;
    searchProviders(filters: SearchFilters): Promise<Array<SearchResult>>;
    seedOwnerServices(): Promise<SeedResult>;
    sendMessage(input: MessageInput): Promise<Message>;
    setAvailabilitySlot(input: AvailabilitySlotInput): Promise<AvailabilitySlot>;
    setEmailNotificationsEnabled(enabled: boolean): Promise<void>;
    setOpenAIApiKey(key: string): Promise<void>;
    startBooking(bookingId: bigint): Promise<Booking>;
    suggestReply(bookingId: bigint, conversationContext: string | null): Promise<string>;
    suspendProvider(providerId: bigint, note: string): Promise<Provider>;
    triageDispute(disputeId: bigint): Promise<DisputeTriage>;
    updateDoc(docId: bigint, input: DocInput): Promise<Doc>;
    updateListing(listingId: bigint, input: ServiceListingInput): Promise<ServiceListing>;
    updateMyProvider(input: ProviderInput): Promise<Provider>;
    updateVerificationTier(providerId: bigint, tier: Variant_background_insurance_business_identity, status: VerificationTierStatus, note: string | null): Promise<VerificationTiers>;
    upsertMyMicrosite(input: MicrositeInput): Promise<Microsite>;
    upsertMyUser(input: UserInput): Promise<User>;
}
