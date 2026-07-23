// Marketplace-core public API mixin.
//
// Auth-gated API methods that delegate to lib/marketplace-core.mo and enforce
// role-based access via the injected accessControlState. Roles:
//   - customers can create bookings and reviews
//   - providers can manage their own listings/bookings/availability
//   - admins can approve/reject/suspend providers and moderate reviews
//
// Authorization model: caffeineai-authorization's #admin role maps to the
// platform admin. The marketplace-specific customer/provider distinction is
// tracked per-user in the users map (Types.MarketplaceRole). A caller must be
// a signed-in non-anonymous principal (#user or #admin in access-control terms)
// to use any state-mutating endpoint; ownership is enforced on top of that.

import AccessControl "mo:caffeineai-authorization/access-control";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Storage "mo:caffeineai-object-storage/Storage";
import Text "mo:core/Text";
import Types "../types/marketplace-core";
import Lib "../lib/marketplace-core";
import OpenAI "../lib/openai";
import Email "../lib/email";
import V3Lib "../lib/v3-contracts";
import V3Types "../types/v3-contracts";

mixin (
  accessControlState : AccessControl.AccessControlState,
  users : Map.Map<Types.UserId, Types.User>,
  providers : Map.Map<Nat, Types.Provider>,
  listings : Map.Map<Nat, Types.ServiceListing>,
  bookings : Map.Map<Nat, Types.Booking>,
  reviews : Map.Map<Nat, Types.Review>,
  messages : Map.Map<Nat, Types.Message>,
  slots : Map.Map<Nat, Types.AvailabilitySlot>,
  nextProviderId : { var value : Nat },
  nextListingId : { var value : Nat },
  nextBookingId : { var value : Nat },
  nextReviewId : { var value : Nat },
  nextMessageId : { var value : Nat },
  nextSlotId : { var value : Nat },
  openAIApiKey : { var value : ?Text },
  emailNotificationsEnabled : { var value : Bool },
  // Rewards state threaded in so the marketplace lifecycle methods can award
  // points, increment/reset streaks, and award referrals as side-effects.
  rewards : Map.Map<V3Types.UserId, V3Types.RewardProfile>,
  rewardLedger : Map.Map<Nat, V3Types.RewardLedgerEntry>,
  referrals : Map.Map<Nat, V3Types.Referral>,
  nextRewardLedgerId : { var value : Nat },
  nextReferralId : { var value : Nat },
) {
  // ---- Auth helpers ----
  func requireSignedIn(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: sign in required");
    };
  };

  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
  };

  // Resolve the caller's marketplace user record. Traps if not signed in or
  // if no marketplace profile exists yet.
  func requireMarketplaceUser(caller : Principal) : Types.User {
    requireSignedIn(caller);
    switch (users.get(caller)) {
      case (?u) u;
      case null Runtime.trap("Marketplace profile not found; call upsertMyUser first");
    };
  };

  // Resolve the provider owned by the caller. Traps if the caller is not a
  // registered provider.
  func requireProviderForCaller(caller : Principal) : Types.Provider {
    requireSignedIn(caller);
    switch (Lib.getProviderByOwner(providers, caller)) {
      case (?p) p;
      case null Runtime.trap("Caller is not a registered provider");
    };
  };

  // ---- User profile management ----
  public query ({ caller }) func getMyUser() : async ?Types.User {
    requireSignedIn(caller);
    users.get(caller);
  };

  public query ({ caller }) func getUser(userId : Types.UserId) : async ?Types.User {
    requireSignedIn(caller);
    users.get(userId);
  };

  public shared ({ caller }) func upsertMyUser(input : Types.UserInput) : async Types.User {
    requireSignedIn(caller);
    Lib.upsertUser(users, caller, input);
  };

  public query ({ caller }) func listUsers() : async [Types.User] {
    requireAdmin(caller);
    Lib.listUsers(users);
  };

  // ---- Provider registration & profile management ----
  public query ({ caller }) func getMyProvider() : async ?Types.Provider {
    requireSignedIn(caller);
    Lib.getProviderByOwner(providers, caller);
  };

  public query ({ caller }) func getProvider(providerId : Nat) : async ?Types.Provider {
    requireSignedIn(caller);
    Lib.getProvider(providers, providerId);
  };

  public shared ({ caller }) func registerProvider(input : Types.ProviderInput) : async Types.Provider {
    requireSignedIn(caller);
    Lib.registerProvider(providers, nextProviderId, caller, input);
  };

  public shared ({ caller }) func updateMyProvider(input : Types.ProviderInput) : async Types.Provider {
    let provider = requireProviderForCaller(caller);
    Lib.updateProvider(providers, provider.id, input);
  };

  public query ({ caller }) func listProviders() : async [Types.Provider] {
    requireSignedIn(caller);
    Lib.listProviders(providers);
  };

  public query ({ caller }) func listProvidersByCategory(category : Types.ServiceCategory) : async [Types.Provider] {
    requireSignedIn(caller);
    Lib.listProvidersByCategory(providers, category);
  };

  // ---- Service listing CRUD ----
  public query ({ caller }) func getListing(listingId : Nat) : async ?Types.ServiceListing {
    requireSignedIn(caller);
    Lib.getListing(listings, listingId);
  };

  public shared ({ caller }) func createListing(input : Types.ServiceListingInput) : async Types.ServiceListing {
    let provider = requireProviderForCaller(caller);
    Lib.createListing(listings, nextListingId, provider.id, input);
  };

  public shared ({ caller }) func updateListing(listingId : Nat, input : Types.ServiceListingInput) : async Types.ServiceListing {
    let provider = requireProviderForCaller(caller);
    let existing = switch (Lib.getListing(listings, listingId)) {
      case (?l) l;
      case null Runtime.trap("Listing not found");
    };
    if (existing.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the listing owner");
    };
    Lib.updateListing(listings, listingId, input);
  };

  public shared ({ caller }) func deleteListing(listingId : Nat) : async () {
    let provider = requireProviderForCaller(caller);
    let existing = switch (Lib.getListing(listings, listingId)) {
      case (?l) l;
      case null Runtime.trap("Listing not found");
    };
    if (existing.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the listing owner");
    };
    Lib.deleteListing(listings, listingId);
  };

  public query ({ caller }) func listListingsByProvider(providerId : Nat) : async [Types.ServiceListing] {
    requireSignedIn(caller);
    Lib.listListingsByProvider(listings, providerId);
  };

  public query ({ caller }) func listListingsByCategory(category : Types.ServiceCategory) : async [Types.ServiceListing] {
    requireSignedIn(caller);
    Lib.listListingsByCategory(listings, category);
  };

  // ---- Booking lifecycle ----
  public query ({ caller }) func getMyBooking(bookingId : Nat) : async ?Types.Booking {
    requireSignedIn(caller);
    switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) {
        // Customer or provider on the booking may read it.
        let callerProvider = switch (Lib.getProviderByOwner(providers, caller)) {
          case (?p) ?p;
          case null null;
        };
        let isProvider = switch (callerProvider) {
          case (?p) b.providerId == p.id;
          case null false;
        };
        if (b.customerId != caller and not isProvider) {
          Runtime.trap("Unauthorized: not a participant on this booking");
        };
        ?b;
      };
      case null null;
    };
  };

  public query ({ caller }) func getBooking(bookingId : Nat) : async ?Types.Booking {
    requireSignedIn(caller);
    Lib.getBooking(bookings, bookingId);
  };

  public shared ({ caller }) func createBooking(input : Types.BookingInput) : async Types.Booking {
    requireSignedIn(caller);
    // Resolve the listing to derive providerId and category.
    let listing = switch (Lib.getListing(listings, input.listingId)) {
      case (?l) l;
      case null Runtime.trap("Listing not found");
    };
    if (not listing.active) {
      Runtime.trap("Listing is not active");
    };
    // A provider cannot book their own listing.
    let callerProvider = switch (Lib.getProviderByOwner(providers, caller)) {
      case (?p) ?p;
      case null null;
    };
    switch (callerProvider) {
      case (?p) {
        if (p.id == listing.providerId) {
          Runtime.trap("Providers cannot book their own listings");
        };
      };
      case null {};
    };
    // Verify the requested time slot is available before creating the booking.
    if (not Lib.checkAvailability(slots, listing.providerId, input.scheduledDate, input.scheduledTime)) {
      Runtime.trap("The selected time slot is not available. Please choose an available time from the provider calendar.");
    };
    let booking = Lib.createBookingWithCategory(bookings, nextBookingId, caller, listing.providerId, listing.id, listing.category, input);
    // Email side-effect: notify the provider of the new booking request.
    // Resolves the provider owner principal for the recipient lookup. Never
    // blocks the transition on email failure.
    let provider = switch (Lib.getProvider(providers, listing.providerId)) {
      case (?p) p;
      case null return booking;
    };
    let customer = switch (Lib.getUser(users, caller)) {
      case (?u) u;
      case null return booking;
    };
    await Email.notifyProviderNewBooking(
      emailNotificationsEnabled.value,
      users,
      provider.ownerPrincipal,
      customer,
      booking,
    );
    booking;
  };

  // Only the provider on the booking can accept it.
  public shared ({ caller }) func acceptBooking(bookingId : Nat) : async Types.Booking {
    let provider = requireProviderForCaller(caller);
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the provider on this booking");
    };
    let updated = Lib.transitionBooking(bookings, bookingId, #accepted);
    // Email side-effect: notify the customer that the booking was accepted.
    await Email.notifyCustomerBookingAccepted(
      emailNotificationsEnabled.value,
      users,
      booking.customerId,
      updated,
    );
    updated;
  };

  // Decline == cancel by the provider (requested -> cancelled).
  public shared ({ caller }) func declineBooking(bookingId : Nat) : async Types.Booking {
    let provider = requireProviderForCaller(caller);
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the provider on this booking");
    };
    Lib.transitionBooking(bookings, bookingId, #cancelled);
  };

  // Only the customer can cancel, and only before the booking is accepted.
  public shared ({ caller }) func cancelBooking(bookingId : Nat) : async Types.Booking {
    requireSignedIn(caller);
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.customerId != caller) {
      Runtime.trap("Unauthorized: not the customer on this booking");
    };
    if (not Lib.bookingStatusEquals(booking.status, #requested)) {
      Runtime.trap("Can only cancel a booking before it is accepted");
    };
    let updated = Lib.transitionBooking(bookings, bookingId, #cancelled);
    // Rewards side-effect: reset the customer's streak with freeze protection
    // (a streak of 0 is left untouched). Wrapped in try/catch so a rewards
    // failure never breaks the primary cancellation.
    try {
      V3Lib.resetStreak(rewards, booking.customerId);
    } catch _ {};
    updated;
  };

  // Provider schedules an accepted booking.
  public shared ({ caller }) func scheduleBooking(bookingId : Nat) : async Types.Booking {
    let provider = requireProviderForCaller(caller);
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the provider on this booking");
    };
    let updated = Lib.transitionBooking(bookings, bookingId, #scheduled);
    // Email side-effect: notify the customer that the booking is scheduled.
    await Email.notifyCustomerBookingScheduled(
      emailNotificationsEnabled.value,
      users,
      booking.customerId,
      updated,
    );
    updated;
  };

  // Provider marks a scheduled booking as in-progress.
  public shared ({ caller }) func startBooking(bookingId : Nat) : async Types.Booking {
    let provider = requireProviderForCaller(caller);
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the provider on this booking");
    };
    Lib.transitionBooking(bookings, bookingId, #inProgress);
  };

  // Provider marks an in-progress booking as completed.
  public shared ({ caller }) func completeBooking(bookingId : Nat) : async Types.Booking {
    let provider = requireProviderForCaller(caller);
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the provider on this booking");
    };
    let updated = Lib.transitionBooking(bookings, bookingId, #completed);
    // Email side-effect: notify the customer that the booking is complete.
    await Email.notifyCustomerBookingCompleted(
      emailNotificationsEnabled.value,
      users,
      booking.customerId,
      updated,
    );
    // Rewards side-effects: award booking-completion points, increment the
    // customer's streak, and check/award any pending referral bonus. Each is
    // wrapped in try/catch so a rewards failure never breaks the primary
    // operation (the booking is already marked completed).
    try {
      ignore V3Lib.awardPoints(
        rewards,
        rewardLedger,
        nextRewardLedgerId,
        bookings,
        reviews,
        referrals,
        booking.customerId,
        100,
        "booking_completed",
      );
    } catch _ {};
    try {
      V3Lib.incrementStreak(rewards, booking.customerId);
    } catch _ {};
    try {
      ignore V3Lib.awardReferralOnFirstBooking(
        rewards,
        rewardLedger,
        nextRewardLedgerId,
        referrals,
        nextReferralId,
        bookings,
        reviews,
        booking.customerId,
      );
    } catch _ {};
    updated;
  };

  public query ({ caller }) func listMyBookings() : async [Types.Booking] {
    requireSignedIn(caller);
    // Return bookings where the caller is the customer OR the provider.
    let asCustomer = Lib.listBookingsByCustomer(bookings, caller);
    let provider = switch (Lib.getProviderByOwner(providers, caller)) {
      case (?p) ?p;
      case null null;
    };
    let asProvider : [Types.Booking] = switch (provider) {
      case (?p) Lib.listBookingsByProvider(bookings, p.id);
      case null [];
    };
    asCustomer.concat(asProvider);
  };

  public query ({ caller }) func listProviderBookings(providerId : Nat) : async [Types.Booking] {
    requireSignedIn(caller);
    // Only the provider owner or an admin may list a provider's bookings.
    let callerProvider = switch (Lib.getProviderByOwner(providers, caller)) {
      case (?p) ?p;
      case null null;
    };
    let isOwner = switch (callerProvider) {
      case (?p) p.id == providerId;
      case null false;
    };
    if (not isOwner and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: not the provider owner or admin");
    };
    Lib.listBookingsByProvider(bookings, providerId);
  };

  // ---- Reviews ----
  public query ({ caller }) func getReview(reviewId : Nat) : async ?Types.Review {
    requireSignedIn(caller);
    Lib.getReview(reviews, reviewId);
  };

  // Only the customer on a completed booking may review that booking, and only
  // once. After creating the review, the provider's aggregate rating is updated.
  public shared ({ caller }) func createReview(input : Types.ReviewInput) : async Types.Review {
    requireSignedIn(caller);
    let booking = switch (Lib.getBooking(bookings, input.bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.customerId != caller) {
      Runtime.trap("Unauthorized: only the booking customer may review");
    };
    if (not Lib.bookingStatusEquals(booking.status, #completed)) {
      Runtime.trap("Can only review a completed booking");
    };
    // Prevent duplicate reviews for the same booking.
    let existing = Lib.listReviewsByBooking(reviews, input.bookingId);
    if (existing.size() > 0) {
      Runtime.trap("Booking already reviewed");
    };
    let review = Lib.createReview(reviews, nextReviewId, input.bookingId, caller, booking.providerId, input);
    Lib.applyReviewToProviderRating(providers, booking.providerId, input.rating);
    // Transition the booking to #reviewed.
    ignore Lib.transitionBooking(bookings, input.bookingId, #reviewed);
    // Rewards side-effect: award review points to the reviewer. Wrapped in
    // try/catch so a rewards failure never breaks the primary review creation.
    try {
      ignore V3Lib.awardPoints(
        rewards,
        rewardLedger,
        nextRewardLedgerId,
        bookings,
        reviews,
        referrals,
        caller,
        20,
        "review_written",
      );
    } catch _ {};
    review;
  };

  // Only the provider on the reviewed booking may respond, and only once.
  public shared ({ caller }) func respondToReview(reviewId : Nat, response : Text) : async Types.Review {
    let provider = requireProviderForCaller(caller);
    let review = switch (Lib.getReview(reviews, reviewId)) {
      case (?r) r;
      case null Runtime.trap("Review not found");
    };
    if (review.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the reviewed provider");
    };
    Lib.respondToReview(reviews, reviewId, response);
  };

  public query ({ caller }) func listReviewsByProvider(providerId : Nat) : async [Types.Review] {
    requireSignedIn(caller);
    Lib.listReviewsByProvider(reviews, providerId);
  };

  public query ({ caller }) func listReviewsByBooking(bookingId : Nat) : async [Types.Review] {
    requireSignedIn(caller);
    Lib.listReviewsByBooking(reviews, bookingId);
  };

  // ---- Messaging ----
  public query ({ caller }) func getThread(bookingId : Nat) : async [Types.Message] {
    requireSignedIn(caller);
    // Only booking participants (customer or provider) may read the thread.
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    let callerProvider = switch (Lib.getProviderByOwner(providers, caller)) {
      case (?p) ?p;
      case null null;
    };
    let isProvider = switch (callerProvider) {
      case (?p) booking.providerId == p.id;
      case null false;
    };
    if (booking.customerId != caller and not isProvider and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: not a participant on this booking");
    };
    Lib.getThread(messages, bookingId);
  };

  public shared ({ caller }) func sendMessage(input : Types.MessageInput) : async Types.Message {
    requireSignedIn(caller);
    let booking = switch (Lib.getBooking(bookings, input.bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    let callerProvider = switch (Lib.getProviderByOwner(providers, caller)) {
      case (?p) ?p;
      case null null;
    };
    let isProvider = switch (callerProvider) {
      case (?p) booking.providerId == p.id;
      case null false;
    };
    if (booking.customerId != caller and not isProvider) {
      Runtime.trap("Unauthorized: not a participant on this booking");
    };
    let message = Lib.sendMessage(messages, nextMessageId, input.bookingId, caller, input);
    // Email side-effect: notify the non-sender participant of the new message.
    // If the sender is the provider, the customer is notified (and vice versa).
    // Only the customer-notification path is required by the spec; the
    // provider-notification path is included for symmetry but uses the same
    // customer-notification helper only when the sender is the provider.
    if (isProvider) {
      await Email.notifyCustomerNewMessage(
        emailNotificationsEnabled.value,
        users,
        booking.customerId,
        booking,
        message.content,
      );
    };
    message;
  };

  public shared ({ caller }) func markThreadRead(bookingId : Nat) : async () {
    requireSignedIn(caller);
    Lib.markThreadRead(messages, bookingId, caller);
  };

  // Count unread messages for the caller in a specific booking thread. Only
  // booking participants (customer, provider, or admin) may query a thread.
  public query ({ caller }) func getUnreadMessageCount(bookingId : Nat) : async Nat {
    requireSignedIn(caller);
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    let callerProvider = switch (Lib.getProviderByOwner(providers, caller)) {
      case (?p) ?p;
      case null null;
    };
    let isProvider = switch (callerProvider) {
      case (?p) booking.providerId == p.id;
      case null false;
    };
    if (booking.customerId != caller and not isProvider and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: not a participant on this booking");
    };
    Lib.countUnreadInThread(messages, bookingId, caller);
  };

  // ---- Availability ----
  public shared ({ caller }) func setAvailabilitySlot(input : Types.AvailabilitySlotInput) : async Types.AvailabilitySlot {
    let provider = requireProviderForCaller(caller);
    Lib.setSlot(slots, nextSlotId, provider.id, input);
  };

  public shared ({ caller }) func blockAvailabilitySlot(slotId : Nat) : async Types.AvailabilitySlot {
    let provider = requireProviderForCaller(caller);
    let slot = switch (slots.get(slotId)) {
      case (?s) s;
      case null Runtime.trap("Slot not found");
    };
    if (slot.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the slot owner");
    };
    Lib.blockSlot(slots, slotId);
  };

  public query ({ caller }) func checkAvailability(providerId : Nat, date : Text, time : ?Text) : async Bool {
    requireSignedIn(caller);
    Lib.checkAvailability(slots, providerId, date, time);
  };

  public query ({ caller }) func listAvailabilitySlots(providerId : Nat) : async [Types.AvailabilitySlot] {
    requireSignedIn(caller);
    Lib.listSlotsByProvider(slots, providerId);
  };

  // ---- Admin governance ----
  public shared ({ caller }) func approveProvider(providerId : Nat) : async Types.Provider {
    requireAdmin(caller);
    Lib.setProviderVerification(providers, providerId, #approved, null);
  };

  public shared ({ caller }) func rejectProvider(providerId : Nat, note : Text) : async Types.Provider {
    requireAdmin(caller);
    Lib.setProviderVerification(providers, providerId, #rejected, ?note);
  };

  public shared ({ caller }) func suspendProvider(providerId : Nat, note : Text) : async Types.Provider {
    requireAdmin(caller);
    Lib.setProviderVerification(providers, providerId, #suspended, ?note);
  };

  public shared ({ caller }) func reinstateProvider(providerId : Nat) : async Types.Provider {
    requireAdmin(caller);
    Lib.setProviderVerification(providers, providerId, #approved, null);
  };

  // Admin moderation of reviews. #hide soft-hides the review (sets hidden=true)
  // so it no longer appears in public listings or counts toward the provider's
  // aggregate rating; #restore sets hidden=false so it reappears. The provider's
  // aggregate rating is recomputed from non-hidden reviews after each action.
  public shared ({ caller }) func moderateReview(reviewId : Nat, action : { #hide; #restore }) : async Types.Review {
    requireAdmin(caller);
    let review = switch (Lib.getReview(reviews, reviewId)) {
      case (?r) r;
      case null Runtime.trap("Review not found");
    };
    let updated = switch (action) {
      case (#hide) Lib.hideReview(reviews, reviewId);
      case (#restore) Lib.restoreReview(reviews, reviewId);
    };
    // Recompute the provider's aggregate rating from non-hidden reviews.
    let visible = Lib.listReviewsByProvider(reviews, review.providerId);
    let newSum = visible.foldLeft(0, func(acc, r) = acc + r.rating);
    let newCount = visible.size();
    let provider = switch (providers.get(review.providerId)) {
      case (?p) p;
      case null return updated;
    };
    providers.add(review.providerId, { provider with ratingSum = newSum; ratingCount = newCount });
    updated;
  };

  // ---- Search & filtering ----
  public query ({ caller }) func searchProviders(filters : Types.SearchFilters) : async [Types.SearchResult] {
    requireSignedIn(caller);
    let results = Lib.search(listings, providers, filters);
    // Apply the availableOn date filter using the slots map (which the lib
    // does not have access to).
    switch (filters.availableOn) {
      case (?date) {
        results.filter(func(r) {
          Lib.checkAvailability(slots, r.provider.id, date, null);
        });
      };
      case null results;
    };
  };

  // ---- OpenAI admin-key settings ----
  // Admin sets a shared OpenAI API key used by all AI content generation calls.
  public query func isOpenAIConfigured() : async Bool {
    openAIApiKey.value != null;
  };

  public shared ({ caller }) func setOpenAIApiKey(key : Text) : async () {
    requireAdmin(caller);
    openAIApiKey.value := ?key;
  };

  // ---- Email notification settings (admin-gated) ----
  // Admin can turn all transactional email notifications on or off from the
  // admin portal. When false, every email helper skips sending silently.
  public query ({ caller }) func getEmailSettings() : async { emailNotificationsEnabled : Bool } {
    requireAdmin(caller);
    { emailNotificationsEnabled = emailNotificationsEnabled.value };
  };

  public shared ({ caller }) func setEmailNotificationsEnabled(enabled : Bool) : async () {
    requireAdmin(caller);
    emailNotificationsEnabled.value := enabled;
  };

  // ---- AI content generation (provider self-service) ----
  // All AI endpoints require a signed-in caller and a configured OpenAI key.

  public shared ({ caller }) func generateListingDescription(bulletPoints : Text, category : ?Types.ServiceCategory, tone : ?Types.Tone) : async Text {
    ignore requireProviderForCaller(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Write a compelling, professional service listing description for a DFW-area service provider based on these bullet points. Output only the description prose, no headings or bullet lists:" # OpenAI.categoryContext(category) # OpenAI.toneInstruction(tone) # "\n" # bulletPoints;
    await* OpenAI.runChatCompletion(OpenAI.configForKey(key), prompt);
  };

  public shared ({ caller }) func generateTitleAndTagline(keywords : Text, category : ?Types.ServiceCategory) : async [Text] {
    ignore requireProviderForCaller(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Generate 3 distinct title and tagline pairs for a DFW-area service provider. Use these keywords where natural: " # keywords # "." # OpenAI.categoryContext(category) # " Format each pair as 'Title — Tagline', one per line. Output only the three lines.";
    let result = await* OpenAI.runChatCompletion(OpenAI.configForKey(key), prompt);
    result.split(#text "\n").toArray();
  };

  public shared ({ caller }) func generatePromotionalContent(offerDetails : Text, category : ?Types.ServiceCategory, tone : ?Types.Tone) : async Text {
    ignore requireProviderForCaller(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Write short promotional copy (2-3 sentences) for a DFW-area service listing based on these offer details: " # offerDetails # "." # OpenAI.categoryContext(category) # OpenAI.toneInstruction(tone) # " Output only the promotional copy.";
    await* OpenAI.runChatCompletion(OpenAI.configForKey(key), prompt);
  };

  // ---- AI image analysis (vision, gpt-4o) ----
  // Each endpoint accepts a single uploaded work photo (Storage.ExternalBlob)
  // and returns a full AI-generated assessment as Text. All require a signed-in
  // caller and a configured OpenAI key. The vision model is gpt-4o with
  // is_replicated=?false (see lib/openai.mo runVisionCompletion).

  public shared ({ caller }) func analyzeImageDescription(image : Storage.ExternalBlob) : async Text {
    requireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Provide a full detailed description of the work shown in this image. Describe what you see, the setting, tools, materials, and the nature of the work being done.";
    await* OpenAI.runVisionCompletion(OpenAI.configForKey(key), image, prompt);
  };

  public shared ({ caller }) func analyzeImageWork(image : Storage.ExternalBlob) : async Text {
    requireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Provide a full work-quality analysis of this image. Assess the materials, craftsmanship, completeness, and professional quality of the work shown. Give specific observations and an overall assessment.";
    await* OpenAI.runVisionCompletion(OpenAI.configForKey(key), image, prompt);
  };

  public shared ({ caller }) func analyzeImageSafety(image : Storage.ExternalBlob) : async Text {
    requireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Provide a full safety assessment of this image. Identify any hazards, PPE usage, compliance concerns, and safety recommendations for the work environment shown.";
    await* OpenAI.runVisionCompletion(OpenAI.configForKey(key), image, prompt);
  };

  // ---- AI text generation (gpt-4o-mini, matching existing pattern) ----
  // New text generators for bios, company descriptions, booking messages,
  // reply suggestions, and review drafts. All require a signed-in caller and
  // a configured OpenAI key.

  public shared ({ caller }) func generateBio(profileInfo : Text, tone : ?Types.Tone) : async Text {
    requireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Draft a professional bio for a service marketplace user based on this profile info: " # profileInfo # "." # OpenAI.toneInstruction(tone);
    await* OpenAI.runChatCompletion(OpenAI.configForKey(key), prompt);
  };

  public shared ({ caller }) func generateCompanyDescription(companyInfo : Text, tone : ?Types.Tone) : async Text {
    requireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Draft a compelling company description for a service provider based on this info: " # companyInfo # "." # OpenAI.toneInstruction(tone);
    await* OpenAI.runChatCompletion(OpenAI.configForKey(key), prompt);
  };

  public shared ({ caller }) func generateBookingMessage(bookingContext : Text) : async Text {
    requireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let prompt = "Draft a professional request message to a service provider based on this booking context: " # bookingContext;
    await* OpenAI.runChatCompletion(OpenAI.configForKey(key), prompt);
  };

  // Suggest a contextually-relevant reply in a booking thread. The caller
  // supplies the bookingId; the prior messages in that thread are pulled from
  // the messages map and injected into the prompt so the suggestion reflects
  // the actual conversation, not a generic reply. The optional
  // conversationContext lets the caller add extra instructions (e.g. desired
  // tone or a specific point to address). Only booking participants may use
  // this endpoint (same gate as getThread / sendMessage).
  public shared ({ caller }) func suggestReply(bookingId : Nat, conversationContext : ?Text) : async Text {
    requireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    let callerProvider = switch (Lib.getProviderByOwner(providers, caller)) {
      case (?p) ?p;
      case null null;
    };
    let isProvider = switch (callerProvider) {
      case (?p) booking.providerId == p.id;
      case null false;
    };
    if (booking.customerId != caller and not isProvider and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: not a participant on this booking");
    };
    // Build the conversation transcript from the thread's prior messages,
    // labeled by role (customer / provider) so the model understands who said
    // what. The caller is the one replying, so the suggestion is drafted from
    // their perspective.
    let thread = Lib.getThread(messages, bookingId);
    let callerRoleLabel : Text = if (isProvider) "provider" else "customer";
    let transcript = thread.foldLeft(
      "",
      func(acc : Text, m : Types.Message) : Text {
        let senderLabel = if (m.sender == booking.customerId) "customer" else "provider";
        acc # "\n" # senderLabel # ": " # m.content;
      },
    );
    let contextLine = switch (conversationContext) {
      case (?c) "\nAdditional instruction: " # c;
      case null "";
    };
    let prompt = "You are drafting a reply for the " # callerRoleLabel # " in a service-booking conversation. Here is the conversation so far:" # transcript # "\n\nDraft a single, contextually-relevant reply from the " # callerRoleLabel # "'s perspective that moves the conversation forward helpfully and professionally. Output only the reply text, no preamble." # contextLine;
    await* OpenAI.runChatCompletion(OpenAI.configForKey(key), prompt);
  };

  // Draft a customer review for a completed booking. Takes the booking's
  // category and job details (resolved from the booking record) plus the
  // caller's optional extra notes so the draft is specific to the service
  // received. The bookingId is used to look up the real booking; the legacy
  // bookingDetails/rating parameters are kept as optional overrides for
  // callers that want to supply their own framing.
  public shared ({ caller }) func generateReviewDraft(bookingId : Nat, rating : Nat, extraNotes : ?Text) : async Text {
    requireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let booking = switch (Lib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.customerId != caller) {
      Runtime.trap("Unauthorized: only the booking customer may draft a review");
    };
    let categoryLine = OpenAI.categoryContext(?booking.category);
    let notesLine = switch (extraNotes) {
      case (?n) "\nAdditional customer notes: " # n;
      case null "";
    };
    let prompt = "Draft a customer review for a completed service booking. Service category:" # categoryLine # " Job details: " # booking.jobDetails # ". Address: " # booking.address # ". Rating: " # rating.toText() # "/5. Write a thoughtful review that reflects this rating and is specific to the service received." # notesLine # " Output only the review text.";
    await* OpenAI.runChatCompletion(OpenAI.configForKey(key), prompt);
  };
};
