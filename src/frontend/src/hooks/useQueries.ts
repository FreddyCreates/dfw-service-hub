// Marketplace TanStack Query hooks — every backend method gets a hook.
// All hooks call `useBackend()` at the top level (never inside callbacks).
// Adapters in `lib/adapters.ts` convert backend results (bigint IDs,
// ExternalBlob images) to frontend types at the hook boundary, and convert
// frontend input shapes + string IDs to backend input shapes + bigint IDs
// before calling the actor.

import type {
  AssistantInput as BackendAssistantInput,
  MatchProvidersInput as BackendMatchProvidersInput,
  ServiceCategory as BackendServiceCategory,
  Tone as BackendTone,
  Variant_background_insurance_business_identity as BackendVerificationTierKey,
  Variant_hide_restore,
} from "@/backend";
import {
  toBackendAvailabilitySlotInput,
  toBackendBookingInput,
  toBackendCommunityReportInput,
  toBackendDisputeInput,
  toBackendDocInput,
  toBackendListingInput,
  toBackendMatchProvidersInput,
  toBackendMessageInput,
  toBackendMicrositeInput,
  toBackendProviderInput,
  toBackendReviewInput,
  toBackendSearchFilters,
  toBackendUserInput,
  toBackendVerificationTierKey,
  toBackendVerificationTierStatus,
  toFrontendAISearchResult,
  toFrontendAssistantMessage,
  toFrontendBooking,
  toFrontendCommunityReport,
  toFrontendDispute,
  toFrontendDisputeTriage,
  toFrontendDoc,
  toFrontendListing,
  toFrontendMessage,
  toFrontendMicrosite,
  toFrontendProvider,
  toFrontendProviderInsights,
  toFrontendProviderMatch,
  toFrontendReferral,
  toFrontendReview,
  toFrontendReviewSummary,
  toFrontendRewardLedgerEntry,
  toFrontendRewardProfile,
  toFrontendSearchResult,
  toFrontendSeedResult,
  toFrontendSlot,
  toFrontendTrustScore,
  toFrontendUser,
  toFrontendVerificationTiers,
} from "@/lib/adapters";
import type {
  AISearchResult,
  AssistantInput,
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
  ServiceCategory,
  ServiceListing,
  ServiceListingInput,
  Tone,
  TrustScore,
  User,
  UserInput,
  VerificationTierKey,
  VerificationTierStatus,
  VerificationTiers,
} from "@/types";
import type { ModerateReviewAction } from "@/types";
import type { ExternalBlob } from "@caffeineai/object-storage";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type EmailSettings, type SeedResult, useBackend } from "./useBackend";

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
  owner: {
    seeded: ["owner", "seeded"] as const,
  },
  email: {
    settings: ["email", "settings"] as const,
  },
  // ─── V3 query-key namespaces ──────────────────────────────────────────────
  trust: {
    score: (providerId: string) => ["trust", "score", providerId] as const,
    verification: (providerId: string) =>
      ["trust", "verification", providerId] as const,
  },
  disputes: {
    all: ["disputes"] as const,
    byBooking: (bookingId: string) =>
      ["disputes", "booking", bookingId] as const,
    detail: (disputeId: string) => ["disputes", "detail", disputeId] as const,
  },
  reports: {
    all: ["reports"] as const,
    detail: (reportId: string) => ["reports", "detail", reportId] as const,
  },
  rewards: {
    me: ["rewards", "me"] as const,
    byUser: (userId: string) => ["rewards", "user", userId] as const,
    ledger: (userId: string) => ["rewards", "ledger", userId] as const,
    referralCode: ["rewards", "referral-code"] as const,
    leaderboard: (limit: number) => ["rewards", "leaderboard", limit] as const,
  },
  microsites: {
    detail: (micrositeId: string) =>
      ["microsites", "detail", micrositeId] as const,
    bySlug: (slug: string) => ["microsites", "slug", slug] as const,
    mine: ["microsites", "mine"] as const,
  },
  docs: {
    all: ["docs"] as const,
    detail: (docId: string) => ["docs", "detail", docId] as const,
    bySlug: (slug: string) => ["docs", "slug", slug] as const,
    byCategory: (category: string) => ["docs", "category", category] as const,
  },
  ai: {
    matches: (input: MatchProvidersInput) => ["ai", "matches", input] as const,
    search: (query: string) => ["ai", "search", query] as const,
    reviewSummary: (providerId: string) =>
      ["ai", "review-summary", providerId] as const,
    providerInsights: (providerId: string) =>
      ["ai", "provider-insights", providerId] as const,
    triage: (disputeId: string) => ["ai", "triage", disputeId] as const,
  },
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
    mutationFn: async ({
      bulletPoints,
      category,
      tone,
    }: {
      bulletPoints: string;
      category?: ServiceCategory | null;
      tone?: Tone | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateListingDescription(
        bulletPoints,
        (category ?? null) as BackendServiceCategory | null,
        (tone ?? null) as BackendTone | null,
      );
    },
  });
}

