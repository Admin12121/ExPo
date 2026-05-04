import "server-only";

import { Realtime, type InferRealtimeEvents } from "@upstash/realtime";
import { z } from "zod";

import { redis } from "@/lib/redis";

const assessmentMessage = z.object({
  id: z.string(),
  assessmentId: z.string(),
  roomId: z.string(),
  sender: z.string(),
  senderRole: z.enum(["admin", "writer", "user"]),
  displayName: z.string(),
  text: z.string(),
  timestamp: z.number(),
  replyToMessageId: z.string().optional(),
});

const assessmentStatus = z.object({
  assessmentId: z.string(),
  status: z.string(),
  title: z.string(),
  timestamp: z.number(),
});

const notification = z.object({
  id: z.string(),
  assessmentId: z.string().optional(),
  title: z.string(),
  body: z.string(),
  timestamp: z.number(),
});

const schema = {
  assessment: {
    message: assessmentMessage,
    status: assessmentStatus,
  },
  notification: {
    item: notification,
  },
};

export const realtime = new Realtime({
  schema,
  redis: redis ?? undefined,
  history: {
    expireAfterSecs: 60 * 60,
    maxLength: 200,
  },
});

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
export type AssessmentMessageEvent = z.infer<typeof assessmentMessage>;
export type AssessmentStatusEvent = z.infer<typeof assessmentStatus>;
export type NotificationEvent = z.infer<typeof notification>;
