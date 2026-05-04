import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { otpResendLogs } from "@/lib/db/schema";
import { eq, gt, and } from "drizzle-orm";
import { auth } from "@/lib/auth/server";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RESENDS = 3;

export async function POST(request: Request) {
  try {
    const { email, type } = await request.json();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const cutoff = new Date(Date.now() - WINDOW_MS);

    // Count resends in the last WINDOW_MS
    const rows = await db
      .select()
      .from(otpResendLogs)
      .where(and(eq(otpResendLogs.email, email), gt(otpResendLogs.createdAt, cutoff)));

    const n = rows.length;
    if (n >= MAX_RESENDS) {
      return NextResponse.json({ error: "Too many OTP requests" }, { status: 429 });
    }

    // Insert a log entry
    await db.insert(otpResendLogs).values({ email });

    // Forward the request to better-auth's internal API to generate & store OTP
    // Type default to 'sign-in' when not provided
    await auth.api.sendVerificationOTP({ body: { email, type: type ?? "sign-in" } as any });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
