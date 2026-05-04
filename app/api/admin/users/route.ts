import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { userRoles, type UserRole } from "@/lib/db/schema";
import { setUserActive, updateUserRole } from "@/lib/server/users";

export const runtime = "nodejs";

function isRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (isRole(body?.role)) {
    await updateUserRole(userId, body.role);
    return NextResponse.json({ ok: true });
  }

  if (typeof body?.active === "boolean") {
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot disable your own account." },
        { status: 400 },
      );
    }

    await setUserActive(userId, body.active);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
