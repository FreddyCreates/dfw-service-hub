// AIAssistantPanel — slide-over chat panel (right side) for the marketplace
// AI assistant. Uses the useAiAssistant hook to send messages and render
// responses. Maintains local conversation state. Toggled by Layout via
// isOpen/onClose props. Styled with the dark portal theme for provider/admin,
// light for customer — the panel inherits theme from the .dark class on
// <html> that Layout toggles based on role.

import { useAiAssistant } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import type { AssistantMessage } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { AlertCircle, Loader2, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  "Find a box truck service in Plano",
  "How do I dispute a booking?",
  "Explain the trust score",
  "What rewards tier am I on?",
];

function formatTimestamp(ts: bigint | number): string {
  const ms = typeof ts === "bigint" ? Number(ts) : ts;
  if (!ms || Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AIAssistantPanel({ isOpen, onClose }: AIAssistantPanelProps) {
  const { isAuthenticated } = useInternetIdentity();
  const assistant = useAiAssistant();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the latest message when the list changes or while pending.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll must fire on new messages and pending state changes
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, assistant.isPending]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || assistant.isPending) return;
    if (!isAuthenticated) {
      setError("Sign in to chat with the AI assistant.");
      return;
    }
    setError(null);
    setInput("");

    const userMsg: AssistantMessage = {
      role: "user",
      content,
      timestamp: BigInt(Date.now()),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await assistant.mutateAsync({ message: content });
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The assistant could not respond.",
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.aside
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col bg-card border-l border-border shadow-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            // biome-ignore lint/a11y/useSemanticElements: motion.aside cannot be a native <dialog> while animating with framer-motion
            role="dialog"
            aria-label="AI Assistant"
            aria-modal="true"
            data-ocid="ai_assistant_panel"
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 bg-gradient-primary">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-foreground/15 ring-1 ring-primary-foreground/30 shrink-0">
                  <Sparkles
                    className="w-5 h-5 text-primary-foreground"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold text-primary-foreground leading-tight truncate">
                    AI Assistant
                  </h2>
                  <p className="text-xs text-primary-foreground/80 font-body truncate">
                    Ask anything about DFW Haul
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI assistant"
                data-ocid="ai_assistant.close_button"
                className="p-2 rounded-md text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50 transition-smooth shrink-0"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </header>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-background"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-10">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 ring-1 ring-primary/20">
                    <Sparkles className="w-8 h-8 text-primary" aria-hidden />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">
                      How can I help?
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground font-body max-w-xs">
                      Ask about providers, bookings, trust scores, rewards, or
                      disputes. Try one of these:
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void handleSend(s)}
                        data-ocid="ai_assistant.suggestion"
                        className="text-left text-sm font-body text-foreground rounded-lg border border-border bg-card px-3 py-2 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-smooth"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <MessageRow
                    key={`${m.role}-${m.timestamp ?? 0}-${m.content.slice(0, 16)}`}
                    message={m}
                  />
                ))
              )}

              {assistant.isPending ? (
                <div className="flex items-center gap-2 text-muted-foreground font-body text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  <span>Assistant is thinking…</span>
                </div>
              ) : null}

              {error ? (
                <div
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive font-body"
                  role="alert"
                  data-ocid="ai_assistant.error_state"
                >
                  <AlertCircle
                    className="w-4 h-4 mt-0.5 shrink-0"
                    aria-hidden
                  />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            {/* Input */}
            <div className="border-t border-border bg-card px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Message the assistant…"
                  aria-label="Message the AI assistant"
                  data-ocid="ai_assistant.input"
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-32 min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || assistant.isPending}
                  aria-label="Send message"
                  data-ocid="ai_assistant.send_button"
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-smooth shrink-0"
                >
                  <Send className="w-4 h-4" aria-hidden />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground font-body text-center">
                Enter to send · Shift+Enter for a new line
              </p>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function MessageRow({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
      data-ocid={
        isUser ? "ai_assistant.user_message" : "ai_assistant.assistant_message"
      }
    >
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2 max-w-[85%]",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-secondary text-secondary-foreground",
        )}
      >
        <p className="text-sm font-body whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
        {message.timestamp ? (
          <p
            className={cn(
              "mt-1 text-[10px] font-mono",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {formatTimestamp(message.timestamp)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
