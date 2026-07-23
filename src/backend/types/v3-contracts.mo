// V3 contracts domain types.
//
// Embedded-protocol and intelligence-layer types for the matured marketplace:
//   - Trust & verification: VerificationTier (identity/business/insurance/
//     background, each with status+date), TrustScore breakdown
//   - Disputes: Dispute (booking-scoped, lifecycle open->responded->resolved
//     or escalated, with AI triage suggestion)
//   - Community reports: CommunityReport (targetType, targetId, reporter,
//     reason, status)
//   - Rewards / loyalty / gamification: RewardProfile (points, tier, badges,
//     streak, referralCode), RewardLedgerEntry (points, reason, timestamp),
//     Referral (referrer, referee, status, awardedAt)
//   - Microsites: Microsite (provider-scoped, slug, copy blocks, cover image,
//     accent color, block order, generatedAt, published)
//   - Docs: Doc (title, slug, category, content, status draft/published,
//     readingTime, updatedAt, author)
//   - AI assistant: AssistantMessage (role user/assistant, content, timestamp,
//     context)
//
// NOTE: Points redemption for booking discounts or gift cards is explicitly
// out of scope (doNotBuild) and is NOT modeled here. Provider team accounts
// with multiple staff logins are also out of scope and not modeled.
//
// Shared cross-cutting types (UserId, Timestamp) are re-exported from
// types/marketplace-core.mo for convenience within this domain.

