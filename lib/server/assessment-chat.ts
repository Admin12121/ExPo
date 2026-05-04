import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, inArray, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { assessmentMessages } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { realtime, type AssessmentMessageEvent } from "@/lib/realtime";
import { canPostAssessmentChat, type AppSessionUser } from "@/lib/server/assessments";
import { buildAssessmentRoomId } from "@/lib/server/assessment-room";
import { serverEnv } from "@/lib/server/env";

const DIRTY_ROOMS_KEY = "assessment-chat:dirty-rooms";
const LOCK_TTL_SECONDS = 30;

type RoomMeta = {
  bytes: number;
  count: number;
  oldestTimestamp: number;
  updatedAt: number;
};

function roomPendingListKey(roomId: string) {
  return `assessment-chat:pending:${roomId}`;
}

function roomMetaKey(roomId: string) {
  return `assessment-chat:meta:${roomId}`;
}

function roomFlushLockKey(roomId: string) {
  return `assessment-chat:flush-lock:${roomId}`;
}

function parseRoomMeta(value: Record<string, unknown> | null | undefined) {
  return {
    bytes: Number(value?.bytes ?? 0),
    count: Number(value?.count ?? 0),
    oldestTimestamp: Number(value?.oldestTimestamp ?? 0),
    updatedAt: Number(value?.updatedAt ?? 0),
  } satisfies RoomMeta;
}

function shouldFlush(meta: RoomMeta, now = Date.now()) {
  return (
    meta.count > 0 &&
    (meta.bytes >= serverEnv.assessmentChatMaxPendingBytes ||
      meta.count >= serverEnv.assessmentChatMaxPendingMessages ||
      now - meta.oldestTimestamp >= serverEnv.assessmentChatFlushAgeMs)
  );
}