export function useGenerateTitleAndTagline() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async ({
      keywords,
      category,
    }: {
      keywords: string;
      category?: ServiceCategory | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateTitleAndTagline(
        keywords,
        (category ?? null) as BackendServiceCategory | null,
      );
    },
  });
}

export function useGeneratePromotionalContent() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async ({
      offerDetails,
      category,
      tone,
    }: {
      offerDetails: string;
      category: ServiceCategory;
      tone?: Tone | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generatePromotionalContent(
        offerDetails,
        category as BackendServiceCategory,
        (tone ?? null) as BackendTone | null,
      );
    },
  });
}

// ─── AI Vision Analysis ─────────────────────────────────────────────────────
// Each hook accepts an ExternalBlob (the uploaded image) and returns the
// analysis text from the backend's OpenAI vision endpoint.

export function useAnalyzeImageDescription() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (image: ExternalBlob) => {
      if (!actor) throw new Error("Actor not available");
      return actor.analyzeImageDescription(image);
    },
  });
}

export function useAnalyzeImageWork() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (image: ExternalBlob) => {
      if (!actor) throw new Error("Actor not available");
      return actor.analyzeImageWork(image);
    },
  });
}

export function useAnalyzeImageSafety() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (image: ExternalBlob) => {
      if (!actor) throw new Error("Actor not available");
      return actor.analyzeImageSafety(image);
    },
  });
}

// ─── AI Text Generation (profile, booking, review) ──────────────────────────

export function useGenerateBio() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async ({
      profileInfo,
      tone,
    }: {
      profileInfo: string;
      tone?: Tone | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateBio(
        profileInfo,
        (tone ?? null) as BackendTone | null,
      );
    },
  });
}

export function useGenerateCompanyDescription() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async ({
      companyInfo,
      tone,
    }: {
      companyInfo: string;
      tone?: Tone | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateCompanyDescription(
        companyInfo,
        (tone ?? null) as BackendTone | null,
      );
    },
  });
}

export function useGenerateBookingMessage() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (bookingContext: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateBookingMessage(bookingContext);
    },
  });
}

export function useSuggestReply() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async ({
      bookingId,
      conversationContext,
    }: {
      bookingId: string;
      conversationContext?: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.suggestReply(
        BigInt(bookingId),
        (conversationContext ?? null) as string | null,
      );
    },
  });
}

export function useGenerateReviewDraft() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async ({
      bookingId,
      rating,
      extraNotes,
    }: {
      bookingId: string;
      rating: number;
      extraNotes?: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateReviewDraft(
        BigInt(bookingId),
        BigInt(rating),
        (extraNotes ?? null) as string | null,
      );
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

// ─── Owner Seeding & Email Settings ─────────────────────────────────────────
// Admin/owner-only endpoints for seeding the owner's four service categories
// and toggling transactional email notifications.

export function useSeedOwnerServices() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.seedOwnerServices();
      return toFrontendSeedResult(result);
    },
    onSuccess: () => {
      // Seeding creates/updates the owner's provider record and listings.
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.all,
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.providers.me });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.listings.all });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.owner.seeded,
      });
    },
  });
}

