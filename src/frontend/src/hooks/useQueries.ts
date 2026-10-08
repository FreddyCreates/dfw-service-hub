// Marketplace TanStack Query hooks — every backend method gets a hook.
// All hooks call `useBackend()` at the top level (never inside callbacks).
// Adapters in `lib/adapters.ts` convert backend results (bigint IDs,
// ExternalBlob images) to frontend types at the hook boundary, and convert
// frontend input shapes + string IDs to backend input shapes + bigint IDs
// before calling the actor.

import type {
  IdentityAttributes as BackendIdentityAttributes,
  IdentitySource as BackendIdentitySource,
  ServiceCategory as BackendServiceCategory,
  Variant_hide_restore,
} from "@/backend";
import {
  toBackendAvailabilitySlotInput,
  toBackendBookingInput,
  toBackendListingInput,
  toBackendMessageInput,
  toBackendProviderInput,
  toBackendReviewInput,
  toBackendSearchFilters,
  toBackendUserInput,
  toFrontendBooking,
  toFrontendListing,
  toFrontendMessage,
  toFrontendProvider,
  toFrontendReview,
  toFrontendSearchResult,
  toFrontendSlot,
  toFrontendUser,
} from "@/lib/adapters";
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
  ServiceCategory,
  ServiceListing,
  ServiceListingInput,
  User,
  UserInput,
} from "@/types";
import type { ModerateReviewAction } from "@/types";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

// Query keys — hierarchical for targeted invalidation.
export const marketplaceKeys = {
  users: {
    all: ["users"] as const,
    me: ["users", "me"] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  providers: {
    all: ["providers"] as const,
    me: ["providers", "me"] as const,
    detail: (id: string) => ["providers", "detail", id] as const,
    byCategory: (category: ServiceCategory) =>
      ["providers", "category", category] as const,
  },
  listings: {
    all: ["listings"] as const,
    detail: (id: string) => ["listings", "detail", id] as const,
    byProvider: (providerId: string) =>
      ["listings", "provider", providerId] as const,
    byCategory: (category: ServiceCategory) =>
      ["listings", "category", category] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    mine: ["bookings", "mine"] as const,
    byProvider: (providerId: string) =>
      ["bookings", "provider", providerId] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    byProvider: (providerId: string) =>
      ["reviews", "provider", providerId] as const,
    byBooking: (bookingId: string) =>
      ["reviews", "booking", bookingId] as const,
  },
  messages: {
    thread: (bookingId: string) => ["messages", "thread", bookingId] as const,
  },
  availability: {
    slots: (providerId: string) =>
      ["availability", "slots", providerId] as const,
    check: (providerId: string, date: string, time: string) =>
      ["availability", "check", providerId, date, time] as const,
  },
  search: (filters: SearchFilters) => ["search", filters] as const,
};

// ─── User ──────────────────────────────────────────────────────────────────

export function useGetMyUser() {
  const { actor, isFetching } = useBackend();
  return useQuery<User | null>({
    queryKey: marketplaceKeys.users.me,
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyUser();
      return result ? toFrontendUser(result) : null;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUser(userId: Principal | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<User | null>({
    queryKey: marketplaceKeys.users.detail(userId?.toString() ?? ""),
    queryFn: async () => {
      if (!actor || !userId) return null;
      const result = await actor.getUser(userId);
      return result ? toFrontendUser(result) : null;
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useListUsers() {
  const { actor, isFetching } = useBackend();
  return useQuery<User[]>({
    queryKey: marketplaceKeys.users.all,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listUsers();
      return result.map(toFrontendUser);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpsertMyUser() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.upsertMyUser(toBackendUserInput(input));
      return toFrontendUser(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.users.me });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.users.all });
    },
  });
}

// ─── Identity ──────────────────────────────────────────────────────────────

export function useGetMyIdentity() {
  const { actor, isFetching } = useBackend();
  return useQuery<BackendIdentityAttributes | null>({
    queryKey: ["identity", "me"],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyIdentity();
      return result ?? null;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyEmail() {
  const { actor, isFetching } = useBackend();
  return useQuery<string | null>({
    queryKey: ["identity", "email"],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyEmail();
      return result ?? null;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyDisplayName() {
  const { actor, isFetching } = useBackend();
  return useQuery<string | null>({
    queryKey: ["identity", "displayName"],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyDisplayName();
      return result ?? null;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyIdentitySource() {
  const { actor, isFetching } = useBackend();
  return useQuery<BackendIdentitySource | null>({
    queryKey: ["identity", "source"],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyIdentitySource();
      return result ?? null;
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function useGetMyProvider() {
  const { actor, isFetching } = useBackend();
  return useQuery<Provider | null>({
    queryKey: marketplaceKeys.providers.me,
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyProvider();
      return result ? toFrontendProvider(result) : null;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetProvider(providerId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Provider | null>({
    queryKey: marketplaceKeys.providers.detail(providerId ?? ""),
    queryFn: async () => {
      if (!actor || !providerId) return null;
      const result = await actor.getProvider(BigInt(providerId));
      return result ? toFrontendProvider(result) : null;
    },
    enabled: !!actor && !isFetching && !!providerId,
  });
}

export function useListProviders() {
  const { actor, isFetching } = useBackend();
  return useQuery<Provider[]>({
    queryKey: marketplaceKeys.providers.all,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listProviders();
      return result.map(toFrontendProvider);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListProvidersByCategory(category: ServiceCategory) {
  const { actor, isFetching } = useBackend();
  return useQuery<Provider[]>({
    queryKey: marketplaceKeys.providers.byCategory(category),
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listProvidersByCategory(
        category as BackendServiceCategory,
      );
      return result.map(toFrontendProvider);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRegisterProvider() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProviderInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.registerProvider(
        toBackendProviderInput(input),
      );
      return toFrontendProvider(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.providers.me });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.all,
      });
    },
  });
}

export function useUpdateMyProvider() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProviderInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.updateMyProvider(
        toBackendProviderInput(input),
      );
      return toFrontendProvider(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.providers.me });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.all,
      });
    },
  });
}

// ─── Listings ──────────────────────────────────────────────────────────────

export function useGetListing(listingId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<ServiceListing | null>({
    queryKey: marketplaceKeys.listings.detail(listingId ?? ""),
    queryFn: async () => {
      if (!actor || !listingId) return null;
      const result = await actor.getListing(BigInt(listingId));
      return result ? toFrontendListing(result) : null;
    },
    enabled: !!actor && !isFetching && !!listingId,
  });
}

export function useListListingsByProvider(providerId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<ServiceListing[]>({
    queryKey: marketplaceKeys.listings.byProvider(providerId ?? ""),
    queryFn: async () => {
      if (!actor || !providerId) return [];
      const result = await actor.listListingsByProvider(BigInt(providerId));
      return result.map(toFrontendListing);
    },
    enabled: !!actor && !isFetching && !!providerId,
  });
}

export function useListListingsByCategory(category: ServiceCategory) {
  const { actor, isFetching } = useBackend();
  return useQuery<ServiceListing[]>({
    queryKey: marketplaceKeys.listings.byCategory(category),
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listListingsByCategory(
        category as BackendServiceCategory,
      );
      return result.map(toFrontendListing);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateListing() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ServiceListingInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.createListing(toBackendListingInput(input));
      return toFrontendListing(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.listings.byProvider(data.providerId),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.listings.byCategory(data.category),
      });
    },
  });
}

export function useUpdateListing() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listingId,
      input,
    }: {
      listingId: string;
      input: ServiceListingInput;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.updateListing(
        BigInt(listingId),
        toBackendListingInput(input),
      );
      return toFrontendListing(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.listings.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.listings.byProvider(data.providerId),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.listings.byCategory(data.category),
      });
    },
  });
}

export function useDeleteListing() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteListing(BigInt(listingId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.listings.all });
    },
  });
}