function deserializeMessage(value: unknown) {
  try {
    const payload =
      typeof value === "string"
        ? (JSON.parse(value) as AssessmentMessageEvent)
        : (value as AssessmentMessageEvent);

    if (
      typeof payload?.id !== "string" ||
      typeof payload.assessmentId !== "string" ||
      typeof payload.roomId !== "string" ||
      typeof payload.sender !== "string" ||
      typeof payload.text !== "string" ||
      typeof payload.timestamp !== "number"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function compareMessages(
  left: Pick<AssessmentMessageEvent, "id" | "timestamp">,
  right: Pick<AssessmentMessageEvent, "id" | "timestamp">,
) {
  if (left.timestamp !== right.timestamp) {
    return left.timestamp - right.timestamp;
  }

  return left.id.localeCompare(right.id);
}

async function loadRoomMeta(roomId: string) {
  if (!redis) {
    return { bytes: 0, count: 0, oldestTimestamp: 0, updatedAt: 0 };
  }

  return parseRoomMeta(
    await redis.hgetall<Record<string, unknown>>(roomMetaKey(roomId)),
  );
}

async function loadPendingMessages(roomId: string) {
  if (!redis) {
    return [] as AssessmentMessageEvent[];
  }

  const raw = await redis.lrange<unknown[]>(roomPendingListKey(roomId), 0, -1);
  return (raw ?? [])
    .map((item) => deserializeMessage(item))
    .filter((item): item is AssessmentMessageEvent => item !== null)
    .sort(compareMessages);
}

async function insertMessages(messages: AssessmentMessageEvent[]) {
  if (messages.length === 0) {
    return 0;
  }

  const existingRows = await db
    .select({ id: assessmentMessages.id })
    .from(assessmentMessages)
    .where(inArray(assessmentMessages.id, messages.map((message) => message.id)));
  const existingIds = new Set(existingRows.map((row) => row.id));
  const rowsToInsert = messages
    .filter((message) => !existingIds.has(message.id))
    .map((message) => ({
      assessmentId: message.assessmentId,
      createdAt: new Date(message.timestamp),
      displayName: message.displayName,
      id: message.id,
      replyToMessageId: message.replyToMessageId ?? null,
      roomId: message.roomId,
      senderId: message.sender,
      senderRole: message.senderRole,
      text: message.text,
    }));

  if (rowsToInsert.length === 0) {
    return 0;
  }

  await db.insert(assessmentMessages).values(rowsToInsert);
  return rowsToInsert.length;
}

async function acquireFlushLock(roomId: string) {
  if (!redis) {
    return true;
  }

  const result = await redis.set(roomFlushLockKey(roomId), "1", {
    ex: LOCK_TTL_SECONDS,
    nx: true,
  });

  return result === "OK";
}

async function releaseFlushLock(roomId: string) {
  if (!redis) {
    return;
  }

  await redis.del(roomFlushLockKey(roomId));
}

export async function createAssessmentChatMessage(
  user: AppSessionUser,
  assessmentId: string,
  input: {
    replyToMessageId?: string;
    text: string;
  },
) {
  const assessment = await canPostAssessmentChat(user, assessmentId);
  if (!assessment) {
    throw new Error("Chat is not available for this assessment.");
  }

  const text = input.text.trim().slice(0, 4000);
  if (!text) {
    throw new Error("Message cannot be empty.");
  }

  const message: AssessmentMessageEvent = {
    assessmentId,
    displayName: user.name,
    id: randomUUID(),
    replyToMessageId: input.replyToMessageId,
    roomId: buildAssessmentRoomId(assessmentId),
    sender: user.id,
    senderRole:
      user.role === "admin" || user.role === "writer" ? user.role : "user",
    text,
    timestamp: Date.now(),
  };

  if (!redis) {
    await insertMessages([message]);
    await realtime.channel(message.roomId).emit("assessment.message", message);
    return message;
  }

  const serialized = JSON.stringify(message);
  const serializedBytes = Buffer.byteLength(serialized, "utf8");
  const currentMeta = await loadRoomMeta(message.roomId);
  const nextMeta = {
    bytes: currentMeta.bytes + serializedBytes,
    count: currentMeta.count + 1,
    oldestTimestamp:
      currentMeta.oldestTimestamp > 0
        ? currentMeta.oldestTimestamp
        : message.timestamp,
    updatedAt: Date.now(),
  } satisfies RoomMeta;

  await redis
    .pipeline()
    .rpush(roomPendingListKey(message.roomId), serialized)
    .hset(roomMetaKey(message.roomId), nextMeta)
    .zadd(DIRTY_ROOMS_KEY, {
      member: message.roomId,
      score: nextMeta.oldestTimestamp,
    })
    .expire(roomPendingListKey(message.roomId), 60 * 60)
    .expire(roomMetaKey(message.roomId), 60 * 60)
    .exec();

  await realtime.channel(message.roomId).emit("assessment.message", message);

  if (shouldFlush(nextMeta)) {
    await flushAssessmentChatRoom(message.roomId);
  }

  return message;
}

export async function flushAssessmentChatRoom(roomId: string) {
  if (!redis) {
    return { messages: 0, roomId };
  }

  const locked = await acquireFlushLock(roomId);
  if (!locked) {
    return { messages: 0, roomId };
  }

  try {
    const pendingMessages = await loadPendingMessages(roomId);
    const messages = await insertMessages(pendingMessages);

    await Promise.all([
      redis.del(roomPendingListKey(roomId)),
      redis.del(roomMetaKey(roomId)),
      redis.zrem(DIRTY_ROOMS_KEY, roomId),
    ]);

    return { messages, roomId };
  } finally {
    await releaseFlushLock(roomId);
  }
}

export async function maybeFlushAssessmentChatRoom(roomId: string) {
  if (!redis) {
    return { flushed: false, messages: 0, roomId };
  }

  const meta = await loadRoomMeta(roomId);
  if (!shouldFlush(meta)) {
    return { flushed: false, messages: 0, roomId };
  }

  const result = await flushAssessmentChatRoom(roomId);
  return { ...result, flushed: result.messages > 0 };
}

export async function flushDueAssessmentChatRooms() {
  if (!redis) {
    return { messages: 0, rooms: 0 };
  }

  const roomIds = await redis.zrange<string[]>(DIRTY_ROOMS_KEY, 0, 200);
  let rooms = 0;
  let messages = 0;

  for (const roomId of roomIds ?? []) {
    const result = await maybeFlushAssessmentChatRoom(roomId);
    if (result.flushed) {
      rooms += 1;
      messages += result.messages;
    }
  }

  return { messages, rooms };
}

export async function getAssessmentMessages(assessmentId: string, limit = 100) {
  const roomId = buildAssessmentRoomId(assessmentId);
  await maybeFlushAssessmentChatRoom(roomId);

  const pending = await loadPendingMessages(roomId);
  const rows = await db
    .select()
    .from(assessmentMessages)
    .where(
      and(
        eq(assessmentMessages.assessmentId, assessmentId),
        eq(assessmentMessages.roomId, roomId),
      ),
    )
    .orderBy(desc(assessmentMessages.createdAt))
    .limit(limit + pending.length);

  const mapped = rows.map(
    (row) =>
      ({
        assessmentId: row.assessmentId,
        displayName: row.displayName,
        id: row.id,
        replyToMessageId: row.replyToMessageId ?? undefined,
        roomId: row.roomId,
        sender: row.senderId ?? "system",
        senderRole:
          row.senderRole === "admin" || row.senderRole === "writer"
            ? row.senderRole
            : "user",
        text: row.text,
        timestamp: row.createdAt.getTime(),
      }) satisfies AssessmentMessageEvent,
  );

  const deduped = new Map<string, AssessmentMessageEvent>();
  for (const message of [...mapped, ...pending]) {
    deduped.set(message.id, message);
  }

  return Array.from(deduped.values()).sort(compareMessages).slice(-limit);
}
