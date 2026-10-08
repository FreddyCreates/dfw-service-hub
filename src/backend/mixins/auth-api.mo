// Auth-domain public API mixin.
//
// Exposes the identity-attributes layer to the frontend so the UI can show the
// signed-in user's verified email, display name, and identity source. All
// endpoints require a signed-in (non-anonymous) caller; the underlying
// Principal-keyed data model and the marketplace-core guards are unchanged.
//
// The `identities` Map is injected from main.mo and shared with the
// MixinAuthorization sign-in callback (which writes to it via AuthLib.recordSignIn).

import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/auth";
import AuthLib "../lib/auth";

mixin (
  accessControlState : AccessControl.AccessControlState,
  identities : Map.Map<Types.AuthId, Types.IdentityAttributes>,
) {
  // Require a non-anonymous caller. Mirrors marketplace-core's requireSignedIn.
  func requireAuthSignedIn(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: sign in required");
    };
  };

  // Returns the caller's recorded identity attributes, or null if none.
  public query ({ caller }) func getMyIdentity() : async ?Types.IdentityAttributes {
    requireAuthSignedIn(caller);
    AuthLib.getIdentity(identities, caller);
  };

  // Returns the caller's verified email, or null if none recorded.
  public query ({ caller }) func getMyEmail() : async ?Text {
    requireAuthSignedIn(caller);
    AuthLib.getEmail(identities, caller);
  };

  // Returns the caller's display name, or null if none recorded.
  public query ({ caller }) func getMyDisplayName() : async ?Text {
    requireAuthSignedIn(caller);
    AuthLib.getDisplayName(identities, caller);
  };

  // Returns the caller's identity source (#internetIdentity / #google / #email),
  // or null if no identity is recorded yet.
  public query ({ caller }) func getMyIdentitySource() : async ?Types.IdentitySource {
    requireAuthSignedIn(caller);
    AuthLib.getIdentitySource(identities, caller);
  };
};
