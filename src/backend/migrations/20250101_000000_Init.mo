import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import AccessControl "mo:caffeineai-authorization/access-control";

// Generated initial migration: seeds all stable actor state on a fresh
// install. Actor type definitions are inlined so this frozen chain entry
// does not drift if the actor's types change in a later version.
module {
  type NoiseLevel = {
    #Quiet;
    #Moderate;
    #Buzzing;
  };

  type WifiSpeed = {
    #Slow;
    #Okay;
    #Fast;
  };

  type LocationType = {
    #Cafe;
    #Library;
    #CoworkingSpace;
  };

  type Profile = {
    name : Text;
  };

  type Rating = {
    noiseLevel : NoiseLevel;
    wifiSpeed : WifiSpeed;
    description : ?Text;
    userId : Principal;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    editCount : Nat; // 0 = never edited, 1 = edited once (max allowed)
  };

  type Location = {
    osmNodeId : Text;
    name : Text;
    locationType : LocationType;
    lat : Float;
    lng : Float;
    address : ?Text;
    ratings : [Rating];
  };

  type LocationInput = {
    osmNodeId : Text;
    name : Text;
    locationType : LocationType;
    lat : Float;
    lng : Float;
    address : ?Text;
  };

  public func migration(_ : {}) : {
    accessControlState : AccessControl.AccessControlState;
    locations : Map.Map<Text, Location>;
    userProfiles : Map.Map<Principal, Profile>;
  } {
    {
      accessControlState = AccessControl.initState();
      locations = Map.empty();
      userProfiles = Map.empty();
    };
  };
};
