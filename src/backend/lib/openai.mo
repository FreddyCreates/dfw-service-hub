// OpenAI SDK glue for the marketplace-core domain.
//
// Admin-key variant: a single OpenAI API key set by an admin via the
// marketplace-core-api mixin's setOpenAIApiKey endpoint. Every AI content
// generation call threads the key through configForKey.
//
// `is_replicated = ?false` is REQUIRED — see the extension-openai skill:
// security (bearer never leaves a single node), billing (no N× replication),
// and determinism (LLM responses are sampled).

import ConfigModule "mo:openai-client/Config";
import ChatApi "mo:openai-client/Apis/ChatApi";
import CreateChatCompletionRequest "mo:openai-client/Models/CreateChatCompletionRequest";
import ChatCompletionRequestUserMessage "mo:openai-client/Models/ChatCompletionRequestUserMessage";
import ChatCompletionRequestUserMessageContentPart "mo:openai-client/Models/ChatCompletionRequestUserMessageContentPart";
import ChatCompletionRequestMessageContentPartImage "mo:openai-client/Models/ChatCompletionRequestMessageContentPartImage";
import ChatCompletionRequestMessageContentPartImageImageUrl "mo:openai-client/Models/ChatCompletionRequestMessageContentPartImageImageUrl";
import ChatCompletionRequestMessageContentPartImageType "mo:openai-client/Models/ChatCompletionRequestMessageContentPartImageType";
import ChatCompletionRequestMessageContentPartText "mo:openai-client/Models/ChatCompletionRequestMessageContentPartText";
import ChatCompletionRequestMessageContentPartTextType "mo:openai-client/Models/ChatCompletionRequestMessageContentPartTextType";
import Storage "mo:caffeineai-object-storage/Storage";
import Base64 "mo:core/Base64";
import Runtime "mo:core/Runtime";
import Types "../types/marketplace-core";

module {
  // Re-export the OpenAI client Config type so callers (e.g. v3-contracts)
  // can reference it as OpenAI.Config without importing the underlying
  // openai-client package directly.
  public type Config = ConfigModule.Config;

  // Build a Config bound to a single bearer. `is_replicated = ?false` is
  // REQUIRED — see the extension-openai skill §3.
  public func configForKey(key : Text) : Config {
    {
      ConfigModule.defaultConfig with
      auth = ?#bearer key;
      is_replicated = ?false;
    };
  };

  // Map a ServiceCategory to a short human-readable label plus a one-sentence
  // context blurb injected into AI copy prompts so generated text is tailored
  // to the specific service type. Returns "" for null so callers can pass an
  // optional category and the prompt degrades gracefully when omitted.
  public func categoryLabel(category : ?Types.ServiceCategory) : Text {
    switch (category) {
      case (?#boxTruck) "box truck hauling (DFW-area freight, furniture, or appliance transport using a box truck)";
      case (?#relocation) "relocation services (DFW-area local or long-distance moving assistance, packing, and setup)";
      case (?#trashHaul) "trash haul / junk removal (DFW-area debris, furniture, appliance, and construction-site waste pickup)";
      case (?#moving) "moving services (DFW-area residential or commercial moves, loading/unloading, and transport)";
      case null "";
    };
  };

  // Compose a category-context sentence for prompt injection. Returns "" when
  // no category is supplied so the surrounding prompt text stays clean.
  public func categoryContext(category : ?Types.ServiceCategory) : Text {
    switch (category) {
      case (?c) " The service category is " # categoryLabel(?c) # ". Tailor the copy specifically to this category — reference the right equipment, typical job scope, and customer expectations for this kind of work.";
      case null "";
    };
  };

  // Map a Tone variant to a prompt instruction. Returns "" for null so
  // callers can pass an optional tone and the prompt degrades gracefully when
  // omitted (the surrounding prompt already specifies a default professional
  // style, so null = no override).
  public func toneInstruction(tone : ?Types.Tone) : Text {
    switch (tone) {
      case (?#professional) " Use a professional, authoritative tone.";
      case (?#friendly) " Use a warm, friendly, approachable tone.";
      case (?#concise) " Be concise and to the point.";
      case null "";
    };
  };

  public func runChatCompletion(config : Config, prompt : Text) : async* Text {
    let userMessage = ChatCompletionRequestUserMessage.JSON.init({
      content = #string(prompt);
      role = #user;
    });

    // `JSON.init` defaults every optional to `null` — DO NOT hand-list them.
    let req = CreateChatCompletionRequest.JSON.init({
      messages = [#user(userMessage)];
      model = "gpt-4o-mini";
    });

    let resp = await* ChatApi.createChatCompletion(config, req);

    if (resp.choices.size() == 0) {
      Runtime.trap("OpenAI returned no choices");
    };
    switch (resp.choices[0].message.content) {
      case (?text) text;
      case null Runtime.trap("OpenAI returned no text content (refusal or tool call)");
    };
  };

  // Vision completion: calls gpt-4o with the image as base64 input alongside
  // the prompt, and returns the text response. Uses is_replicated=?false
  // (same security/billing/determinism reasons as runChatCompletion).
  // The image is a Storage.ExternalBlob (the object-storage extension's
  // shared image type used across User.avatar, Provider.logo, listing photos,
  // and User.workPhotos). Storage.ExternalBlob is a Blob alias, so we encode
  // it directly with Base64 and embed it as a data URI in an image_url content
  // part. The prompt is sent as a sibling text content part — gpt-4o accepts
  // multimodal user messages with both image_url and text parts.
  public func runVisionCompletion(config : Config, image : Storage.ExternalBlob, prompt : Text) : async* Text {
    // Build the data URI: data:image/jpeg;base64,<encoded bytes>.
    // We use image/jpeg as a safe default MIME type; gpt-4o accepts jpeg, png,
    // gif, and webp. The object-storage ExternalBlob does not carry a MIME
    // type, so jpeg is the most broadly compatible choice for work photos.
    let dataUri = "data:image/jpeg;base64," # Base64.encode(image);

    // Image content part: type = #image_url, image_url.url = data URI.
    let imagePart : ChatCompletionRequestMessageContentPartImage.ChatCompletionRequestMessageContentPartImage =
      ChatCompletionRequestMessageContentPartImage.JSON.init({
        type_ = #image_url;
        image_url = ChatCompletionRequestMessageContentPartImageImageUrl.JSON.init({
          url = dataUri;
        });
      });

    // Text content part: type = #text_, text = the prompt.
    let textPart : ChatCompletionRequestMessageContentPartText.ChatCompletionRequestMessageContentPartText =
      ChatCompletionRequestMessageContentPartText.JSON.init({
        type_ = #text_;
        text_ = prompt;
      });

    // Multimodal user message: array of [image, text] content parts.
    let userMessage = ChatCompletionRequestUserMessage.JSON.init({
      content = #array([
        #image_url(imagePart),
        #text_(textPart),
      ]);
      role = #user;
    });

    // gpt-4o is the vision-capable model (gpt-4o-mini is text-only per the
    // admin-key variant's existing runChatCompletion). `JSON.init` defaults
    // every optional to `null` — DO NOT hand-list them.
    let req = CreateChatCompletionRequest.JSON.init({
      messages = [#user(userMessage)];
      model = "gpt-4o";
    });

    let resp = await* ChatApi.createChatCompletion(config, req);

    if (resp.choices.size() == 0) {
      Runtime.trap("OpenAI returned no choices");
    };
    switch (resp.choices[0].message.content) {
      case (?text) text;
      case null Runtime.trap("OpenAI returned no text content (refusal or tool call)");
    };
  };
};
