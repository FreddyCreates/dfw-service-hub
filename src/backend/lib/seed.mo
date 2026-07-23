// Seed-domain logic.
//
// Idempotent seeding of the owner's marketplace presence: one Provider
// record ("DFW Service Hub", all four service categories, DFW metroplex
// service areas, auto-approved) plus one active ServiceListing per
// category. Re-running the seed is safe: an existing owner provider is
// reused, and per-category listings are only created when none exists for
// that provider+category.
//
// This module is stateless; the mixin layer injects the providers/listings
// maps and the ID counters. It does not perform authorization — that is
// the mixin's responsibility.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types/marketplace-core";
import SeedTypes "../types/seed";

module {
  // ---- Owner seed constants ----
  // The owner is whoever calls the admin-gated seed action; their principal
  // becomes the provider's ownerPrincipal. The company identity and service
  // footprint are fixed for the DFW Service Hub launch.

  let COMPANY_NAME : Text = "DFW Service Hub";

  let COMPANY_DESCRIPTION : Text = "DFW Service Hub is a full-service hauling, relocation, and moving company serving the entire Dallas–Fort Worth metroplex. From box truck deliveries and apartment relocations to junk removal and full-home moves, our locally-based crews bring reliable scheduling, upfront pricing, and careful handling to every job across Dallas, Fort Worth, Arlington, Plano, Irving, Garland, Frisco, McKinney, Denton, and Richardson.";

  let SERVICE_AREAS : [Text] = [
    "Dallas",
    "Fort Worth",
    "Arlington",
    "Plano",
    "Irving",
    "Garland",
    "Frisco",
    "McKinney",
    "Denton",
    "Richardson",
  ];

  let ALL_CATEGORIES : [Types.ServiceCategory] = [
    #boxTruck,
    #relocation,
    #trashHaul,
    #moving,
  ];

  // Per-category seed listing content. Realistic DFW-appropriate titles,
  // descriptions, prices (in cents), and price units. Order matches
  // ALL_CATEGORIES so the seed result is deterministic.
  let SEED_LISTINGS : [{
    category : Types.ServiceCategory;
    title : Text;
    description : Text;
    priceCents : Nat;
    priceUnit : Text;
  }] = [
    {
      category = #boxTruck;
      title = "Box Truck Hauling & Delivery Across DFW";
      description = "On-demand 16–26 ft box truck hauling for furniture, appliances, palletized freight, and bulky items throughout the Dallas–Fort Worth metroplex. Includes load/unload by a two-person crew, route planning, and same-day scheduling in most areas. Ideal for retail pickups, Craigslist/Facebook Marketplace buys, and last-mile business deliveries.";
      priceCents = 17500;
      priceUnit = "per hour (2-person crew, 2-hour minimum)";
    },
    {
      category = #relocation;
      title = "Apartment & Office Relocation Services";
      description = "Full-service local relocation for apartments, condos, and small offices anywhere in DFW. We handle disassembly, padded wrapping, transport, and reassembly at the destination, with transparent flat-rate pricing based on inventory size and distance. Available 7 days a week with evening and weekend slots.";
      priceCents = 29500;
      priceUnit = "flat (local move, up to 2 bedrooms)";
    },
    {
      category = #trashHaul;
      title = "Junk & Trash Hauling — Full-Service Removal";
      description = "Single-item to full-load junk and trash removal for homes, garages, estates, and construction cleanups across DFW. We sort for donation and recycling where possible and provide sweep-up after loading. Covers furniture, appliances, yard waste, construction debris, and general household junk. Pricing is all-inclusive: labor, transport, and disposal fees.";
      priceCents = 12500;
      priceUnit = "per load (up to 1/4 truckload)";
    },
    {
      category = #moving;
      title = "Full-Home Moving Services — DFW Movers You Can Trust";
      description = "Complete residential moving service for houses and large apartments across the Dallas–Fort Worth metroplex. Includes professional packing of breakables, furniture protection, appliance disconnect/reconnect (non-gas), and careful placement in your new home. Fixed-price quotes based on home size and mileage — no surprise fees on moving day.";
      priceCents = 45000;
      priceUnit = "flat (whole-home move, up to 3 bedrooms, local)";
    },
  ];

  // ---- Helpers ----
  func categoryEquals(a : Types.ServiceCategory, b : Types.ServiceCategory) : Bool {
    switch (a, b) {
      case (#boxTruck, #boxTruck) true;
      case (#relocation, #relocation) true;
      case (#trashHaul, #trashHaul) true;
      case (#moving, #moving) true;
      case (_) false;
    };
  };

  // Does the provider already have an active or inactive listing for the
  // given category? Used to make the seed idempotent per provider+category.
  public func providerHasListingForCategory(
    listings : Map.Map<Nat, Types.ServiceListing>,
    providerId : Nat,
    category : Types.ServiceCategory,
  ) : Bool {
    listings.values().toArray().any(
      func(l) { l.providerId == providerId and categoryEquals(l.category, category) }
    );
  };

  // ---- Seed entry point ----
  // Idempotently creates the owner's Provider (if missing) and one active
  // listing per category (only for categories the provider does not already
  // have a listing for). Returns a SeedResult describing what was created vs
  // skipped. The owner principal is supplied by the mixin (admin-gated).
  //
  // The provider is auto-approved (#approved) so its listings are
  // immediately visible in search results.
  public func seedOwnerServices(
    providers : Map.Map<Nat, Types.Provider>,
    listings : Map.Map<Nat, Types.ServiceListing>,
    nextProviderId : { var value : Nat },
    nextListingId : { var value : Nat },
    owner : Types.UserId,
  ) : SeedTypes.SeedResult {
    // Resolve or create the owner's provider record.
    let (providerId, providerCreated) = switch (providers.values().find(
      func(p) { p.ownerPrincipal == owner }
    )) {
      case (?existing) (existing.id, false);
      case null {
        let id = nextProviderId.value;
        nextProviderId.value := id + 1;
        let ts = Time.now();
        let provider : Types.Provider = {
          id;
          ownerPrincipal = owner;
          companyName = COMPANY_NAME;
          description = ?COMPANY_DESCRIPTION;
          logo = null;
          serviceCategories = ALL_CATEGORIES;
          serviceAreas = SERVICE_AREAS;
          verificationStatus = #approved;
          verificationNote = null;
          ratingSum = 0;
          ratingCount = 0;
          createdAt = ts;
          updatedAt = ts;
        };
        providers.add(id, provider);
        (id, true);
      };
    };

    // Create one active listing per category, skipping any that already exist
    // for this provider+category. Outcomes are returned in ALL_CATEGORIES
    // order so the result is deterministic.
    let outcomes : [SeedTypes.SeedListingOutcome] = ALL_CATEGORIES.map(
      func(cat) : SeedTypes.SeedListingOutcome {
        if (providerHasListingForCategory(listings, providerId, cat)) {
          { category = cat; outcome = #skipped };
        } else {
          let spec = SEED_LISTINGS.find(func(s) { categoryEquals(s.category, cat) });
          let (title, description, priceCents, priceUnit) = switch (spec) {
            case (?s) (s.title, s.description, s.priceCents, s.priceUnit);
            case null {
              // Defensive: ALL_CATEGORIES and SEED_LISTINGS are kept in sync,
              // so this branch is unreachable. Trap rather than seed bad data.
              Runtime.trap("Seed config missing for category");
            };
          };
          let id = nextListingId.value;
          nextListingId.value := id + 1;
          let ts = Time.now();
          let listing : Types.ServiceListing = {
            id;
            providerId;
            category = cat;
            title;
            description;
            priceCents;
            priceUnit;
            photos = [];
            serviceArea = "Dallas–Fort Worth metroplex";
            active = true;
            createdAt = ts;
            updatedAt = ts;
          };
          listings.add(id, listing);
          { category = cat; outcome = #created };
        };
      }
    );

    {
      providerCreated;
      providerId;
      listingOutcomes = outcomes;
    };
  };

  // ---- Seed status query ----
  // True iff the owner principal already has a Provider record. The
  // frontend uses this to show whether the owner's services have been
  // seeded. (Listings are created alongside the provider, so a provider
  // existing is a sufficient signal that seeding has run.)
  public func isOwnerSeeded(
    providers : Map.Map<Nat, Types.Provider>,
    owner : Types.UserId,
  ) : Bool {
    providers.values().any(func(p) { p.ownerPrincipal == owner });
  };
};
