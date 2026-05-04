import { NextResponse } from "next/server";

function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email);
    if (!isEmail(email)) {
      return NextResponse.json({ error: "valid email required" }, { status: 400 });
    }

    return NextResponse.json({
      exists: true,
      methods: {
        emailOtp: true,
        passkey: false,
        totp: false,
      },
    }, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
