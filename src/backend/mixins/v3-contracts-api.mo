// V3 contracts public API mixin.
//
// Auth-gated public API methods for the V3 embedded-protocol and
// intelligence-layer features. Delegates to lib/v3-contracts.mo and enforces
// role-based access via the injected accessControlState.
//
// Domains exposed:
//   - trust/verification: getTrustScore, getVerification, updateVerificationTier
//   - disputes: openDispute, respondToDispute, resolveDispute, escalateDispute,
//     listDisputes, listDisputesByBooking
//   - community reports: reportTarget, listReports, resolveReport
//   - rewards: getMyRewards, getRewardsByUser, awardPoints, getRewardLedger,
//     getMyReferralCode, applyReferral, getLeaderboard
//   - microsites: getMicrosite, getMicrositeBySlug, upsertMyMicrosite,
//     publishMicrosite, generateMicrosite
//   - docs: listDocs, getDoc, getDocBySlug, createDoc, updateDoc, publishDoc,
//     listDocsByCategory
//   - AI: matchProviders, aiAssistant, aiSearch, generateReviewSummary,
//     generateProviderInsights, triageDispute
//
// Authorization model: same as marketplace-core-api — a caller must be a
// signed-in non-anonymous principal for any state-mutating endpoint; admin
// gates apply to moderation (resolveDispute, escalateDispute, resolveReport,
// awardPoints, updateVerificationTier, createDoc, updateDoc, publishDoc) and
// to AI admin-key configuration.

import AccessControl "mo:caffeineai-authorization/access-control";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Types "../types/v3-contracts";
import CoreTypes "../types/marketplace-core";
import Lib "../lib/v3-contracts";
import OpenAI "../lib/openai";
import CoreLib "../lib/marketplace-core";

