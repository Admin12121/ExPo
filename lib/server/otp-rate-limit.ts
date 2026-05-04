import "server-only";

import { and, count, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { otpResendLogs } from "@/lib/db/schema";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_EMAIL_RESENDS = 3;
const MAX_IP_RESENDS = 10;

export class OtpRateLimitError extends Error {
  constructor() {
    super("Too many OTP requests");
    this.name = "OtpRateLimitError";
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    forwardedIp ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

async function countRecentResends(input: {
  email?: string;
  ipAddress?: string;
  cutoff: Date;
}) {
  const filters = [gt(otpResendLogs.createdAt, input.cutoff)];

  if (input.email) {
    filters.push(eq(otpResendLogs.email, input.email));
  }

  if (input.ipAddress) {
    filters.push(eq(otpResendLogs.ipAddress, input.ipAddress));
  }

  const [row] = await db
    .select({ value: count() })
    .from(otpResendLogs)
    .where(and(...filters));

  return Number(row?.value ?? 0);
}

export async function recordOtpRequestOrThrow({
  email,
  request,
}: {
  email: string;
  request: Request;
}) {
  const ipAddress = getClientIp(request);
  const cutoff = new Date(Date.now() - WINDOW_MS);
  const [emailCount, ipCount] = await Promise.all([
    countRecentResends({ cutoff, email }),
    countRecentResends({ cutoff, ipAddress }),
  ]);

  if (emailCount >= MAX_EMAIL_RESENDS || ipCount >= MAX_IP_RESENDS) {
    throw new OtpRateLimitError();
  }

  await db.insert(otpResendLogs).values({ email, ipAddress });
}