import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // ---- Cross-cutting aliases (re-exported for convenience within this domain) ----
  public type UserId = Principal;
  public type Timestamp = Time.Time;

  // ---- Verification tiers (trust protocol) ----
  // A provider may be verified across four independent tiers. Each tier carries
  // its own status and the timestamp at which it was last evaluated. The
  // VerificationTierStatus is shared across all four tiers.
  public type VerificationTierStatus = {
    #unverified;
    #pending;
    #approved;
    #rejected;
    #expired;
  };

  // A single verification tier record. `verifiedAt` is the timestamp of the
  // most recent status change (approved/rejected/expired); null while pending
  // or unverified. `note` carries an optional admin or evaluator note.
  public type VerificationTierRecord = {
    status : VerificationTierStatus;
    verifiedAt : ?Timestamp;
    note : ?Text;
  };

  // The four verification tiers. Each field is a tier record. A provider's
  // overall verification standing is the combination of these four tiers.
  public type VerificationTiers = {
    identity : VerificationTierRecord;
    business : VerificationTierRecord;
    insurance : VerificationTierRecord;
    background : VerificationTierRecord;
  };

  // ---- Trust score (trust protocol) ----
  // A composite trust score broken down by contributing factor. The overall
  // score is a 0-100 integer; the breakdown lets the UI and the AI layer
  // explain WHY a provider is trusted. Each component is a 0-100 integer.
  public type TrustScore = {
    overall : Nat; // 0-100 composite
    verification : Nat; // contribution from verification tiers
    reviews : Nat; // contribution from review volume + ratings
    responsiveness : Nat; // contribution from booking response time
    disputeHistory : Nat; // contribution from dispute outcomes
    longevity : Nat; // contribution from time on platform
    updatedAt : Timestamp;
  };

  // ---- Disputes (dispute protocol) ----
  // A dispute is opened against a booking by one of its participants. The
  // lifecycle is: open -> responded (provider has responded) -> resolved
  // (admin resolution) OR escalated (could not be resolved, escalated). The
  // aiTriageSuggestion carries an AI-generated triage recommendation (e.g.
  // suggested severity, suggested resolution path) populated by the
  // triageDispute AI endpoint.
  public type DisputeStatus = {
    #open;
    #responded;
    #resolved;
    #escalated;
  };

  public type Dispute = {
    id : Nat;
    bookingId : Nat;
    openedBy : UserId; // the principal who opened the dispute
    reason : Text;
    status : DisputeStatus;
    providerResponse : ?Text; // the provider's response (set on #responded)
    adminResolution : ?Text; // the admin's resolution text (set on #resolved)
    aiTriageSuggestion : ?Text; // AI-generated triage recommendation
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // Input for opening a dispute.
  public type DisputeInput = {
    bookingId : Nat;
    reason : Text;
  };

  // ---- Community reports (accountability protocol) ----
  // A community report flags a target (a provider, listing, review, or user)
  // for moderation. targetType identifies what kind of entity is flagged;
  // targetId is the entity's identifier (provider/listing/review id, or the
  // user principal rendered as Text for user targets).
  public type ReportTargetType = {
    #provider;
    #listing;
    #review;
    #user;
  };

  public type ReportStatus = {
    #open;
    #reviewing;
    #resolved;
    #dismissed;
  };

  public type CommunityReport = {
    id : Nat;
    targetType : ReportTargetType;
    targetId : Text; // Nat rendered as Text, or principal.toText() for users
    reporter : UserId;
    reason : Text;
    status : ReportStatus;
    resolutionNote : ?Text;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  public type CommunityReportInput = {
    targetType : ReportTargetType;
    targetId : Text;
    reason : Text;
  };

  // ---- Rewards / loyalty / gamification ----
  // A RewardProfile tracks a user's loyalty standing. Points are earned via
  // the RewardLedger and never spent on booking discounts or gift cards
  // (doNotBuild). Tier is a loyalty band derived from points; badges are
  // earned achievements; streak tracks consecutive active periods; referralCode
  // is the user's shareable referral code.
  public type RewardTier = {
    #bronze;
    #silver;
    #gold;
    #platinum;
  };

  public type RewardProfile = {
    userId : UserId;
    points : Nat;
    tier : RewardTier;
    badges : [Text]; // earned badge identifiers
    streak : Nat; // consecutive active periods (e.g. days/weeks)
    referralCode : Text; // user's shareable referral code
    updatedAt : Timestamp;
  };

  // A single ledger entry recording a points change (award or adjustment).
  // `reason` is a short machine-readable reason code (e.g. "booking_completed",
  // "review_left", "referral_signed_up"). Points are always non-negative; the
  // ledger records awards only (no redemptions — doNotBuild).
  public type RewardLedgerEntry = {
    id : Nat;
    userId : UserId;
    points : Nat;
    reason : Text;
    timestamp : Timestamp;
  };

  // ---- Referrals (rewards protocol) ----
  // A referral links a referrer to a referee. Status tracks the referral
  // lifecycle: pending (referee signed up via code) -> awarded (referee
  // completed a qualifying action, points granted to referrer).
  public type ReferralStatus = {
    #pending;
    #awarded;
    #expired;
  };

  public type Referral = {
    id : Nat;
    referrer : UserId;
    referee : UserId;
    status : ReferralStatus;
    awardedAt : ?Timestamp;
    createdAt : Timestamp;
  };

  // ---- Microsites (provider marketing) ----
  // A microsite is a provider's customizable public landing page. The copy
  // blocks (heroCopy, aboutCopy, servicesCopy) can be AI-generated via the
  // generateMicrosite endpoint. blockOrder is the ordered list of section
  // identifiers controlling display order. published toggles public visibility.
  public type Microsite = {
    id : Nat;
    providerId : Nat;
    slug : Text; // URL slug, unique per microsite
    heroCopy : Text;
    aboutCopy : Text;
    servicesCopy : Text;
    coverImage : ?Blob; // object-storage reference (ExternalBlob stored as Blob)
    accentColor : ?Text; // hex color string, e.g. "#1a2b3c"
    blockOrder : [Text]; // ordered section identifiers
    generatedAt : ?Timestamp; // when AI last generated the copy (null = manual)
    published : Bool;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  public type MicrositeInput = {
    slug : Text;
    heroCopy : Text;
    aboutCopy : Text;
    servicesCopy : Text;
    coverImage : ?Blob;
    accentColor : ?Text;
    blockOrder : [Text];
    published : Bool;
  };

  // ---- Docs (help center / knowledge base) ----
  // A Doc is a help-center or knowledge-base article. status is draft or
  // published; only published docs are publicly readable. readingTime is the
  // estimated reading time in seconds (computed at author time).
  public type DocStatus = {
    #draft;
    #published;
  };

  public type Doc = {
    id : Nat;
    title : Text;
    slug : Text; // URL slug, unique per doc
    category : Text;
    content : Text; // markdown or plain text body
    status : DocStatus;
    readingTime : Nat; // estimated seconds
    updatedAt : Timestamp;
    author : UserId; // the principal who authored/last edited the doc
    createdAt : Timestamp;
  };

  public type DocInput = {
    title : Text;
    slug : Text;
    category : Text;
    content : Text;
    status : DocStatus;
  };

  // ---- AI assistant ----
  // A single message in a user's AI assistant conversation. role is user or
  // assistant; content is the message body; context is an optional structured
  // context string (e.g. the page or feature the user was on when they asked).
  public type AssistantRole = {
    #user;
    #assistant;
  };

  public type AssistantMessage = {
    role : AssistantRole;
    content : Text;
    timestamp : Timestamp;
    context : ?Text;
  };

  // ---- AI endpoint input/result types ----
  // matchProviders: AI-ranked provider recommendations for a customer need.
  public type ProviderMatch = {
    providerId : Nat;
    score : Nat; // 0-100 AI relevance score
    rationale : Text; // why this provider was recommended
  };

  public type MatchProvidersInput = {
    need : Text; // free-form customer need description
    category : ?Text; // optional category hint
    serviceArea : ?Text; // optional service-area hint
  };

  // aiSearch: natural-language search over the marketplace.
  public type AISearchResult = {
    listingId : Nat;
    providerId : Nat;
    score : Nat; // 0-100 AI relevance score
    rationale : Text;
  };

  // generateReviewSummary: AI summary of a provider's reviews.
  public type ReviewSummary = {
    providerId : Nat;
    summary : Text;
    sentiment : Text; // e.g. "positive", "mixed", "negative"
    themes : [Text]; // recurring themes extracted from reviews
  };

  // generateProviderInsights: AI-generated insights for a provider.
  public type ProviderInsights = {
    providerId : Nat;
    insights : Text; // narrative insights
    recommendations : [Text]; // actionable recommendations
  };

  // triageDispute: AI triage recommendation for a dispute.
  public type DisputeTriage = {
    disputeId : Nat;
    severity : Text; // e.g. "low", "medium", "high"
    suggestedResolution : Text; // recommended resolution path
    rationale : Text;
  };

  // aiAssistant: input for a conversational assistant turn.
  public type AssistantInput = {
    message : Text;
    context : ?Text;
  };
};
