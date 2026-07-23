// Marketplace-core domain logic.
//
// Pure domain logic for the DFW marketplace: user profile management,
// provider registration, service listing CRUD, booking lifecycle, reviews,
// messaging, availability, admin governance, and search/filtering.
//
// State is injected by the mixin layer; this module is stateless and operates
// on the passed-in collections. ID counters are wrapped in `{ var value : Nat }`
// records so mutations propagate back to the caller.

import Array "mo:core/Array";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Types "../types/marketplace-core";

module {
  // ---- Helpers ----
  func now() : Types.Timestamp = Time.now();

  func categoryEquals(a : Types.ServiceCategory, b : Types.ServiceCategory) : Bool {
    switch (a, b) {
      case (#boxTruck, #boxTruck) true;
      case (#relocation, #relocation) true;
      case (#trashHaul, #trashHaul) true;
      case (#moving, #moving) true;
      case (_) false;
    };
  };

  public func slotStatusEquals(a : Types.SlotStatus, b : Types.SlotStatus) : Bool {
    switch (a, b) {
      case (#available, #available) true;
      case (#blocked, #blocked) true;
      case (_) false;
    };
  };

  public func verificationStatusEquals(a : Types.VerificationStatus, b : Types.VerificationStatus) : Bool {
    switch (a, b) {
      case (#pending, #pending) true;
      case (#approved, #approved) true;
      case (#rejected, #rejected) true;
      case (#suspended, #suspended) true;
      case (_) false;
    };
  };

  public func bookingStatusEquals(a : Types.BookingStatus, b : Types.BookingStatus) : Bool {
    switch (a, b) {
      case (#requested, #requested) true;
      case (#accepted, #accepted) true;
      case (#scheduled, #scheduled) true;
      case (#inProgress, #inProgress) true;
      case (#completed, #completed) true;
      case (#cancelled, #cancelled) true;
      case (#reviewed, #reviewed) true;
      case (_) false;
    };
  };

  // ---- Users ----
  public func getUser(users : Map.Map<Types.UserId, Types.User>, id : Types.UserId) : ?Types.User {
    users.get(id);
  };

  public func upsertUser(users : Map.Map<Types.UserId, Types.User>, id : Types.UserId, input : Types.UserInput) : Types.User {
    let ts = now();
    let user : Types.User = {
      principal = id;
      role = input.role;
      displayName = input.displayName;
      email = input.email;
      phone = input.phone;
      avatar = input.avatar;
      workPhotos = input.workPhotos;
      createdAt = ts;
      updatedAt = ts;
    };
    switch (users.get(id)) {
      case (?existing) {
        // Preserve createdAt on update; everything else comes from input.
        let preserved : Types.User = { user with createdAt = existing.createdAt };
        users.add(id, preserved);
        preserved;
      };
      case null {
        users.add(id, user);
        user;
      };
    };
  };

  public func listUsers(users : Map.Map<Types.UserId, Types.User>) : [Types.User] {
    users.values().toArray();
  };

  // ---- Providers ----
  public func getProvider(providers : Map.Map<Nat, Types.Provider>, id : Nat) : ?Types.Provider {
    providers.get(id);
  };

  public func getProviderByOwner(providers : Map.Map<Nat, Types.Provider>, owner : Types.UserId) : ?Types.Provider {
    providers.values().find(func(p) { p.ownerPrincipal == owner });
  };

  public func registerProvider(providers : Map.Map<Nat, Types.Provider>, nextProviderId : { var value : Nat }, owner : Types.UserId, input : Types.ProviderInput) : Types.Provider {
    // One provider per owner principal.
    switch (getProviderByOwner(providers, owner)) {
      case (?_) Runtime.trap("Provider already registered for this principal");
      case null {};
    };
    let id = nextProviderId.value;
    nextProviderId.value := id + 1;
    let ts = now();
    let provider : Types.Provider = {
      id;
      ownerPrincipal = owner;
      companyName = input.companyName;
      description = input.description;
      logo = input.logo;
      serviceCategories = input.serviceCategories;
      serviceAreas = input.serviceAreas;
      verificationStatus = #pending;
      verificationNote = null;
      ratingSum = 0;
      ratingCount = 0;
      createdAt = ts;
      updatedAt = ts;
    };
    providers.add(id, provider);
    provider;
  };

  public func updateProvider(providers : Map.Map<Nat, Types.Provider>, providerId : Nat, input : Types.ProviderInput) : Types.Provider {
    let existing = switch (providers.get(providerId)) {
      case (?p) p;
      case null Runtime.trap("Provider not found");
    };
    let updated : Types.Provider = {
      existing with
      companyName = input.companyName;
      description = input.description;
      logo = input.logo;
      serviceCategories = input.serviceCategories;
      serviceAreas = input.serviceAreas;
      updatedAt = now();
    };
    providers.add(providerId, updated);
    updated;
  };

  public func setProviderVerification(providers : Map.Map<Nat, Types.Provider>, providerId : Nat, status : Types.VerificationStatus, note : ?Text) : Types.Provider {
    let existing = switch (providers.get(providerId)) {
      case (?p) p;
      case null Runtime.trap("Provider not found");
    };
    let updated : Types.Provider = {
      existing with
      verificationStatus = status;
      verificationNote = note;
      updatedAt = now();
    };
    providers.add(providerId, updated);
    updated;
  };

  public func listProviders(providers : Map.Map<Nat, Types.Provider>) : [Types.Provider] {
    providers.values().toArray();
  };

  public func listProvidersByCategory(providers : Map.Map<Nat, Types.Provider>, category : Types.ServiceCategory) : [Types.Provider] {
    providers.values().toArray().filter(
      func(p) { p.serviceCategories.any(func(c) { categoryEquals(c, category) }) }
    );
  };

  // ---- Service listings ----
  public func getListing(listings : Map.Map<Nat, Types.ServiceListing>, id : Nat) : ?Types.ServiceListing {
    listings.get(id);
  };

  public func createListing(listings : Map.Map<Nat, Types.ServiceListing>, nextListingId : { var value : Nat }, providerId : Nat, input : Types.ServiceListingInput) : Types.ServiceListing {
    let id = nextListingId.value;
    nextListingId.value := id + 1;
    let ts = now();
    let listing : Types.ServiceListing = {
      id;
      providerId;
      category = input.category;
      title = input.title;
      description = input.description;
      priceCents = input.priceCents;
      priceUnit = input.priceUnit;
      photos = input.photos;
      serviceArea = input.serviceArea;
      active = input.active;
      createdAt = ts;
      updatedAt = ts;
    };
    listings.add(id, listing);
    listing;
  };

  public func updateListing(listings : Map.Map<Nat, Types.ServiceListing>, listingId : Nat, input : Types.ServiceListingInput) : Types.ServiceListing {
    let existing = switch (listings.get(listingId)) {
      case (?l) l;
      case null Runtime.trap("Listing not found");
    };
    let updated : Types.ServiceListing = {
      existing with
      category = input.category;
      title = input.title;
      description = input.description;
      priceCents = input.priceCents;
      priceUnit = input.priceUnit;
      photos = input.photos;
      serviceArea = input.serviceArea;
      active = input.active;
      updatedAt = now();
    };
    listings.add(listingId, updated);
    updated;
  };

  public func deleteListing(listings : Map.Map<Nat, Types.ServiceListing>, listingId : Nat) : () {
    listings.remove(listingId);
  };

  public func listListingsByProvider(listings : Map.Map<Nat, Types.ServiceListing>, providerId : Nat) : [Types.ServiceListing] {
    listings.values().toArray().filter(func(l) { l.providerId == providerId });
  };

  public func listListingsByCategory(listings : Map.Map<Nat, Types.ServiceListing>, category : Types.ServiceCategory) : [Types.ServiceListing] {
    listings.values().toArray().filter(func(l) { categoryEquals(l.category, category) });
  };

  // ---- Bookings ----
  public func getBooking(bookings : Map.Map<Nat, Types.Booking>, id : Nat) : ?Types.Booking {
    bookings.get(id);
  };

  // Variant that accepts the resolved category (used by the mixin layer, which
  // looks up the listing to derive the category at booking creation time).
  public func createBookingWithCategory(bookings : Map.Map<Nat, Types.Booking>, nextBookingId : { var value : Nat }, customerId : Types.UserId, providerId : Nat, listingId : Nat, category : Types.ServiceCategory, input : Types.BookingInput) : Types.Booking {
    let id = nextBookingId.value;
    nextBookingId.value := id + 1;
    let ts = now();
    let booking : Types.Booking = {
      id;
      customerId;
      providerId;
      listingId;
      category;
      scheduledDate = input.scheduledDate;
      scheduledTime = input.scheduledTime;
      status = #requested;
      jobDetails = input.jobDetails;
      address = input.address;
      customerNote = input.customerNote;
      createdAt = ts;
      updatedAt = ts;
    };
    bookings.add(id, booking);
    booking;
  };

  // Validate a status transition per the marketplace pipeline:
  // requested -> accepted | cancelled
  // accepted  -> scheduled | cancelled
  // scheduled -> inProgress
  // inProgress-> completed
  // completed -> reviewed
  public func isValidTransition(from : Types.BookingStatus, to : Types.BookingStatus) : Bool {
    switch (from, to) {
      case (#requested, #accepted) true;
      case (#requested, #cancelled) true;
      case (#accepted, #scheduled) true;
      case (#accepted, #cancelled) true;
      case (#scheduled, #inProgress) true;
      case (#inProgress, #completed) true;
      case (#completed, #reviewed) true;
      case (_) false;
    };
  };

  public func transitionBooking(bookings : Map.Map<Nat, Types.Booking>, bookingId : Nat, newStatus : Types.BookingStatus) : Types.Booking {
    let existing = switch (bookings.get(bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (not isValidTransition(existing.status, newStatus)) {
      Runtime.trap("Invalid booking status transition");
    };
    let updated : Types.Booking = {
      existing with
      status = newStatus;
      updatedAt = now();
    };
    bookings.add(bookingId, updated);
    updated;
  };

  public func listBookingsByCustomer(bookings : Map.Map<Nat, Types.Booking>, customerId : Types.UserId) : [Types.Booking] {
    bookings.values().toArray().filter(func(b) { b.customerId == customerId });
  };

  public func listBookingsByProvider(bookings : Map.Map<Nat, Types.Booking>, providerId : Nat) : [Types.Booking] {
    bookings.values().toArray().filter(func(b) { b.providerId == providerId });
  };

  // ---- Reviews ----
  public func getReview(reviews : Map.Map<Nat, Types.Review>, id : Nat) : ?Types.Review {
    reviews.get(id);
  };

  public func createReview(reviews : Map.Map<Nat, Types.Review>, nextReviewId : { var value : Nat }, bookingId : Nat, customerId : Types.UserId, providerId : Nat, input : Types.ReviewInput) : Types.Review {
    // Validation (booking exists, belongs to customer, is completed, not already
    // reviewed) is enforced by the mixin layer before calling this function.
    if (input.rating < 1 or input.rating > 5) {
      Runtime.trap("Rating must be between 1 and 5");
    };
    let id = nextReviewId.value;
    nextReviewId.value := id + 1;
    let ts = now();
    let review : Types.Review = {
      id;
      bookingId;
      customerId;
      providerId;
      rating = input.rating;
      writtenText = input.writtenText;
      providerResponse = null;
      hidden = false;
      createdAt = ts;
      updatedAt = ts;
    };
    reviews.add(id, review);
    review;
  };

  // Update a provider's aggregate rating after a review is created.
  public func applyReviewToProviderRating(providers : Map.Map<Nat, Types.Provider>, providerId : Nat, rating : Nat) : () {
    let existing = switch (providers.get(providerId)) {
      case (?p) p;
      case null return;
    };
    let updated : Types.Provider = {
      existing with
      ratingSum = existing.ratingSum + rating;
      ratingCount = existing.ratingCount + 1;
      updatedAt = now();
    };
    providers.add(providerId, updated);
  };

  public func respondToReview(reviews : Map.Map<Nat, Types.Review>, reviewId : Nat, response : Text) : Types.Review {
    let existing = switch (reviews.get(reviewId)) {
      case (?r) r;
      case null Runtime.trap("Review not found");
    };
    if (existing.providerResponse != null) {
      Runtime.trap("Review already has a provider response");
    };
    // A provider cannot respond to a hidden review.
    if (existing.hidden) {
      Runtime.trap("Cannot respond to a hidden review");
    };
    let updated : Types.Review = {
      existing with
      providerResponse = ?response;
      updatedAt = now();
    };
    reviews.add(reviewId, updated);
    updated;
  };

  // Soft-hide a review (admin moderation). The review stays in storage with
  // hidden=true so it can be restored later; it is excluded from public
  // listings and from the provider's aggregate rating.
  public func hideReview(reviews : Map.Map<Nat, Types.Review>, reviewId : Nat) : Types.Review {
    let existing = switch (reviews.get(reviewId)) {
      case (?r) r;
      case null Runtime.trap("Review not found");
    };
    let updated : Types.Review = {
      existing with
      hidden = true;
      updatedAt = now();
    };
    reviews.add(reviewId, updated);
    updated;
  };

  // Restore a previously soft-hidden review (admin moderation). Sets hidden=false
  // so the review reappears in public listings and the provider's aggregate
  // rating.
  public func restoreReview(reviews : Map.Map<Nat, Types.Review>, reviewId : Nat) : Types.Review {
    let existing = switch (reviews.get(reviewId)) {
      case (?r) r;
      case null Runtime.trap("Review not found");
    };
    let updated : Types.Review = {
      existing with
      hidden = false;
      updatedAt = now();
    };
    reviews.add(reviewId, updated);
    updated;
  };

  // Public-facing review list for a provider: excludes hidden reviews.
  public func listReviewsByProvider(reviews : Map.Map<Nat, Types.Review>, providerId : Nat) : [Types.Review] {
    reviews.values().toArray().filter(func(r) { r.providerId == providerId and not r.hidden });
  };

  // All reviews for a provider including hidden ones (admin/internal use).
  public func listAllReviewsByProvider(reviews : Map.Map<Nat, Types.Review>, providerId : Nat) : [Types.Review] {
    reviews.values().toArray().filter(func(r) { r.providerId == providerId });
  };

  public func listReviewsByBooking(reviews : Map.Map<Nat, Types.Review>, bookingId : Nat) : [Types.Review] {
    reviews.values().toArray().filter(func(r) { r.bookingId == bookingId });
  };

  // ---- Messages ----
  public func getThread(messages : Map.Map<Nat, Types.Message>, bookingId : Nat) : [Types.Message] {
    messages.values().toArray()
      .filter(func(m) { m.bookingId == bookingId })
      .sort(func(a, b) { Int.compare(a.sentAt, b.sentAt) });
  };

  public func sendMessage(messages : Map.Map<Nat, Types.Message>, nextMessageId : { var value : Nat }, bookingId : Nat, sender : Types.UserId, input : Types.MessageInput) : Types.Message {
    let id = nextMessageId.value;
    nextMessageId.value := id + 1;
    let msg : Types.Message = {
      id;
      bookingId;
      sender;
      content = input.content;
      read = false;
      sentAt = now();
    };
    messages.add(id, msg);
    msg;
  };

  // Mark every message in the thread NOT sent by the reader as read.
  public func markThreadRead(messages : Map.Map<Nat, Types.Message>, bookingId : Nat, reader : Types.UserId) : () {
    messages.forEach(func(_id, m) {
      if (m.bookingId == bookingId and m.sender != reader and not m.read) {
        messages.add(m.id, { m with read = true });
      };
    });
  };

  // Count unread messages in a thread for a reader (used by dashboards).
  public func countUnreadInThread(messages : Map.Map<Nat, Types.Message>, bookingId : Nat, reader : Types.UserId) : Nat {
    messages.values().toArray()
      .filter(func(m) { m.bookingId == bookingId and m.sender != reader and not m.read })
      .size();
  };

  // ---- Availability ----
  public func setSlot(slots : Map.Map<Nat, Types.AvailabilitySlot>, nextSlotId : { var value : Nat }, providerId : Nat, input : Types.AvailabilitySlotInput) : Types.AvailabilitySlot {
    let id = nextSlotId.value;
    nextSlotId.value := id + 1;
    let ts = now();
    let slot : Types.AvailabilitySlot = {
      id;
      providerId;
      date = input.date;
      time = input.time;
      status = input.status;
      createdAt = ts;
    };
    slots.add(id, slot);
    slot;
  };

  public func blockSlot(slots : Map.Map<Nat, Types.AvailabilitySlot>, slotId : Nat) : Types.AvailabilitySlot {
    let existing = switch (slots.get(slotId)) {
      case (?s) s;
      case null Runtime.trap("Slot not found");
    };
    let updated : Types.AvailabilitySlot = { existing with status = #blocked };
    slots.add(slotId, updated);
    updated;
  };

  // A slot is available for a given date/time if there exists an #available slot
  // for that provider matching the date, and (when time is provided) matching
  // the time, OR a whole-day slot (time = null) when no specific time is given.
  public func checkAvailability(slots : Map.Map<Nat, Types.AvailabilitySlot>, providerId : Nat, date : Text, time : ?Text) : Bool {
    slots.values().toArray()
      .any(func(s) {
        s.providerId == providerId
        and slotStatusEquals(s.status, #available)
        and s.date == date
        and (
          switch (s.time, time) {
            case (null, null) true; // whole-day slot, no specific time requested
            case (?_, null) true; // specific slot available, requester asked for the whole day
            case (null, ?_) false; // whole-day slot but requester asked for a specific time
            case (?st, ?rt) st == rt;
          }
        );
      });
  };

  public func listSlotsByProvider(slots : Map.Map<Nat, Types.AvailabilitySlot>, providerId : Nat) : [Types.AvailabilitySlot] {
    slots.values().toArray().filter(func(s) { s.providerId == providerId });
  };

  // ---- Search ----
  // Filter listings by category, serviceArea, keyword (in title/description),
  // maxPriceCents, and provider-level minRating. The availableOn date filter is
  // applied by the mixin layer (which has access to the slots map) after this
  // function returns candidate results.
  public func search(listings : Map.Map<Nat, Types.ServiceListing>, providers : Map.Map<Nat, Types.Provider>, filters : Types.SearchFilters) : [Types.SearchResult] {
    let allListings = listings.values().toArray();
    let candidates = allListings.filter(func(l) {
      // Only active listings.
      if (not l.active) { return false };

      // Category filter.
      switch (filters.category) {
        case (?c) { if (not categoryEquals(l.category, c)) { return false } };
        case null {};
      };

      // Service area filter (substring match on the listing's serviceArea).
      switch (filters.serviceArea) {
        case (?area) {
          if (not l.serviceArea.contains(#text area)) { return false };
        };
        case null {};
      };

      // Keyword filter (case-insensitive substring in title or description).
      switch (filters.keyword) {
        case (?kw) {
          let kwLower = kw.toLower();
          let titleLower = l.title.toLower();
          let descLower = l.description.toLower();
          if (not titleLower.contains(#text kwLower) and not descLower.contains(#text kwLower)) {
            return false;
          };
        };
        case null {};
      };

      // Max price filter.
      switch (filters.maxPriceCents) {
        case (?max) { if (l.priceCents > max) { return false } };
        case null {};
      };

      true;
    });

    // Build results, joining each listing with its provider and applying the
    // provider-level filters (minRating, approved-only). Uses filterMap so
    // listings without an approved provider (or below minRating) are dropped
    // by returning null — Motoko has no `continue` inside `for`.
    candidates.filterMap(func(l) {
      let provider = switch (providers.get(l.providerId)) {
        case (?p) p;
        case null return null;
      };
      // Only approved providers appear in search results.
      if (not verificationStatusEquals(provider.verificationStatus, #approved)) { return null };

      // minRating filter (provider aggregate rating).
      switch (filters.minRating) {
        case (?min) {
          let avg : Nat = if (provider.ratingCount == 0) { 0 } else { provider.ratingSum / provider.ratingCount };
          if (avg < min) { return null };
        };
        case null {};
      };

      ?{ listing = l; provider };
    });
  };
};