mixin (
  accessControlState : AccessControl.AccessControlState,
  users : Map.Map<CoreTypes.UserId, CoreTypes.User>,
  providers : Map.Map<Nat, CoreTypes.Provider>,
  listings : Map.Map<Nat, CoreTypes.ServiceListing>,
  bookings : Map.Map<Nat, CoreTypes.Booking>,
  reviews : Map.Map<Nat, CoreTypes.Review>,
  disputes : Map.Map<Nat, Types.Dispute>,
  communityReports : Map.Map<Nat, Types.CommunityReport>,
  rewards : Map.Map<Types.UserId, Types.RewardProfile>,
  rewardLedger : Map.Map<Nat, Types.RewardLedgerEntry>,
  referrals : Map.Map<Nat, Types.Referral>,
  microsites : Map.Map<Nat, Types.Microsite>,
  docs : Map.Map<Nat, Types.Doc>,
  providerVerifications : Map.Map<Nat, Types.VerificationTiers>,
  assistantSessions : Map.Map<Types.UserId, [Types.AssistantMessage]>,
  nextDisputeId : { var value : Nat },
  nextReportId : { var value : Nat },
  nextRewardLedgerId : { var value : Nat },
  nextReferralId : { var value : Nat },
  nextMicrositeId : { var value : Nat },
  nextDocId : { var value : Nat },
  openAIApiKey : { var value : ?Text },
) {
  // ---- Auth helpers ----
  // NOTE: prefixed with `v3` to avoid duplicate-definition collisions with the
  // private helpers of the same name in mixins/marketplace-core-api.mo when
  // both mixins are included in main.mo.
  func v3RequireSignedIn(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: sign in required");
    };
  };

  func v3RequireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
  };

  // Resolve the provider owned by the caller. Traps if the caller is not a
  // registered provider.
  func v3RequireProviderForCaller(caller : Principal) : CoreTypes.Provider {
    v3RequireSignedIn(caller);
    switch (CoreLib.getProviderByOwner(providers, caller)) {
      case (?p) p;
      case null Runtime.trap("Caller is not a registered provider");
    };
  };

  // ---- Trust & verification ----
  public query ({ caller }) func getTrustScore(providerId : Nat) : async Types.TrustScore {
    Lib.computeTrustScore(providerVerifications, providers, bookings, reviews, disputes, providerId);
  };

  public query ({ caller }) func getVerification(providerId : Nat) : async Types.VerificationTiers {
    Lib.getVerificationTiers(providerVerifications, providerId);
  };

  public shared ({ caller }) func updateVerificationTier(
    providerId : Nat,
    tier : { #identity; #business; #insurance; #background },
    status : Types.VerificationTierStatus,
    note : ?Text,
  ) : async Types.VerificationTiers {
    v3RequireAdmin(caller);
    Lib.updateVerificationTier(providerVerifications, providerId, tier, status, note);
  };

  // ---- Disputes ----
  // openDispute: requires the caller is the booking customer.
  public shared ({ caller }) func openDispute(input : Types.DisputeInput) : async Types.Dispute {
    v3RequireSignedIn(caller);
    let booking = switch (CoreLib.getBooking(bookings, input.bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    if (booking.customerId != caller) {
      Runtime.trap("Unauthorized: only the booking customer may open a dispute");
    };
    Lib.openDispute(disputes, nextDisputeId, input.bookingId, caller, input.reason);
  };

  // respondToDispute: requires the caller is the provider on the booking.
  public shared ({ caller }) func respondToDispute(disputeId : Nat, response : Text) : async Types.Dispute {
    let provider = v3RequireProviderForCaller(caller);
    let dispute = switch (disputes.get(disputeId)) {
      case (?d) d;
      case null Runtime.trap("Dispute not found");
    };
    let booking = switch (CoreLib.getBooking(bookings, dispute.bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found for dispute");
    };
    if (booking.providerId != provider.id) {
      Runtime.trap("Unauthorized: only the booking provider may respond");
    };
    Lib.respondToDispute(disputes, disputeId, response);
  };

  // resolveDispute: admin-only.
  public shared ({ caller }) func resolveDispute(disputeId : Nat, resolution : Text) : async Types.Dispute {
    v3RequireAdmin(caller);
    Lib.resolveDispute(disputes, disputeId, resolution);
  };

  // escalateDispute: admin-only.
  public shared ({ caller }) func escalateDispute(disputeId : Nat) : async Types.Dispute {
    v3RequireAdmin(caller);
    Lib.escalateDispute(disputes, disputeId);
  };

  // listDisputes: admin sees all; non-admin sees only disputes they are a
  // participant on (customer or provider).
  public query ({ caller }) func listDisputes() : async [Types.Dispute] {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return Lib.listDisputes(disputes);
    };
    v3RequireSignedIn(caller);
    let callerProvider = switch (CoreLib.getProviderByOwner(providers, caller)) {
      case (?p) ?p;
      case null null;
    };
    Lib.listDisputes(disputes).filter(func(d : Types.Dispute) : Bool {
      switch (CoreLib.getBooking(bookings, d.bookingId)) {
        case (?b) {
          let isProvider = switch (callerProvider) {
            case (?p) b.providerId == p.id;
            case null false;
          };
          b.customerId == caller or isProvider or d.openedBy == caller;
        };
        case null d.openedBy == caller;
      };
    });
  };

  // listDisputesByBooking: signed-in; only booking participants may view.
  public query ({ caller }) func listDisputesByBooking(bookingId : Nat) : async [Types.Dispute] {
    v3RequireSignedIn(caller);
    let booking = switch (CoreLib.getBooking(bookings, bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found");
    };
    let callerProvider = switch (CoreLib.getProviderByOwner(providers, caller)) {
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
    Lib.listDisputesByBooking(disputes, bookingId);
  };

  // ---- Community reports ----
  // reportTarget: signed-in.
  public shared ({ caller }) func reportTarget(input : Types.CommunityReportInput) : async Types.CommunityReport {
    v3RequireSignedIn(caller);
    Lib.reportTarget(communityReports, nextReportId, caller, input);
  };

  // listReports: admin-only.
  public query ({ caller }) func listReports() : async [Types.CommunityReport] {
    v3RequireAdmin(caller);
    Lib.listReports(communityReports);
  };

  // resolveReport: admin-only.
  public shared ({ caller }) func resolveReport(reportId : Nat, resolutionNote : Text, dismiss : Bool) : async Types.CommunityReport {
    v3RequireAdmin(caller);
    Lib.resolveReport(communityReports, reportId, resolutionNote, dismiss);
  };

  // ---- Rewards ----
  public query ({ caller }) func getMyRewards() : async ?Types.RewardProfile {
    v3RequireSignedIn(caller);
    rewards.get(caller);
  };

  public query ({ caller }) func getRewardsByUser(userId : Types.UserId) : async ?Types.RewardProfile {
    rewards.get(userId);
  };

  // awardPoints: admin-only (also used internally by lifecycle hooks, but the
  // public endpoint is admin-gated).
  public shared ({ caller }) func awardPoints(userId : Types.UserId, points : Nat, reason : Text) : async Types.RewardLedgerEntry {
    v3RequireAdmin(caller);
    Lib.awardPoints(rewards, rewardLedger, nextRewardLedgerId, bookings, reviews, referrals, userId, points, reason);
  };

  // getRewardLedger: signed-in; a user may view their own ledger, an admin may
  // view any user's ledger.
  public query ({ caller }) func getRewardLedger(userId : Types.UserId) : async [Types.RewardLedgerEntry] {
    v3RequireSignedIn(caller);
    if (caller != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: can only view your own reward ledger");
    };
    Lib.getRewardLedger(rewardLedger, userId);
  };

  public query ({ caller }) func getMyReferralCode() : async Text {
    v3RequireSignedIn(caller);
    let profile = Lib.getOrInitRewardProfile(rewards, caller);
    profile.referralCode;
  };

  public shared ({ caller }) func applyReferral(referralCode : Text) : async Types.Referral {
    v3RequireSignedIn(caller);
    // Ensure the caller has a reward profile (and thus a referral code) before
    // applying someone else's, so self-referral can be detected.
    ignore Lib.getOrInitRewardProfile(rewards, caller);
    Lib.applyReferral(rewards, referrals, nextReferralId, caller, referralCode);
  };

  public query ({ caller }) func getLeaderboard(limit : Nat) : async [Types.RewardProfile] {
    Lib.getLeaderboard(rewards, limit);
  };

  // ---- Microsites ----
  public query ({ caller }) func getMicrosite(micrositeId : Nat) : async ?Types.Microsite {
    microsites.get(micrositeId);
  };

  public query ({ caller }) func getMicrositeBySlug(slug : Text) : async ?Types.Microsite {
    Lib.getMicrositeBySlug(microsites, slug);
  };

  // upsertMyMicrosite: requires the caller owns the provider profile.
  public shared ({ caller }) func upsertMyMicrosite(input : Types.MicrositeInput) : async Types.Microsite {
    let provider = v3RequireProviderForCaller(caller);
    Lib.upsertMicrosite(microsites, nextMicrositeId, provider.id, input);
  };

  // publishMicrosite: ownership check.
  public shared ({ caller }) func publishMicrosite(micrositeId : Nat, published : Bool) : async Types.Microsite {
    let provider = v3RequireProviderForCaller(caller);
    let existing = switch (microsites.get(micrositeId)) {
      case (?m) m;
      case null Runtime.trap("Microsite not found");
    };
    if (existing.providerId != provider.id) {
      Runtime.trap("Unauthorized: not the microsite owner");
    };
    Lib.publishMicrosite(microsites, micrositeId, published);
  };

  // generateMicrosite: ownership + OpenAI key check, async* AI call.
  public shared ({ caller }) func generateMicrosite(providerId : Nat) : async Types.Microsite {
    let provider = v3RequireProviderForCaller(caller);
    if (provider.id != providerId) {
      Runtime.trap("Unauthorized: not the provider owner");
    };
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    await* Lib.generateMicrosite(microsites, nextMicrositeId, providers, listings, OpenAI.configForKey(key), providerId);
  };

  // ---- Docs ----
  // listDocs: public; non-admin sees only published docs, admin sees all.
  // Seeds default docs on first access if empty.
  public query ({ caller }) func listDocs() : async [Types.Doc] {
    if (docs.size() == 0) {
      // Seeding is a mutation; queries cannot mutate. The seed is performed
      // lazily by the first update-path caller (createDoc) or by an admin via
      // a separate path. For the public query, return published docs (empty
      // until seeded).
      return Lib.listPublishedDocs(docs);
    };
    if (AccessControl.isAdmin(accessControlState, caller)) {
      Lib.listAllDocs(docs);
    } else {
      Lib.listPublishedDocs(docs);
    };
  };

  // getDoc: public; returns null for draft docs unless caller is admin.
  public query ({ caller }) func getDoc(docId : Nat) : async ?Types.Doc {
    switch (docs.get(docId)) {
      case null null;
      case (?d) {
        if (d.status == #published or AccessControl.isAdmin(accessControlState, caller)) {
          ?d;
        } else {
          null;
        };
      };
    };
  };

  // getDocBySlug: public; returns null for draft docs unless caller is admin.
  public query ({ caller }) func getDocBySlug(slug : Text) : async ?Types.Doc {
    switch (Lib.getDocBySlug(docs, slug)) {
      case null null;
      case (?d) {
        if (d.status == #published or AccessControl.isAdmin(accessControlState, caller)) {
          ?d;
        } else {
          null;
        };
      };
    };
  };

  // listDocsByCategory: public; non-admin sees only published docs in the
  // category.
  public query ({ caller }) func listDocsByCategory(category : Text) : async [Types.Doc] {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      docs.values().toArray().filter(func(d : Types.Doc) : Bool { d.category == category });
    } else {
      Lib.listPublishedDocsByCategory(docs, category);
    };
  };

  // createDoc: admin-only. Seeds default docs first if the collection is empty
  // so the help center is never blank on first admin access.
  public shared ({ caller }) func createDoc(input : Types.DocInput) : async Types.Doc {
    v3RequireAdmin(caller);
    if (docs.size() == 0) {
      Lib.seedDefaultDocs(docs, nextDocId, caller);
    };
    Lib.createDoc(docs, nextDocId, caller, input);
  };

  // updateDoc: admin-only.
  public shared ({ caller }) func updateDoc(docId : Nat, input : Types.DocInput) : async Types.Doc {
    v3RequireAdmin(caller);
    Lib.updateDoc(docs, docId, input);
  };

  // publishDoc: admin-only.
  public shared ({ caller }) func publishDoc(docId : Nat, status : Types.DocStatus) : async Types.Doc {
    v3RequireAdmin(caller);
    Lib.publishDoc(docs, docId, status);
  };

  // ---- AI (intelligence layer) ----
  // matchProviders: signed-in.
  public shared ({ caller }) func matchProviders(input : Types.MatchProvidersInput) : async [Types.ProviderMatch] {
    v3RequireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    await* Lib.matchProviders(providers, listings, OpenAI.configForKey(key), input);
  };

  // aiAssistant: signed-in.
  public shared ({ caller }) func aiAssistant(input : Types.AssistantInput) : async Types.AssistantMessage {
    v3RequireSignedIn(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    await* Lib.aiAssistant(assistantSessions, users, providers, bookings, OpenAI.configForKey(key), caller, input);
  };

  // aiSearch: public.
  public shared ({ caller }) func aiSearch(searchQuery : Text) : async [Types.AISearchResult] {
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    await* Lib.aiSearch(listings, providers, OpenAI.configForKey(key), searchQuery);
  };

  // generateReviewSummary: public.
  public shared ({ caller }) func generateReviewSummary(providerId : Nat) : async Types.ReviewSummary {
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    await* Lib.generateReviewSummary(reviews, OpenAI.configForKey(key), providerId);
  };

  // generateProviderInsights: caller owns the provider OR admin.
  public shared ({ caller }) func generateProviderInsights(providerId : Nat) : async Types.ProviderInsights {
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    if (not isAdmin) {
      let provider = v3RequireProviderForCaller(caller);
      if (provider.id != providerId) {
        Runtime.trap("Unauthorized: not the provider owner");
      };
    };
    await* Lib.generateProviderInsights(providers, listings, bookings, reviews, OpenAI.configForKey(key), providerId);
  };

  // triageDispute: admin-only. Stores the AI triage suggestion on the dispute
  // record after the AI call returns.
  public shared ({ caller }) func triageDispute(disputeId : Nat) : async Types.DisputeTriage {
    v3RequireAdmin(caller);
    let ?key = openAIApiKey.value else Runtime.trap("OpenAI is not configured");
    let triage = await* Lib.triageDispute(disputes, bookings, OpenAI.configForKey(key), disputeId);
    // Store the suggestion on the dispute record.
    let suggestionText = "Severity: " # triage.severity # " | Resolution: " # triage.suggestedResolution # " | Rationale: " # triage.rationale;
    ignore Lib.setDisputeTriageSuggestion(disputes, disputeId, suggestionText);
    triage;
  };
};
