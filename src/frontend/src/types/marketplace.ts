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

export interface User {
  principal: Principal;
  role: MarketplaceRole;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
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
  photos: string[];
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
