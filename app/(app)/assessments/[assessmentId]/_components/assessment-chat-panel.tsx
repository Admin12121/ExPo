"use client";

import { SendHorizonalIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRealtime } from "@/lib/realtime-client";
import type { AssessmentMessageEvent } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type AssessmentChatPanelProps = {
  assessmentId: string;
  canPost: boolean;
  currentUserId: string;
  initialMessages: AssessmentMessageEvent[];
  roomId: string;
};

function compareMessages(
  left: Pick<AssessmentMessageEvent, "id" | "timestamp">,
  right: Pick<AssessmentMessageEvent, "id" | "timestamp">,
) {
  if (left.timestamp !== right.timestamp) {
    return left.timestamp - right.timestamp;
  }

  return left.id.localeCompare(right.id);
}

function mergeMessages(messages: AssessmentMessageEvent[]) {
  const deduped = new Map<string, AssessmentMessageEvent>();
  for (const message of messages) {
    deduped.set(message.id, message);
  }

  return Array.from(deduped.values()).sort(compareMessages);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function AssessmentChatPanel({
  assessmentId,
  canPost,
  currentUserId,
  initialMessages,
  roomId,
}: AssessmentChatPanelProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useRealtime({
    channels: [roomId],
    events: ["assessment.message"],
    onData: ({ data }) => {
      setMessages((current) => mergeMessages([...current, data]));
    },
  });

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({ top: node.scrollHeight });
  }, [messages]);

  async function sendMessage() {
    const trimmed = text.trim();
    if (!canPost || !trimmed || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/chat/messages`,
        {
          body: JSON.stringify({ text: trimmed }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: AssessmentMessageEvent;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to send message.");
      }

      if (payload?.message) {
        setMessages((current) => mergeMessages([...current, payload.message!]));
      }

      setText("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send message.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[30rem] flex-col gap-3">
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-6 overflow-y-auto rounded-xl bg-background p-4"
      >
        {messages.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm h-full">
            No messages yet.
          </div>
        ) : null}
        {messages.map((message) => {
          const own = message.sender === currentUserId;

          return (
            <div
              className={cn("flex gap-3", own && "flex-row-reverse")}
              key={message.id}
            >
              <Avatar className="size-8">
                <AvatarFallback>
                  {initials(message.displayName) || "A"}
                </AvatarFallback>
              </Avatar>
              <div className={cn("min-w-0 max-w-2xl", own && "text-right")}>
                <div
                  className={cn(
                    "mb-1 flex items-center gap-2 text-muted-foreground text-xs",
                    own && "justify-end",
                  )}
                >
                  <span className="font-medium text-foreground/80">
                    {message.displayName}
                  </span>
                  <span>{formatTime(message.timestamp)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7">
                  {message.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-background p-3 gap-2 flex">
        <Textarea
          className="min-h-24 border-0 bg-transparent shadow-none"
          disabled={!canPost || pending}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder={canPost ? "Write a message..." : "Chat is closed"}
          value={text}
        />
        <div className="mt-2 flex items-end justify-between gap-2">
          <Button
            disabled={!canPost || pending || text.trim().length === 0}
            loading={pending}
            onClick={() => void sendMessage()}
            type="button"
            size={"icon"}
          >
            <SendHorizonalIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
