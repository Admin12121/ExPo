import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/lib/db/schema";

const LOCAL_DATABASE_URL =
  "postgres://postgres:postgres@127.0.0.1:5432/athena";

declare global {
  var __athenaPool: Pool | undefined;
}

export function getDatabaseUrl() {
  const configured = process.env.DATABASE_URL;

  if (!configured && process.env.APP_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }

  return configured ?? LOCAL_DATABASE_URL;
}

export function getPool() {
  if (!globalThis.__athenaPool) {
    globalThis.__athenaPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
    });
  }

  return globalThis.__athenaPool;
}

export const db = drizzle(getPool(), { schema });
