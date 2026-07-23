// Migration: add workPhotos field to User.
//
// Users can now store multiple work-portfolio photos on their profile
// ([Storage.ExternalBlob]) so the AI vision endpoints (analyzeImageDescription,
// analyzeImageWork, analyzeImageSafety) can analyze uploaded work photos.
//
// OldActor matches the previous NewActor (20260722_000000.mo). NewActor adds
// the workPhotos field to the inlined User type (existing users get an empty
// workPhotos array on upgrade).
//
// Self-contained: only mo:core/... and caffeineai-authorization imports. All
// types inlined so this frozen migration does not drift if the actor's types
// change in a later version.

import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // ---- Old actor state (matches 20260722_000000 NewActor) ----
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

  // Old User (no workPhotos field).
  type OldUser = {
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
  // New User adds workPhotos : [Blob] (ExternalBlob inlined as Blob).
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
  };

  public func migration(old : OldActor) : NewActor {
    // Add an empty workPhotos array to every existing user; all other state
    // is preserved unchanged.
    let newUsers = Map.empty<Principal, NewUser>();
    old.users.forEach(func(principal, u) {
      newUsers.add(
        principal,
        {
          principal = u.principal;
          role = u.role;
          displayName = u.displayName;
          email = u.email;
          phone = u.phone;
          avatar = u.avatar;
          workPhotos = [];
          createdAt = u.createdAt;
          updatedAt = u.updatedAt;
        },
      );
    });
    {
      accessControlState = old.accessControlState;
      users = newUsers;
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
    };
  };
};
