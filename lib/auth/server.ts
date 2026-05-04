import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { APIError, betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import {
  admin,
  createAccessControl,
  emailOTP,
  twoFactor,
} from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { authSchema, users } from "@/lib/db/schema";
import {
  resetPasswordEmail,
  signInOtpEmail,
  twoFactorOtpEmail,
  verifyEmailEmail,
} from "@/lib/server/email-templates";
import { sendAuthEmail } from "@/lib/server/email";

const APP_NAME = "ExPO";

const userManagementAccess = createAccessControl({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

const adminRole = userManagementAccess.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

const standardRole = userManagementAccess.newRole({
  user: [],
  session: [],
});

function getAuthSecret() {
  if (process.env.BETTER_AUTH_SECRET) {
    return process.env.BETTER_AUTH_SECRET;
  }

  if (process.env.APP_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }

  return "dev-athena-better-auth-secret-change-me";
}

function getBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

function getPasskeyRpId() {
  if (process.env.PASSKEY_RP_ID) {
    return process.env.PASSKEY_RP_ID;
  }

  try {
    return new URL(getBaseUrl()).hostname;
  } catch {
    return "localhost";
  }
}

export const auth = betterAuth({
  appName: APP_NAME,
  basePath: "/api/auth",
  baseURL: getBaseUrl(),
  secret: getAuthSecret(),
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
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const [user] = await db
            .select({
              banned: users.banned,
              isActive: users.isActive,
              deletedAt: users.deletedAt,
              emailVerified: users.emailVerified,
            })
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);

          if (!user || user.banned || !user.isActive || user.deletedAt) {
            throw APIError.from("FORBIDDEN", {
              code: "ACCOUNT_DISABLED",
              message: "This account cannot sign in.",
            });
          }
          // require verified email before allowing session creation
          if (!user.emailVerified) {
            throw APIError.from("FORBIDDEN", {
              code: "EMAIL_NOT_VERIFIED",
              message: "Email address not verified.",
            });
          }
        },
        async after(session) {
          await db
            .update(users)
            .set({
              lastLoginAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, session.userId));
        },
      },
    },
  },
  user: {
    additionalFields: {
      isActive: {
        type: "boolean",
        input: false,
        required: false,
        defaultValue: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // do not automatically sign users in after sign-up — create account only
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your ExPO password",
        react: resetPasswordEmail(url, APP_NAME),
        text: `Reset your ExPO password: ${url}`,
      });
    },
  },
  emailVerification: {
    // do NOT send the default verification link on sign-up —
    // we prefer to use email-OTP flows (client will request OTP)
    sendOnSignUp: false,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Verify your ExPO email",
        react: verifyEmailEmail(url, APP_NAME),
        text: `Verify your ExPO email address: ${url}`,
      });
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      ac: userManagementAccess,
      roles: {
        admin: adminRole,
        writer: standardRole,
        user: standardRole,
      },
      bannedUserMessage: "This account cannot sign in.",
    }),
    emailOTP({
      // allow sign-ups (was disabling sign-up globally)
      disableSignUp: false,
      overrideDefaultEmailVerification: true,
      expiresIn: 300,
      allowedAttempts: 3,
      async sendVerificationOTP({ email, otp, type }) {
        await sendAuthEmail({
          to: email,
          subject:
            type === "sign-in"
              ? "Your ExPO sign-in code"
              : "Your ExPO verification code",
          react: signInOtpEmail(otp, APP_NAME, 5),
          text: `Your ExPO code is ${otp}. It expires in 5 minutes.`,
        });
      },
    }),
    twoFactor({
      issuer: APP_NAME,
      allowPasswordless: true,
      otpOptions: {
        period: 5,
        digits: 6,
        allowedAttempts: 5,
        async sendOTP({ user, otp }) {
          await sendAuthEmail({
            to: user.email,
            subject: "Your ExPO two-factor code",
            react: twoFactorOtpEmail(otp, APP_NAME),
            text: `Your ExPO two-factor code is ${otp}.`,
          });
        },
      },
    }),
    passkey({
      rpName: APP_NAME,
      rpID: getPasskeyRpId(),
      origin: process.env.PASSKEY_ORIGIN ?? getBaseUrl(),
    }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
