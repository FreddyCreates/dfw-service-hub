// Migration: add emailNotificationsEnabled stable variable.
//
// Admin-gated master toggle for transactional email notifications. When false,
// every email helper skips sending silently. Defaults to true on upgrade.
//
// OldActor matches the previously-deployed NewActor (20260722_055940.mo): all
// marketplace collections, next*Id counters, openAIApiKey, and the User type
// with workPhotos — but NO emailNotificationsEnabled.
//
// NewActor = OldActor + emailNotificationsEnabled : { var value : Bool }.
// The migration function preserves every existing field and sets
// emailNotificationsEnabled = { var value = true }.
//
// Self-contained: only mo:core/... and mo:caffeineai-authorization/...
// imports. All types inlined so this frozen migration does not drift if the
// actor's types change in a later version.

import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // ---- Old actor state (matches 20260722_055940 NewActor) ----
  type ServiceCategory = {
    #boxTruck;
    #relocation;
    #trashHaul;
    #moving;
  };

  type VerificationStatus = {
    #pending;
    #approved;
    #rejected;
    #suspended;
  };

  type BookingStatus = {
    #requested;
    #accepted;
    #scheduled;
    #inProgress;
    #completed;
    #cancelled;
    #reviewed;
  };

  type SlotStatus = {
    #available;
    #blocked;
  };

  type MarketplaceRole = {
    #customer;
    #provider;
    #admin;
  };

  // Old User (with workPhotos field, as deployed by 20260722_055940).
  type OldUser = {
    principal : Principal;
    role : MarketplaceRole;
    displayName : Text;
    email : ?Text;
    phone : ?Text;
    avatar : ?Blob;
    workPhotos : [Blob];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Provider = {
    id : Nat;
    ownerPrincipal : Principal;
    companyName : Text;
    description : ?Text;
    logo : ?Blob;
    serviceCategories : [ServiceCategory];
    serviceAreas : [Text];
    verificationStatus : VerificationStatus;
    verificationNote : ?Text;
    ratingSum : Nat;
    ratingCount : Nat;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type ServiceListing = {
    id : Nat;
    providerId : Nat;
    category : ServiceCategory;
    title : Text;
    description : Text;
    priceCents : Nat;
    priceUnit : Text;
    photos : [Blob];
    serviceArea : Text;
    active : Bool;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Booking = {
    id : Nat;
    customerId : Principal;
    providerId : Nat;
    listingId : Nat;
    category : ServiceCategory;
    scheduledDate : Text;
    scheduledTime : ?Text;
    status : BookingStatus;
    jobDetails : Text;
    address : Text;
    customerNote : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Review = {
    id : Nat;
    bookingId : Nat;
    customerId : Principal;
    providerId : Nat;
    rating : Nat;
    writtenText : Text;
    providerResponse : ?Text;
    hidden : Bool;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Message = {
    id : Nat;
    bookingId : Nat;
    sender : Principal;
    content : Text;
    read : Bool;
    sentAt : Time.Time;
  };

  type AvailabilitySlot = {
    id : Nat;
    providerId : Nat;
    date : Text;
    time : ?Text;
    status : SlotStatus;
    createdAt : Time.Time;
  };

  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    users : Map.Map<Principal, OldUser>;
    providers : Map.Map<Nat, Provider>;
    listings : Map.Map<Nat, ServiceListing>;
    bookings : Map.Map<Nat, Booking>;
    reviews : Map.Map<Nat, Review>;
    messages : Map.Map<Nat, Message>;
    slots : Map.Map<Nat, AvailabilitySlot>;
    nextProviderId : { var value : Nat };
    nextListingId : { var value : Nat };
    nextBookingId : { var value : Nat };
    nextReviewId : { var value : Nat };
    nextMessageId : { var value : Nat };
    nextSlotId : { var value : Nat };
    openAIApiKey : { var value : ?Text };
  };

  // ---- New actor state ----
  // NewUser is unchanged from OldUser (workPhotos already present).
  type NewUser = {
    principal : Principal;
    role : MarketplaceRole;
    displayName : Text;
    email : ?Text;
    phone : ?Text;
    avatar : ?Blob;
    workPhotos : [Blob];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    users : Map.Map<Principal, NewUser>;
    providers : Map.Map<Nat, Provider>;
    listings : Map.Map<Nat, ServiceListing>;
    bookings : Map.Map<Nat, Booking>;
    reviews : Map.Map<Nat, Review>;
    messages : Map.Map<Nat, Message>;
    slots : Map.Map<Nat, AvailabilitySlot>;
    nextProviderId : { var value : Nat };
    nextListingId : { var value : Nat };
    nextBookingId : { var value : Nat };
    nextReviewId : { var value : Nat };
    nextMessageId : { var value : Nat };
    nextSlotId : { var value : Nat };
    openAIApiKey : { var value : ?Text };
    emailNotificationsEnabled : { var value : Bool };
  };

  public func migration(old : OldActor) : NewActor {
    // Preserve every existing field unchanged; initialize the new
    // emailNotificationsEnabled toggle to true (notifications on by default).
    {
      accessControlState = old.accessControlState;
      users = old.users;
      providers = old.providers;
      listings = old.listings;
      bookings = old.bookings;
      reviews = old.reviews;
      messages = old.messages;
      slots = old.slots;
      nextProviderId = old.nextProviderId;
      nextListingId = old.nextListingId;
      nextBookingId = old.nextBookingId;
      nextReviewId = old.nextReviewId;
      nextMessageId = old.nextMessageId;
      nextSlotId = old.nextSlotId;
      openAIApiKey = old.openAIApiKey;
      emailNotificationsEnabled = { var value = true };
    };
  };
};
