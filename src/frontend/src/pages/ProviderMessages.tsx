// ProviderMessages — messaging inbox for verified DFW providers.
// Lists booking threads from useListProviderBookings(providerId) with unread
// indicators via useUnreadMessageCount. Click to open thread view with
// MessageBubble via useGetThread, send form via useSendMessage, mark read
// via useMarkThreadRead. Uses identity?.getPrincipal() ?? null for MessageBubble.

import { EmptyState } from "@/components/EmptyState";
import { MessageBubble } from "@/components/MessageBubble";
import { SkeletonCard, SkeletonList } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetMyProvider,
  useGetThread,
  useGetUser,
  useListProviderBookings,
  useMarkThreadRead,
  useSendMessage,
  useSuggestReply,
  useUnreadMessageCount,
} from "@/hooks/useQueries";
import { type Booking, CATEGORY_LABELS, type Message } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Truck,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function formatDate(date: string): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function principalShort(principal: string): string {
  if (!principal) return "Customer";
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

// Build a compact conversation transcript for the AI reply suggestion.
// Labels each line as Customer/Provider based on the sender principal so the
// model understands who said what. Caps at the most recent 12 messages.
function buildConversationContext(
  messages: Message[] | undefined,
  myPrincipal: string | null,
): string {
  if (!messages || messages.length === 0) return "";
  const recent = messages.slice(-12);
  const lines = recent.map((msg) => {
    const sender =
      myPrincipal && msg.sender.toString() === myPrincipal
        ? "Provider"
        : "Customer";
    return `${sender}: ${msg.content}`;
  });
  return lines.join("\n");
}

interface ThreadRowProps {
  booking: Booking;
  index: number;
  active: boolean;
  onSelect: (booking: Booking) => void;
}

function ThreadRow({ booking, index, active, onSelect }: ThreadRowProps) {
  const { data: customer } = useGetUser(booking.customerId);
  const { data: unread } = useUnreadMessageCount(booking.id);
  const unreadCount = unread !== undefined ? Number(unread) : 0;
  const customerName =
    customer?.displayName ?? principalShort(booking.customerId.toString());

  return (
    <button
      type="button"
      onClick={() => onSelect(booking)}
      className={`w-full text-left p-4 border-b border-border transition-smooth animate-fade-in-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
        active ? "bg-primary/10" : "hover:bg-secondary"
      }`}
      data-ocid={`provider_messages.thread.${index + 1}`}
      aria-current={active ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-body font-medium text-foreground truncate">
            {customerName}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            {CATEGORY_LABELS[booking.category]} ·{" "}
            {formatDate(booking.scheduledDate)}
          </p>
        </div>
        {unreadCount > 0 ? (
          <span
            className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-body font-semibold"
            aria-label={`${unreadCount} unread`}
            data-ocid={`provider_messages.unread.${index + 1}`}
          >
            {unreadCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}

interface ThreadViewProps {
  booking: Booking;
  onBack: () => void;
}

function ThreadView({ booking, onBack }: ThreadViewProps) {
  const { identity } = useInternetIdentity();
  const { data: customer } = useGetUser(booking.customerId);
  const { data: messages, isLoading } = useGetThread(booking.id);
  const sendMessage = useSendMessage();
  const suggestReply = useSuggestReply();
  const markThreadRead = useMarkThreadRead();
  const [draft, setDraft] = useState("");
  const [suggestedReply, setSuggestedReply] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const customerName =
    customer?.displayName ?? principalShort(booking.customerId.toString());

  const myPrincipal = identity?.getPrincipal().toString() ?? null;
  const hasMessages = !!messages && messages.length > 0;
  const isSuggesting = suggestReply.isPending;

  const handleSuggestReply = () => {
    const context = buildConversationContext(messages, myPrincipal);
    if (!context) return;
    suggestReply.mutate(
      { bookingId: booking.id, conversationContext: context },
      {
        onSuccess: (reply) => {
          setSuggestedReply(reply);
          setShowSuggestion(true);
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : "Could not generate a reply. Please try again.",
          ),
      },
    );
  };

  const handleUseSuggestion = () => {
    setDraft(suggestedReply);
    setShowSuggestion(false);
    setSuggestedReply("");
  };

  const handleDiscardSuggestion = () => {
    setShowSuggestion(false);
    setSuggestedReply("");
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional fire-on-open
  useEffect(() => {
    markThreadRead.mutate(booking.id);
    // Only on open / booking change.
  }, [booking.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change only
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    sendMessage.mutate(
      { bookingId: BigInt(booking.id), content },
      {
        onSuccess: () => setDraft(""),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not send message.",
          ),
      },
    );
  };

  return (
    <Card
      className="py-0 flex flex-col h-full"
      data-ocid="provider_messages.thread_view"
    >
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back to inbox"
            data-ocid="provider_messages.back"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </button>
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-semibold text-foreground truncate">
              {customerName}
            </CardTitle>
            <p className="text-xs text-muted-foreground font-body mt-0.5 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" aria-hidden />
              {formatDate(booking.scheduledDate)} ·{" "}
              {CATEGORY_LABELS[booking.category]}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1" data-ocid="provider_messages.scroll">
          <div ref={scrollRef} className="p-4 flex flex-col gap-3 min-h-full">
            {isLoading ? (
              <div className="p-4">
                <SkeletonCard withMedia={false} />
              </div>
            ) : !messages || messages.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body text-center py-8">
                No messages yet. Reach out to your customer about this booking.
              </p>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentPrincipal={identity?.getPrincipal() ?? null}
                  index={i}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {showSuggestion ? (
          <div
            className="border-t border-border p-3 flex flex-col gap-2 bg-accent/5"
            data-ocid="provider_messages.suggestion_preview"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-body font-semibold uppercase tracking-wide text-accent-foreground ring-1 ring-accent/30"
                data-ocid="provider_messages.suggestion_badge"
              >
                <Sparkles className="w-2.5 h-2.5" aria-hidden />
                AI-generated
              </span>
              <span className="text-[11px] text-muted-foreground font-body">
                Edit before sending
              </span>
            </div>
            <Textarea
              value={suggestedReply}
              onChange={(e) => setSuggestedReply(e.target.value)}
              rows={4}
              aria-label="AI suggested reply"
              data-ocid="provider_messages.suggestion_input"
              className="bg-background"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleUseSuggestion}
                disabled={!suggestedReply.trim()}
                data-ocid="provider_messages.use_suggestion"
              >
                <Send className="w-3.5 h-3.5" aria-hidden />
                Use in composer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDiscardSuggestion}
                data-ocid="provider_messages.discard_suggestion"
              >
                Discard
              </Button>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={handleSend}
          className="border-t border-border p-3 flex flex-col gap-2"
          data-ocid="provider_messages.send_form"
        >
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Type a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Message"
              data-ocid="provider_messages.send_input"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSuggestReply}
              disabled={isSuggesting || !hasMessages}
              data-ocid="provider_messages.suggest_reply_button"
              className="shrink-0 border-accent/40 text-accent-foreground hover:bg-accent/10 hover:text-accent-foreground"
            >
              {isSuggesting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="w-4 h-4" aria-hidden />
              )}
              <span className="hidden sm:inline">AI Suggest Reply</span>
              <span className="sm:hidden">AI</span>
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={sendMessage.isPending || !draft.trim()}
              aria-label="Send message"
              data-ocid="provider_messages.send_button"
            >
              <Send className="w-4 h-4" aria-hidden />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProviderMessages() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: bookings, isLoading: bookingsLoading } =
    useListProviderBookings(providerId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedBookings = useMemo(() => {
    const list = [...(bookings ?? [])];
    list.sort((a, b) => Number(b.updatedAt - a.updatedAt));
    return list;
  }, [bookings]);

  const selectedBooking = useMemo(
    () => sortedBookings.find((b) => b.id === selectedId) ?? null,
    [sortedBookings, selectedId],
  );

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.provider_messages"
      >
        <SkeletonList count={4} className="grid-cols-1" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_messages"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to view messages"
          description="You need to sign in with Internet Identity to message customers about bookings."
          data-ocid="provider_messages.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_messages"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to start messaging DFW customers about their bookings."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_messages.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_messages.not_registered"
        />
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_messages"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_messages.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Chat with customers about their booking requests, timing, and job
            details.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8"
        data-ocid="provider_messages.inbox"
      >
        {bookingsLoading ? (
          <SkeletonList count={4} className="grid-cols-1 md:grid-cols-3" />
        ) : sortedBookings.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Once customers request your services, you can message them here."
            action={
              <Link to="/provider/listings">
                <Button data-ocid="provider_messages.manage_listings">
                  Manage listings
                </Button>
              </Link>
            }
            data-ocid="provider_messages.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-16rem)] min-h-[28rem]">
            {/* Inbox list */}
            <Card
              className={`py-0 flex flex-col overflow-hidden ${
                selectedBooking ? "hidden md:flex" : "flex"
              }`}
              data-ocid="provider_messages.list"
            >
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="font-display text-sm font-semibold text-foreground">
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {sortedBookings.map((booking, i) => (
                  <ThreadRow
                    key={booking.id}
                    booking={booking}
                    index={i}
                    active={selectedBooking?.id === booking.id}
                    onSelect={(b) => setSelectedId(b.id)}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Thread view */}
            <div className="md:col-span-2 h-full">
              {selectedBooking ? (
                <ThreadView
                  booking={selectedBooking}
                  onBack={() => setSelectedId(null)}
                />
              ) : (
                <Card
                  className="py-0 h-full flex items-center justify-center"
                  data-ocid="provider_messages.no_thread"
                >
                  <CardContent className="p-8 text-center">
                    <MessageSquare
                      className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3"
                      aria-hidden
                    />
                    <p className="text-sm text-muted-foreground font-body">
                      Select a conversation to view messages.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