export function useIsOwnerSeeded() {
  const { actor, isFetching } = useBackend();
  return useQuery<boolean>({
    queryKey: marketplaceKeys.owner.seeded,
    queryFn: async () => {
      if (!actor) return false;
      return actor.isOwnerSeeded();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEmailSettings() {
  const { actor, isFetching } = useBackend();
  return useQuery<EmailSettings | null>({
    queryKey: marketplaceKeys.email.settings,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getEmailSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetEmailNotificationsEnabled() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!actor) throw new Error("Actor not available");
      await actor.setEmailNotificationsEnabled(enabled);
      return enabled;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.email.settings,
      });
    },
  });
}

// ─── V3: Trust & Verification ──────────────────────────────────────────────

export function useGetTrustScore(providerId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<TrustScore | null>({
    queryKey: marketplaceKeys.trust.score(providerId ?? ""),
    queryFn: async () => {
      if (!actor || !providerId) return null;
      const result = await actor.getTrustScore(BigInt(providerId));
      return toFrontendTrustScore(result);
    },
    enabled: !!actor && !isFetching && !!providerId,
  });
}

export function useGetVerification(providerId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<VerificationTiers | null>({
    queryKey: marketplaceKeys.trust.verification(providerId ?? ""),
    queryFn: async () => {
      if (!actor || !providerId) return null;
      const result = await actor.getVerification(BigInt(providerId));
      return toFrontendVerificationTiers(result);
    },
    enabled: !!actor && !isFetching && !!providerId,
  });
}

export function useUpdateVerificationTier() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      providerId,
      tier,
      status,
      note,
    }: {
      providerId: string;
      tier: VerificationTierKey;
      status: VerificationTierStatus;
      note?: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.updateVerificationTier(
        BigInt(providerId),
        toBackendVerificationTierKey(tier),
        toBackendVerificationTierStatus(status),
        note ?? null,
      );
      return toFrontendVerificationTiers(result);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.trust.verification(variables.providerId),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.trust.score(variables.providerId),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.providers.detail(variables.providerId),
      });
    },
  });
}

// ─── V3: Disputes ──────────────────────────────────────────────────────────

export function useOpenDispute() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DisputeInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.openDispute(toBackendDisputeInput(input));
      return toFrontendDispute(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.disputes.all });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.disputes.byBooking(data.bookingId),
      });
    },
  });
}

export function useRespondToDispute() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      disputeId,
      response,
    }: {
      disputeId: string;
      response: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.respondToDispute(BigInt(disputeId), response);
      return toFrontendDispute(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.disputes.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.disputes.byBooking(data.bookingId),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.disputes.all });
    },
  });
}

export function useResolveDispute() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      disputeId,
      resolution,
    }: {
      disputeId: string;
      resolution: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.resolveDispute(BigInt(disputeId), resolution);
      return toFrontendDispute(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.disputes.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.disputes.byBooking(data.bookingId),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.disputes.all });
    },
  });
}

export function useEscalateDispute() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (disputeId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.escalateDispute(BigInt(disputeId));
      return toFrontendDispute(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.disputes.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.disputes.byBooking(data.bookingId),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.disputes.all });
    },
  });
}

export function useListDisputes() {
  const { actor, isFetching } = useBackend();
  return useQuery<Dispute[]>({
    queryKey: marketplaceKeys.disputes.all,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listDisputes();
      return result.map(toFrontendDispute);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListDisputesByBooking(bookingId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Dispute[]>({
    queryKey: marketplaceKeys.disputes.byBooking(bookingId ?? ""),
    queryFn: async () => {
      if (!actor || !bookingId) return [];
      const result = await actor.listDisputesByBooking(BigInt(bookingId));
      return result.map(toFrontendDispute);
    },
    enabled: !!actor && !isFetching && !!bookingId,
  });
}

export function useTriageDispute() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (disputeId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.triageDispute(BigInt(disputeId));
      return toFrontendDisputeTriage(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.ai.triage(data.disputeId),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.disputes.detail(data.disputeId),
      });
    },
  });
}

