// Migration: full domain rewrite from HushMap (workspace finder) to the DFW
// service marketplace.
//
// OldActor matches the previous NewActor (HushMap state: accessControlState,
// locations, userProfiles). NewActor lists every stable field declared in the
// new main.mo. The old locations and userProfiles collections are intentionally
// dropped — this is a full domain rewrite, not a feature extension.
//
// Self-contained: only mo:core/... imports. All types inlined.

import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // ---- Old actor state (HushMap) ----
  type NoiseLevel = {
    #Quiet;
    #Moderate;
    #Buzzing;
  };

  type WifiSpeed = {
    #Slow;
    #Okay;
    #Fast;
  };

  type LocationType = {
    #Cafe;
    #Library;
    #CoworkingSpace;
  };

  type Profile = {
    name : Text;
  };

  type Rating = {
    noiseLevel : NoiseLevel;
    wifiSpeed : WifiSpeed;
    description : ?Text;
    userId : Principal;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    editCount : Nat;
  };

  type Location = {
    osmNodeId : Text;
    name : Text;
    locationType : LocationType;
    lat : Float;
    lng : Float;
    address : ?Text;
    ratings : [Rating];
  };

  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    locations : Map.Map<Text, Location>;
    userProfiles : Map.Map<Principal, Profile>;
  };

  // ---- New actor state (DFW marketplace) ----
  // Marketplace-core types are inlined here so this frozen migration does not
  // drift if the actor's types change in a later version.
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

  // ExternalBlob is a Blob alias in the object-storage package; inlined here
  // as Blob so the migration stays self-contained.
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
  };

  public func migration(old : OldActor) : NewActor {
    // Preserve the access-control state (admin role, user roles) across the
    // domain rewrite. All HushMap-specific collections (locations, userProfiles)
    // are intentionally dropped — this is a full marketplace rewrite.
    {
      accessControlState = old.accessControlState;
      users = Map.empty();
      providers = Map.empty();
      listings = Map.empty();
      bookings = Map.empty();
      reviews = Map.empty();
      messages = Map.empty();
      slots = Map.empty();
      nextProviderId = { var value = 1 };
      nextListingId = { var value = 1 };
      nextBookingId = { var value = 1 };
      nextReviewId = { var value = 1 };
      nextMessageId = { var value = 1 };
      nextSlotId = { var value = 1 };
      openAIApiKey = { var value = null };
    };
  };
};
