// V3 contracts domain logic.
//
// Pure domain logic for the V3 embedded-protocol and intelligence-layer
// features. This module is stateless: state is injected by the mixin layer and
// ID counters are wrapped in `{ var value : Nat }` records so mutations
// propagate back to the caller.
//
// Two groups of functions live here:
//   1. Session-store helpers for the AI assistant (getAssistantSession,
//      appendAssistantMessage) — pure collection operations, no OpenAI calls.
//   2. The V3 AI intelligence layer (matchProviders, aiAssistant, aiSearch,
//      generateReviewSummary, generateProviderInsights, triageDispute). Each
//      builds a rich prompt from real marketplace data and calls
//      OpenAI.runChatCompletion (gpt-4o-mini, admin-key variant,
//      is_replicated=?false). Structured results are parsed from the model's
//      line-delimited text response with safe fallbacks.
//
// NOTE on trust scores: lib getTrustScore is owned by the trust/verification
// domain and is still a contract stub. Calling it would trap, so the AI
// ranking functions here use a rating-based trust proxy
// (ratingSum/ratingCount + verificationStatus) injected into the prompt. When
// getTrustScore is implemented it can be threaded in here without changing
// these signatures.
//
// NOTE on availability: the v3 mixin does not receive the slots collection, so
// matchProviders/aiSearch use active-listing presence as the availability
// signal fed to the model. The model ranks on the data provided.

import Array "mo:core/Array";
import Char "mo:core/Char";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import OpenAI "../lib/openai";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Types "../types/v3-contracts";
import CoreTypes "../types/marketplace-core";

