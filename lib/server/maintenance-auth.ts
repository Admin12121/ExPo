import "server-only";

import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/server/env";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isMaintenanceRequestAuthorized(request: Request) {
  const apiKey = serverEnv.maintenanceApiKey;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = apiKey ? `Bearer ${apiKey}` : "";

  return Boolean(apiKey && authorization && safeEqual(authorization, expected));
}