// ─── V3: Community Reports ──────────────────────────────────────────────────

export function useReportTarget() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommunityReportInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.reportTarget(
        toBackendCommunityReportInput(input),
      );
      return toFrontendCommunityReport(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.reports.all });
    },
  });
}

export function useListReports() {
  const { actor, isFetching } = useBackend();
  return useQuery<CommunityReport[]>({
    queryKey: marketplaceKeys.reports.all,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listReports();
      return result.map(toFrontendCommunityReport);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useResolveReport() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      resolutionNote,
      dismiss,
    }: {
      reportId: string;
      resolutionNote: string;
      dismiss: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.resolveReport(
        BigInt(reportId),
        resolutionNote,
        dismiss,
      );
      return toFrontendCommunityReport(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.reports.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.reports.all });
    },
  });
}

// ─── V3: Rewards & Referrals ────────────────────────────────────────────────

export function useGetMyRewards() {
  const { actor, isFetching } = useBackend();
  return useQuery<import("@/types").RewardProfile | null>({
    queryKey: marketplaceKeys.rewards.me,
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getMyRewards();
      return result ? toFrontendRewardProfile(result) : null;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRewardsByUser(userId: Principal | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<import("@/types").RewardProfile | null>({
    queryKey: marketplaceKeys.rewards.byUser(userId?.toString() ?? ""),
    queryFn: async () => {
      if (!actor || !userId) return null;
      const result = await actor.getRewardsByUser(userId);
      return result ? toFrontendRewardProfile(result) : null;
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useGetRewardLedger(userId: Principal | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<import("@/types").RewardLedgerEntry[]>({
    queryKey: marketplaceKeys.rewards.ledger(userId?.toString() ?? ""),
    queryFn: async () => {
      if (!actor || !userId) return [];
      const result = await actor.getRewardLedger(userId);
      return result.map(toFrontendRewardLedgerEntry);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useGetMyReferralCode() {
  const { actor, isFetching } = useBackend();
  return useQuery<string>({
    queryKey: marketplaceKeys.rewards.referralCode,
    queryFn: async () => {
      if (!actor) return "";
      return actor.getMyReferralCode();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useApplyReferral() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (referralCode: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.applyReferral(referralCode);
      return toFrontendReferral(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.rewards.me });
    },
  });
}

export function useGetLeaderboard(limit: number) {
  const { actor, isFetching } = useBackend();
  return useQuery<import("@/types").RewardProfile[]>({
    queryKey: marketplaceKeys.rewards.leaderboard(limit),
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getLeaderboard(BigInt(limit));
      return result.map(toFrontendRewardProfile);
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── V3: Provider Microsites ────────────────────────────────────────────────

export function useGetMicrosite(micrositeId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Microsite | null>({
    queryKey: marketplaceKeys.microsites.detail(micrositeId ?? ""),
    queryFn: async () => {
      if (!actor || !micrositeId) return null;
      const result = await actor.getMicrosite(BigInt(micrositeId));
      return result ? toFrontendMicrosite(result) : null;
    },
    enabled: !!actor && !isFetching && !!micrositeId,
  });
}

export function useGetMicrositeBySlug(slug: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Microsite | null>({
    queryKey: marketplaceKeys.microsites.bySlug(slug ?? ""),
    queryFn: async () => {
      if (!actor || !slug) return null;
      const result = await actor.getMicrositeBySlug(slug);
      return result ? toFrontendMicrosite(result) : null;
    },
    enabled: !!actor && !isFetching && !!slug,
  });
}

export function useUpsertMyMicrosite() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MicrositeInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.upsertMyMicrosite(
        toBackendMicrositeInput(input),
      );
      return toFrontendMicrosite(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.microsites.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.microsites.bySlug(data.slug),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.microsites.mine,
      });
    },
  });
}

export function usePublishMicrosite() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      micrositeId,
      published,
    }: {
      micrositeId: string;
      published: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.publishMicrosite(
        BigInt(micrositeId),
        published,
      );
      return toFrontendMicrosite(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.microsites.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.microsites.bySlug(data.slug),
      });
    },
  });
}

export function useGenerateMicrosite() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.generateMicrosite(BigInt(providerId));
      return toFrontendMicrosite(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.microsites.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.microsites.bySlug(data.slug),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.microsites.mine,
      });
    },
  });
}