// ─── Bookings ──────────────────────────────────────────────────────────────

export function useListMyBookings() {
  const { actor, isFetching } = useBackend();
  return useQuery<Booking[]>({
    queryKey: marketplaceKeys.bookings.mine,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listMyBookings();
      return result.map(toFrontendBooking);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListProviderBookings(providerId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Booking[]>({
    queryKey: marketplaceKeys.bookings.byProvider(providerId ?? ""),
    queryFn: async () => {
      if (!actor || !providerId) return [];
      const result = await actor.listProviderBookings(BigInt(providerId));
      return result.map(toFrontendBooking);
    },
    enabled: !!actor && !isFetching && !!providerId,
  });
}

export function useCreateBooking() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookingInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.createBooking(toBackendBookingInput(input));
      return toFrontendBooking(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.bookings.mine,
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.bookings.all });
    },
  });
}

export function useAcceptBooking() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.acceptBooking(BigInt(bookingId));
      return toFrontendBooking(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.bookings.all });
    },
  });
}

export function useDeclineBooking() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.declineBooking(BigInt(bookingId));
      return toFrontendBooking(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.bookings.all });
    },
  });
}

export function useCancelBooking() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.cancelBooking(BigInt(bookingId));
      return toFrontendBooking(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.bookings.all });
    },
  });
}

export function useStartBooking() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.startBooking(BigInt(bookingId));
      return toFrontendBooking(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.bookings.all });
    },
  });
}

export function useCompleteBooking() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.completeBooking(BigInt(bookingId));
      return toFrontendBooking(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.bookings.all });
    },
  });
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export function useListReviewsByProvider(providerId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Review[]>({
    queryKey: marketplaceKeys.reviews.byProvider(providerId ?? ""),
    queryFn: async () => {
      if (!actor || !providerId) return [];
      const result = await actor.listReviewsByProvider(BigInt(providerId));
      return result.map(toFrontendReview);
    },
    enabled: !!actor && !isFetching && !!providerId,
  });
}

export function useListReviewsByBooking(bookingId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Review[]>({
    queryKey: marketplaceKeys.reviews.byBooking(bookingId ?? ""),
    queryFn: async () => {
      if (!actor || !bookingId) return [];
      const result = await actor.listReviewsByBooking(BigInt(bookingId));
      return result.map(toFrontendReview);
    },
    enabled: !!actor && !isFetching && !!bookingId,
  });
}

