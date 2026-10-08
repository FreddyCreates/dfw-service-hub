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
export type Timestamp = bigint;
export interface SearchResult {
    listing: ServiceListing;
    provider: Provider;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type AuthId = Principal;
export interface IdentityAttributes {
    principal: AuthId;
    lastSeenAt: bigint;
    displayName?: string;
    source: IdentitySource;
    firstSeenAt: bigint;
    email?: string;
}
export interface Cell {
    value: Value;
    name: string;
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
export interface UserInput {
    displayName: string;
    role: MarketplaceRole;
    email?: string;
    phone?: string;
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
export interface SearchFilters {
    serviceArea?: string;
    minRating?: bigint;
    category?: ServiceCategory;
    keyword?: string;
    maxPriceCents?: bigint;
    availableOn?: string;
}
export interface AvailabilitySlotInput {
    status: SlotStatus;
    date: string;
    time?: string;
}
export interface BookingInput {
    customerNote?: string;
    scheduledDate: string;
    scheduledTime?: string;
    listingId: bigint;
    jobDetails: string;
    address: string;
}
export interface User {
    principal: UserId;
    displayName: string;
    createdAt: Timestamp;
    role: MarketplaceRole;
    email?: string;
    updatedAt: Timestamp;
    phone?: string;
    avatar?: ExternalBlob;
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
export interface AvailabilitySlot {
    id: bigint;
    status: SlotStatus;
    date: string;
    createdAt: Timestamp;
    time?: string;
    providerId: bigint;
}
export interface ProviderInput {
    logo?: ExternalBlob;
    serviceCategories: Array<ServiceCategory>;
    description?: string;
    companyName: string;
    serviceAreas: Array<string>;
}
export type UserId = Principal;
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
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
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
export interface Message {
    id: bigint;
    content: string;
    bookingId: bigint;
    read: boolean;
    sender: UserId;
    sentAt: Timestamp;
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
export interface MessageInput {
    content: string;
    bookingId: bigint;
}
export interface ReviewInput {
    bookingId: bigint;
    rating: bigint;
    writtenText: string;
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
export enum IdentitySource {
    internetIdentity = "internetIdentity",
    google = "google",
    email = "email"
}
export enum MarketplaceRole {
    admin = "admin",
    provider = "provider",
    customer = "customer"
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
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
export interface backendInterface {
    acceptBooking(bookingId: bigint): Promise<Booking>;
    approveProvider(providerId: bigint): Promise<Provider>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockAvailabilitySlot(slotId: bigint): Promise<AvailabilitySlot>;
    cancelBooking(bookingId: bigint): Promise<Booking>;
    checkAvailability(providerId: bigint, date: string, time: string | null): Promise<boolean>;
    completeBooking(bookingId: bigint): Promise<Booking>;
    createBooking(input: BookingInput): Promise<Booking>;
    createListing(input: ServiceListingInput): Promise<ServiceListing>;
    createReview(input: ReviewInput): Promise<Review>;
    declineBooking(bookingId: bigint): Promise<Booking>;
    deleteListing(listingId: bigint): Promise<void>;
    execute(qJson: string): Promise<Result>;
    generateListingDescription(bulletPoints: string): Promise<string>;
    generatePromotionalContent(offerDetails: string): Promise<string>;
    generateTitleAndTagline(keywords: string): Promise<Array<string>>;
    getBooking(bookingId: bigint): Promise<Booking | null>;
    getCallerUserRole(): Promise<UserRole>;
    getListing(listingId: bigint): Promise<ServiceListing | null>;
    getMyBooking(bookingId: bigint): Promise<Booking | null>;
    getMyDisplayName(): Promise<string | null>;
    getMyEmail(): Promise<string | null>;
    getMyIdentity(): Promise<IdentityAttributes | null>;
    getMyIdentitySource(): Promise<IdentitySource | null>;
    getMyProvider(): Promise<Provider | null>;
    getMyUser(): Promise<User | null>;
    getProvider(providerId: bigint): Promise<Provider | null>;
    getReview(reviewId: bigint): Promise<Review | null>;
    getThread(bookingId: bigint): Promise<Array<Message>>;
    getUnreadMessageCount(bookingId: bigint): Promise<bigint>;
    getUser(userId: UserId): Promise<User | null>;
    isCallerAdmin(): Promise<boolean>;
    isOpenAIConfigured(): Promise<boolean>;
    listAvailabilitySlots(providerId: bigint): Promise<Array<AvailabilitySlot>>;
    listListingsByCategory(category: ServiceCategory): Promise<Array<ServiceListing>>;
    listListingsByProvider(providerId: bigint): Promise<Array<ServiceListing>>;
    listMyBookings(): Promise<Array<Booking>>;
    listProviderBookings(providerId: bigint): Promise<Array<Booking>>;
    listProviders(): Promise<Array<Provider>>;
    listProvidersByCategory(category: ServiceCategory): Promise<Array<Provider>>;
    listReviewsByBooking(bookingId: bigint): Promise<Array<Review>>;
    listReviewsByProvider(providerId: bigint): Promise<Array<Review>>;
    listUsers(): Promise<Array<User>>;
    markThreadRead(bookingId: bigint): Promise<void>;
    moderateReview(reviewId: bigint, action: Variant_hide_restore): Promise<Review>;
    registerProvider(input: ProviderInput): Promise<Provider>;
    reinstateProvider(providerId: bigint): Promise<Provider>;
    rejectProvider(providerId: bigint, note: string): Promise<Provider>;
    respondToReview(reviewId: bigint, response: string): Promise<Review>;
    scheduleBooking(bookingId: bigint): Promise<Booking>;
    schema(): Promise<string>;
    searchProviders(filters: SearchFilters): Promise<Array<SearchResult>>;
    sendMessage(input: MessageInput): Promise<Message>;
    setAvailabilitySlot(input: AvailabilitySlotInput): Promise<AvailabilitySlot>;
    setOpenAIApiKey(key: string): Promise<void>;
    startBooking(bookingId: bigint): Promise<Booking>;
    suspendProvider(providerId: bigint, note: string): Promise<Provider>;
    updateListing(listingId: bigint, input: ServiceListingInput): Promise<ServiceListing>;
    updateMyProvider(input: ProviderInput): Promise<Provider>;
    upsertMyUser(input: UserInput): Promise<User>;
}
