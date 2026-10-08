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
  AvailabilitySlot as BackendAvailabilitySlot,
  AvailabilitySlotInput as BackendAvailabilitySlotInput,
  Booking as BackendBooking,
  BookingInput as BackendBookingInput,
  MarketplaceRole as BackendMarketplaceRole,
  Message as BackendMessage,
  MessageInput as BackendMessageInput,
  Provider as BackendProvider,
  ProviderInput as BackendProviderInput,
  Review as BackendReview,
  ReviewInput as BackendReviewInput,
  SearchFilters as BackendSearchFilters,
  SearchResult as BackendSearchResult,
  ServiceCategory as BackendServiceCategory,
  ServiceListing as BackendServiceListing,
  ServiceListingInput as BackendServiceListingInput,
  SlotStatus as BackendSlotStatus,
  User as BackendUser,
  UserInput as BackendUserInput,
} from "@/backend";
import type {
  AvailabilitySlot,
  AvailabilitySlotInput,
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
  ServiceListing,
  ServiceListingInput,
  SlotStatus,
  User,
  UserInput,
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

/** Convert an array of URL strings to an array of ExternalBlob. */
function urlsToBlobs(urls: string[]): ExternalBlob[] {
  return urls.map((u) => ExternalBlob.fromURL(u));
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

// ─── Frontend → Backend (inputs) ───────────────────────────────────────────

export function toBackendUserInput(input: UserInput): BackendUserInput {
  return {
    role: input.role as BackendMarketplaceRole,
    displayName: input.displayName,
    email: input.email,
    phone: input.phone,
    avatar: urlToBlob(input.avatar),
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
