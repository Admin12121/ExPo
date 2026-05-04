import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  accounts,
  passkeys,
  sessions,
  twoFactors,
  users,
} from "@/lib/db/schema";

export type UpdateAccountProfileInput = {
  name: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  bio?: string;
  recoveryEmail?: string;
};

export async function getAccountSettings(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      timezone: users.timezone,
      locale: users.locale,
      bio: users.bio,
      role: users.role,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      recoveryEmail: users.recoveryEmail,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("Account not found.");
  }

  const [linkedAccounts, activeSessions, accountPasskeys, twoFactorRows] =
    await Promise.all([
      db
        .select({
          id: accounts.id,
          providerId: accounts.providerId,
          accountId: accounts.accountId,
          createdAt: accounts.createdAt,
          updatedAt: accounts.updatedAt,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .orderBy(desc(accounts.createdAt)),
      db
        .select({
          id: sessions.id,
          token: sessions.token,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          expiresAt: sessions.expiresAt,
          createdAt: sessions.createdAt,
          updatedAt: sessions.updatedAt,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.updatedAt)),
      db
        .select({
          id: passkeys.id,
          name: passkeys.name,
          deviceType: passkeys.deviceType,
          backedUp: passkeys.backedUp,
          createdAt: passkeys.createdAt,
          updatedAt: passkeys.updatedAt,
        })
        .from(passkeys)
        .where(eq(passkeys.userId, userId))
        .orderBy(desc(passkeys.createdAt)),
      db
        .select({
          verified: twoFactors.verified,
          createdAt: twoFactors.createdAt,
          updatedAt: twoFactors.updatedAt,
        })
        .from(twoFactors)
        .where(eq(twoFactors.userId, userId))
        .limit(1),
    ]);

  return {
    user,
    linkedAccounts,
    sessions: activeSessions,
    passkeys: accountPasskeys,
    twoFactor: twoFactorRows[0] ?? null,
  };
}

export async function updateAccountProfile(
  userId: string,
  input: UpdateAccountProfileInput,
) {
  await db
    .update(users)
    .set({
      name: input.name,
      phone: input.phone ?? null,
      timezone: input.timezone || "UTC",
      locale: input.locale || "en",
      bio: input.bio ?? null,
      recoveryEmail: input.recoveryEmail ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function deleteAccountPasskey(userId: string, passkeyId: string) {
  await db
    .delete(passkeys)
    .where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)));
}

export async function revokeAccountSession(
  userId: string,
  sessionId: string,
  currentSessionId: string,
) {
  await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        ne(sessions.id, currentSessionId),
      ),
    );
}
