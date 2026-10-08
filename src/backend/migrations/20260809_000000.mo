// Migration: add the identity-attributes layer to the DFW marketplace.
//
// OldActor matches the NewActor of migrations/20260722_000000.mo (the deployed
// marketplace state). NewActor adds a single new stable field — `identities` —
// keyed by Principal. All existing marketplace state (accessControlState, the 7
// stable Map collections, all ID counters, openAIApiKey) is preserved exactly.
//
// Self-contained: only mo:core/... and mo:caffeineai-authorization/... imports.
// All types inlined so this frozen migration does not drift if the actor's
// types change in a later version.

import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // ---- Old actor state (DFW marketplace, pre-auth-domain) ----
  // Inlined from migrations/20260722_000000.mo's NewActor.
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

  type User = {
    principal : Principal;
    role : MarketplaceRole;
    displayName : Text;
    email : ?Text;
    phone : ?Text;
    avatar : ?Blob;
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
    users : Map.Map<Principal, User>;
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

  // ---- New actor state (DFW marketplace + identity-attributes layer) ----
  // IdentityAttributes is inlined here so this frozen migration does not drift.
  type IdentitySource = {
    #internetIdentity;
    #google;
    #email;
  };

  type IdentityAttributes = {
    principal : Principal;
    displayName : ?Text;
    email : ?Text;
    source : IdentitySource;
    firstSeenAt : Nat;
    lastSeenAt : Nat;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    users : Map.Map<Principal, User>;
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
    identities : Map.Map<Principal, IdentityAttributes>;
  };

  public func migration(old : OldActor) : NewActor {
    // Preserve every existing field exactly; seed the new identities collection
    // empty. Existing marketplace users will have their identity attributes
    // recorded on their next sign-in (the MixinAuthorization callback fires
    // once per sign-in with the verified attribute bundle).
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
      identities = Map.empty();
    };
  };
};
