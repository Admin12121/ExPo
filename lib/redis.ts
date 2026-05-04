import "server-only";

import { Redis } from "@upstash/redis";

import { serverEnv } from "@/lib/server/env";

export const redis =
  serverEnv.upstashRedisRestUrl && serverEnv.upstashRedisRestToken
    ? new Redis({
        token: serverEnv.upstashRedisRestToken,
        url: serverEnv.upstashRedisRestUrl,
      })
    : null;
