// Visual QA mock backend for the DFW marketplace.
// Implements the MarketplaceActor surface used by hooks/useQueries.ts with
// realistic DFW-area data so every page renders populated content during
// visual testing. Activated by VITE_USE_MOCK=true.

import type { Principal } from "@icp-sdk/core/principal";

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW = BigInt(Date.now());
const DAY = 86_400_000n;
const fakePrincipal: Principal = {
  toString: () =>
    "2vxsx-faeaaa-aaaaq-aaaca-cai",
  toUint8Array: () => new Uint8Array(29),
  isAnonymous: () => false,
} as unknown as Principal;

// ─── Mock data ──────────────────────────────────────────────────────────────

const mockProviders = [
  {
    id: 1n,
    ownerPrincipal: fakePrincipal,
    companyName: "Lone Star Hauling Co.",
    description:
      "Family-owned box truck and moving service serving Dallas, Plano, and Frisco. Fully insured, on-time guarantee, and careful crews trained for fragile and oversized loads.",
    logo: undefined,
    serviceCategories: ["boxTruck", "moving"] as const,
    serviceAreas: ["Dallas", "Plano", "Frisco", "Richardson"],
    verificationStatus: "approved" as const,
    verificationNote: undefined,
    ratingSum: 47n,
    ratingCount: 10n,
    createdAt: NOW - 90n * DAY,
    updatedAt: NOW - 2n * DAY,
  },
  {
    id: 2n,
    ownerPrincipal: fakePrincipal,
    companyName: "Metro Relocation Experts",
    description:
      "Full-service relocation specialists for homes and offices across the DFW metroplex. Packing, loading, transport, and unpacking with a white-glove touch.",
    logo: undefined,
    serviceCategories: ["relocation", "moving"] as const,
    serviceAreas: ["Fort Worth", "Arlington", "Dallas", "Irving"],
    verificationStatus: "approved" as const,
    verificationNote: undefined,
    ratingSum: 38n,
    ratingCount: 9n,
    createdAt: NOW - 120n * DAY,
    updatedAt: NOW - 5n * DAY,
  },
  {
    id: 3n,
    ownerPrincipal: fakePrincipal,
    companyName: "Clean Sweep Trash Haul",
    description:
      "Same-day trash and junk haul for residential and commercial properties. Construction debris, appliance removal, and estate cleanouts across Tarrant County.",
    logo: undefined,
    serviceCategories: ["trashHaul"] as const,
    serviceAreas: ["Fort Worth", "Arlington", "Bedford", "Euless"],
    verificationStatus: "pending" as const,
    verificationNote: undefined,
    ratingSum: 22n,
    ratingCount: 5n,
    createdAt: NOW - 30n * DAY,
    updatedAt: NOW - 1n * DAY,
  },
  {
    id: 4n,
    ownerPrincipal: fakePrincipal,
    companyName: "Big D Box Truck Bros",
    description:
      "Box truck rentals with driver for furniture delivery, appliance moves, and small loads. Hourly and flat-rate pricing across North Dallas suburbs.",
    logo: undefined,
    serviceCategories: ["boxTruck"] as const,
    serviceAreas: ["Dallas", "Plano", "Garland", "Mesquite"],
    verificationStatus: "approved" as const,
    verificationNote: undefined,
    ratingSum: 29n,
    ratingCount: 7n,
    createdAt: NOW - 60n * DAY,
    updatedAt: NOW - 3n * DAY,
  },
];

