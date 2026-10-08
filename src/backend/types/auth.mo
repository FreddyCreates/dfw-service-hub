// Auth-domain types.
//
// Identity-attributes layer that records which frontend sign-in source
// (Internet Identity, Google, or email/password) produced each Principal.
// The Principal itself comes from the II-backed login flow BEFORE any backend
// call; this layer only persists the verified attribute bundle (name/email/sso)
// keyed by Principal so the marketplace can surface the user's verified email
// and identity source. Backend guards and the Principal-keyed data model in
// marketplace-core stay unchanged.

import Principal "mo:core/Principal";

module {
  // The ICP Principal that identifies an authenticated identity. Same alias as
  // marketplace-core's UserId so the two domains share the same key type.
  public type AuthId = Principal;

  // Which frontend sign-in source produced this Principal.
  //   - #internetIdentity: plain II login (passkey-based)
  //   - #google:           login({ provider: 'google' })
  //   - #email:            email/password sign-up/sign-in (II-backed)
  public type IdentitySource = {
    #internetIdentity;
    #google;
    #email;
  };

  // Persisted identity attributes for a Principal. Stored in the `identities`
  // stable Map keyed by AuthId. firstSeenAt/lastSeenAt are Time.now() values.
  public type IdentityAttributes = {
    principal : AuthId;
    displayName : ?Text;
    email : ?Text;
    source : IdentitySource;
    firstSeenAt : Nat;
    lastSeenAt : Nat;
  };

  // The verified attribute bundle delivered by MixinAuthorization's sign-in
  // callback. `sso` is the SSO domain when the identity came from SSO, otherwise
  // null. The field is named `email` but only ever holds II's verified_email
  // value (per extension-authorization).
  public type SignInAttributes = {
    name : ?Text;
    email : ?Text;
    sso : ?Text;
  };
};