export function useCreateReview() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.createReview(toBackendReviewInput(input));
      return toFrontendReview(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.reviews.byProvider(data.providerId),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.reviews.byBooking(data.bookingId),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.bookings.all });
    },
  });
}

export function useRespondToReview() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reviewId,
      response,
    }: {
      reviewId: string;
      response: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.respondToReview(BigInt(reviewId), response);
      return toFrontendReview(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.reviews.byProvider(data.providerId),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.reviews.byBooking(data.bookingId),
      });
    },
  });
}

// ─── Messaging ──────────────────────────────────────────────────────────────

export function useGetThread(bookingId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Message[]>({
    queryKey: marketplaceKeys.messages.thread(bookingId ?? ""),
    queryFn: async () => {
      if (!actor || !bookingId) return [];
      const result = await actor.getThread(BigInt(bookingId));
      return result.map(toFrontendMessage);
    },
    enabled: !!actor && !isFetching && !!bookingId,
  });
}

export function useSendMessage() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MessageInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.sendMessage(toBackendMessageInput(input));
      return toFrontendMessage(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.messages.thread(data.bookingId),
      });
    },
  });
}

export function useMarkThreadRead() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.markThreadRead(BigInt(bookingId));
    },
    onSuccess: (_data, bookingId) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.messages.thread(bookingId),
      });
    },
  });
}

// ─── Availability ────────────────────────────────────────────────────────────

export function useListAvailabilitySlots(providerId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<AvailabilitySlot[]>({
    queryKey: marketplaceKeys.availability.slots(providerId ?? ""),
    queryFn: async () => {
      if (!actor || !providerId) return [];
      const result = await actor.listAvailabilitySlots(BigInt(providerId));
      return result.map(toFrontendSlot);
    },
    enabled: !!actor && !isFetching && !!providerId,
  });
}

export function useCheckAvailability(
  providerId: string | null,
  date: string | null,
  time: string | null,
) {
  const { actor, isFetching } = useBackend();
  return useQuery<boolean>({
    queryKey: marketplaceKeys.availability.check(
      providerId ?? "",
      date ?? "",
      time ?? "",
    ),
    queryFn: async () => {
      if (!actor || !providerId || !date || !time) return false;
      return actor.checkAvailability(BigInt(providerId), date, time);
    },
    enabled: !!actor && !isFetching && !!providerId && !!date && !!time,
  });
}

export function useSetAvailabilitySlot() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AvailabilitySlotInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.setAvailabilitySlot(
        toBackendAvailabilitySlotInput(input),
      );
      return toFrontendSlot(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.availability.slots(data.providerId),
      });
    },
  });
}

export function useBlockAvailabilitySlot() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.blockAvailabilitySlot(BigInt(slotId));
      return toFrontendSlot(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

// ─── AI Generation ──────────────────────────────────────────────────────────

export function useGenerateListingDescription() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (bulletPoints: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateListingDescription(bulletPoints);
    },
  });
}

export function useGenerateTitleAndTagline() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (keywords: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateTitleAndTagline(keywords);
    },
  });
}

export function useGeneratePromotionalContent() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (offerDetails: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generatePromotionalContent(offerDetails);
    },
  });
}

export function useUnreadMessageCount(bookingId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<bigint>({
    queryKey: ["messages", "unread", bookingId ?? ""],
    queryFn: async () => {
      if (!actor || !bookingId) return 0n;
      return actor.getUnreadMessageCount(BigInt(bookingId));
    },
    enabled: !!actor && !isFetching && !!bookingId,
  });
}

// ─── Search ─────────────────────────────────────────────────────────────────

export function useSearchProviders(filters: SearchFilters) {
  const { actor, isFetching } = useBackend();
  return useQuery<SearchResult[]>({
    queryKey: marketplaceKeys.search(filters),
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.searchProviders(
        toBackendSearchFilters(filters),
      );
      return result.map(toFrontendSearchResult);
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export function useApproveProvider() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.approveProvider(BigInt(providerId));
      return toFrontendProvider(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.all,
      });
    },
  });
}

export function useRejectProvider() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      providerId,
      note,
    }: {
      providerId: string;
      note: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.rejectProvider(BigInt(providerId), note);
      return toFrontendProvider(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.all,
      });
    },
  });
}

export function useSuspendProvider() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      providerId,
      note,
    }: {
      providerId: string;
      note: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.suspendProvider(BigInt(providerId), note);
      return toFrontendProvider(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.all,
      });
    },
  });
}

export function useReinstateProvider() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.reinstateProvider(BigInt(providerId));
      return toFrontendProvider(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.all,
      });
    },
  });
}

export function useModerateReview() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reviewId,
      action,
    }: {
      reviewId: string;
      action: ModerateReviewAction;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.moderateReview(
        BigInt(reviewId),
        action as Variant_hide_restore,
      );
      return toFrontendReview(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.reviews.byProvider(data.providerId),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.reviews.all });
    },
  });
}
