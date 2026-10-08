// OpenAI SDK glue for the marketplace-core domain.
//
// Admin-key variant: a single OpenAI API key set by an admin via the
// marketplace-core-api mixin's setOpenAIApiKey endpoint. Every AI content
// generation call threads the key through configForKey.
//
// `is_replicated = ?false` is REQUIRED — see the extension-openai skill:
// security (bearer never leaves a single node), billing (no N× replication),
// and determinism (LLM responses are sampled).

import { defaultConfig; type Config } "mo:openai-client/Config";
import ChatApi "mo:openai-client/Apis/ChatApi";
import CreateChatCompletionRequest "mo:openai-client/Models/CreateChatCompletionRequest";
import ChatCompletionRequestUserMessage "mo:openai-client/Models/ChatCompletionRequestUserMessage";
import Runtime "mo:core/Runtime";

module {
  // Build a Config bound to a single bearer. `is_replicated = ?false` is
  // REQUIRED — see the extension-openai skill §3.
  public func configForKey(key : Text) : Config {
    {
      defaultConfig with
      auth = ?#bearer key;
      is_replicated = ?false;
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
};
