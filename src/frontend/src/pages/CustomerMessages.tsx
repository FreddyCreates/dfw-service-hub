// CustomerMessages — messaging inbox for the signed-in customer.
// Lists booking threads from useListMyBookings with unread indicators.
// Clicking a thread opens the message view (useGetThread) with a send form
// (useSendMessage) and marks the thread read (useMarkThreadRead) on open.
// V3 polish: skeleton loading, motion, improved message UI.

import { EmptyState } from "@/components/EmptyState";
import { MessageBubble } from "@/components/MessageBubble";
import { Skeleton, SkeletonText } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetProvider,
  useGetThread,
  useListMyBookings,
  useMarkThreadRead,
  useSendMessage,
  useSuggestReply,
  useUnreadMessageCount,
} from "@/hooks/useQueries";
import { type Booking, CATEGORY_LABELS, type Message } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  MessageSquare,
  Send,
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
        ? "Customer"
        : "Provider";
    return `${sender}: ${msg.content}`;
  });
  return lines.join("\n");
}

// Inbox list row — resolves provider name + unread count for one booking.
function ThreadRow({
  booking,
  index,
  active,
  onSelect,
}: {
  booking: Booking;
  index: number;
  active: boolean;
  onSelect: (booking: Booking) => void;
}) {
  const { data: provider } = useGetProvider(booking.providerId);
  const { data: unread } = useUnreadMessageCount(booking.id);
  const unreadCount = unread !== undefined ? Number(unread) : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(booking)}
      className={`w-full text-left p-4 border-b border-border transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
        active ? "bg-primary/10" : "hover:bg-secondary"
      }`}
      data-ocid={`customer_messages.thread.${index + 1}`}
      aria-current={active ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-body font-medium text-foreground truncate">
            {provider?.companyName ?? "Provider"}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            {CATEGORY_LABELS[booking.category]} ·{" "}
            {formatDate(booking.scheduledDate)}
          </p>
        </div>
        {unreadCount > 0 ? (
          <span
            className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-body font-semibold animate-badge-pop"
            aria-label={`${unreadCount} unread`}
            data-ocid={`customer_messages.unread.${index + 1}`}
          >
            {unreadCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}

// Skeleton row for the inbox list — matches ThreadRow layout.
function ThreadRowSkeleton({ index }: { index: number }) {
  return (
    <div
      className="p-4 border-b border-border"
      data-ocid={`customer_messages.thread_skeleton.${index + 1}`}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton circle className="w-5 h-5" />
      </div>
    </div>
  );
}

// Skeleton for the thread view — message bubbles + send form.
function ThreadViewSkeleton() {
  return (
    <Card
      className="py-0 flex flex-col h-full"
      data-ocid="customer_messages.thread_view_skeleton"
    >
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Skeleton circle className="w-9 h-9" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div className="flex-1 p-4 flex flex-col gap-3">
          <div className="flex justify-start">
            <Skeleton className="h-12 w-2/3 rounded-2xl rounded-bl-md" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-1/2 rounded-2xl rounded-br-md" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-16 w-3/4 rounded-2xl rounded-bl-md" />
          </div>
        </div>
        <div className="border-t border-border p-3 flex items-center gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// Thread view — message list + send form for a single booking.
function ThreadView({
  booking,
  onBack,
}: {
  booking: Booking;
  onBack: () => void;
}) {
  const { identity } = useInternetIdentity();
  const { data: provider } = useGetProvider(booking.providerId);
  const { data: messages, isLoading } = useGetThread(booking.id);
  const sendMessage = useSendMessage();
  const suggestReply = useSuggestReply();
  const markThreadRead = useMarkThreadRead();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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
          setDraft(reply);
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

  // Mark the thread read when opened.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional fire-on-open
  useEffect(() => {
    markThreadRead.mutate(booking.id);
    // Only on open / booking change.
  }, [booking.id]);

  // Auto-scroll to the latest message.
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
      className="py-0 flex flex-col h-full animate-fade-in-up shadow-subtle"
      data-ocid="customer_messages.thread_view"
    >
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back to inbox"
            data-ocid="customer_messages.back"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </button>
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-semibold text-foreground truncate">
              {provider?.companyName ?? "Provider"}
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
        <ScrollArea className="flex-1" data-ocid="customer_messages.scroll">
          <div ref={scrollRef} className="p-4 flex flex-col gap-3 min-h-full">
            {isLoading ? (
              <div className="flex flex-col gap-3" aria-hidden>
                <div className="flex justify-start">
                  <Skeleton className="h-12 w-2/3 rounded-2xl rounded-bl-md" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-12 w-1/2 rounded-2xl rounded-br-md" />
                </div>
                <div className="flex justify-start">
                  <Skeleton className="h-16 w-3/4 rounded-2xl rounded-bl-md" />
                </div>
              </div>
            ) : !messages || messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <MessageSquare
                    className="w-6 h-6 text-muted-foreground"
                    aria-hidden
                  />
                </div>
                <p className="text-sm text-muted-foreground font-body">
                  No messages yet. Say hello to your provider.
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                >
                  <MessageBubble
                    message={msg}
                    currentPrincipal={identity?.getPrincipal() ?? null}
                    index={i}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <form
          onSubmit={handleSend}
          className="border-t border-border p-3 flex items-center gap-2"
          data-ocid="customer_messages.send_form"
        >
          <Input
            type="text"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Message"
            data-ocid="customer_messages.send_input"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSuggestReply}
            disabled={isSuggesting || !hasMessages}
            aria-label="Suggest reply with AI"
            title="Suggest reply with AI"
            data-ocid="customer_messages.suggest_reply_button"
            className="shrink-0 text-accent-foreground border-accent/40 hover:bg-accent/10 hover:text-accent-foreground"
          >
            {isSuggesting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="w-4 h-4" aria-hidden />
            )}
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={sendMessage.isPending || !draft.trim()}
            aria-label="Send message"
            data-ocid="customer_messages.send_button"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Send className="w-4 h-4" aria-hidden />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CustomerMessages() {
  const { isAuthenticated, login } = useAuth();
  const { data: bookings, isLoading } = useListMyBookings();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      login();
    }
  }, [isAuthenticated, login]);

  const sortedBookings = useMemo(() => {
    const list = [...(bookings ?? [])];
    list.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
    return list;
  }, [bookings]);

  const selectedBooking = useMemo(
    () => sortedBookings.find((b) => b.id === selectedId) ?? null,
    [sortedBookings, selectedId],
  );

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.customer_messages"
      >
        <EmptyState
          icon={MessageSquare}
          title="Sign in to view messages"
          description="Message your providers about bookings, timing, and job details."
          action={
            <Button onClick={login} data-ocid="customer_messages.signin">
              Sign in
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen animate-page-transition"
      data-ocid="page.customer_messages"
    >
      <section
        className="bg-card border-b border-border shadow-subtle"
        data-ocid="customer_messages.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Chat with your providers about active and upcoming bookings.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8"
        data-ocid="customer_messages.inbox"
      >
        {isLoading ? (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-16rem)] min-h-[28rem]"
            data-ocid="customer_messages.loading_state"
          >
            <Card
              className="py-0 flex flex-col overflow-hidden"
              data-ocid="customer_messages.list_skeleton"
            >
              <CardHeader className="border-b border-border py-3">
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ThreadRowSkeleton
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton thread rows have no stable identity; index is the only available key.
                    key={i}
                    index={i}
                  />
                ))}
              </CardContent>
            </Card>
            <div className="md:col-span-2 h-full">
              <ThreadViewSkeleton />
            </div>
          </div>
        ) : sortedBookings.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Once you book a service, you can message your provider here."
            action={
              <Button
                onClick={() => undefined}
                data-ocid="customer_messages.browse"
                asChild
              >
                <a href="/search">Browse services</a>
              </Button>
            }
            data-ocid="customer_messages.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-16rem)] min-h-[28rem]">
            {/* Inbox list */}
            <Card
              className={`py-0 flex flex-col overflow-hidden shadow-subtle ${
                selectedBooking ? "hidden md:flex" : "flex"
              }`}
              data-ocid="customer_messages.list"
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
                  className="py-0 h-full flex items-center justify-center shadow-subtle"
                  data-ocid="customer_messages.no_thread"
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                      <MessageSquare
                        className="w-7 h-7 text-muted-foreground"
                        aria-hidden
                      />
                    </div>
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
