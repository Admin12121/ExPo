import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const VERSION = "v1";
const STATE_TTL_MS = 10 * 60 * 1000;

const payloadSchema = z.object({
  email: z.email(),
  expiresAt: z.number().int().positive(),
});

type PasswordResetStatePayload = z.infer<typeof payloadSchema>;

function getStateSecret() {
  const secret =
    process.env.PASSWORD_RESET_STATE_SECRET ?? process.env.BETTER_AUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.APP_ENV === "production") {
    throw new Error(
      "PASSWORD_RESET_STATE_SECRET or BETTER_AUTH_SECRET is required in production.",
    );
  }

  return "dev-expo-password-reset-state-secret-change-me";
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getStateSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function isEqualSignature(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function createPasswordResetState(email: string) {
  const payload: PasswordResetStatePayload = {
    email,
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = signPayload(encodedPayload);

  return `${VERSION}.${encodedPayload}.${signature}`;
}

export function verifyPasswordResetState(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [version, encodedPayload, signature] = token.split(".");
  if (version !== VERSION || !encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!isEqualSignature(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = payloadSchema.parse(
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")),
    );

    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
