import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

export async function getCurrentSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession(nextPath = "/dashboard") {
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const user = session.user as typeof session.user & {
    banned?: boolean | null;
    isActive?: boolean | null;
    role?: string | null;
  };

  if (user.banned || user.isActive === false) {
    redirect("/login?error=account_disabled");
  }

  return {
    ...session,
    user,
  };
}

export async function requireAdmin(nextPath = "/users") {
  const session = await requireSession(nextPath);

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return session;
}
