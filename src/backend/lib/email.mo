// Email notification helpers for the DFW marketplace.
//
// Wraps caffeineai-email's sendServiceEmail to deliver transactional
// notifications through the booking lifecycle and messaging flow:
//   - notifyProviderNewBooking: provider gets an email when a customer
//     creates a booking request.
//   - notifyCustomerBookingAccepted / Scheduled / Completed: customer gets
//     an email when the provider advances the booking through each stage.
//   - notifyCustomerNewMessage: customer gets an email when the provider
//     sends a new message in a booking thread.
//
// All helpers are non-blocking side-effects: they are called AFTER the
// state transition succeeds, and any email failure is logged via Debug
// but never traps the calling endpoint. Recipients with no email (null)
// are skipped gracefully with a debug note.
//
// The emailNotificationsEnabled toggle is consulted by every helper; when
// false, all sending is skipped silently.

import Debug "mo:core/Debug";
import EmailClient "mo:caffeineai-email/emailClient";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Types "../types/marketplace-core";

module {
  // ---- Helpers ----

  // Resolve a user's email, returning null if the user or email is absent.
  func userEmail(users : Map.Map<Types.UserId, Types.User>, id : Types.UserId) : ?Text {
    switch (users.get(id)) {
      case null null;
      case (?u) u.email;
    };
  };

  // Human-readable label for a service category.
  func categoryLabel(c : Types.ServiceCategory) : Text = switch c {
    case (#boxTruck) "Box Truck";
    case (#relocation) "Relocation";
    case (#trashHaul) "Trash Haul";
    case (#moving) "Moving";
  };

  // Format the scheduled date/time line. When time is null, show date only.
  func scheduledWhen(b : Types.Booking) : Text = switch (b.scheduledTime) {
    case null b.scheduledDate;
    case (?t) b.scheduledDate # " at " # t;
  };

  // Booking reference shown in subject/body (e.g. "BK-1042").
  func bookingRef(b : Types.Booking) : Text = "BK-" # b.id.toText();

  // Send an email to a single recipient, swallowing failures so the calling
  // transition is never blocked. Logs a debug note on failure or when the
  // recipient has no email.
  func sendOne(
    enabled : Bool,
    recipient : Text,
    subject : Text,
    htmlBody : Text,
  ) : async () {
    if (not enabled) { return };
    let result = await EmailClient.sendServiceEmail(
      "no-reply",
      [recipient],
      subject,
      htmlBody,
    );
    switch (result) {
      case (#ok) {};
      case (#err(err)) {
        Debug.print("Email send failed to " # recipient # ": " # err);
      };
    };
  };

  // ---- Notifications ----

  // Provider is notified when a customer creates a new booking request.
  public func notifyProviderNewBooking(
    enabled : Bool,
    users : Map.Map<Types.UserId, Types.User>,
    providerOwner : Types.UserId,
    customer : Types.User,
    booking : Types.Booking,
  ) : async () {
    if (not enabled) { return };
    let ?providerEmail = userEmail(users, providerOwner) else {
      Debug.print("Skipping provider new-booking email: provider has no email");
      return;
    };
    let subject = "New booking request " # bookingRef(booking) # " — " # categoryLabel(booking.category);
    let body = "<h2>New booking request</h2>" #
      "<p>You have a new booking request from <strong>" # customer.displayName # "</strong>.</p>" #
      "<ul>" #
      "<li><strong>Reference:</strong> " # bookingRef(booking) # "</li>" #
      "<li><strong>Service:</strong> " # categoryLabel(booking.category) # "</li>" #
      "<li><strong>Scheduled:</strong> " # scheduledWhen(booking) # "</li>" #
      "<li><strong>Customer:</strong> " # customer.displayName # "</li>" #
      "<li><strong>Job details:</strong> " # booking.jobDetails # "</li>" #
      "<li><strong>Address:</strong> " # booking.address # "</li>" #
      "</ul>" #
      "<p>Sign in to your provider portal to accept or decline this request.</p>";
    await sendOne(enabled, providerEmail, subject, body);
  };

  // Customer is notified when the provider accepts their booking.
  public func notifyCustomerBookingAccepted(
    enabled : Bool,
    users : Map.Map<Types.UserId, Types.User>,
    customerId : Types.UserId,
    booking : Types.Booking,
  ) : async () {
    if (not enabled) { return };
    let ?email = userEmail(users, customerId) else {
      Debug.print("Skipping customer accepted-booking email: customer has no email");
      return;
    };
    let subject = "Your booking " # bookingRef(booking) # " has been accepted";
    let body = "<h2>Booking accepted</h2>" #
      "<p>Your booking request has been accepted by the provider.</p>" #
      "<ul>" #
      "<li><strong>Reference:</strong> " # bookingRef(booking) # "</li>" #
      "<li><strong>Service:</strong> " # categoryLabel(booking.category) # "</li>" #
      "<li><strong>Scheduled:</strong> " # scheduledWhen(booking) # "</li>" #
      "</ul>" #
      "<p>The provider will schedule the final time shortly. You can view this booking in your customer portal.</p>";
    await sendOne(enabled, email, subject, body);
  };

  // Customer is notified when the provider schedules their booking.
  public func notifyCustomerBookingScheduled(
    enabled : Bool,
    users : Map.Map<Types.UserId, Types.User>,
    customerId : Types.UserId,
    booking : Types.Booking,
  ) : async () {
    if (not enabled) { return };
    let ?email = userEmail(users, customerId) else {
      Debug.print("Skipping customer scheduled-booking email: customer has no email");
      return;
    };
    let subject = "Your booking " # bookingRef(booking) # " is scheduled";
    let body = "<h2>Booking scheduled</h2>" #
      "<p>Your booking has been scheduled by the provider.</p>" #
      "<ul>" #
      "<li><strong>Reference:</strong> " # bookingRef(booking) # "</li>" #
      "<li><strong>Service:</strong> " # categoryLabel(booking.category) # "</li>" #
      "<li><strong>Scheduled:</strong> " # scheduledWhen(booking) # "</li>" #
      "</ul>" #
      "<p>Please be ready at the scheduled time. You can view this booking in your customer portal.</p>";
    await sendOne(enabled, email, subject, body);
  };

  // Customer is notified when the provider marks their booking as completed.
  public func notifyCustomerBookingCompleted(
    enabled : Bool,
    users : Map.Map<Types.UserId, Types.User>,
    customerId : Types.UserId,
    booking : Types.Booking,
  ) : async () {
    if (not enabled) { return };
    let ?email = userEmail(users, customerId) else {
      Debug.print("Skipping customer completed-booking email: customer has no email");
      return;
    };
    let subject = "Your booking " # bookingRef(booking) # " is complete";
    let body = "<h2>Booking complete</h2>" #
      "<p>Your booking has been marked as complete by the provider.</p>" #
      "<ul>" #
      "<li><strong>Reference:</strong> " # bookingRef(booking) # "</li>" #
      "<li><strong>Service:</strong> " # categoryLabel(booking.category) # "</li>" #
      "<li><strong>Scheduled:</strong> " # scheduledWhen(booking) # "</li>" #
      "</ul>" #
      "<p>We'd love your feedback — please leave a review in your customer portal.</p>";
    await sendOne(enabled, email, subject, body);
  };

  // Customer is notified when the provider sends a new message in a booking
  // thread. The sender is the provider; the recipient is the customer.
  public func notifyCustomerNewMessage(
    enabled : Bool,
    users : Map.Map<Types.UserId, Types.User>,
    customerId : Types.UserId,
    booking : Types.Booking,
    messageContent : Text,
  ) : async () {
    if (not enabled) { return };
    let ?email = userEmail(users, customerId) else {
      Debug.print("Skipping customer new-message email: customer has no email");
      return;
    };
    let subject = "New message on booking " # bookingRef(booking);
    let body = "<h2>New message</h2>" #
      "<p>The provider sent you a new message on booking " # bookingRef(booking) # ".</p>" #
      "<ul>" #
      "<li><strong>Reference:</strong> " # bookingRef(booking) # "</li>" #
      "<li><strong>Service:</strong> " # categoryLabel(booking.category) # "</li>" #
      "</ul>" #
      "<p><strong>Message:</strong></p>" #
      "<blockquote>" # messageContent # "</blockquote>" #
      "<p>Reply in your customer portal to continue the conversation.</p>";
    await sendOne(enabled, email, subject, body);
  };
};
