// Seed-domain types.
//
// Result types for the admin-triggered, idempotent seed action that
// populates the marketplace with the owner's own provider record and four
// active service listings (one per ServiceCategory). The seed reuses the
// existing Provider and ServiceListing types from marketplace-core; this
// file owns only the seed result shape returned to the caller / frontend.

module {
  // Per-category outcome of the seed action.
  //   #created  — a new listing was inserted for this category
  //   #skipped  — a listing for this provider+category already existed
  public type SeedListingOutcome = {
    category : { #boxTruck; #relocation; #trashHaul; #moving };
    outcome : { #created; #skipped };
  };

  // Aggregate result of seedOwnerServices.
  //   providerCreated  — true iff the owner's Provider record was newly created
  //   providerId       — the owner's provider id (existing or newly created)
  //   listingOutcomes  — one entry per category, in fixed category order
  public type SeedResult = {
    providerCreated : Bool;
    providerId : Nat;
    listingOutcomes : [SeedListingOutcome];
  };
};
