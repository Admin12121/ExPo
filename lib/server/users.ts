import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, type UserRole, userRoles } from "@/lib/db/schema";

export type UserDirectoryRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  banned: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export function parseUserRole(value: FormDataEntryValue | null): UserRole {
  const role = String(value ?? "user");

  if (userRoles.includes(role as UserRole)) {
    return role as UserRole;
  }

  return "user";
}

export async function getUsers() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      banned: users.banned,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt), asc(users.email));

  return rows.map((row) => ({
    ...row,
    role: parseUserRole(row.role),
  }));
}

export async function updateUserRole(userId: string, role: UserRole) {
  await db
    .update(users)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function setUserActive(userId: string, isActive: boolean) {
  await db
    .update(users)
    .set({
      isActive,
      banned: !isActive,
      banReason: isActive ? null : "Disabled by admin",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
