// Migration: add V3 embedded-protocol and intelligence-layer stable state.
//
// Adds the new collections, ID counters required by the V3 contracts domain:
//   - disputes : Map<Nat, Dispute>
//   - communityReports : Map<Nat, CommunityReport>
//   - rewards : Map<UserId, RewardProfile>
//   - rewardLedger : Map<Nat, RewardLedgerEntry>
//   - referrals : Map<Nat, Referral>
//   - microsites : Map<Nat, Microsite>
//   - docs : Map<Nat, Doc>
//   - assistantSessions : Map<UserId, [AssistantMessage]>
//   - nextDisputeId, nextReportId, nextRewardLedgerId, nextReferralId,
//     nextMicrositeId, nextDocId (each { var value : Nat })
//
// OldActor matches the previously-deployed NewActor (20260723_151031.mo): all
// marketplace collections, next*Id counters, openAIApiKey, and
// emailNotificationsEnabled — but NONE of the V3 collections/counters.
//
// NewActor = OldActor + the eight new collections + the six new counters.
// The migration function preserves every existing field and initializes each
// new collection to Map.empty() and each new counter to { var value = 1 }
// (ID counters start at 1, matching the existing convention).
//
// Self-contained: only mo:core/... and mo:caffeineai-authorization/...
// imports. All types inlined so this frozen migration does not drift if the
// actor's types change in a later version.

import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // ---- Old actor state (matches 20260723_151031 NewActor) ----
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
    emailNotificationsEnabled : { var value : Bool };
  };

  // ---- New actor state ----
  // New V3 collection types, inlined. NewUser is unchanged from OldUser.
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

  // V3 verification-tier types (multi-tier provider verification protocol).
  // Stored in a dedicated providerVerifications collection keyed by providerId
  // (the Provider record itself is unchanged — adding a field to it would
  // require editing the frozen earlier migrations' Provider type).
  type VerificationTierStatus = {
    #unverified;
    #pending;
    #approved;
    #rejected;
    #expired;
  };

  type VerificationTierRecord = {
    status : VerificationTierStatus;
    verifiedAt : ?Time.Time;
    note : ?Text;
  };

  type VerificationTiers = {
    identity : VerificationTierRecord;
    business : VerificationTierRecord;
    insurance : VerificationTierRecord;
    background : VerificationTierRecord;
  };

  // V3 dispute types.
  type DisputeStatus = {
    #open;
    #responded;
    #resolved;
    #escalated;
  };

  type Dispute = {
    id : Nat;
    bookingId : Nat;
    openedBy : Principal;
    reason : Text;
    status : DisputeStatus;
    providerResponse : ?Text;
    adminResolution : ?Text;
    aiTriageSuggestion : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // V3 community report types.
  type ReportTargetType = {
    #provider;
    #listing;
    #review;
    #user;
  };

  type ReportStatus = {
    #open;
    #reviewing;
    #resolved;
    #dismissed;
  };

  type CommunityReport = {
    id : Nat;
    targetType : ReportTargetType;
    targetId : Text;
    reporter : Principal;
    reason : Text;
    status : ReportStatus;
    resolutionNote : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // V3 rewards types.
  type RewardTier = {
    #bronze;
    #silver;
    #gold;
    #platinum;
  };

  type RewardProfile = {
    userId : Principal;
    points : Nat;
    tier : RewardTier;
    badges : [Text];
    streak : Nat;
    referralCode : Text;
    updatedAt : Time.Time;
  };

  type RewardLedgerEntry = {
    id : Nat;
    userId : Principal;
    points : Nat;
    reason : Text;
    timestamp : Time.Time;
  };

  // V3 referral types.
  type ReferralStatus = {
    #pending;
    #awarded;
    #expired;
  };

  type Referral = {
    id : Nat;
    referrer : Principal;
    referee : Principal;
    status : ReferralStatus;
    awardedAt : ?Time.Time;
    createdAt : Time.Time;
  };

  // V3 microsite type.
  type Microsite = {
    id : Nat;
    providerId : Nat;
    slug : Text;
    heroCopy : Text;
    aboutCopy : Text;
    servicesCopy : Text;
    coverImage : ?Blob;
    accentColor : ?Text;
    blockOrder : [Text];
    generatedAt : ?Time.Time;
    published : Bool;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // V3 doc types.
  type DocStatus = {
    #draft;
    #published;
  };

  type Doc = {
    id : Nat;
    title : Text;
    slug : Text;
    category : Text;
    content : Text;
    status : DocStatus;
    readingTime : Nat;
    updatedAt : Time.Time;
    author : Principal;
    createdAt : Time.Time;
  };

  // V3 AI assistant types.
  type AssistantRole = {
    #user;
    #assistant;
  };

  type AssistantMessage = {
    role : AssistantRole;
    content : Text;
    timestamp : Time.Time;
    context : ?Text;
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
    // V3 collections.
    disputes : Map.Map<Nat, Dispute>;
    communityReports : Map.Map<Nat, CommunityReport>;
    rewards : Map.Map<Principal, RewardProfile>;
    rewardLedger : Map.Map<Nat, RewardLedgerEntry>;
    referrals : Map.Map<Nat, Referral>;
    microsites : Map.Map<Nat, Microsite>;
    docs : Map.Map<Nat, Doc>;
    assistantSessions : Map.Map<Principal, [AssistantMessage]>;
    // V3 verification tiers (multi-tier provider verification protocol).
    providerVerifications : Map.Map<Nat, VerificationTiers>;
    // V3 ID counters.
    nextDisputeId : { var value : Nat };
    nextReportId : { var value : Nat };
    nextRewardLedgerId : { var value : Nat };
    nextReferralId : { var value : Nat };
    nextMicrositeId : { var value : Nat };
    nextDocId : { var value : Nat };
  };

  public func migration(old : OldActor) : NewActor {
    // Preserve every existing field unchanged; initialize each new collection
    // to Map.empty() and each new ID counter to { var value = 1 } (counters
    // start at 1, matching the existing convention).
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
      emailNotificationsEnabled = old.emailNotificationsEnabled;
      // V3 collections — empty on upgrade.
      disputes = Map.empty();
      communityReports = Map.empty();
      rewards = Map.empty();
      rewardLedger = Map.empty();
      referrals = Map.empty();
      microsites = Map.empty();
      docs = Map.empty();
      assistantSessions = Map.empty();
      // V3 verification tiers — empty on upgrade (providers start unverified
      // across all four tiers; tiers are populated lazily by
      // updateVerificationTier).
      providerVerifications = Map.empty();
      // V3 ID counters — start at 1.
      nextDisputeId = { var value = 1 };
      nextReportId = { var value = 1 };
      nextRewardLedgerId = { var value = 1 };
      nextReferralId = { var value = 1 };
      nextMicrositeId = { var value = 1 };
      nextDocId = { var value = 1 };
    };
  };
};
