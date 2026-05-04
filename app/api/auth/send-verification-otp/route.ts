import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import {
  OtpRateLimitError,
  recordOtpRequestOrThrow,
} from "@/lib/server/otp-rate-limit";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "valid email required" },
        { status: 400 },
      );
    }

    const { email } = parsed.data;

    try {
      await recordOtpRequestOrThrow({ email, request });
    } catch (dbErr: unknown) {
      if (dbErr instanceof OtpRateLimitError) {
        return NextResponse.json(
          { error: dbErr.message },
          { status: 429 },
        );
      }

      console.error("OTP resend logs check failed", dbErr);
      const message =
        process.env.NODE_ENV === "production"
          ? "Internal DB error"
          : dbErr instanceof Error
            ? dbErr.message
            : String(dbErr);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // This route is only for email verification. Sign-in OTP uses Better Auth's
    // own /api/auth/sign-in/email-otp endpoint and plugin rate limits.
    try {
      await auth.api.sendVerificationOTP({
        body: { email, type: "email-verification" },
      });
    } catch (sendErr: unknown) {
      console.error("auth.api.sendVerificationOTP failed", sendErr);
      const message =
        process.env.NODE_ENV === "production"
          ? "Failed to send OTP"
          : sendErr instanceof Error
            ? sendErr.message
            : String(sendErr);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