module {
  // ---- Internal helpers ----

  // Average rating for a provider as a 0-5 Text label, or "no reviews" when
  // the provider has no ratings. Used to give the model a compact trust signal.
  func ratingLabel(provider : CoreTypes.Provider) : Text {
    if (provider.ratingCount == 0) { "no reviews" } else {
      // integer average 0-5
      let avg = provider.ratingSum / provider.ratingCount;
      avg.toText() # "/5 (" # provider.ratingCount.toText() # " reviews)"
    };
  };

  // Verification status as a short Text label for prompt injection.
  func verificationLabel(provider : CoreTypes.Provider) : Text {
    switch (provider.verificationStatus) {
      case (#approved) "verified";
      case (#pending) "pending verification";
      case (#rejected) "rejected";
      case (#suspended) "suspended";
    };
  };

  // Render a provider's service categories as a comma-separated Text list.
  func categoriesText(provider : CoreTypes.Provider) : Text {
    let labels = provider.serviceCategories.map(func(c : CoreTypes.ServiceCategory) : Text {
      OpenAI.categoryLabel(?c)
    });
    labels.vals().join(", ");
  };

  // Render a provider's service areas as a comma-separated Text list.
  func serviceAreasText(provider : CoreTypes.Provider) : Text {
    if (provider.serviceAreas.size() == 0) { "unspecified" } else {
      provider.serviceAreas.vals().join(", ")
    };
  };

  // True if the provider serves the given area (case-insensitive substring
  // match against any of the provider's serviceAreas). Empty area hint matches
  // all.
  func servesArea(provider : CoreTypes.Provider, area : ?Text) : Bool {
    switch (area) {
      case null true;
      case (?a) {
        let aLower = a.toLower();
        provider.serviceAreas.any(func(sa : Text) : Bool {
          sa.toLower().contains(#text aLower)
        })
      };
    };
  };

  // Count a provider's active listings.
  func activeListingCount(
    listings : Map.Map<Nat, CoreTypes.ServiceListing>,
    providerId : Nat,
  ) : Nat {
    listings.foldLeft(
      0,
      func(acc : Nat, _id : Nat, l : CoreTypes.ServiceListing) : Nat {
        if (l.providerId == providerId and l.active) { acc + 1 } else { acc }
      },
    );
  };

  // Build a compact one-line provider summary for prompt injection.
  func providerSummary(
    providers : Map.Map<Nat, CoreTypes.Provider>,
    listings : Map.Map<Nat, CoreTypes.ServiceListing>,
    providerId : Nat,
  ) : ?Text {
    switch (providers.get(providerId)) {
      case null null;
      case (?p) {
        let active = activeListingCount(listings, providerId);
        ?(
          "Provider " # p.id.toText() # ": " # p.companyName #
          " | categories: " # categoriesText(p) #
          " | service areas: " # serviceAreasText(p) #
          " | status: " # verificationLabel(p) #
          " | rating: " # ratingLabel(p) #
          " | active listings: " # active.toText() #
          (switch (p.description) { case (?d) " | " # d; case null "" })
        )
      };
    };
  };

  // Parse the first non-empty line of a Text response (used for single-value
  // AI outputs like assistant replies, review summaries, insights narratives).
  func firstLine(text : Text) : Text {
    let trimmed = text.trim(#char ' ');
    let lines = trimmed.split(#char '\n');
    switch (lines.next()) {
      case (?l) l.trim(#char ' ');
      case null trimmed;
    };
  };

  // Parse a Nat from Text, returning 0 on failure (safe fallback for scores).
  func parseNat(text : Text) : Nat {
    let trimmed = text.trim(#char ' ');
    switch (Nat.fromText(trimmed)) {
      case (?n) if (n > 100) { 100 } else { n };
      case null 0;
    };
  };

  // Parse the model's structured response for matchProviders / aiSearch.
  // Expected format per result line:
  //   <id>|<score 0-100>|<rationale>
  // Lines that do not parse are skipped. Returns at most `limit` results.
  func parseRankedLines(text : Text, limit : Nat) : [(Nat, Nat, Text)] {
    let lines = text.split(#char '\n');
    let collected : List.List<(Nat, Nat, Text)> = List.empty();
    for (line in lines) {
      let l = line.trim(#char ' ');
      if (l.size() == 0) {} else {
        // Split on '|' into up to 3 fields.
        let parts = l.split(#char '|');
        let idText = switch (parts.next()) { case (?x) x.trim(#char ' '); case null "" };
        let scoreText = switch (parts.next()) { case (?x) x.trim(#char ' '); case null "" };
        // Rationale is the remainder; rejoin any '|' that were inside it.
        let rationale = switch (parts.next()) { case (?x) x.trim(#char ' '); case null "" };
        switch (Nat.fromText(idText)) {
          case (?id) {
            if (collected.size() < limit) {
              collected.add((id, parseNat(scoreText), rationale))
            };
          };
          case null {};
        };
      };
    };
    collected.toArray();
  };

  // ---- AI assistant session store ----
  // Returns the user's conversation history, or an empty array if none.
  public func getAssistantSession(
    assistantSessions : Map.Map<Types.UserId, [Types.AssistantMessage]>,
    userId : Types.UserId,
  ) : [Types.AssistantMessage] {
    switch (assistantSessions.get(userId)) {
      case (?msgs) msgs;
      case null [];
    };
  };

  // Append a message to the user's session, keeping only the last 20 messages
  // to control token usage. Stores the trimmed array back in the map.
  public func appendAssistantMessage(
    assistantSessions : Map.Map<Types.UserId, [Types.AssistantMessage]>,
    userId : Types.UserId,
    message : Types.AssistantMessage,
  ) : [Types.AssistantMessage] {
    let current = getAssistantSession(assistantSessions, userId);
    let appended = current.concat([message]);
    // Keep only the last 20 messages.
    let kept = if (appended.size() > 20) {
      let dropCount = appended.size() - 20;
      appended.vals().drop(dropCount).toArray()
    } else {
      appended
    };
    assistantSessions.add(userId, kept);
    kept;
  };

  // ---- AI: provider matching engine ----
  // Ranks providers for a customer need. Gathers real provider data (category
  // match, service-area match, rating/verification trust proxy, active-listing
  // availability), feeds it to gpt-4o-mini with the natural-language need, and
  // returns the top 3 ProviderMatch records with score (0-100) and rationale.
  public func matchProviders(
    providers : Map.Map<Nat, CoreTypes.Provider>,
    listings : Map.Map<Nat, CoreTypes.ServiceListing>,
    config : OpenAI.Config,
    input : Types.MatchProvidersInput,
  ) : async* [Types.ProviderMatch] {
    // Gather candidate providers. Filter by service-area hint when supplied;
    // exclude suspended providers (they cannot take new work).
    let candidates = providers.foldLeft(
      Array.empty<CoreTypes.Provider>(),
      func(acc : [CoreTypes.Provider], _id : Nat, p : CoreTypes.Provider) : [CoreTypes.Provider] {
        if (p.verificationStatus == #suspended) { acc } else {
          if (servesArea(p, input.serviceArea)) {
            acc.concat([p])
          } else {
            acc
          }
        }
      },
    );

    if (candidates.size() == 0) { return [] };

    // Build a compact candidate dossier for the model.
    let dossier = candidates.foldLeft(
      "",
      func(acc : Text, p : CoreTypes.Provider) : Text {
        let active = activeListingCount(listings, p.id);
        acc # "\n- " # p.id.toText() # "|" # p.companyName #
          "|" # categoriesText(p) #
          "|" # serviceAreasText(p) #
          "|" # verificationLabel(p) #
          "|" # ratingLabel(p) #
          "|" # active.toText() # " active listings"
      },
    );

    let categoryHint = switch (input.category) {
      case (?c) " The customer is interested in: " # c # ".";
      case null "";
    };
    let areaHint = switch (input.serviceArea) {
      case (?a) " The customer's service area is: " # a # ".";
      case null "";
    };

    let prompt =
      "You are the matching engine for the DFW Service Hub marketplace (box truck hauling, relocation, trash haul/junk removal, and moving services across the Dallas-Fort Worth area). " #
      "A customer described their need. Rank the candidate providers by how well they match, considering: category fit, service-area coverage, trust (verification status + rating + review count), availability (active listings), and price competitiveness where known." # categoryHint # areaHint #
      "\n\nCustomer need: " # input.need #
      "\n\nCandidate providers (format: id|companyName|categories|serviceAreas|verificationStatus|rating|activeListings):" # dossier #
      "\n\nReturn the TOP 3 providers, one per line, in the format: providerId|score(0-100)|rationale. The rationale is one sentence explaining why this provider matches the customer's need. Output only the 3 lines, no preamble or extra text.";

    let result = await* OpenAI.runChatCompletion(config, prompt);
    let parsed = parseRankedLines(result, 3);

    // Map parsed (id, score, rationale) to ProviderMatch, validating the id
    // refers to an actual candidate provider.
    let validIds = candidates.map(func(p : CoreTypes.Provider) : Nat { p.id });
    let matches = parsed.filterMap(func((id, score, rationale) : (Nat, Nat, Text)) : ?Types.ProviderMatch {
      if (validIds.contains(id)) {
        ?{ providerId = id; score = score; rationale = rationale }
      } else {
        null
      }
    });
    matches;
  };

  // ---- AI: conversational assistant ----
  // Maintains a per-user session and responds using gpt-4o-mini. The system
  // context establishes the assistant as a DFW Service Hub helper and injects
  // the user's real context (role, bookings, provider profile). Appends both
  // the user message and the assistant response to the session.
  public func aiAssistant(
    assistantSessions : Map.Map<Types.UserId, [Types.AssistantMessage]>,
    users : Map.Map<CoreTypes.UserId, CoreTypes.User>,
    providers : Map.Map<Nat, CoreTypes.Provider>,
    bookings : Map.Map<Nat, CoreTypes.Booking>,
    config : OpenAI.Config,
    userId : Types.UserId,
    input : Types.AssistantInput,
  ) : async* Types.AssistantMessage {
    let now = Time.now();

    // Build real user context for the prompt.
    let userContext = switch (users.get(userId)) {
      case (?u) {
        let roleLabel = switch (u.role) {
          case (#customer) "customer";
          case (#provider) "provider";
          case (#admin) "admin";
        };
        let providerLine = switch (providers.foldLeft(
          ?"",
          func(acc : ?Text, _id : Nat, p : CoreTypes.Provider) : ?Text {
            if (p.ownerPrincipal == userId) {
              let accText = switch (acc) { case (?a) a; case null "" };
              ?(accText # " Owns provider: " # p.companyName # " (id " # p.id.toText() # ", " # verificationLabel(p) # ").")
            } else {
              acc
            }
          },
        )) {
          case (?l) l;
          case null "";
        };
        let myBookings = bookings.foldLeft(
          0,
          func(acc : Nat, _id : Nat, b : CoreTypes.Booking) : Nat {
            if (b.customerId == userId or pOwnsBooking(providers, b, userId)) { acc + 1 } else { acc }
          },
        );
        "The user is signed in as a " # roleLabel # " named " # u.displayName # "." # providerLine # " They have " # myBookings.toText() # " booking(s) on the platform."
      };
      case null "The user is signed in.";
    };

    // Build conversation history (last 20 messages) as a transcript.
    let history = getAssistantSession(assistantSessions, userId);
    let transcript = history.foldLeft(
      "",
      func(acc : Text, m : Types.AssistantMessage) : Text {
        let roleLabel = switch (m.role) {
          case (#user) "User";
          case (#assistant) "Assistant";
        };
        acc # "\n" # roleLabel # ": " # m.content
      },
    );

    let contextLine = switch (input.context) {
      case (?c) "\nCurrent page/feature context: " # c;
      case null "";
    };

    let prompt =
      "You are the AI assistant for the DFW Service Hub marketplace (box truck hauling, relocation, trash haul/junk removal, and moving services across Dallas-Fort Worth). " #
      "You help users: answer platform questions (how to book, how verification works, how disputes work, how trust scores work), draft messages to providers/customers, explain trust scores, and guide bookings. " #
      "Be concise, helpful, and specific to the DFW service context. If a question is outside the platform's scope, say so briefly." #
      "\n\n" # userContext # contextLine #
      "\n\nConversation so far:" # transcript #
      "\n\nUser: " # input.message #
      "\n\nRespond as the Assistant. Output only the reply text, no preamble.";

    let reply = await* OpenAI.runChatCompletion(config, prompt);

    // Append the user's message, then the assistant's reply, to the session.
    let userMsg : Types.AssistantMessage = {
      role = #user;
      content = input.message;
      timestamp = now;
      context = input.context;
    };
    let _afterUser = appendAssistantMessage(assistantSessions, userId, userMsg);
    let assistantMsg : Types.AssistantMessage = {
      role = #assistant;
      content = reply;
      timestamp = Time.now();
      context = input.context;
    };
    let _afterAssistant = appendAssistantMessage(assistantSessions, userId, assistantMsg);
    assistantMsg;
  };

  // Helper: true if the user owns the provider on the given booking.
  func pOwnsBooking(
    providers : Map.Map<Nat, CoreTypes.Provider>,
    booking : CoreTypes.Booking,
    userId : Types.UserId,
  ) : Bool {
    switch (providers.get(booking.providerId)) {
      case (?p) p.ownerPrincipal == userId;
      case null false;
    };
  };

  // ---- AI: natural-language search ----
  // Interprets a natural-language query (category, serviceArea, price
  // preference, timing), filters listings/providers, and ranks results.
  public func aiSearch(
    listings : Map.Map<Nat, CoreTypes.ServiceListing>,
    providers : Map.Map<Nat, CoreTypes.Provider>,
    config : OpenAI.Config,
    queryText : Text,
  ) : async* [Types.AISearchResult] {
    // Gather all active listings with their provider for ranking context.
    let candidates = listings.foldLeft(
      Array.empty<{ listing : CoreTypes.ServiceListing; provider : CoreTypes.Provider }>(),
      func(acc : [{ listing : CoreTypes.ServiceListing; provider : CoreTypes.Provider }], _id : Nat, l : CoreTypes.ServiceListing) : [{ listing : CoreTypes.ServiceListing; provider : CoreTypes.Provider }] {
        if (not l.active) { acc } else {
          switch (providers.get(l.providerId)) {
            case null acc;
            case (?p) {
              if (p.verificationStatus == #suspended) { acc } else {
                acc.concat([{ listing = l; provider = p }])
              }
            };
          }
        }
      },
    );

    if (candidates.size() == 0) { return [] };

    let dossier = candidates.foldLeft(
      "",
      func(acc : Text, c : { listing : CoreTypes.ServiceListing; provider : CoreTypes.Provider }) : Text {
        let priceDollars = c.listing.priceCents / 100;
        acc # "\n- " # c.listing.id.toText() # "|" # c.provider.id.toText() #
          "|" # c.listing.title #
          "|" # OpenAI.categoryLabel(?c.listing.category) #
          "|" # c.listing.serviceArea #
          "|$" # priceDollars.toText() # " " # c.listing.priceUnit #
          "|" # c.provider.companyName #
          "|" # verificationLabel(c.provider) #
          "|" # ratingLabel(c.provider)
      },
    );

    let prompt =
      "You are the search engine for the DFW Service Hub marketplace (box truck hauling, relocation, trash haul/junk removal, and moving services across Dallas-Fort Worth). " #
      "A user entered a natural-language search. Interpret their intent (category, service area, price preference, timing) and rank the listings that match. " #
      "Consider category fit, service-area match, price competitiveness, provider trust (verification + rating), and timing hints." #
      "\n\nSearch query: " # queryText #
      "\n\nCandidate listings (format: listingId|providerId|title|category|serviceArea|price|companyName|verificationStatus|rating):" # dossier #
      "\n\nReturn the TOP results, one per line, in the format: listingId|score(0-100)|rationale. The rationale is one sentence explaining why this listing matches the search. Output only the result lines, no preamble.";

    let result = await* OpenAI.runChatCompletion(config, prompt);
    let parsed = parseRankedLines(result, 10);

    // Validate listing ids and map to AISearchResult. The first field from
    // parseRankedLines is the listingId; we need the providerId too, so look
    // it up from the listings map.
    let validListingIds = candidates.map(func(c : { listing : CoreTypes.ServiceListing; provider : CoreTypes.Provider }) : Nat { c.listing.id });
    let results = parsed.filterMap(func((listingId, score, rationale) : (Nat, Nat, Text)) : ?Types.AISearchResult {
      if (validListingIds.contains(listingId)) {
        switch (listings.get(listingId)) {
          case (?l) ?{ listingId = l.id; providerId = l.providerId; score = score; rationale = rationale };
          case null null;
        }
      } else {
        null
      }
    });
    results;
  };

  // ---- AI: review summarization ----
  // Reads all (non-hidden) reviews for a provider, calls gpt-4o-mini to
  // generate a summary, sentiment label, and key themes. Computed on-demand
  // (no caching, to avoid a migration).
  public func generateReviewSummary(
    reviews : Map.Map<Nat, CoreTypes.Review>,
    config : OpenAI.Config,
    providerId : Nat,
  ) : async* Types.ReviewSummary {
    let providerReviews = reviews.foldLeft(
      Array.empty<CoreTypes.Review>(),
      func(acc : [CoreTypes.Review], _id : Nat, r : CoreTypes.Review) : [CoreTypes.Review] {
        if (r.providerId == providerId and not r.hidden) {
          acc.concat([r])
        } else {
          acc
        }
      },
    );

    if (providerReviews.size() == 0) {
      return {
        providerId = providerId;
        summary = "No reviews yet for this provider.";
        sentiment = "neutral";
        themes = [];
      };
    };

    let reviewText = providerReviews.foldLeft(
      "",
      func(acc : Text, r : CoreTypes.Review) : Text {
        acc # "\n- " # r.rating.toText() # "/5: " # r.writtenText
      },
    );

    let prompt =
      "You are analyzing customer reviews for a service provider on the DFW Service Hub marketplace. " #
      "Summarize the review themes, classify the overall sentiment, and extract 3-5 key themes." #
      "\n\nReviews (rating: text):" # reviewText #
      "\n\nRespond in EXACTLY this format (no preamble):\n" #
      "SUMMARY: <one paragraph summary of strengths and watch-outs>\n" #
      "SENTIMENT: <one of: positive, mixed, negative>\n" #
      "THEMES: <comma-separated list of 3-5 short theme phrases>";

    let result = await* OpenAI.runChatCompletion(config, prompt);

    // Parse the structured response.
    var summary = "";
    var sentiment = "neutral";
    var themes : [Text] = [];
    for (line in result.split(#char '\n')) {
      let l = line.trim(#char ' ');
      if (l.startsWith(#text "SUMMARY:")) {
        summary := switch (l.stripStart(#text "SUMMARY:")) { case (?rest) rest.trim(#char ' '); case null "" };
      } else if (l.startsWith(#text "SENTIMENT:")) {
        sentiment := switch (l.stripStart(#text "SENTIMENT:")) { case (?rest) rest.trim(#char ' ').toLower(); case null "" };
      } else if (l.startsWith(#text "THEMES:")) {
        let themesText = switch (l.stripStart(#text "THEMES:")) { case (?rest) rest.trim(#char ' '); case null "" };
        let themeIter = themesText.split(#char ',');
        themes := themeIter.map(func(t : Text) : Text { t.trim(#char ' ') }).toArray();
      };
    };
    if (summary == "") { summary := firstLine(result) };

    { providerId = providerId; summary = summary; sentiment = sentiment; themes = themes };
  };

  // ---- AI: provider insights ----
  // Reads a provider's bookings (completion rate), reviews (rating trends),
  // and listings (performance), then calls gpt-4o-mini for a weekly
  // performance summary, suggested improvements, pricing recommendations, and
  // response-time coaching. Requires the caller to own the provider (enforced
  // in the mixin).
  public func generateProviderInsights(
    providers : Map.Map<Nat, CoreTypes.Provider>,
    listings : Map.Map<Nat, CoreTypes.ServiceListing>,
    bookings : Map.Map<Nat, CoreTypes.Booking>,
    reviews : Map.Map<Nat, CoreTypes.Review>,
    config : OpenAI.Config,
    providerId : Nat,
  ) : async* Types.ProviderInsights {
    let provider = switch (providers.get(providerId)) {
      case (?p) p;
      case null Runtime.trap("Provider not found");
    };

    let providerBookings = bookings.foldLeft(
      Array.empty<CoreTypes.Booking>(),
      func(acc : [CoreTypes.Booking], _id : Nat, b : CoreTypes.Booking) : [CoreTypes.Booking] {
        if (b.providerId == providerId) { acc.concat([b]) } else { acc }
      },
    );
    let providerReviews = reviews.foldLeft(
      Array.empty<CoreTypes.Review>(),
      func(acc : [CoreTypes.Review], _id : Nat, r : CoreTypes.Review) : [CoreTypes.Review] {
        if (r.providerId == providerId and not r.hidden) { acc.concat([r]) } else { acc }
      },
    );
    let providerListings = listings.foldLeft(
      Array.empty<CoreTypes.ServiceListing>(),
      func(acc : [CoreTypes.ServiceListing], _id : Nat, l : CoreTypes.ServiceListing) : [CoreTypes.ServiceListing] {
        if (l.providerId == providerId) { acc.concat([l]) } else { acc }
      },
    );

    // Compute completion rate.
    let totalBookings = providerBookings.size();
    let completedBookings = providerBookings.filter(func(b : CoreTypes.Booking) : Bool {
      b.status == #completed or b.status == #reviewed
    }).size();
    let completionRate = if (totalBookings == 0) { "no bookings yet" } else {
      (completedBookings * 100 / totalBookings).toText() # "% (" # completedBookings.toText() # " of " # totalBookings.toText() # ")"
    };

    // Compute rating trend (average + count).
    let ratingTrend = if (providerReviews.size() == 0) {
      "no reviews yet"
    } else {
      let avg = provider.ratingSum / provider.ratingCount;
      "average " # avg.toText() # "/5 across " # providerReviews.size().toText() # " reviews"
    };

    // Listings performance summary.
    let activeListings = providerListings.filter(func(l : CoreTypes.ServiceListing) : Bool { l.active }).size();
    let listingsSummary = providerListings.size().toText() # " listings (" # activeListings.toText() # " active)";

    // Build a compact review excerpt (last 5 reviews).
    let reviewExcerpt = providerReviews.foldLeft(
      "",
      func(acc : Text, r : CoreTypes.Review) : Text {
        acc # "\n- " # r.rating.toText() # "/5: " # r.writtenText
      },
    );

    let prompt =
      "You are a performance coach for service providers on the DFW Service Hub marketplace (box truck hauling, relocation, trash haul/junk removal, moving). " #
      "Generate weekly performance insights for this provider based on their real platform data. " #
      "Cover: a weekly performance summary, suggested improvements, pricing recommendations, and response-time coaching." #
      "\n\nProvider: " # provider.companyName # " (" # verificationLabel(provider) # ", " # ratingTrend # ")." #
      "\nBookings: " # completionRate # " completion rate." #
      "\nListings: " # listingsSummary # "." #
      "\nRecent reviews:" # reviewExcerpt #
      "\n\nRespond in EXACTLY this format (no preamble):\n" #
      "INSIGHTS: <one paragraph narrative covering weekly performance, response-time coaching, and pricing recommendations>\n" #
      "RECOMMENDATIONS: <comma-separated list of 3-5 short actionable recommendations>";

    let result = await* OpenAI.runChatCompletion(config, prompt);

    var insights = "";
    var recommendations : [Text] = [];
    for (line in result.split(#char '\n')) {
      let l = line.trim(#char ' ');
      if (l.startsWith(#text "INSIGHTS:")) {
        insights := switch (l.stripStart(#text "INSIGHTS:")) { case (?rest) rest.trim(#char ' '); case null "" };
      } else if (l.startsWith(#text "RECOMMENDATIONS:")) {
        let recsText = switch (l.stripStart(#text "RECOMMENDATIONS:")) { case (?rest) rest.trim(#char ' '); case null "" };
        let recIter = recsText.split(#char ',');
        recommendations := recIter.map(func(t : Text) : Text { t.trim(#char ' ') }).toArray();
      };
    };
    if (insights == "") { insights := firstLine(result) };

    { providerId = providerId; insights = insights; recommendations = recommendations };
  };

  // ---- AI: dispute triage ----
  // Reads a dispute (reason, booking context), calls gpt-4o-mini to assess
  // severity, suggest a resolution, and provide rationale. The mixin stores
  // the suggestion on the dispute record's aiTriageSuggestion field.
  public func triageDispute(
    disputes : Map.Map<Nat, Types.Dispute>,
    bookings : Map.Map<Nat, CoreTypes.Booking>,
    config : OpenAI.Config,
    disputeId : Nat,
  ) : async* Types.DisputeTriage {
    let dispute = switch (disputes.get(disputeId)) {
      case (?d) d;
      case null Runtime.trap("Dispute not found");
    };

    let booking = switch (bookings.get(dispute.bookingId)) {
      case (?b) b;
      case null Runtime.trap("Booking not found for dispute");
    };

    let prompt =
      "You are the dispute triage assistant for the DFW Service Hub marketplace (box truck hauling, relocation, trash haul/junk removal, moving). " #
      "Assess this dispute's severity, suggest a resolution path, and explain your rationale. " #
      "Severity is low (minor scheduling/communication issues), medium (service quality or partial completion disputes), or high (no-show, damage, safety, or fraud)." #
      "\n\nDispute reason: " # dispute.reason #
      "\nBooking category: " # OpenAI.categoryLabel(?booking.category) #
      "\nBooking job details: " # booking.jobDetails #
      "\nBooking address: " # booking.address #
      "\nBooking status: " # bookingStatusLabel(booking.status) #
      "\n\nRespond in EXACTLY this format (no preamble):\n" #
      "SEVERITY: <one of: low, medium, high>\n" #
      "RESOLUTION: <one or two sentences recommending a resolution path>\n" #
      "RATIONALE: <one sentence explaining the assessment>";

    let result = await* OpenAI.runChatCompletion(config, prompt);

    var severity = "medium";
    var suggestedResolution = "";
    var rationale = "";
    for (line in result.split(#char '\n')) {
      let l = line.trim(#char ' ');
      if (l.startsWith(#text "SEVERITY:")) {
        severity := switch (l.stripStart(#text "SEVERITY:")) { case (?rest) rest.trim(#char ' ').toLower(); case null "" };
      } else if (l.startsWith(#text "RESOLUTION:")) {
        suggestedResolution := switch (l.stripStart(#text "RESOLUTION:")) { case (?rest) rest.trim(#char ' '); case null "" };
      } else if (l.startsWith(#text "RATIONALE:")) {
        rationale := switch (l.stripStart(#text "RATIONALE:")) { case (?rest) rest.trim(#char ' '); case null "" };
      };
    };
    if (suggestedResolution == "") { suggestedResolution := firstLine(result) };

    { disputeId = disputeId; severity = severity; suggestedResolution = suggestedResolution; rationale = rationale };
  };

  // Booking status as a short Text label for prompt injection.
  func bookingStatusLabel(status : CoreTypes.BookingStatus) : Text {
    switch (status) {
      case (#requested) "requested";
      case (#accepted) "accepted";
      case (#scheduled) "scheduled";
      case (#inProgress) "in progress";
      case (#completed) "completed";
      case (#cancelled) "cancelled";
      case (#reviewed) "reviewed";
    };
  };

  // ---- Trust & verification ----
  // Default verification tiers: all four tiers #unverified with no date/note.
  public func defaultVerificationTiers() : Types.VerificationTiers = {
    identity = { status = #unverified; verifiedAt = null; note = null };
    business = { status = #unverified; verifiedAt = null; note = null };
    insurance = { status = #unverified; verifiedAt = null; note = null };
    background = { status = #unverified; verifiedAt = null; note = null };
  };

  // Read a provider's verification tiers, returning the default (all
  // unverified) when none have been recorded yet.
  public func getVerificationTiers(
    providerVerifications : Map.Map<Nat, Types.VerificationTiers>,
    providerId : Nat,
  ) : Types.VerificationTiers {
    switch (providerVerifications.get(providerId)) {
      case (?t) t;
      case null defaultVerificationTiers();
    };
  };

  // Update a single verification tier for a provider. Inserts the default
  // tiers record on first update so the other three tiers start unverified.
  public func updateVerificationTier(
    providerVerifications : Map.Map<Nat, Types.VerificationTiers>,
    providerId : Nat,
    tier : { #identity; #business; #insurance; #background },
    status : Types.VerificationTierStatus,
    note : ?Text,
  ) : Types.VerificationTiers {
    let current = getVerificationTiers(providerVerifications, providerId);
    let now = Time.now();
    let verifiedAt : ?Types.Timestamp = switch (status) {
      case (#approved) ?now;
      case (#rejected) ?now;
      case (#expired) ?now;
      case (_) null;
    };
    let tierRecord : Types.VerificationTierRecord = {
      status;
      verifiedAt;
      note;
    };
    let updated : Types.VerificationTiers = switch (tier) {
      case (#identity) ({ current with identity = tierRecord });
      case (#business) ({ current with business = tierRecord });
      case (#insurance) ({ current with insurance = tierRecord });
      case (#background) ({ current with background = tierRecord });
    };
    providerVerifications.add(providerId, updated);
    updated;
  };

  // Compute a composite 0-100 trust score for a provider from real platform
  // signals: verification tiers, review volume + ratings, dispute history,
  // and longevity. Each component is a 0-100 integer; the overall is a simple
  // weighted blend. Computed on-demand (no caching, to avoid a migration).
  public func computeTrustScore(
    providerVerifications : Map.Map<Nat, Types.VerificationTiers>,
    providers : Map.Map<Nat, CoreTypes.Provider>,
    bookings : Map.Map<Nat, CoreTypes.Booking>,
    reviews : Map.Map<Nat, CoreTypes.Review>,
    disputes : Map.Map<Nat, Types.Dispute>,
    providerId : Nat,
  ) : Types.TrustScore {
    let provider = switch (providers.get(providerId)) {
      case (?p) p;
      case null Runtime.trap("Provider not found");
    };
    let tiers = getVerificationTiers(providerVerifications, providerId);
    let now = Time.now();

    // Verification component: 25 points per approved tier (max 100).
    func tierPoints(t : Types.VerificationTierRecord) : Nat {
      switch (t.status) { case (#approved) 25; case (_) 0 };
    };
    let verification = tierPoints(tiers.identity) + tierPoints(tiers.business) + tierPoints(tiers.insurance) + tierPoints(tiers.background);

    // Reviews component: rating average scaled to 0-100, weighted by volume
    // (capped at 20 reviews for full confidence).
    let providerReviews = reviews.values().toArray().filter(func(r : CoreTypes.Review) : Bool {
      r.providerId == providerId and not r.hidden;
    });
    let reviewsComponent : Nat = if (providerReviews.size() == 0) {
      0;
    } else {
      let avg = provider.ratingSum / provider.ratingCount;
      let volumeWeight = if (providerReviews.size() >= 20) { 100 } else {
        providerReviews.size() * 100 / 20;
      };
      (avg * 20) + (volumeWeight / 5); // avg 0-5 -> 0-100, plus volume bonus
    };
    let reviewsScore = if (reviewsComponent > 100) { 100 } else { reviewsComponent };

    // Responsiveness placeholder: no response-time signal stored yet, so this
    // component is derived from the provider's verification status as a proxy.
    let responsiveness : Nat = switch (provider.verificationStatus) {
      case (#approved) 70;
      case (#pending) 40;
      case (#rejected) 10;
      case (#suspended) 0;
    };

    // Dispute history component: penalize for disputes against the provider's
    // bookings. Start at 100; subtract 15 per dispute, floor at 0.
    let providerDisputeCount = disputes.values().toArray().filter(func(d : Types.Dispute) : Bool {
      switch (bookings.get(d.bookingId)) {
        case (?b) b.providerId == providerId;
        case null false;
      };
    }).size();
    let disputePenalty = providerDisputeCount * 15;
    let disputeHistory : Nat = if (disputePenalty >= 100) { 0 } else { 100 - disputePenalty };

    // Longevity component: days on platform scaled to 0-100 (capped at 365 days
    // for full score). Time.now() and createdAt are in nanoseconds.
    let ageNs = Int.toNat(now - provider.createdAt);
    let ageDays = ageNs / 86_400_000_000_000;
    let longevity : Nat = if (ageDays >= 365) { 100 } else {
      ageDays * 100 / 365;
    };

    // Weighted overall: verification 30, reviews 25, responsiveness 15,
    // disputeHistory 20, longevity 10.
    let overall = (verification * 30 + reviewsScore * 25 + responsiveness * 15 + disputeHistory * 20 + longevity * 10) / 100;

    { overall; verification; reviews = reviewsScore; responsiveness; disputeHistory; longevity; updatedAt = now };
  };

  // ---- Disputes ----
  // Open a dispute on a booking. The caller must be the booking customer
  // (validated by the mixin). Returns the new dispute record.
  public func openDispute(
    disputes : Map.Map<Nat, Types.Dispute>,
    nextDisputeId : { var value : Nat },
    bookingId : Nat,
    openedBy : Types.UserId,
    reason : Text,
  ) : Types.Dispute {
    let id = nextDisputeId.value;
    nextDisputeId.value := id + 1;
    let now = Time.now();
    let dispute : Types.Dispute = {
      id;
      bookingId;
      openedBy;
      reason;
      status = #open;
      providerResponse = null;
      adminResolution = null;
      aiTriageSuggestion = null;
      createdAt = now;
      updatedAt = now;
    };
    disputes.add(id, dispute);
    dispute;
  };

  // Provider responds to an open or responded dispute.
  public func respondToDispute(
    disputes : Map.Map<Nat, Types.Dispute>,
    disputeId : Nat,
    response : Text,
  ) : Types.Dispute {
    let existing = switch (disputes.get(disputeId)) {
      case (?d) d;
      case null Runtime.trap("Dispute not found");
    };
    let updated : Types.Dispute = {
      existing with
      status = #responded;
      providerResponse = ?response;
      updatedAt = Time.now();
    };
    disputes.add(disputeId, updated);
    updated;
  };

  // Admin resolves a dispute with a resolution note.
  public func resolveDispute(
    disputes : Map.Map<Nat, Types.Dispute>,
    disputeId : Nat,
    resolution : Text,
  ) : Types.Dispute {
    let existing = switch (disputes.get(disputeId)) {
      case (?d) d;
      case null Runtime.trap("Dispute not found");
    };
    let updated : Types.Dispute = {
      existing with
      status = #resolved;
      adminResolution = ?resolution;
      updatedAt = Time.now();
    };
    disputes.add(disputeId, updated);
    updated;
  };

  // Admin escalates a dispute (could not be resolved).
  public func escalateDispute(
    disputes : Map.Map<Nat, Types.Dispute>,
    disputeId : Nat,
  ) : Types.Dispute {
    let existing = switch (disputes.get(disputeId)) {
      case (?d) d;
      case null Runtime.trap("Dispute not found");
    };
    let updated : Types.Dispute = {
      existing with
      status = #escalated;
      updatedAt = Time.now();
    };
    disputes.add(disputeId, updated);
    updated;
  };

  // Store an AI triage suggestion on a dispute record (called by the
  // triageDispute mixin endpoint after the AI call returns).
  public func setDisputeTriageSuggestion(
    disputes : Map.Map<Nat, Types.Dispute>,
    disputeId : Nat,
    suggestion : Text,
  ) : Types.Dispute {
    let existing = switch (disputes.get(disputeId)) {
      case (?d) d;
      case null Runtime.trap("Dispute not found");
    };
    let updated : Types.Dispute = {
      existing with
      aiTriageSuggestion = ?suggestion;
      updatedAt = Time.now();
    };
    disputes.add(disputeId, updated);
    updated;
  };

  public func listDisputes(disputes : Map.Map<Nat, Types.Dispute>) : [Types.Dispute] {
    disputes.values().toArray();
  };

  public func listDisputesByBooking(disputes : Map.Map<Nat, Types.Dispute>, bookingId : Nat) : [Types.Dispute] {
    disputes.values().toArray().filter(func(d : Types.Dispute) : Bool { d.bookingId == bookingId });
  };

  // ---- Community reports ----
  public func reportTarget(
    communityReports : Map.Map<Nat, Types.CommunityReport>,
    nextReportId : { var value : Nat },
    reporter : Types.UserId,
    input : Types.CommunityReportInput,
  ) : Types.CommunityReport {
    let id = nextReportId.value;
    nextReportId.value := id + 1;
    let now = Time.now();
    let report : Types.CommunityReport = {
      id;
      targetType = input.targetType;
      targetId = input.targetId;
      reporter;
      reason = input.reason;
      status = #open;
      resolutionNote = null;
      createdAt = now;
      updatedAt = now;
    };
    communityReports.add(id, report);
    report;
  };

  public func resolveReport(
    communityReports : Map.Map<Nat, Types.CommunityReport>,
    reportId : Nat,
    resolutionNote : Text,
    dismiss : Bool,
  ) : Types.CommunityReport {
    let existing = switch (communityReports.get(reportId)) {
      case (?r) r;
      case null Runtime.trap("Report not found");
    };
    let status : Types.ReportStatus = if (dismiss) { #dismissed } else { #resolved };
    let updated : Types.CommunityReport = {
      existing with
      status;
      resolutionNote = ?resolutionNote;
      updatedAt = Time.now();
    };
    communityReports.add(reportId, updated);
    updated;
  };

  public func listReports(communityReports : Map.Map<Nat, Types.CommunityReport>) : [Types.CommunityReport] {
    communityReports.values().toArray();
  };

  // ---- Rewards ----
  // Derive a loyalty tier from a points total.
  public func tierForPoints(points : Nat) : Types.RewardTier {
    if (points >= 5000) { #platinum } else if (points >= 2000) { #gold } else if (points >= 500) { #silver } else { #bronze };
  };

  // Generate a short referral code from a principal (first 8 chars of the
  // principal's text, uppercased, with non-alphanumerics stripped).
  public func referralCodeFor(userId : Types.UserId) : Text {
    let raw = userId.toText();
    let upper = raw.toUpper();
    // Keep only alphanumeric chars and take the first 8.
    let kept = upper.chars().filter(func(c : Char.Char) : Bool {
      c.isDigit() or c.isAlphabetic()
    });
    let arr = kept.toArray();
    let take = if (arr.size() >= 8) { 8 } else { arr.size() };
    let slice = arr.sliceToArray(0, take.toInt());
    Text.fromIter(slice.vals());
  };

  // Get or create a user's reward profile. On first access, initializes a
  // profile with 0 points, bronze tier, no badges, streak 0, and a referral
  // code derived from the principal.
  public func getOrInitRewardProfile(
    rewards : Map.Map<Types.UserId, Types.RewardProfile>,
    userId : Types.UserId,
  ) : Types.RewardProfile {
    switch (rewards.get(userId)) {
      case (?p) p;
      case null {
        let profile : Types.RewardProfile = {
          userId;
          points = 0;
          tier = #bronze;
          badges = [];
          streak = 0;
          referralCode = referralCodeFor(userId);
          updatedAt = Time.now();
        };
        rewards.add(userId, profile);
        profile;
      };
    };
  };

  // Award points to a user. Appends a ledger entry, updates the user's points
  // and tier, and recomputes badges from the user's activity. The badge
  // recompute uses the bookings/reviews/referrals maps to count qualifying
  // actions. Returns the new ledger entry.
  public func awardPoints(
    rewards : Map.Map<Types.UserId, Types.RewardProfile>,
    rewardLedger : Map.Map<Nat, Types.RewardLedgerEntry>,
    nextRewardLedgerId : { var value : Nat },
    bookings : Map.Map<Nat, CoreTypes.Booking>,
    reviews : Map.Map<Nat, CoreTypes.Review>,
    referrals : Map.Map<Nat, Types.Referral>,
    userId : Types.UserId,
    points : Nat,
    reason : Text,
  ) : Types.RewardLedgerEntry {
    let profile = getOrInitRewardProfile(rewards, userId);
    let id = nextRewardLedgerId.value;
    nextRewardLedgerId.value := id + 1;
    let now = Time.now();
    let entry : Types.RewardLedgerEntry = {
      id;
      userId;
      points;
      reason;
      timestamp = now;
    };
    rewardLedger.add(id, entry);

    // Recompute badges from real activity.
    let badges = recomputeBadges(bookings, reviews, referrals, userId, profile.points + points);
    let updated : Types.RewardProfile = {
      profile with
      points = profile.points + points;
      tier = tierForPoints(profile.points + points);
      badges;
      updatedAt = now;
    };
    rewards.add(userId, updated);
    entry;
  };

  // Recompute a user's badge set from their real platform activity. Badges are
  // short machine-readable identifiers. The set is derived from booking
  // completions, review count, and referral count.
  public func recomputeBadges(
    bookings : Map.Map<Nat, CoreTypes.Booking>,
    reviews : Map.Map<Nat, CoreTypes.Review>,
    referrals : Map.Map<Nat, Types.Referral>,
    userId : Types.UserId,
    totalPoints : Nat,
  ) : [Text] {
    let completedBookings = bookings.values().toArray().filter(func(b : CoreTypes.Booking) : Bool {
      b.customerId == userId and (b.status == #completed or b.status == #reviewed);
    }).size();
    let reviewCount = reviews.values().toArray().filter(func(r : CoreTypes.Review) : Bool {
      r.customerId == userId;
    }).size();
    let referralCount = referrals.values().toArray().filter(func(r : Types.Referral) : Bool {
      r.referrer == userId and r.status == #awarded;
    }).size();

    var badges : [Text] = [];
    if (completedBookings >= 1) { badges := badges.concat(["first_booking"]) };
    if (completedBookings >= 5) { badges := badges.concat(["five_bookings"]) };
    if (completedBookings >= 25) { badges := badges.concat(["twenty_five_bookings"]) };
    if (reviewCount >= 1) { badges := badges.concat(["first_review"]) };
    if (reviewCount >= 10) { badges := badges.concat(["ten_reviews"]) };
    if (referralCount >= 1) { badges := badges.concat(["first_referral"]) };
    if (referralCount >= 5) { badges := badges.concat(["five_referrals"]) };
    if (totalPoints >= 500) { badges := badges.concat(["silver_club"]) };
    if (totalPoints >= 2000) { badges := badges.concat(["gold_club"]) };
    if (totalPoints >= 5000) { badges := badges.concat(["platinum_club"]) };
    badges;
  };

  // Increment a user's streak (consecutive active periods). Called on booking
  // completion.
  public func incrementStreak(
    rewards : Map.Map<Types.UserId, Types.RewardProfile>,
    userId : Types.UserId,
  ) : () {
    let profile = getOrInitRewardProfile(rewards, userId);
    let updated : Types.RewardProfile = {
      profile with
      streak = profile.streak + 1;
      updatedAt = Time.now();
    };
    rewards.add(userId, updated);
  };

  // Reset a user's streak to 0 (called on booking cancellation). Freeze
  // protection: a streak of 0 is left untouched so a cancelled booking does
  // not penalize a user who had no active streak.
  public func resetStreak(
    rewards : Map.Map<Types.UserId, Types.RewardProfile>,
    userId : Types.UserId,
  ) : () {
    let profile = getOrInitRewardProfile(rewards, userId);
    if (profile.streak == 0) { return };
    let updated : Types.RewardProfile = {
      profile with
      streak = 0;
      updatedAt = Time.now();
    };
    rewards.add(userId, updated);
  };

  // Award a referral: when a referee completes a qualifying action (first
  // booking completion), find the pending referral for the referee and mark it
  // awarded, then award points to the referrer. Returns the updated referral if
  // one was pending, null otherwise.
  public func awardReferralOnFirstBooking(
    rewards : Map.Map<Types.UserId, Types.RewardProfile>,
    rewardLedger : Map.Map<Nat, Types.RewardLedgerEntry>,
    nextRewardLedgerId : { var value : Nat },
    referrals : Map.Map<Nat, Types.Referral>,
    nextReferralId : { var value : Nat },
    bookings : Map.Map<Nat, CoreTypes.Booking>,
    reviews : Map.Map<Nat, CoreTypes.Review>,
    referee : Types.UserId,
  ) : ?Types.Referral {
    // Find a pending referral where this user is the referee.
    let pending = referrals.values().toArray().find(func(r : Types.Referral) : Bool {
      r.referee == referee and r.status == #pending;
    });
    switch (pending) {
      case null null;
      case (?r) {
        let now = Time.now();
        let updated : Types.Referral = {
          r with
          status = #awarded;
          awardedAt = ?now;
        };
        referrals.add(r.id, updated);
        // Award 100 points to the referrer for a successful referral.
        let _entry = awardPoints(
          rewards,
          rewardLedger,
          nextRewardLedgerId,
          bookings,
          reviews,
          referrals,
          r.referrer,
          100,
          "referral_awarded",
        );
        ?updated;
      };
    };
  };

  // Apply a referral code: the caller (referee) submits a referrer's code. If
  // the code matches a referrer's profile and the referee has not already
  // applied a referral, create a pending referral record. The referrer is
  // awarded when the referee completes their first booking.
  public func applyReferral(
    rewards : Map.Map<Types.UserId, Types.RewardProfile>,
    referrals : Map.Map<Nat, Types.Referral>,
    nextReferralId : { var value : Nat },
    referee : Types.UserId,
    referralCode : Text,
  ) : Types.Referral {
    // The referee must not already have a referral (as referee).
    let existing = referrals.values().toArray().find(func(r : Types.Referral) : Bool {
      r.referee == referee;
    });
    switch (existing) {
      case (?_) Runtime.trap("Referral already applied");
      case null {};
    };
    // A user cannot refer themselves.
    if (referralCodeFor(referee) == referralCode) {
      Runtime.trap("Cannot refer yourself");
    };
    // Find the referrer by matching the referral code across reward profiles.
    let referrer = rewards.values().toArray().find(func(p : Types.RewardProfile) : Bool {
      p.referralCode == referralCode;
    });
    let referrerProfile = switch (referrer) {
      case (?p) p;
      case null Runtime.trap("Invalid referral code");
    };
    let id = nextReferralId.value;
    nextReferralId.value := id + 1;
    let now = Time.now();
    let referral : Types.Referral = {
      id;
      referrer = referrerProfile.userId;
      referee;
      status = #pending;
      awardedAt = null;
      createdAt = now;
    };
    referrals.add(id, referral);
    referral;
  };

  public func getRewardLedger(
    rewardLedger : Map.Map<Nat, Types.RewardLedgerEntry>,
    userId : Types.UserId,
  ) : [Types.RewardLedgerEntry] {
    rewardLedger.values().toArray().filter(func(e : Types.RewardLedgerEntry) : Bool { e.userId == userId });
  };

  // Top N reward profiles by points (the leaderboard).
  public func getLeaderboard(
    rewards : Map.Map<Types.UserId, Types.RewardProfile>,
    limit : Nat,
  ) : [Types.RewardProfile] {
    let all = rewards.values().toArray();
    let sorted = all.sort(func(a : Types.RewardProfile, b : Types.RewardProfile) : Order.Order {
      Nat.compare(b.points, a.points);
    });
    if (sorted.size() <= limit) { sorted } else {
      sorted.sliceToArray(0, limit.toInt());
    };
  };

  // ---- Microsites ----
  // Find a microsite by its provider id.
  public func getMicrositeByProvider(
    microsites : Map.Map<Nat, Types.Microsite>,
    providerId : Nat,
  ) : ?Types.Microsite {
    microsites.values().toArray().find(func(m : Types.Microsite) : Bool { m.providerId == providerId });
  };

  public func getMicrositeBySlug(
    microsites : Map.Map<Nat, Types.Microsite>,
    slug : Text,
  ) : ?Types.Microsite {
    microsites.values().toArray().find(func(m : Types.Microsite) : Bool { m.slug == slug });
  };

  // Upsert the caller's provider microsite. If a microsite already exists for
  // the provider, update it; otherwise create a new one. Enforces slug
  // uniqueness across all microsites.
  public func upsertMicrosite(
    microsites : Map.Map<Nat, Types.Microsite>,
    nextMicrositeId : { var value : Nat },
    providerId : Nat,
    input : Types.MicrositeInput,
  ) : Types.Microsite {
    // Slug uniqueness: no other microsite may share this slug.
    switch (getMicrositeBySlug(microsites, input.slug)) {
      case (?m) {
        if (m.providerId != providerId) {
          Runtime.trap("Slug is already taken by another microsite");
        };
      };
      case null {};
    };
    let now = Time.now();
    switch (getMicrositeByProvider(microsites, providerId)) {
      case (?existing) {
        let updated : Types.Microsite = {
          existing with
          slug = input.slug;
          heroCopy = input.heroCopy;
          aboutCopy = input.aboutCopy;
          servicesCopy = input.servicesCopy;
          coverImage = input.coverImage;
          accentColor = input.accentColor;
          blockOrder = input.blockOrder;
          published = input.published;
          updatedAt = now;
        };
        microsites.add(existing.id, updated);
        updated;
      };
      case null {
        let id = nextMicrositeId.value;
        nextMicrositeId.value := id + 1;
        let microsite : Types.Microsite = {
          id;
          providerId;
          slug = input.slug;
          heroCopy = input.heroCopy;
          aboutCopy = input.aboutCopy;
          servicesCopy = input.servicesCopy;
          coverImage = input.coverImage;
          accentColor = input.accentColor;
          blockOrder = input.blockOrder;
          generatedAt = null;
          published = input.published;
          createdAt = now;
          updatedAt = now;
        };
        microsites.add(id, microsite);
        microsite;
      };
    };
  };

  // Toggle a microsite's published flag.
  public func publishMicrosite(
    microsites : Map.Map<Nat, Types.Microsite>,
    micrositeId : Nat,
    published : Bool,
  ) : Types.Microsite {
    let existing = switch (microsites.get(micrositeId)) {
      case (?m) m;
      case null Runtime.trap("Microsite not found");
    };
    let updated : Types.Microsite = {
      existing with
      published;
      updatedAt = Time.now();
    };
    microsites.add(micrositeId, updated);
    updated;
  };

  // AI-generate the copy blocks for a provider's microsite. Calls OpenAI to
  // produce heroCopy, aboutCopy, and servicesCopy from the provider's real
  // profile data, then upserts the microsite with the generated copy. Marks
  // generatedAt with the current timestamp.
  public func generateMicrosite(
    microsites : Map.Map<Nat, Types.Microsite>,
    nextMicrositeId : { var value : Nat },
    providers : Map.Map<Nat, CoreTypes.Provider>,
    listings : Map.Map<Nat, CoreTypes.ServiceListing>,
    config : OpenAI.Config,
    providerId : Nat,
  ) : async* Types.Microsite {
    let provider = switch (providers.get(providerId)) {
      case (?p) p;
      case null Runtime.trap("Provider not found");
    };
    let providerListings = listings.values().toArray().filter(func(l : CoreTypes.ServiceListing) : Bool {
      l.providerId == providerId and l.active;
    });
    let listingsText = providerListings.foldLeft(
      "",
      func(acc : Text, l : CoreTypes.ServiceListing) : Text {
        acc # "\n- " # l.title # " (" # OpenAI.categoryLabel(?l.category) # "): " # l.description;
      },
    );
    let prompt =
      "You are generating marketing copy for a service provider's microsite on the DFW Service Hub marketplace. " #
      "Generate three copy blocks: a hero headline (one punchy sentence), an about paragraph (2-3 sentences), and a services paragraph (2-3 sentences). " #
      "Tailor the copy to the provider's real profile and active listings." #
      "\n\nProvider: " # provider.companyName #
      "\nCategories: " # categoriesText(provider) #
      "\nService areas: " # serviceAreasText(provider) #
      "\nDescription: " # (switch (provider.description) { case (?d) d; case null "n/a" }) #
      "\nActive listings:" # listingsText #
      "\n\nRespond in EXACTLY this format (no preamble):\n" #
      "HERO: <hero headline>\n" #
      "ABOUT: <about paragraph>\n" #
      "SERVICES: <services paragraph>";

    let result = await* OpenAI.runChatCompletion(config, prompt);

    var heroCopy = "";
    var aboutCopy = "";
    var servicesCopy = "";
    for (line in result.split(#char '\n')) {
      let l = line.trim(#char ' ');
      if (l.startsWith(#text "HERO:")) {
        heroCopy := switch (l.stripStart(#text "HERO:")) { case (?rest) rest.trim(#char ' '); case null "" };
      } else if (l.startsWith(#text "ABOUT:")) {
        aboutCopy := switch (l.stripStart(#text "ABOUT:")) { case (?rest) rest.trim(#char ' '); case null "" };
      } else if (l.startsWith(#text "SERVICES:")) {
        servicesCopy := switch (l.stripStart(#text "SERVICES:")) { case (?rest) rest.trim(#char ' '); case null "" };
      };
    };
    if (heroCopy == "") { heroCopy := "Trusted DFW-area " # provider.companyName };
    if (aboutCopy == "") { aboutCopy := "Professional service provider serving the Dallas-Fort Worth area." };
    if (servicesCopy == "") { servicesCopy := "Contact us for a quote on your next job." };

    let now = Time.now();
    let slug = provider.companyName.toLower().replace(#text " ", "-");
    // Upsert with generated copy.
    switch (getMicrositeByProvider(microsites, providerId)) {
      case (?existing) {
        let updated : Types.Microsite = {
          existing with
          heroCopy;
          aboutCopy;
          servicesCopy;
          generatedAt = ?now;
          updatedAt = now;
        };
        microsites.add(existing.id, updated);
        updated;
      };
      case null {
        let id = nextMicrositeId.value;
        nextMicrositeId.value := id + 1;
        let microsite : Types.Microsite = {
          id;
          providerId;
          slug;
          heroCopy;
          aboutCopy;
          servicesCopy;
          coverImage = null;
          accentColor = null;
          blockOrder = ["hero", "about", "services"];
          generatedAt = ?now;
          published = false;
          createdAt = now;
          updatedAt = now;
        };
        microsites.add(id, microsite);
        microsite;
      };
    };
  };

  // ---- Docs ----
  // Seed default help-center docs on first access if the docs collection is
  // empty. Idempotent: only seeds when empty.
  public func seedDefaultDocs(
    docs : Map.Map<Nat, Types.Doc>,
    nextDocId : { var value : Nat },
    author : Types.UserId,
  ) : () {
    if (docs.size() > 0) { return };
    let now = Time.now();
    let defaults : [(Text, Text, Text, Text)] = [
      ("How to Book a Service", "how-to-book", "Booking", "To book a service, browse listings by category or service area, select a listing, and choose an available time slot. The provider will accept or decline your request. You'll receive email notifications at each stage of the booking lifecycle."),
      ("How Verification Works", "how-verification-works", "Trust", "Providers can be verified across four tiers: identity, business, insurance, and background. Each tier is independently evaluated by the platform admin. Verified providers earn higher trust scores and appear more prominently in search and AI matching."),
      ("How Disputes Work", "how-disputes-work", "Disputes", "If a booking goes wrong, the customer can open a dispute. The provider responds, and if the issue cannot be resolved, an admin steps in to resolve or escalate. AI triage helps admins assess severity and suggest a resolution path."),
      ("How Trust Scores Work", "how-trust-scores-work", "Trust", "Your trust score is a 0-100 composite of verification tiers, review volume and ratings, responsiveness, dispute history, and longevity on the platform. Higher trust scores lead to better placement and more bookings."),
      ("How Rewards Work", "how-rewards-work", "Rewards", "Earn points by completing bookings, leaving reviews, and referring new users. Points determine your loyalty tier (bronze, silver, gold, platinum) and unlock badges. Maintain an active streak by completing bookings regularly."),
    ];
    for ((title, slug, category, content) in defaults.vals()) {
      let id = nextDocId.value;
      nextDocId.value := id + 1;
      let doc : Types.Doc = {
        id;
        title;
        slug;
        category;
        content;
        status = #published;
        readingTime = content.size() / 15; // ~15 chars/sec reading speed
        updatedAt = now;
        author;
        createdAt = now;
      };
      docs.add(id, doc);
    };
  };

  public func getDocBySlug(
    docs : Map.Map<Nat, Types.Doc>,
    slug : Text,
  ) : ?Types.Doc {
    docs.values().toArray().find(func(d : Types.Doc) : Bool { d.slug == slug });
  };

  public func createDoc(
    docs : Map.Map<Nat, Types.Doc>,
    nextDocId : { var value : Nat },
    author : Types.UserId,
    input : Types.DocInput,
  ) : Types.Doc {
    // Slug uniqueness.
    switch (getDocBySlug(docs, input.slug)) {
      case (?_) Runtime.trap("Slug is already taken");
      case null {};
    };
    let id = nextDocId.value;
    nextDocId.value := id + 1;
    let now = Time.now();
    let doc : Types.Doc = {
      id;
      title = input.title;
      slug = input.slug;
      category = input.category;
      content = input.content;
      status = input.status;
      readingTime = input.content.size() / 15;
      updatedAt = now;
      author;
      createdAt = now;
    };
    docs.add(id, doc);
    doc;
  };

  public func updateDoc(
    docs : Map.Map<Nat, Types.Doc>,
    docId : Nat,
    input : Types.DocInput,
  ) : Types.Doc {
    let existing = switch (docs.get(docId)) {
      case (?d) d;
      case null Runtime.trap("Doc not found");
    };
    // Slug uniqueness (excluding this doc).
    switch (getDocBySlug(docs, input.slug)) {
      case (?d) {
        if (d.id != docId) { Runtime.trap("Slug is already taken") };
      };
      case null {};
    };
    let updated : Types.Doc = {
      existing with
      title = input.title;
      slug = input.slug;
      category = input.category;
      content = input.content;
      status = input.status;
      readingTime = input.content.size() / 15;
      updatedAt = Time.now();
    };
    docs.add(docId, updated);
    updated;
  };

  public func publishDoc(
    docs : Map.Map<Nat, Types.Doc>,
    docId : Nat,
    status : Types.DocStatus,
  ) : Types.Doc {
    let existing = switch (docs.get(docId)) {
      case (?d) d;
      case null Runtime.trap("Doc not found");
    };
    let updated : Types.Doc = {
      existing with
      status;
      updatedAt = Time.now();
    };
    docs.add(docId, updated);
    updated;
  };

  public func listAllDocs(docs : Map.Map<Nat, Types.Doc>) : [Types.Doc] {
    docs.values().toArray();
  };

  public func listPublishedDocs(docs : Map.Map<Nat, Types.Doc>) : [Types.Doc] {
    docs.values().toArray().filter(func(d : Types.Doc) : Bool { d.status == #published });
  };

  public func listPublishedDocsByCategory(docs : Map.Map<Nat, Types.Doc>, category : Text) : [Types.Doc] {
    docs.values().toArray().filter(func(d : Types.Doc) : Bool {
      d.status == #published and d.category == category;
    });
  };
};
