// Marketplace-core domain types.
// Covers User (customer/provider/admin roles), Provider (company profile,
// verification status, service areas), ServiceCategory (box truck, relocation,
// trash haul, moving), ServiceListing, Booking lifecycle, Review, Message,
// and AvailabilitySlot.
//
// Shared cross-cutting types (UserId, Timestamp) live in types/common.mo and
// are imported from there. This file owns only marketplace-core types.

import Storage "mo:caffeineai-object-storage/Storage";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // ---- Cross-cutting aliases (re-exported for convenience within this domain) ----
  public type UserId = Principal;
  public type Timestamp = Time.Time;

  // ---- Roles ----
  // Marketplace roles layered on top of caffeineai-authorization's #admin/#user/#guest.
  // The authorization extension's #admin role maps to the platform admin; the
  // marketplace-specific provider/customer distinction is tracked here in
  // MarketplaceRole and persisted per-user.
  public type MarketplaceRole = {
    #customer;
    #provider;
    #admin;
  };

  // ---- Service categories ----
  // The four launch categories for the DFW marketplace.
  public type ServiceCategory = {
    #boxTruck;
    #relocation;
    #trashHaul;
    #moving;
  };

  // ---- Writing tone ----
  // Selectable tone for AI copy generation endpoints. Each variant maps to a
  // prompt instruction in lib/openai.mo (toneInstruction). Endpoints that
  // accept a tone take it as `?Tone` so existing callers can omit it; the
  // default (null) falls back to a professional tone.
  public type Tone = {
    #professional;
    #friendly;
    #concise;
  };

  // ---- Verification status (provider governance) ----
  public type VerificationStatus = {
    #pending;
    #approved;
    #rejected;
    #suspended;
  };

  // ---- Booking lifecycle ----
  // requested -> accepted -> scheduled -> in-progress -> completed -> reviewed
  // Any state may transition to #cancelled.
  public type BookingStatus = {
    #requested;
    #accepted;
    #scheduled;
    #inProgress;
    #completed;
    #cancelled;
    #reviewed;
  };

  // ---- Availability ----
  public type SlotStatus = {
    #available;
    #blocked;
  };

  // ---- User ----
  // A platform user. A user may be a customer, a provider, or an admin.
  // The role field is the marketplace-specific role; the underlying
  // caffeineai-authorization role (#admin/#user/#guest) is consulted separately
  // for hard permission gates.
  public type User = {
    principal : UserId;
    role : MarketplaceRole;
    displayName : Text;
    email : ?Text;
    phone : ?Text;
    avatar : ?Storage.ExternalBlob;
    // Work-portfolio photos uploaded by the user for actual work reasons
    // (job-site photos, completed-work evidence, etc.). Each photo can be
    // analyzed by the AI vision endpoints (description, work analysis, safety).
    workPhotos : [Storage.ExternalBlob];
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // ---- Provider ----
  // A provider is a company on the platform. One provider principal owns it;
  // the verification status drives governance (admin approval / suspension).
  public type Provider = {
    id : Nat;
    ownerPrincipal : UserId;
    companyName : Text;
    description : ?Text;
    logo : ?Storage.ExternalBlob;
    serviceCategories : [ServiceCategory];
    serviceAreas : [Text]; // DFW-area city/county names
    verificationStatus : VerificationStatus;
    verificationNote : ?Text; // admin note on approve/reject/suspend
    ratingSum : Nat; // sum of all review ratings for average computation
    ratingCount : Nat;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // ---- Service listing ----
  // A provider's offering within a category. Photos use Storage.ExternalBlob
  // per the object-storage extension contract.
  public type ServiceListing = {
    id : Nat;
    providerId : Nat;
    category : ServiceCategory;
    title : Text;
    description : Text;
    priceCents : Nat; // price in cents to avoid Float rounding
    priceUnit : Text; // e.g. "per hour", "flat", "per load"
    photos : [Storage.ExternalBlob];
    serviceArea : Text;
    active : Bool;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // ---- Booking ----
  // A customer's request for a provider's service. The status field tracks the
  // lifecycle pipeline. jobDetails carries free-form job specifics.
  public type Booking = {
    id : Nat;
    customerId : UserId;
    providerId : Nat;
    listingId : Nat;
    category : ServiceCategory;
    scheduledDate : Text; // ISO date (YYYY-MM-DD)
    scheduledTime : ?Text; // ISO time or window (HH:MM or "09:00-12:00")
    status : BookingStatus;
    jobDetails : Text;
    address : Text;
    customerNote : ?Text;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // ---- Review ----
  // A customer review of a completed booking. A provider may respond once.
  // `hidden` is a soft-hide flag set by admin moderation (#hide); hidden
  // reviews remain in storage so admins can still list and restore them.
  public type Review = {
    id : Nat;
    bookingId : Nat;
    customerId : UserId;
    providerId : Nat;
    rating : Nat; // 1-5
    writtenText : Text;
    providerResponse : ?Text;
    hidden : Bool;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // ---- Message ----
  // A message in a thread tied to a booking. sender is the principal of either
  // the customer or the provider.
  public type Message = {
    id : Nat;
    bookingId : Nat;
    sender : UserId;
    content : Text;
    read : Bool;
    sentAt : Timestamp;
  };

  // ---- Availability slot ----
  // A single date/time slot for a provider. status = #available or #blocked.
  // Recurring templates and blackout dates are explicitly out of scope
  // (doNotBuild) — only individual slots are modeled here.
  public type AvailabilitySlot = {
    id : Nat;
    providerId : Nat;
    date : Text; // ISO date (YYYY-MM-DD)
    time : ?Text; // ISO time or window; null = whole day
    status : SlotStatus;
    createdAt : Timestamp;
  };

  // ---- Input types (for create/update endpoints) ----
  public type UserInput = {
    role : MarketplaceRole;
    displayName : Text;
    email : ?Text;
    phone : ?Text;
    avatar : ?Storage.ExternalBlob;
    workPhotos : [Storage.ExternalBlob];
  };

  public type ProviderInput = {
    companyName : Text;
    description : ?Text;
    logo : ?Storage.ExternalBlob;
    serviceCategories : [ServiceCategory];
    serviceAreas : [Text];
  };

  public type ServiceListingInput = {
    category : ServiceCategory;
    title : Text;
    description : Text;
    priceCents : Nat;
    priceUnit : Text;
    photos : [Storage.ExternalBlob];
    serviceArea : Text;
    active : Bool;
  };

  public type BookingInput = {
    listingId : Nat;
    scheduledDate : Text;
    scheduledTime : ?Text;
    jobDetails : Text;
    address : Text;
    customerNote : ?Text;
  };

  public type ReviewInput = {
    bookingId : Nat;
    rating : Nat; // 1-5
    writtenText : Text;
  };

  public type MessageInput = {
    bookingId : Nat;
    content : Text;
  };

  public type AvailabilitySlotInput = {
    date : Text;
    time : ?Text;
    status : SlotStatus;
  };

  // ---- Search / filter ----
  public type SearchFilters = {
    category : ?ServiceCategory;
    serviceArea : ?Text;
    keyword : ?Text;
    minRating : ?Nat; // 1-5
    maxPriceCents : ?Nat;
    availableOn : ?Text; // ISO date
  };

  public type SearchResult = {
    listing : ServiceListing;
    provider : Provider;
  };
};
