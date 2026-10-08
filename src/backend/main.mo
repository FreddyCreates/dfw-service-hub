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
import IntValue "mo:caffeineai-oql/IntValue";
import NatValue "mo:caffeineai-oql/NatValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import TextValue "mo:caffeineai-oql/TextValue";
import BlobValue "mo:caffeineai-oql/BlobValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import Types "types/marketplace-core";
import AuthTypes "types/auth";
import AuthLib "lib/auth";
import AuthApi "mixins/auth-api";
import MarketplaceApi "mixins/marketplace-core-api";

actor {
  // ---- Authorization ----
  let accessControlState : AccessControl.AccessControlState;
  // Identity-attributes layer: records which frontend sign-in source
  // (II/Google/email) produced each Principal, plus the verified name/email.
  // Populated by the MixinAuthorization sign-in callback below.
  let identities : Map.Map<AuthTypes.AuthId, AuthTypes.IdentityAttributes>;
  include MixinAuthorization(
    accessControlState,
    ?(func(caller : Principal, attrs : { name : ?Text; email : ?Text; sso : ?Text }) {
      ignore AuthLib.recordSignIn(
        identities,
        caller,
        { name = attrs.name; email = attrs.email; sso = attrs.sso },
      );
    }),
  );

  // ---- Auth-domain public API (identity attributes) ----
  include AuthApi(accessControlState, identities);

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

  // ---- Marketplace public API ----
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

  // IdentitySource -> Text sentinel (auth domain).
  func identitySourceText(s : AuthTypes.IdentitySource) : Text = switch s {
    case (#internetIdentity) "internetIdentity";
    case (#google) "google";
    case (#email) "email";
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

  // [ServiceCategory] -> comma-joined Text.
  func categoriesText(cs : [Types.ServiceCategory]) : Text =
    cs.map(categoryText).vals().join(",");

  // [Text] -> comma-joined Text.
  func joinText(ts : [Text]) : Text = ts.vals().join(",");

  // [Blob] -> comma-joined Text (each blob's byte length as a stable sentinel).
  func blobsText(bs : [Blob]) : Text =
    bs.map(func(b) = b.size().toText()).vals().join(",");

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
      // Identity-attributes layer (auth domain). controllerOnly: private to the
      // platform; the Data Intelligence agent answers aggregate questions as the
      // controller. Per-row owner scoping is not applied — the `principal` field
      // is the row's identity, not an owner column for row-level visibility.
      identities.toEntityManual("identity", "IdentityAttributes", "principal")
        .payload("principal", func i = i.principal)
        .payload("displayName", func i = optText(i.displayName))
        .payload("email", func i = optText(i.email))
        .payload("source", func i = identitySourceText(i.source))
        .payload("firstSeenAt", func i = i.firstSeenAt)
        .payload("lastSeenAt", func i = i.lastSeenAt)
        .controllerOnly()
        .build(),
    ];
  });
};
