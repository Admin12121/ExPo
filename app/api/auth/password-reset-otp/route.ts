import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import { createPasswordResetState } from "@/lib/auth/password-reset-state";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  OtpRateLimitError,
  recordOtpRequestOrThrow,
} from "@/lib/server/otp-rate-limit";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      headers: { "cache-control": "no-store" },
      status,
    },
  );
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Enter a valid email address.", 400);
  }

  const { email } = parsed.data;

  try {
    await recordOtpRequestOrThrow({ email, request });
  } catch (error) {
    if (error instanceof OtpRateLimitError) {
      return jsonError(error.message, 429);
    }

    console.error("Password reset OTP rate-limit check failed", error);
    return jsonError("Unable to send reset code.", 500);
  }

  let user:
    | {
        banned: boolean;
        deletedAt: Date | null;
        id: string;
        isActive: boolean;
      }
    | undefined;

  try {
    [user] = await db
      .select({
        banned: users.banned,
        deletedAt: users.deletedAt,
        id: users.id,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
  } catch (error) {
    console.error("Password reset user lookup failed", error);
    return jsonError("Unable to send reset code.", 500);
  }

  if (!user || user.deletedAt) {
    return jsonError("No account was found for this email.", 404);
  }

  if (user.banned || !user.isActive) {
    return jsonError("This account cannot reset its password.", 403);
  }

  try {
    await auth.api.requestPasswordResetEmailOTP({
      body: { email },
    });
  } catch (error) {
    console.error("auth.api.requestPasswordResetEmailOTP failed", error);
    return jsonError("Unable to send reset code.", 500);
  }

  return NextResponse.json(
    {
      state: createPasswordResetState(email),
      success: true,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