const mockListings = [
  {
    id: 101n,
    providerId: 1n,
    category: "boxTruck" as const,
    title: "26ft Box Truck — Local DFW Moves",
    description:
      "Clean 26ft box truck with liftgate and two trained movers. Perfect for 1-3 bedroom homes. Includes furniture blankets, straps, and dollies.",
    priceCents: 12000n,
    priceUnit: "hour" as const,
    photos: [],
    serviceArea: "Dallas",
    active: true,
    createdAt: NOW - 45n * DAY,
    updatedAt: NOW - 2n * DAY,
  },
  {
    id: 102n,
    providerId: 1n,
    category: "moving" as const,
    title: "Full-Service Home Moving — Dallas & Plano",
    description:
      "End-to-end moving: packing, loading, transport, and unpacking. Insured up to $50,000. Free in-home estimates for moves over 50 miles.",
    priceCents: 45000n,
    priceUnit: "job" as const,
    photos: [],
    serviceArea: "Plano",
    active: true,
    createdAt: NOW - 40n * DAY,
    updatedAt: NOW - 4n * DAY,
  },
  {
    id: 103n,
    providerId: 2n,
    category: "relocation" as const,
    title: "Office Relocation — DFW Metroplex",
    description:
      "Weekend and after-hours office moves to minimize downtime. IT equipment handling, cubicle disassembly, and floor-plan setup at destination.",
    priceCents: 85000n,
    priceUnit: "job" as const,
    photos: [],
    serviceArea: "Fort Worth",
    active: true,
    createdAt: NOW - 35n * DAY,
    updatedAt: NOW - 6n * DAY,
  },
  {
    id: 104n,
    providerId: 3n,
    category: "trashHaul" as const,
    title: "Junk & Debris Haul — Same Day",
    description:
      "Construction debris, appliances, furniture, and estate cleanouts. We sort for donation and recycling. Flat fee includes dump fees.",
    priceCents: 18000n,
    priceUnit: "load" as const,
    photos: [],
    serviceArea: "Fort Worth",
    active: true,
    createdAt: NOW - 20n * DAY,
    updatedAt: NOW - 1n * DAY,
  },
  {
    id: 105n,
    providerId: 4n,
    category: "boxTruck" as const,
    title: "Box Truck with Driver — Hourly",
    description:
      "16ft box truck with experienced driver for furniture, appliances, and small loads. You load, we drive. Two-hour minimum.",
    priceCents: 7500n,
    priceUnit: "hour" as const,
    photos: [],
    serviceArea: "Dallas",
    active: true,
    createdAt: NOW - 15n * DAY,
    updatedAt: NOW - 3n * DAY,
  },
];

const mockBookings = [
  {
    id: 1001n,
    customerId: fakePrincipal,
    providerId: 1n,
    listingId: 101n,
    category: "boxTruck" as const,
    scheduledDate: "2026-08-15",
    scheduledTime: "09:00",
    status: "scheduled" as const,
    jobDetails: "Move 2-bedroom apartment from Uptown Dallas to Plano. Includes couch, bed, dining set, and ~30 boxes.",
    address: "1234 McKinney Ave, Dallas, TX 75204",
    customerNote: "Elevator reserved 9am-12pm. Parking permit obtained for moving truck.",
    createdAt: NOW - 7n * DAY,
    updatedAt: NOW - 5n * DAY,
  },
  {
    id: 1002n,
    customerId: fakePrincipal,
    providerId: 2n,
    listingId: 103n,
    category: "relocation" as const,
    scheduledDate: "2026-08-22",
    scheduledTime: "",
    status: "requested" as const,
    jobDetails: "Relocate 8-person office from Fort Worth to Arlington. 12 desks, server rack, and conference table.",
    address: "500 Commerce St, Fort Worth, TX 76102",
    customerNote: undefined,
    createdAt: NOW - 2n * DAY,
    updatedAt: NOW - 2n * DAY,
  },
  {
    id: 1003n,
    customerId: fakePrincipal,
    providerId: 3n,
    listingId: 104n,
    category: "trashHaul" as const,
    scheduledDate: "2026-07-30",
    scheduledTime: "14:00",
    status: "completed" as const,
    jobDetails: "Estate cleanout — remove sofa, mattress, appliances, and 15 bags of household junk.",
    address: "88 Oak St, Bedford, TX 76021",
    customerNote: "Items in garage, ready for pickup.",
    createdAt: NOW - 25n * DAY,
    updatedAt: NOW - 22n * DAY,
  },
  {
    id: 1004n,
    customerId: fakePrincipal,
    providerId: 1n,
    listingId: 102n,
    category: "moving" as const,
    scheduledDate: "2026-08-10",
    scheduledTime: "08:00",
    status: "inProgress" as const,
    jobDetails: "Full-service move — 3-bedroom house in Plano to Frisco. Packing included.",
    address: "4567 Legacy Dr, Plano, TX 75024",
    customerNote: "Fragile items marked with red stickers. Piano needs special handling.",
    createdAt: NOW - 10n * DAY,
    updatedAt: NOW - 1n * DAY,
  },
];

