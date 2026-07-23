// MessageBubble — single message in a booking thread.

import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import type { Principal } from "@icp-sdk/core/principal";

interface MessageBubbleProps {
  message: Message;
  currentPrincipal: Principal | null;
  index?: number;
}

function formatTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageBubble({
  message,
  currentPrincipal,
  index = 0,
}: MessageBubbleProps) {
  const isOwn =
    !!currentPrincipal &&
    message.sender.toString() === currentPrincipal.toString();

  return (
    <div
      data-ocid={`message_bubble.${index + 1}`}
      className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md",
        )}
      >
        <p className="text-sm font-body leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div
          className={cn(
            "flex items-center gap-1.5 mt-1",
            isOwn ? "justify-end" : "justify-start",
          )}
        >
          <span
            className={cn(
              "text-[0.6875rem] font-body",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {formatTime(message.sentAt)}
          </span>
          {isOwn && message.read ? (
            <span
              className="text-[0.6875rem] text-primary-foreground/70 font-body"
              aria-label="Read"
            >
              · Read
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
