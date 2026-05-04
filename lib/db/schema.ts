import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoles = ["admin", "writer", "user"] as const;

export type UserRole = (typeof userRoles)[number];

export const assessmentStatuses = [
  "open",
  "in_progress",
  "close_requested",
  "closed",
  "completed_pending_payment",
  "payment_submitted",
  "payment_verified",
  "downloaded",
  "archived",
  "cancelled",
] as const;

export type AssessmentStatus = (typeof assessmentStatuses)[number];

export const assessmentFileKinds = [
  "source",
  "completed",
  "payment_proof",
] as const;

export type AssessmentFileKind = (typeof assessmentFileKinds)[number];

export const assessmentFileScanStatuses = [
  "clean",
  "rejected",
  "deleted",
] as const;

export type AssessmentFileScanStatus =
  (typeof assessmentFileScanStatuses)[number];

export const assessmentReportStatuses = ["open", "resolved"] as const;

export type AssessmentReportStatus = (typeof assessmentReportStatuses)[number];

export const notificationStatuses = ["unread", "read"] as const;

export type NotificationStatus = (typeof notificationStatuses)[number];

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role").notNull().default("user"),
    phone: text("phone"),
    timezone: text("timezone").notNull().default("UTC"),
    locale: text("locale").notNull().default("en"),
    bio: text("bio"),
    recoveryEmail: text("recovery_email"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_active_idx").on(table.isActive),
    check("users_role_check", sql`${table.role} in ('admin', 'writer', 'user')`),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounts_user_idx").on(table.userId),
    unique("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: uuid("impersonated_by").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("verifications_identifier_idx").on(table.identifier),
    index("verifications_expires_idx").on(table.expiresAt),
    unique("verifications_identifier_value_unique").on(
      table.identifier,
      table.value,
    ),
  ],
);

export const otpResendLogs = pgTable(
  "otp_resend_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    ipAddress: text("ip_address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("otp_resend_logs_email_idx").on(table.email),
    index("otp_resend_logs_ip_idx").on(table.ipAddress),
    index("otp_resend_logs_created_idx").on(table.createdAt),
  ],
);

export const twoFactors = pgTable(
  "two_factors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("two_factors_user_idx").on(table.userId)],
);

export const passkeys = pgTable(
  "passkeys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    credentialID: text("credential_id").notNull().unique(),
    counter: integer("counter").notNull().default(0),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull().default(false),
    transports: text("transports"),
    aaguid: text("aaguid"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("passkeys_user_idx").on(table.userId)],
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    writerId: uuid("writer_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    topic: text("topic").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("open"),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    paymentSubmittedAt: timestamp("payment_submitted_at", {
      withTimezone: true,
    }),
    paymentVerifiedAt: timestamp("payment_verified_at", {
      withTimezone: true,
    }),
    firstDownloadedAt: timestamp("first_downloaded_at", {
      withTimezone: true,
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closeReason: text("close_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assessments_user_idx").on(table.userId),
    index("assessments_writer_idx").on(table.writerId),
    index("assessments_status_idx").on(table.status),
    index("assessments_deadline_idx").on(table.deadlineAt),
    index("assessments_created_idx").on(table.createdAt),
    index("assessments_completed_idx").on(table.completedAt),
    index("assessments_downloaded_idx").on(table.firstDownloadedAt),
    index("assessments_payment_state_idx").on(
      table.status,
      table.paymentSubmittedAt,
      table.paymentVerifiedAt,
    ),
    check(
      "assessments_status_check",
      sql`${table.status} in ('open', 'in_progress', 'close_requested', 'closed', 'completed_pending_payment', 'payment_submitted', 'payment_verified', 'downloaded', 'archived', 'cancelled')`,
    ),
    check("assessments_price_check", sql`${table.priceCents} >= 0`),
  ],
);

export const assessmentFiles = pgTable(
  "assessment_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    uploaderId: uuid("uploader_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    kind: text("kind").notNull(),
    originalName: text("original_name").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    scanStatus: text("scan_status").notNull().default("clean"),
    scanMessage: text("scan_message"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_files_storage_key_unique").on(table.storageKey),
    index("assessment_files_assessment_idx").on(table.assessmentId),
    index("assessment_files_kind_idx").on(table.kind),
    index("assessment_files_scan_idx").on(table.scanStatus),
    check(
      "assessment_files_kind_check",
      sql`${table.kind} in ('source', 'completed', 'payment_proof')`,
    ),
    check(
      "assessment_files_scan_status_check",
      sql`${table.scanStatus} in ('clean', 'rejected', 'deleted')`,
    ),
    check("assessment_files_size_check", sql`${table.sizeBytes} >= 0`),
  ],
);

export const assessmentMessages = pgTable(
  "assessment_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    roomId: text("room_id").notNull(),
    senderId: uuid("sender_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    senderRole: text("sender_role").notNull(),
    displayName: text("display_name").notNull(),
    text: text("text").notNull(),
    replyToMessageId: uuid("reply_to_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("assessment_messages_assessment_idx").on(table.assessmentId),
    index("assessment_messages_room_idx").on(table.roomId),
    index("assessment_messages_created_idx").on(table.createdAt),
    check(
      "assessment_messages_sender_role_check",
      sql`${table.senderRole} in ('admin', 'writer', 'user')`,
    ),
  ],
);

export const assessmentCloseRequests = pgTable(
  "assessment_close_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    requestedById: uuid("requested_by_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    requestedByRole: text("requested_by_role").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    respondedById: uuid("responded_by_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assessment_close_requests_assessment_idx").on(table.assessmentId),
    index("assessment_close_requests_status_idx").on(table.status),
    check(
      "assessment_close_requests_status_check",
      sql`${table.status} in ('pending', 'accepted', 'rejected')`,
    ),
    check(
      "assessment_close_requests_role_check",
      sql`${table.requestedByRole} in ('admin', 'writer', 'user')`,
    ),
  ],
);

export const assessmentReports = pgTable(
  "assessment_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    reporterId: uuid("reporter_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    resolvedById: uuid("resolved_by_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assessment_reports_assessment_idx").on(table.assessmentId),
    index("assessment_reports_status_idx").on(table.status),
    check(
      "assessment_reports_status_check",
      sql`${table.status} in ('open', 'resolved')`,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    role: text("role"),
    assessmentId: uuid("assessment_id").references(() => assessments.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("unread"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_role_idx").on(table.role),
    index("notifications_status_idx").on(table.status),
    index("notifications_created_idx").on(table.createdAt),
    check(
      "notifications_status_check",
      sql`${table.status} in ('unread', 'read')`,
    ),
  ],
);

export const maintenanceRuns = pgTable(
  "maintenance_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobName: text("job_name").notNull(),
    status: text("status").notNull(),
    details: text("details"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("maintenance_runs_job_idx").on(table.jobName),
    index("maintenance_runs_started_idx").on(table.startedAt),
  ],
);

export const authSchema = {
  users,
  accounts,
  sessions,
  verifications,
  twoFactors,
  passkeys,
};