const mockReviews = [
  {
    id: 201n,
    bookingId: 1003n,
    customerId: fakePrincipal,
    providerId: 3n,
    rating: 5n,
    writtenText: "Clean Sweep was incredible — arrived early, hauled everything fast, and even swept the garage before leaving. Will use again for our next cleanout.",
    providerResponse: "Thank you! We appreciate the kind words and the tip. Call us anytime.",
    createdAt: NOW - 21n * DAY,
    updatedAt: NOW - 20n * DAY,
  },
  {
    id: 202n,
    bookingId: 1001n,
    customerId: fakePrincipal,
    providerId: 1n,
    rating: 5n,
    writtenText: "Lone Star Hauling made our apartment move stress-free. Crew was professional, careful with our furniture, and finished under the time estimate.",
    providerResponse: undefined,
    createdAt: NOW - 4n * DAY,
    updatedAt: NOW - 4n * DAY,
  },
  {
    id: 203n,
    bookingId: 1002n,
    customerId: fakePrincipal,
    providerId: 2n,
    rating: 4n,
    writtenText: "Metro Relocation handled our office move well. A few boxes got mixed up but they sorted it out the same day. Overall solid experience.",
    providerResponse: "Thanks for the feedback — we've updated our labeling process to prevent mix-ups.",
    createdAt: NOW - 1n * DAY,
    updatedAt: NOW - 1n * DAY,
  },
];

const mockMessages = [
  {
    id: 301n,
    bookingId: 1001n,
    sender: fakePrincipal,
    content: "Hi! Confirming our move for August 15th at 9am. The elevator is reserved until noon.",
    read: true,
    sentAt: NOW - 6n * DAY,
  },
  {
    id: 302n,
    bookingId: 1001n,
    sender: fakePrincipal,
    content: "Great, thanks for the heads up. We'll bring an extra dolly for the heavier items. See you at 9!",
    read: true,
    sentAt: NOW - 6n * DAY + 3600n,
  },
  {
    id: 303n,
    bookingId: 1001n,
    sender: fakePrincipal,
    content: "Quick question — is there a loading dock or will we need a parking permit for the truck?",
    read: false,
    sentAt: NOW - 1n * DAY,
  },
];

const mockSlots = [
  {
    id: 501n,
    providerId: 1n,
    date: "2026-08-15",
    time: "09:00",
    status: "blocked" as const,
    createdAt: NOW - 7n * DAY,
  },
  {
    id: 502n,
    providerId: 1n,
    date: "2026-08-16",
    time: "10:00",
    status: "available" as const,
    createdAt: NOW - 7n * DAY,
  },
  {
    id: 503n,
    providerId: 1n,
    date: "2026-08-17",
    time: "",
    status: "available" as const,
    createdAt: NOW - 7n * DAY,
  },
];

const mockUser = {
  principal: fakePrincipal,
  role: "customer" as const,
  displayName: "Jordan Avery",
  email: "jordan.avery@example.com",
  phone: "+1 (214) 555-0142",
  avatar: undefined,
  createdAt: NOW - 100n * DAY,
  updatedAt: NOW - 10n * DAY,
};

const mockUsers = [
  mockUser,
  {
    principal: fakePrincipal,
    role: "provider" as const,
    displayName: "Marcus Bell",
    email: "marcus@lonestarhauling.example",
    phone: "+1 (214) 555-0188",
    avatar: undefined,
    createdAt: NOW - 90n * DAY,
    updatedAt: NOW - 5n * DAY,
  },
  {
    principal: fakePrincipal,
    role: "admin" as const,
    displayName: "Platform Admin",
    email: "admin@dfwhaul.example",
    phone: undefined,
    avatar: undefined,
    createdAt: NOW - 200n * DAY,
    updatedAt: NOW - 1n * DAY,
  },
];

