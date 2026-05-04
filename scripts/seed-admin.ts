import "dotenv/config";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { authSchema } from "../lib/db/schema";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5432/athena";

const ADMIN_EMAIL = process.env.ATHENA_ADMIN_EMAIL ?? "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ATHENA_ADMIN_PASSWORD ?? "admin@#12";
const ADMIN_NAME = process.env.ATHENA_ADMIN_NAME ?? "Admin";

function createSeedAuth(pool: Pool) {
  const db = drizzle(pool, { schema: authSchema });

  return betterAuth({
    appName: "Athena",
    basePath: "/api/auth",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret:
      process.env.BETTER_AUTH_SECRET ??
      "dev-athena-better-auth-secret-change-me",
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
      usePlural: true,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
  });
}

async function seedAdmin() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 5,
  });
  const auth = createSeedAuth(pool);

  try {
    await pool.query("DELETE FROM users WHERE email = $1", [ADMIN_EMAIL]);

    const created = await auth.api.signUpEmail({
      body: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
      headers: {
        "x-forwarded-for": "127.0.0.1",
        "x-real-ip": "127.0.0.1",
        "user-agent": "athena-seed/1.0",
      },
    });

    await pool.query(
      `
      UPDATE users
      SET role = 'admin',
          email_verified = true,
          is_active = true,
          banned = false,
          updated_at = now()
      WHERE id = $1
      `,
      [created.user.id],
    );

    console.log(`Seeded admin ${ADMIN_EMAIL}`);
  } finally {
    await pool.end();
  }
}

seedAdmin().catch((error) => {
  console.error("Failed to seed admin:", error);
  process.exit(1);
});
