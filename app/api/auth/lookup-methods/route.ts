import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users, twoFactors, passkeys } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return NextResponse.json({ exists: false, methods: {} });
    }

    const [tf] = await db.select().from(twoFactors).where(eq(twoFactors.userId, user.id)).limit(1);
    const [pk] = await db.select().from(passkeys).where(eq(passkeys.userId, user.id)).limit(1);

    return NextResponse.json({
      exists: true,
      methods: {
        emailOtp: true,
        totp: !!tf && !!tf.verified,
        passkey: !!pk,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
