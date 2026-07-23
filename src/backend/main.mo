// Marketplace backend composition root.
//
// Single-actor backend for the DFW service marketplace. Composes:
//   - caffeineai-authorization (MixinAuthorization) for II login + roles
//   - caffeineai-object-storage (MixinObjectStorage) for provider photo uploads
//   - caffeineai-oql (Expose) for Data Intelligence queryability
//   - marketplace-core-api mixin for the full marketplace public API
//
// Stable state is declared with types only — initial values come from the
// migration chain in src/backend/migrations/.

import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import MapEntity "mo:caffeineai-oql/MapEntity";
import Entity "mo:caffeineai-oql/Entity";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import TextValue "mo:caffeineai-oql/TextValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import BlobValue "mo:caffeineai-oql/BlobValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import Types "types/marketplace-core";
import V3Types "types/v3-contracts";
import MarketplaceApi "mixins/marketplace-core-api";
import SeedApi "mixins/seed-api";
import V3Api "mixins/v3-contracts-api";

actor {
  // ---- Authorization ----
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  // ---- Object storage (provider photos / company logos) ----
  include MixinObjectStorage();

  // ---- Marketplace stable state ----
  // All collections are stable (enhanced orthogonal persistence); initial
  // values are supplied by the migration chain.
  let users : Map.Map<Types.UserId, Types.User>;
  let providers : Map.Map<Nat, Types.Provider>;
  let listings : Map.Map<Nat, Types.ServiceListing>;
  let bookings : Map.Map<Nat, Types.Booking>;
  let reviews : Map.Map<Nat, Types.Review>;
  let messages : Map.Map<Nat, Types.Message>;
  let slots : Map.Map<Nat, Types.AvailabilitySlot>;

  // ID counters wrapped in mutable records so mixin mutations propagate.
  let nextProviderId : { var value : Nat };
  let nextListingId : { var value : Nat };
  let nextBookingId : { var value : Nat };
  let nextReviewId : { var value : Nat };
  let nextMessageId : { var value : Nat };
  let nextSlotId : { var value : Nat };

  // Admin-set OpenAI API key (admin-key variant per extension-openai §9).
  // Never returned by any endpoint; only isOpenAIConfigured (Bool) is exposed.
  let openAIApiKey : { var value : ?Text };

  // Admin-gated master toggle for transactional email notifications. When
  // false, every email helper skips sending silently. Defaults to true via
  // the migration chain.
  let emailNotificationsEnabled : { var value : Bool };

  // ---- V3 embedded-protocol & intelligence-layer stable state ----
  // Collections backing the V3 contracts domain (trust/verification, disputes,
  // community reports, rewards, referrals, microsites, docs, AI assistant
  // sessions). Initial values come from the migration chain.
  let disputes : Map.Map<Nat, V3Types.Dispute>;
  let communityReports : Map.Map<Nat, V3Types.CommunityReport>;
  let rewards : Map.Map<V3Types.UserId, V3Types.RewardProfile>;
  let rewardLedger : Map.Map<Nat, V3Types.RewardLedgerEntry>;
  let referrals : Map.Map<Nat, V3Types.Referral>;
  let microsites : Map.Map<Nat, V3Types.Microsite>;
  let docs : Map.Map<Nat, V3Types.Doc>;
  let assistantSessions : Map.Map<V3Types.UserId, [V3Types.AssistantMessage]>;
  // V3 verification tiers (multi-tier provider verification protocol). Stored
  // in a dedicated collection keyed by providerId so the Provider record itself
  // stays unchanged (no frozen-migration edits needed).
  let providerVerifications : Map.Map<Nat, V3Types.VerificationTiers>;

  // V3 ID counters wrapped in mutable records so mixin mutations propagate.
  let nextDisputeId : { var value : Nat };
  let nextReportId : { var value : Nat };
  let nextRewardLedgerId : { var value : Nat };
  let nextReferralId : { var value : Nat };
  let nextMicrositeId : { var value : Nat };
  let nextDocId : { var value : Nat };

  // ---- Marketplace public API ----
  // The rewards collections (rewards, rewardLedger, referrals, nextRewardLedgerId,
  // nextReferralId) are threaded in so the marketplace lifecycle methods
  // (completeBooking, createReview, cancelBooking) can award points, increment
  // streaks, and award referrals as side-effects without breaking the primary
  // operation.
  include MarketplaceApi(
    accessControlState,
    users,
    providers,
    listings,
    bookings,
    reviews,
    messages,
    slots,
    nextProviderId,
    nextListingId,
    nextBookingId,
    nextReviewId,
    nextMessageId,
    nextSlotId,
    openAIApiKey,
    emailNotificationsEnabled,
    rewards,
    rewardLedger,
    referrals,
    nextRewardLedgerId,
    nextReferralId,
  );

  // ---- Seed (owner marketplace presence) ----
  // Admin-gated, idempotent seeding of the owner's Provider record and four
  // active ServiceListings (one per ServiceCategory). Reuses the marketplace
  // stable state (providers, listings, nextProviderId, nextListingId) — no
  // additional stable state is introduced, so no migration is required.
  include SeedApi(
    accessControlState,
    providers,
    listings,
    nextProviderId,
    nextListingId,
  );

  // ---- V3 embedded-protocol & intelligence-layer public API ----
  // Trust/verification, disputes, community reports, rewards, referrals,
  // microsites, docs, and the AI intelligence layer. Shares the marketplace
  // stable state (users, providers, listings, bookings, reviews) plus the new
  // V3 collections and counters declared above.
  include V3Api(
    accessControlState,
    users,
    providers,
    listings,
    bookings,
    reviews,
    disputes,
    communityReports,
    rewards,
    rewardLedger,
    referrals,
    microsites,
    docs,
    providerVerifications,
    assistantSessions,
    nextDisputeId,
    nextReportId,
    nextRewardLedgerId,
    nextReferralId,
    nextMicrositeId,
    nextDocId,
    openAIApiKey,
  );

  // ---- OQL (Data Intelligence) ----
  // Expose the primary stored collections so they are queryable in natural
  // language by the Caffeine Data Intelligence agent. All entities use manual
  // mode (.toEntityManual) because their record types contain variants,
  // options, and arrays — auto-derive only handles all-primitive records.
  // Each non-primitive field is projected via .payload with a Text sentinel
  // (variants -> tag text, options -> "" for null, arrays -> comma-joined
  // text); primitives (Nat, Bool, Principal, Blob) are passed directly.
  // Per-entity authorization:
  //   - providers, listings: public_ (browse the marketplace)
  //   - users, bookings, reviews, messages, slots: controllerOnly (private to
  //     the platform; the agent answers aggregate questions as the controller)
  transient let anyP = Principal.fromText("aaaaa-aa");

  // Variant -> Text sentinels.
  func roleText(r : Types.MarketplaceRole) : Text = switch r {
    case (#customer) "customer";
    case (#provider) "provider";
    case (#admin) "admin";
  };
  func categoryText(c : Types.ServiceCategory) : Text = switch c {
    case (#boxTruck) "boxTruck";
    case (#relocation) "relocation";
    case (#trashHaul) "trashHaul";
    case (#moving) "moving";
  };
  func verificationText(v : Types.VerificationStatus) : Text = switch v {
    case (#pending) "pending";
    case (#approved) "approved";
    case (#rejected) "rejected";
    case (#suspended) "suspended";
  };
  func bookingStatusText(s : Types.BookingStatus) : Text = switch s {
    case (#requested) "requested";
    case (#accepted) "accepted";
    case (#scheduled) "scheduled";
    case (#inProgress) "inProgress";
    case (#completed) "completed";
    case (#cancelled) "cancelled";
    case (#reviewed) "reviewed";
  };
  func slotStatusText(s : Types.SlotStatus) : Text = switch s {
    case (#available) "available";
    case (#blocked) "blocked";
  };

  // V3 variant -> Text sentinels (for OQL entity projection).
  func disputeStatusText(s : V3Types.DisputeStatus) : Text = switch s {
    case (#open) "open";
    case (#responded) "responded";
    case (#resolved) "resolved";
    case (#escalated) "escalated";
  };
  func reportTargetTypeText(t : V3Types.ReportTargetType) : Text = switch t {
    case (#provider) "provider";
    case (#listing) "listing";
    case (#review) "review";
    case (#user) "user";
  };
  func reportStatusText(s : V3Types.ReportStatus) : Text = switch s {
    case (#open) "open";
    case (#reviewing) "reviewing";
    case (#resolved) "resolved";
    case (#dismissed) "dismissed";
  };
  func rewardTierText(t : V3Types.RewardTier) : Text = switch t {
    case (#bronze) "bronze";
    case (#silver) "silver";
    case (#gold) "gold";
    case (#platinum) "platinum";
  };
  func referralStatusText(s : V3Types.ReferralStatus) : Text = switch s {
    case (#pending) "pending";
    case (#awarded) "awarded";
    case (#expired) "expired";
  };
  func docStatusText(s : V3Types.DocStatus) : Text = switch s {
    case (#draft) "draft";
    case (#published) "published";
  };
  func assistantRoleText(r : V3Types.AssistantRole) : Text = switch r {
    case (#user) "user";
    case (#assistant) "assistant";
  };
  func verificationTierStatusText(s : V3Types.VerificationTierStatus) : Text = switch s {
    case (#unverified) "unverified";
    case (#pending) "pending";
    case (#approved) "approved";
    case (#rejected) "rejected";
    case (#expired) "expired";
  };

  // Option -> Text sentinel ("" for null).
  func optText(t : ?Text) : Text = switch t {
    case null "";
    case (?v) v;
  };

  // ?Blob -> Blob sentinel (empty blob for null).
  func optBlob(b : ?Blob) : Blob = switch b {
    case null Array.toBlob([]);
    case (?v) v;
  };

  // ?Timestamp -> Int sentinel (0 for null). Timestamp = Time.Time = Int.
  func optTimestamp(t : ?Int) : Int = switch t {
    case null 0;
    case (?v) v;
  };

  // [ServiceCategory] -> comma-joined Text.
  func categoriesText(cs : [Types.ServiceCategory]) : Text =
    cs.map(categoryText).vals().join(",");

  // [Text] -> comma-joined Text.
  func joinText(ts : [Text]) : Text = ts.vals().join(",");

  // [Blob] -> comma-joined Text. Each ExternalBlob (object-storage reference)
  // is stored as a Blob whose bytes are UTF-8 text ("!caf!sha256:..."), so we
  // decode to surface the readable reference; non-UTF-8 blobs fall back to a
  // "<blob:N bytes>" placeholder. This mirrors the OQL BlobValue._toRow
  // instance so array-of-blob fields are as queryable as single-blob fields.
  func blobText(b : Blob) : Text = switch (b.decodeUtf8()) {
    case (?t) t;
    case null "<blob:" # b.size().toText() # " bytes>";
  };
  func blobsText(bs : [Blob]) : Text =
    bs.map(blobText).vals().join(",");

  include Expose({
    entities = [
      providers.toEntityManual("provider", "Provider", "id")
        .payload("id", func p = p.id)
        .payload("ownerPrincipal", func p = p.ownerPrincipal)
        .payload("companyName", func p = p.companyName)
        .payload("description", func p = optText(p.description))
        .payload("logo", func p = optBlob(p.logo))
        .payload("serviceCategories", func p = categoriesText(p.serviceCategories))
        .payload("serviceAreas", func p = joinText(p.serviceAreas))
        .payload("verificationStatus", func p = verificationText(p.verificationStatus))
        .payload("verificationNote", func p = optText(p.verificationNote))
        .payload("ratingSum", func p = p.ratingSum)
        .payload("ratingCount", func p = p.ratingCount)
        .payload("createdAt", func p = p.createdAt)
        .payload("updatedAt", func p = p.updatedAt)
        .public_()
        .build(),
      listings.toEntityManual("listing", "ServiceListing", "id")
        .payload("id", func l = l.id)
        .payload("providerId", func l = l.providerId)
        .payload("category", func l = categoryText(l.category))
        .payload("title", func l = l.title)
        .payload("description", func l = l.description)
        .payload("priceCents", func l = l.priceCents)
        .payload("priceUnit", func l = l.priceUnit)
        .payload("photos", func l = blobsText(l.photos))
        .payload("serviceArea", func l = l.serviceArea)
        .payload("active", func l = l.active)
        .payload("createdAt", func l = l.createdAt)
        .payload("updatedAt", func l = l.updatedAt)
        .public_()
        .build(),
      users.toEntityManual("user", "User", "principal")
        .payload("principal", func u = u.principal)
        .payload("role", func u = roleText(u.role))
        .payload("displayName", func u = u.displayName)
        .payload("email", func u = optText(u.email))
        .payload("phone", func u = optText(u.phone))
        .payload("avatar", func u = optBlob(u.avatar))
        .payload("workPhotos", func u = blobsText(u.workPhotos))
        .payload("createdAt", func u = u.createdAt)
        .payload("updatedAt", func u = u.updatedAt)
        .controllerOnly()
        .build(),
      bookings.toEntityManual("booking", "Booking", "id")
        .payload("id", func b = b.id)
        .payload("customerId", func b = b.customerId)
        .payload("providerId", func b = b.providerId)
        .payload("listingId", func b = b.listingId)
        .payload("category", func b = categoryText(b.category))
        .payload("scheduledDate", func b = b.scheduledDate)
        .payload("scheduledTime", func b = optText(b.scheduledTime))
        .payload("status", func b = bookingStatusText(b.status))
        .payload("jobDetails", func b = b.jobDetails)
        .payload("address", func b = b.address)
        .payload("customerNote", func b = optText(b.customerNote))
        .payload("createdAt", func b = b.createdAt)
        .payload("updatedAt", func b = b.updatedAt)
        .controllerOnly()
        .build(),
      reviews.toEntityManual("review", "Review", "id")
        .payload("id", func r = r.id)
        .payload("bookingId", func r = r.bookingId)
        .payload("customerId", func r = r.customerId)
        .payload("providerId", func r = r.providerId)
        .payload("rating", func r = r.rating)
        .payload("writtenText", func r = r.writtenText)
        .payload("providerResponse", func r = optText(r.providerResponse))
        .payload("hidden", func r = r.hidden)
        .payload("createdAt", func r = r.createdAt)
        .payload("updatedAt", func r = r.updatedAt)
        .controllerOnly()
        .build(),
      messages.toEntityManual("message", "Message", "id")
        .payload("id", func m = m.id)
        .payload("bookingId", func m = m.bookingId)
        .payload("sender", func m = m.sender)
        .payload("content", func m = m.content)
        .payload("read", func m = m.read)
        .payload("sentAt", func m = m.sentAt)
        .controllerOnly()
        .build(),
      slots.toEntityManual("availabilitySlot", "AvailabilitySlot", "id")
        .payload("id", func s = s.id)
        .payload("providerId", func s = s.providerId)
        .payload("date", func s = s.date)
        .payload("time", func s = optText(s.time))
        .payload("status", func s = slotStatusText(s.status))
        .payload("createdAt", func s = s.createdAt)
        .controllerOnly()
        .build(),
      // ---- V3 entities ----
      // disputes: controllerOnly (private moderation data; agent answers as
      // the controller).
      disputes.toEntityManual("dispute", "Dispute", "id")
        .payload("id", func d = d.id)
        .payload("bookingId", func d = d.bookingId)
        .payload("openedBy", func d = d.openedBy)
        .payload("reason", func d = d.reason)
        .payload("status", func d = disputeStatusText(d.status))
        .payload("providerResponse", func d = optText(d.providerResponse))
        .payload("adminResolution", func d = optText(d.adminResolution))
        .payload("aiTriageSuggestion", func d = optText(d.aiTriageSuggestion))
        .payload("createdAt", func d = d.createdAt)
        .payload("updatedAt", func d = d.updatedAt)
        .controllerOnly()
        .build(),
      // communityReports: controllerOnly (private moderation data).
      communityReports.toEntityManual("communityReport", "CommunityReport", "id")
        .payload("id", func r = r.id)
        .payload("targetType", func r = reportTargetTypeText(r.targetType))
        .payload("targetId", func r = r.targetId)
        .payload("reporter", func r = r.reporter)
        .payload("reason", func r = r.reason)
        .payload("status", func r = reportStatusText(r.status))
        .payload("resolutionNote", func r = optText(r.resolutionNote))
        .payload("createdAt", func r = r.createdAt)
        .payload("updatedAt", func r = r.updatedAt)
        .controllerOnly()
        .build(),
      // rewards: controllerOnly (private loyalty data; agent answers as the
      // controller). userId is the owner principal.
      rewards.toEntityManual("rewardProfile", "RewardProfile", "userId")
        .payload("userId", func r = r.userId)
        .payload("points", func r = r.points)
        .payload("tier", func r = rewardTierText(r.tier))
        .payload("badges", func r = joinText(r.badges))
        .payload("streak", func r = r.streak)
        .payload("referralCode", func r = r.referralCode)
        .payload("updatedAt", func r = r.updatedAt)
        .controllerOnly()
        .build(),
      // rewardLedger: controllerOnly (private ledger; agent answers as the
      // controller).
      rewardLedger.toEntityManual("rewardLedgerEntry", "RewardLedgerEntry", "id")
        .payload("id", func e = e.id)
        .payload("userId", func e = e.userId)
        .payload("points", func e = e.points)
        .payload("reason", func e = e.reason)
        .payload("timestamp", func e = e.timestamp)
        .controllerOnly()
        .build(),
      // referrals: controllerOnly (private referral data).
      referrals.toEntityManual("referral", "Referral", "id")
        .payload("id", func r = r.id)
        .payload("referrer", func r = r.referrer)
        .payload("referee", func r = r.referee)
        .payload("status", func r = referralStatusText(r.status))
        .payload("awardedAt", func r = optTimestamp(r.awardedAt))
        .payload("createdAt", func r = r.createdAt)
        .controllerOnly()
        .build(),
      // microsites: public_ (browse provider marketing pages, incl. anonymous).
      microsites.toEntityManual("microsite", "Microsite", "id")
        .payload("id", func m = m.id)
        .payload("providerId", func m = m.providerId)
        .payload("slug", func m = m.slug)
        .payload("heroCopy", func m = m.heroCopy)
        .payload("aboutCopy", func m = m.aboutCopy)
        .payload("servicesCopy", func m = m.servicesCopy)
        .payload("coverImage", func m = optBlob(m.coverImage))
        .payload("accentColor", func m = optText(m.accentColor))
        .payload("blockOrder", func m = joinText(m.blockOrder))
        .payload("generatedAt", func m = optTimestamp(m.generatedAt))
        .payload("published", func m = m.published)
        .payload("createdAt", func m = m.createdAt)
        .payload("updatedAt", func m = m.updatedAt)
        .public_()
        .build(),
      // docs: public_ (help-center / knowledge base, incl. anonymous). Only
      // published docs are surfaced here in practice (the develop layer will
      // filter; the entity exposes the status column so the agent can filter
      // too).
      docs.toEntityManual("doc", "Doc", "id")
        .payload("id", func d = d.id)
        .payload("title", func d = d.title)
        .payload("slug", func d = d.slug)
        .payload("category", func d = d.category)
        .payload("content", func d = d.content)
        .payload("status", func d = docStatusText(d.status))
        .payload("readingTime", func d = d.readingTime)
        .payload("updatedAt", func d = d.updatedAt)
        .payload("author", func d = d.author)
        .payload("createdAt", func d = d.createdAt)
        .public_()
        .build(),
      // providerVerifications: controllerOnly (private trust/verification data;
      // agent answers as the controller). The primary key (providerId) lives in
      // the Map key, so we use OQL.Entity.manual over .entries() and promote the
      // key as a providerId column. Each of the four tier records (identity,
      // business, insurance, background) is flattened into prefixed columns
      // (status, verifiedAt, note) so the agent can query per-tier standing.
      OQL.Entity.manual<(Nat, V3Types.VerificationTiers)>(
        "providerVerification",
        func () = providerVerifications.entries(),
        "VerificationTiers",
        "providerId",
      )
        .payload("providerId", func ((providerId, _)) = providerId)
        .payload("identityStatus", func ((_, v)) = verificationTierStatusText(v.identity.status))
        .payload("identityVerifiedAt", func ((_, v)) = optTimestamp(v.identity.verifiedAt))
        .payload("identityNote", func ((_, v)) = optText(v.identity.note))
        .payload("businessStatus", func ((_, v)) = verificationTierStatusText(v.business.status))
        .payload("businessVerifiedAt", func ((_, v)) = optTimestamp(v.business.verifiedAt))
        .payload("businessNote", func ((_, v)) = optText(v.business.note))
        .payload("insuranceStatus", func ((_, v)) = verificationTierStatusText(v.insurance.status))
        .payload("insuranceVerifiedAt", func ((_, v)) = optTimestamp(v.insurance.verifiedAt))
        .payload("insuranceNote", func ((_, v)) = optText(v.insurance.note))
        .payload("backgroundStatus", func ((_, v)) = verificationTierStatusText(v.background.status))
        .payload("backgroundVerifiedAt", func ((_, v)) = optTimestamp(v.background.verifiedAt))
        .payload("backgroundNote", func ((_, v)) = optText(v.background.note))
        .controllerOnly()
        .build(),
    ];
  });
};
