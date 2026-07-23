// Seed-domain public API mixin.
//
// Admin-gated endpoints that trigger idempotent seeding of the owner's
// marketplace presence (one Provider + four active ServiceListings) and
// expose seed status to the frontend. The owner is the admin principal
// that calls seedOwnerServices; authorization is enforced via the injected
// accessControlState (AccessControl.isAdmin).

import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Types "../types/marketplace-core";
import SeedTypes "../types/seed";
import SeedLib "../lib/seed";

mixin (
  accessControlState : AccessControl.AccessControlState,
  providers : Map.Map<Nat, Types.Provider>,
  listings : Map.Map<Nat, Types.ServiceListing>,
  nextProviderId : { var value : Nat },
  nextListingId : { var value : Nat },
) {
  // Admin-only: idempotently seed the owner's Provider record and one active
  // ServiceListing per ServiceCategory. The caller (an admin) becomes the
  // provider's ownerPrincipal. Re-running is safe — an existing owner
  // provider is reused, and per-category listings are only created when none
  // exists for that provider+category. Returns a SeedResult describing what
  // was created vs skipped.
  public shared ({ caller }) func seedOwnerServices() : async SeedTypes.SeedResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    SeedLib.seedOwnerServices(providers, listings, nextProviderId, nextListingId, caller);
  };

  // Query: has the owner's marketplace presence been seeded? Returns true iff
  // a Provider record owned by the caller exists. Any signed-in caller may
  // ask about their own seed status; the frontend uses this to decide whether
  // to surface the "Seed my services" admin action.
  public query ({ caller }) func isOwnerSeeded() : async Bool {
    SeedLib.isOwnerSeeded(providers, caller);
  };
};
