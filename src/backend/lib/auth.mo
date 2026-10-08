// Auth-domain logic.
//
// Pure domain logic for the identity-attributes layer. State is injected by the
// mixin layer; this module is stateless and operates on the passed-in
// `identities` Map. It derives the IdentitySource from the SignInAttributes
// bundle and records/updates the IdentityAttributes for a caller Principal.
//
// Derivation rule (per extension-authorization):
//   - attrs.sso present  -> #internetIdentity (SSO domain set; company IdP)
//   - attrs.email present and attrs.sso null -> #google (Google sign-in delivers
//     a verified email; plain II may also deliver a verified email, but the
//     frontend's Google button is the only path that sets email without sso
//     for the visible sign-in methods)
//   - otherwise -> #internetIdentity (plain II login, passkey-based)
//
// Note: email/password sign-in is II-backed on the frontend, so the backend
// cannot distinguish it from plain II by attributes alone. The #email source is
// reserved for a future explicit signal; today the frontend's email/password
// flow produces the same attribute bundle as plain II. This keeps the data model
// forward-compatible without changing guards.

import Int "mo:core/Int";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Types "../types/auth";

module {
  // Derive the IdentitySource from the verified SignInAttributes bundle.
  // SSO takes precedence (company IdP), then email-present-without-sso (Google),
  // then default to #internetIdentity.
  public func deriveSource(attrs : Types.SignInAttributes) : Types.IdentitySource {
    switch (attrs.sso) {
      case (?_) #internetIdentity;
      case null {
        switch (attrs.email) {
          case (?_) #google;
          case null #internetIdentity;
        };
      };
    };
  };

  // Record or refresh the identity attributes for a caller Principal. Called
  // once per sign-in by the MixinAuthorization callback. On first sight, sets
  // firstSeenAt = lastSeenAt = now; on subsequent sign-ins, preserves
  // firstSeenAt and source (the first source wins so a user's origin is
  // stable), updates displayName/email/lastSeenAt from the latest bundle.
  public func recordSignIn(
    identities : Map.Map<Types.AuthId, Types.IdentityAttributes>,
    caller : Types.AuthId,
    attrs : Types.SignInAttributes,
  ) : Types.IdentityAttributes {
    let now = Time.now().toNat();
    let source = deriveSource(attrs);
    switch (identities.get(caller)) {
      case (?existing) {
        let updated : Types.IdentityAttributes = {
          principal = caller;
          displayName = attrs.name;
          email = attrs.email;
          source = existing.source;
          firstSeenAt = existing.firstSeenAt;
          lastSeenAt = now;
        };
        identities.add(caller, updated);
        updated;
      };
      case null {
        let created : Types.IdentityAttributes = {
          principal = caller;
          displayName = attrs.name;
          email = attrs.email;
          source;
          firstSeenAt = now;
          lastSeenAt = now;
        };
        identities.add(caller, created);
        created;
      };
    };
  };

  // Look up the identity attributes for a caller Principal.
  public func getIdentity(
    identities : Map.Map<Types.AuthId, Types.IdentityAttributes>,
    caller : Types.AuthId,
  ) : ?Types.IdentityAttributes {
    identities.get(caller);
  };

  // Convenience: the verified email for a caller, if recorded.
  public func getEmail(
    identities : Map.Map<Types.AuthId, Types.IdentityAttributes>,
    caller : Types.AuthId,
  ) : ?Text {
    switch (identities.get(caller)) {
      case (?attrs) attrs.email;
      case null null;
    };
  };

  // Convenience: the display name for a caller, if recorded.
  public func getDisplayName(
    identities : Map.Map<Types.AuthId, Types.IdentityAttributes>,
    caller : Types.AuthId,
  ) : ?Text {
    switch (identities.get(caller)) {
      case (?attrs) attrs.displayName;
      case null null;
    };
  };

  // Convenience: the identity source for a caller, if recorded.
  public func getIdentitySource(
    identities : Map.Map<Types.AuthId, Types.IdentityAttributes>,
    caller : Types.AuthId,
  ) : ?Types.IdentitySource {
    switch (identities.get(caller)) {
      case (?attrs) ?attrs.source;
      case null null;
    };
  };
};
