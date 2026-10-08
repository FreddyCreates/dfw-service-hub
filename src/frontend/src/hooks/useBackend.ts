import { createActor } from "@/backend";
import type { Backend } from "@/backend";
import type {
  AvailabilitySlot,
  AvailabilitySlotInput,
  Booking,
  BookingInput,
  IdentityAttributes,
  IdentitySource,
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
  Variant_hide_restore,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
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
  // Identity (auth surface)
  getMyIdentity(): Promise<IdentityAttributes | null>;
  getMyEmail(): Promise<string | null>;
  getMyDisplayName(): Promise<string | null>;
  getMyIdentitySource(): Promise<IdentitySource | null>;
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
  // AI generation tools
  generateListingDescription(bulletPoints: string): Promise<string>;
  generateTitleAndTagline(keywords: string): Promise<string[]>;
  generatePromotionalContent(offerDetails: string): Promise<string>;
  getUnreadMessageCount(bookingId: bigint): Promise<bigint>;
};

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