// ─── V3: Docs (help center / knowledge base) ────────────────────────────────

export function useListDocs() {
  const { actor, isFetching } = useBackend();
  return useQuery<Doc[]>({
    queryKey: marketplaceKeys.docs.all,
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listDocs();
      return result.map(toFrontendDoc);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDoc(docId: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Doc | null>({
    queryKey: marketplaceKeys.docs.detail(docId ?? ""),
    queryFn: async () => {
      if (!actor || !docId) return null;
      const result = await actor.getDoc(BigInt(docId));
      return result ? toFrontendDoc(result) : null;
    },
    enabled: !!actor && !isFetching && !!docId,
  });
}

export function useGetDocBySlug(slug: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<Doc | null>({
    queryKey: marketplaceKeys.docs.bySlug(slug ?? ""),
    queryFn: async () => {
      if (!actor || !slug) return null;
      const result = await actor.getDocBySlug(slug);
      return result ? toFrontendDoc(result) : null;
    },
    enabled: !!actor && !isFetching && !!slug,
  });
}

export function useCreateDoc() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DocInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.createDoc(toBackendDocInput(input));
      return toFrontendDoc(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.docs.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.docs.bySlug(data.slug),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.docs.all });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.docs.byCategory(data.category),
      });
    },
  });
}

export function useUpdateDoc() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docId,
      input,
    }: {
      docId: string;
      input: DocInput;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.updateDoc(
        BigInt(docId),
        toBackendDocInput(input),
      );
      return toFrontendDoc(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.docs.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.docs.bySlug(data.slug),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.docs.all });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.docs.byCategory(data.category),
      });
    },
  });
}

export function usePublishDoc() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docId,
      status,
    }: {
      docId: string;
      status: import("@/types").DocStatus;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.publishDoc(
        BigInt(docId),
        status as import("@/backend").DocStatus,
      );
      return toFrontendDoc(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.docs.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.docs.bySlug(data.slug),
      });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.docs.all });
    },
  });
}

export function useListDocsByCategory(category: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<Doc[]>({
    queryKey: marketplaceKeys.docs.byCategory(category),
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listDocsByCategory(category);
      return result.map(toFrontendDoc);
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── V3: AI Provider Matching & Search ──────────────────────────────────────

export function useMatchProviders() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: MatchProvidersInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.matchProviders(
        toBackendMatchProvidersInput(input) as BackendMatchProvidersInput,
      );
      return result.map(toFrontendProviderMatch);
    },
  });
}

export function useAiAssistant() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (input: AssistantInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.aiAssistant(input as BackendAssistantInput);
      return toFrontendAssistantMessage(result);
    },
  });
}

export function useAiSearch(searchQuery: string | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<AISearchResult[]>({
    queryKey: marketplaceKeys.ai.search(searchQuery ?? ""),
    queryFn: async () => {
      if (!actor || !searchQuery) return [];
      const result = await actor.aiSearch(searchQuery);
      return result.map(toFrontendAISearchResult);
    },
    enabled: !!actor && !isFetching && !!searchQuery,
  });
}

// ─── V3: AI Review Summary & Provider Insights ──────────────────────────────

export function useGenerateReviewSummary() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.generateReviewSummary(BigInt(providerId));
      return toFrontendReviewSummary(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.ai.reviewSummary(data.providerId),
      });
    },
  });
}

export function useGenerateProviderInsights() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.generateProviderInsights(BigInt(providerId));
      return toFrontendProviderInsights(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: marketplaceKeys.ai.providerInsights(data.providerId),
      });
    },
  });
}