// ─── Mock actor ─────────────────────────────────────────────────────────────

function findProvider(id: bigint) {
  return mockProviders.find((p) => p.id === id) ?? null;
}
function findListing(id: bigint) {
  return mockListings.find((l) => l.id === id) ?? null;
}
function findBooking(id: bigint) {
  return mockBookings.find((b) => b.id === id) ?? null;
}

export const mockBackend = {
  // User
  getMyUser: async () => mockUser,
  getUser: async (_userId: Principal) => mockUser,
  upsertMyUser: async (input: any) => ({ ...mockUser, ...input, updatedAt: NOW }),
  listUsers: async () => mockUsers,

  // Provider
  getMyProvider: async () => findProvider(1n),
  getProvider: async (providerId: bigint) => findProvider(providerId),
  registerProvider: async (input: any) => ({
    id: 99n,
    ownerPrincipal: fakePrincipal,
    ratingSum: 0n,
    ratingCount: 0n,
    verificationStatus: "pending" as const,
    verificationNote: undefined,
    logo: undefined,
    createdAt: NOW,
    updatedAt: NOW,
    ...input,
  }),
  updateMyProvider: async (input: any) => ({ ...findProvider(1n), ...input, updatedAt: NOW }),
  listProviders: async () => mockProviders,
  listProvidersByCategory: async (category: any) =>
    mockProviders.filter((p) =>
      (p.serviceCategories as readonly string[]).includes(category),
    ),

  // Listings
  getListing: async (listingId: bigint) => findListing(listingId),
  createListing: async (input: any) => ({
    id: 999n,
    providerId: 1n,
    active: true,
    photos: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...input,
  }),
  updateListing: async (listingId: bigint, input: any) => ({
    ...findListing(listingId),
    ...input,
    updatedAt: NOW,
  }),
  deleteListing: async (_listingId: bigint) => undefined,
  listListingsByProvider: async (providerId: bigint) =>
    mockListings.filter((l) => l.providerId === providerId),
  listListingsByCategory: async (category: any) =>
    mockListings.filter((l) => l.category === category),

  // Bookings
  createBooking: async (input: any) => ({
    id: 9999n,
    customerId: fakePrincipal,
    providerId: findListing(input.listingId)?.providerId ?? 1n,
    status: "requested" as const,
    createdAt: NOW,
    updatedAt: NOW,
    ...input,
  }),
  acceptBooking: async (bookingId: bigint) => ({
    ...findBooking(bookingId),
    status: "accepted" as const,
    updatedAt: NOW,
  }),
  declineBooking: async (bookingId: bigint) => ({
    ...findBooking(bookingId),
    status: "cancelled" as const,
    updatedAt: NOW,
  }),
  cancelBooking: async (bookingId: bigint) => ({
    ...findBooking(bookingId),
    status: "cancelled" as const,
    updatedAt: NOW,
  }),
  startBooking: async (bookingId: bigint) => ({
    ...findBooking(bookingId),
    status: "inProgress" as const,
    updatedAt: NOW,
  }),
  completeBooking: async (bookingId: bigint) => ({
    ...findBooking(bookingId),
    status: "completed" as const,
    updatedAt: NOW,
  }),
  scheduleBooking: async (bookingId: bigint) => ({
    ...findBooking(bookingId),
    status: "scheduled" as const,
    updatedAt: NOW,
  }),
  listMyBookings: async () => mockBookings,
  listProviderBookings: async (providerId: bigint) =>
    mockBookings.filter((b) => b.providerId === providerId),

  // Reviews
  createReview: async (input: any) => ({
    id: 999n,
    customerId: fakePrincipal,
    providerId: findBooking(input.bookingId)?.providerId ?? 1n,
    createdAt: NOW,
    updatedAt: NOW,
    providerResponse: undefined,
    ...input,
  }),
  respondToReview: async (reviewId: bigint, response: string) => ({
    ...mockReviews.find((r) => r.id === reviewId),
    providerResponse: response,
    updatedAt: NOW,
  }),
  listReviewsByProvider: async (providerId: bigint) =>
    mockReviews.filter((r) => r.providerId === providerId),
  listReviewsByBooking: async (bookingId: bigint) =>
    mockReviews.filter((r) => r.bookingId === bookingId),
  moderateReview: async (reviewId: bigint, _action: any) =>
    mockReviews.find((r) => r.id === reviewId) ?? mockReviews[0],

  // Messaging
  getThread: async (bookingId: bigint) =>
    mockMessages.filter((m) => m.bookingId === bookingId),
  sendMessage: async (input: any) => ({
    id: 999n,
    sender: fakePrincipal,
    read: false,
    sentAt: NOW,
    ...input,
  }),
  markThreadRead: async (_bookingId: bigint) => undefined,
  getUnreadMessageCount: async (_bookingId: bigint) => 1n,

  // Availability
  setAvailabilitySlot: async (input: any) => ({
    id: 999n,
    providerId: 1n,
    createdAt: NOW,
    ...input,
  }),
  blockAvailabilitySlot: async (slotId: bigint) => ({
    ...mockSlots.find((s) => s.id === slotId),
    status: "blocked" as const,
  }),
  checkAvailability: async (_providerId: bigint, _date: string, _time: string | null) => true,
  listAvailabilitySlots: async (providerId: bigint) =>
    mockSlots.filter((s) => s.providerId === providerId),

  // Search + admin
  searchProviders: async (filters: any) => {
    let results = mockListings.map((listing) => ({
      listing,
      provider: findProvider(listing.providerId),
    }));
    if (filters?.category) {
      results = results.filter((r) => r.listing.category === filters.category);
    }
    if (filters?.serviceArea) {
      results = results.filter(
        (r) =>
          r.listing.serviceArea === filters.serviceArea ||
          r.provider?.serviceAreas.includes(filters.serviceArea),
      );
    }
    if (filters?.keyword) {
      const kw = filters.keyword.toLowerCase();
      results = results.filter(
        (r) =>
          r.listing.title.toLowerCase().includes(kw) ||
          r.listing.description.toLowerCase().includes(kw) ||
          r.provider?.companyName.toLowerCase().includes(kw),
      );
    }
    return results.filter((r) => r.provider !== null);
  },
  approveProvider: async (providerId: bigint) => ({
    ...findProvider(providerId),
    verificationStatus: "approved" as const,
    updatedAt: NOW,
  }),
  rejectProvider: async (providerId: bigint, note: string) => ({
    ...findProvider(providerId),
    verificationStatus: "rejected" as const,
    verificationNote: note,
    updatedAt: NOW,
  }),
  suspendProvider: async (providerId: bigint, note: string) => ({
    ...findProvider(providerId),
    verificationStatus: "suspended" as const,
    verificationNote: note,
    updatedAt: NOW,
  }),
  reinstateProvider: async (providerId: bigint) => ({
    ...findProvider(providerId),
    verificationStatus: "approved" as const,
    verificationNote: undefined,
    updatedAt: NOW,
  }),

  // AI generation tools
  generateListingDescription: async (bulletPoints: string) =>
    `Professional service offering: ${bulletPoints}. Our experienced team ensures reliable, on-time delivery with full insurance coverage. Serving the Dallas-Fort Worth metroplex with competitive rates and a satisfaction guarantee.`,
  generateTitleAndTagline: async (keywords: string) => [
    `Premium DFW ${keywords.split(",")[0]?.trim() ?? "Service"} — Insured & On-Time`,
    `Trusted local pros for your ${keywords.split(",")[0]?.trim() ?? "project"}.`,
  ],
  generatePromotionalContent: async (offerDetails: string) =>
    `Limited-time offer! ${offerDetails}. Book now and save 10% on your first booking. Fully insured, locally owned, and rated 5 stars by DFW customers.`,
};
