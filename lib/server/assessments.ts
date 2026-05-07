import "server-only";

import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  assessmentCloseRequests,
  assessmentFiles,
  assessmentMessages,
  assessmentReports,
  assessments,
  notifications,
  users,
  type AssessmentFileKind,
  type AssessmentStatus,
  type UserRole,
} from "@/lib/db/schema";
import { realtime } from "@/lib/realtime";
import { buildAssessmentRoomId } from "@/lib/server/assessment-room";
import {
  readPrivateAssessmentFile,
  removePrivateAssessmentFile,
  validateAssessmentUpload,
  writePrivateAssessmentFile,
} from "@/lib/server/assessment-files";
import { serverEnv } from "@/lib/server/env";

export type AppSessionUser = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
};

export type AssessmentSummary = Awaited<
  ReturnType<typeof getAssessmentWorkspace>
>["items"][number];

export type AssessmentDetail = NonNullable<
  Awaited<ReturnType<typeof getAssessmentDetail>>
>;

const mutableStatuses = [
  "in_progress",
  "close_requested",
  "completed_pending_payment",
  "payment_submitted",
  "payment_verified",
] satisfies AssessmentStatus[];

const maxAssessmentFiles = 3;
const completedFileMutableStatuses = [
  "in_progress",
  "close_requested",
  "completed_pending_payment",
  "payment_submitted",
] satisfies AssessmentStatus[];

function asRole(value: string | null | undefined): UserRole {
  if (value === "admin" || value === "writer" || value === "user") {
    return value;
  }

  return "user";
}

function getText(formData: FormData, key: string, maxLength = 4000) {
  return String(formData.get(key) ?? "")
    .trim()
    .slice(0, maxLength);
}

function getPriceCents(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 100);
}

function getDateValue(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value
  );
}

function getUploadFiles(formData: FormData) {
  return formData
    .getAll("file")
    .filter((value): value is File => isFile(value));
}

function assertFileCount(files: File[], label: string) {
  if (files.length === 0) {
    throw new Error(`${label} file is required.`);
  }

  if (files.length > maxAssessmentFiles) {
    throw new Error(`Upload up to ${maxAssessmentFiles} files.`);
  }
}

function assertRole(user: AppSessionUser, roles: UserRole[]) {
  const role = asRole(user.role);
  if (!roles.includes(role)) {
    throw new Error("You do not have permission for this action.");
  }
}

function canViewAssessment(
  user: AppSessionUser,
  assessment: Pick<
    typeof assessments.$inferSelect,
    "status" | "userId" | "writerId"
  >,
) {
  const role = asRole(user.role);
  return (
    role === "admin" ||
    assessment.userId === user.id ||
    assessment.writerId === user.id ||
    canReviewOpenAssessment(user, assessment)
  );
}

function canReviewOpenAssessment(
  user: AppSessionUser,
  assessment: Pick<
    typeof assessments.$inferSelect,
    "status" | "writerId"
  >,
) {
  return (
    asRole(user.role) === "writer" &&
    assessment.status === "open" &&
    assessment.writerId === null
  );
}

function canMutateClaimedAssessment(
  user: AppSessionUser,
  assessment: Pick<typeof assessments.$inferSelect, "userId" | "writerId">,
) {
  const role = asRole(user.role);
  return (
    role === "admin" ||
    assessment.userId === user.id ||
    assessment.writerId === user.id
  );
}

async function getAssessmentRow(assessmentId: string) {
  const [row] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  return row ?? null;
}

async function insertNotification(input: {
  userId?: string | null;
  role?: UserRole | null;
  assessmentId?: string;
  title: string;
  body: string;
}) {
  const [row] = await db
    .insert(notifications)
    .values({
      assessmentId: input.assessmentId,
      body: input.body,
      role: input.role ?? null,
      title: input.title,
      userId: input.userId ?? null,
    })
    .returning();

  const event = {
    id: row.id,
    assessmentId: row.assessmentId ?? undefined,
    body: row.body,
    title: row.title,
    timestamp: row.createdAt.getTime(),
  };

  if (input.userId) {
    await realtime.channel(`user:${input.userId}`).emit("notification.item", event);
  }

  if (input.role === "writer") {
    await realtime.channel("writers").emit("notification.item", event);
  }
}

async function emitAssessmentStatus(input: {
  assessmentId: string;
  status: string;
  title: string;
}) {
  await realtime
    .channel(buildAssessmentRoomId(input.assessmentId))
    .emit("assessment.status", {
      assessmentId: input.assessmentId,
      status: input.status,
      title: input.title,
      timestamp: Date.now(),
    });
}

async function insertAssessmentFile(input: {
  assessmentId: string;
  file: File;
  kind: AssessmentFileKind;
  uploaderId: string;
}) {
  const upload = await validateAssessmentUpload(input.file, input.kind);
  const storageKey = await writePrivateAssessmentFile(
    input.assessmentId,
    input.kind,
    upload,
  );

  const [fileRow] = await db
    .insert(assessmentFiles)
    .values({
      assessmentId: input.assessmentId,
      kind: input.kind,
      mimeType: upload.mimeType,
      originalName: upload.originalName,
      scanMessage: upload.scanMessage,
      scanStatus: "clean",
      sha256: upload.sha256,
      sizeBytes: upload.sizeBytes,
      storageKey,
      uploaderId: input.uploaderId,
    })
    .returning();

  return fileRow;
}

async function getUsersById(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, { id: string; name: string; email: string }>();
  }

  const rows = await db
    .select({
      email: users.email,
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(inArray(users.id, uniqueIds));

  return new Map(rows.map((row) => [row.id, row]));
}

function mapAssessmentRow(
  row: typeof assessments.$inferSelect,
  usersById: Map<string, { id: string; name: string; email: string }>,
) {
  return {
    ...row,
    roomId: buildAssessmentRoomId(row.id),
    status: row.status as AssessmentStatus,
    user: usersById.get(row.userId) ?? null,
    writer: row.writerId ? usersById.get(row.writerId) ?? null : null,
  };
}

export async function getAssessmentWorkspace(user: AppSessionUser) {
  const role = asRole(user.role);
  const where =
    role === "admin"
      ? undefined
      : role === "writer"
        ? or(
            eq(assessments.writerId, user.id),
            and(eq(assessments.status, "open"), isNull(assessments.writerId)),
          )
        : eq(assessments.userId, user.id);

  const rows = await db
    .select()
    .from(assessments)
    .where(where)
    .orderBy(desc(assessments.updatedAt), desc(assessments.createdAt))
    .limit(100);

  const usersById = await getUsersById(
    rows.flatMap((row) => [row.userId, row.writerId ?? ""]),
  );
  const items = rows.map((row) => mapAssessmentRow(row, usersById));

  return {
    items,
    role,
    stats: {
      active: items.filter((item) =>
        mutableStatuses.includes(
          item.status as (typeof mutableStatuses)[number],
        ),
      ).length,
      open: items.filter((item) => item.status === "open").length,
      payment: items.filter((item) => item.status === "payment_submitted")
        .length,
      total: items.length,
    },
  };
}

export async function getAssessmentDetail(
  user: AppSessionUser,
  assessmentId: string,
) {
  const row = await getAssessmentRow(assessmentId);
  if (!row || !canViewAssessment(user, row)) {
    return null;
  }

  const [usersById, files, closeRequests, reports] = await Promise.all([
    getUsersById([row.userId, row.writerId ?? ""]),
    db
      .select()
      .from(assessmentFiles)
      .where(
        and(
          eq(assessmentFiles.assessmentId, assessmentId),
          eq(assessmentFiles.scanStatus, "clean"),
          isNull(assessmentFiles.deletedAt),
        ),
      )
      .orderBy(desc(assessmentFiles.createdAt)),
    db
      .select()
      .from(assessmentCloseRequests)
      .where(eq(assessmentCloseRequests.assessmentId, assessmentId))
      .orderBy(desc(assessmentCloseRequests.createdAt))
      .limit(5),
    db
      .select()
      .from(assessmentReports)
      .where(eq(assessmentReports.assessmentId, assessmentId))
      .orderBy(desc(assessmentReports.createdAt))
      .limit(5),
  ]);

  return {
    assessment: mapAssessmentRow(row, usersById),
    closeRequests,
    files,
    reports,
  };
}

export async function canAccessAssessmentByRoomId(
  user: AppSessionUser,
  roomId: string,
) {
  const [, assessmentId] = roomId.split(":");
  if (!assessmentId || buildAssessmentRoomId(assessmentId) !== roomId) {
    return false;
  }

  const row = await getAssessmentRow(assessmentId);
  return Boolean(row && canViewAssessment(user, row));
}

export async function canPostAssessmentChat(
  user: AppSessionUser,
  assessmentId: string,
) {
  const row = await getAssessmentRow(assessmentId);
  if (!row || !canViewAssessment(user, row)) {
    return null;
  }

  const allowedStatuses = [
    "in_progress",
    "close_requested",
    "completed_pending_payment",
    "payment_submitted",
    "payment_verified",
  ];

  if (!allowedStatuses.includes(row.status)) {
    return null;
  }

  return row;
}

export async function createAssessmentFromForm(
  user: AppSessionUser,
  formData: FormData,
) {
  assertRole(user, ["admin", "user"]);

  const title = getText(formData, "title", 160);
  const description = getText(formData, "description", 4000);
  const topic = getText(formData, "topic", 120);
  const currency = getText(formData, "currency", 8).toUpperCase() || "USD";
  const priceCents = getPriceCents(getText(formData, "price", 32));
  const deadlineAt = getDateValue(getText(formData, "deadlineAt", 64));
  const files = getUploadFiles(formData);

  if (!title || !description || !topic) {
    throw new Error("Country, description, topic, and source file are required.");
  }

  assertFileCount(files, "Source");

  const [assessment] = await db
    .insert(assessments)
    .values({
      currency,
      deadlineAt,
      description,
      priceCents,
      status: "open",
      title,
      topic,
      userId: user.id,
    })
    .returning();

  const insertedFiles: Awaited<ReturnType<typeof insertAssessmentFile>>[] = [];
  try {
    for (const file of files) {
      insertedFiles.push(
        await insertAssessmentFile({
          assessmentId: assessment.id,
          file,
          kind: "source",
          uploaderId: user.id,
        }),
      );
    }
  } catch (error) {
    await Promise.all(
      insertedFiles.map((file) => removePrivateAssessmentFile(file.storageKey)),
    );
    await db.delete(assessments).where(eq(assessments.id, assessment.id));
    throw error;
  }

  await insertNotification({
    assessmentId: assessment.id,
    body: `${topic} - ${title}`,
    role: "writer",
    title: "New assessment available",
  });

  return assessment.id;
}

export async function claimAssessment(user: AppSessionUser, assessmentId: string) {
  assertRole(user, ["admin", "writer"]);

  const [row] = await db
    .update(assessments)
    .set({
      claimedAt: new Date(),
      status: "in_progress",
      updatedAt: new Date(),
      writerId: user.id,
    })
    .where(
      and(
        eq(assessments.id, assessmentId),
        eq(assessments.status, "open"),
        isNull(assessments.writerId),
      ),
    )
    .returning();

  if (!row) {
    throw new Error("This assessment has already been claimed.");
  }

  await Promise.all([
    insertNotification({
      assessmentId,
      body: `${user.name} claimed ${row.title}.`,
      title: "Assessment claimed",
      userId: row.userId,
    }),
    emitAssessmentStatus({
      assessmentId,
      status: "in_progress",
      title: row.title,
    }),
  ]);
}

export async function cancelOpenAssessment(
  user: AppSessionUser,
  assessmentId: string,
) {
  const row = await getAssessmentRow(assessmentId);
  if (!row) {
    throw new Error("Assessment not found.");
  }

  const role = asRole(user.role);
  if (role !== "admin" && row.userId !== user.id) {
    throw new Error("Only the owner or admin can cancel this assessment.");
  }

  if (row.status !== "open") {
    throw new Error("Only unclaimed assessments can be cancelled directly.");
  }

  const files = await db
    .select()
    .from(assessmentFiles)
    .where(eq(assessmentFiles.assessmentId, assessmentId));

  await db
    .update(assessments)
    .set({
      cancelledAt: new Date(),
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId));

  await db
    .update(assessmentFiles)
    .set({ deletedAt: new Date(), scanStatus: "deleted" })
    .where(eq(assessmentFiles.assessmentId, assessmentId));

  await Promise.all(
    files.map((file) => removePrivateAssessmentFile(file.storageKey)),
  );
}

export async function requestMutualClose(
  user: AppSessionUser,
  assessmentId: string,
  reason: string,
) {
  const row = await getAssessmentRow(assessmentId);
  if (!row || !canMutateClaimedAssessment(user, row)) {
    throw new Error("Assessment not found.");
  }

  const role = asRole(user.role);
  if (role === "admin") {
    await db
      .update(assessments)
      .set({
        closeReason: reason,
        closedAt: new Date(),
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessmentId));
    return;
  }

  if (row.status !== "in_progress" && row.status !== "close_requested") {
    throw new Error("Only active claimed assessments can be closed by agreement.");
  }

  const pending = await db
    .select()
    .from(assessmentCloseRequests)
    .where(
      and(
        eq(assessmentCloseRequests.assessmentId, assessmentId),
        eq(assessmentCloseRequests.status, "pending"),
      ),
    )
    .orderBy(desc(assessmentCloseRequests.createdAt))
    .limit(1);

  const existing = pending[0];
  if (existing && existing.requestedById && existing.requestedById !== user.id) {
    await db
      .update(assessmentCloseRequests)
      .set({
        respondedAt: new Date(),
        respondedById: user.id,
        status: "accepted",
      })
      .where(eq(assessmentCloseRequests.id, existing.id));

    await db
      .update(assessments)
      .set({
        closeReason: existing.reason,
        closedAt: new Date(),
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessmentId));

    await emitAssessmentStatus({
      assessmentId,
      status: "closed",
      title: row.title,
    });
    return;
  }

  if (existing?.requestedById === user.id) {
    return;
  }

  await db.insert(assessmentCloseRequests).values({
    assessmentId,
    reason: reason || "Mutual close requested.",
    requestedById: user.id,
    requestedByRole: role,
    status: "pending",
  });

  await db
    .update(assessments)
    .set({
      status: "close_requested",
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId));
}

export async function completeAssessmentFromForm(
  user: AppSessionUser,
  assessmentId: string,
  formData: FormData,
) {
  assertRole(user, ["admin", "writer"]);
  const row = await getAssessmentRow(assessmentId);
  const files = getUploadFiles(formData);

  if (!row || (row.writerId !== user.id && asRole(user.role) !== "admin")) {
    throw new Error("Only the assigned writer can complete this assessment.");
  }

  if (
    !completedFileMutableStatuses.includes(
      row.status as (typeof completedFileMutableStatuses)[number],
    )
  ) {
    throw new Error("This assessment cannot be completed from its current state.");
  }

  assertFileCount(files, "Completed");

  const existingCompletedFiles = await db
    .select({ id: assessmentFiles.id })
    .from(assessmentFiles)
    .where(
      and(
        eq(assessmentFiles.assessmentId, assessmentId),
        eq(assessmentFiles.kind, "completed"),
        eq(assessmentFiles.scanStatus, "clean"),
        isNull(assessmentFiles.deletedAt),
      ),
    );

  if (existingCompletedFiles.length + files.length > maxAssessmentFiles) {
    throw new Error(`Upload up to ${maxAssessmentFiles} files.`);
  }

  const insertedFiles: Awaited<ReturnType<typeof insertAssessmentFile>>[] = [];
  try {
    for (const file of files) {
      insertedFiles.push(
        await insertAssessmentFile({
          assessmentId,
          file,
          kind: "completed",
          uploaderId: user.id,
        }),
      );
    }
  } catch (error) {
    await Promise.all(
      insertedFiles.map((file) => removePrivateAssessmentFile(file.storageKey)),
    );
    throw error;
  }

  await db
    .update(assessments)
    .set({
      completedAt: new Date(),
      status:
        row.status === "payment_submitted"
          ? "payment_submitted"
          : "completed_pending_payment",
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId));

  if (row.status !== "completed_pending_payment") {
    await Promise.all([
      insertNotification({
        assessmentId,
        body: "Your completed assessment is waiting for payment confirmation.",
        title: "Assessment completed",
        userId: row.userId,
      }),
      emitAssessmentStatus({
        assessmentId,
        status: "completed_pending_payment",
        title: row.title,
      }),
    ]);
  }
}

export async function removeCompletedAssessmentFile(
  user: AppSessionUser,
  assessmentId: string,
  fileId: string,
) {
  assertRole(user, ["admin", "writer"]);

  const row = await getAssessmentRow(assessmentId);
  if (!row || (row.writerId !== user.id && asRole(user.role) !== "admin")) {
    throw new Error("Only the assigned writer can remove completed files.");
  }

  if (
    !completedFileMutableStatuses.includes(
      row.status as (typeof completedFileMutableStatuses)[number],
    )
  ) {
    throw new Error("Completed files can no longer be removed.");
  }

  const [file] = await db
    .select()
    .from(assessmentFiles)
    .where(
      and(
        eq(assessmentFiles.id, fileId),
        eq(assessmentFiles.assessmentId, assessmentId),
        eq(assessmentFiles.kind, "completed"),
        eq(assessmentFiles.scanStatus, "clean"),
        isNull(assessmentFiles.deletedAt),
      ),
    )
    .limit(1);

  if (!file) {
    throw new Error("Completed file not found.");
  }

  await removePrivateAssessmentFile(file.storageKey);
  await db
    .update(assessmentFiles)
    .set({
      deletedAt: new Date(),
      scanStatus: "deleted",
    })
    .where(eq(assessmentFiles.id, fileId));

  const remainingCompletedFiles = await db
    .select({ id: assessmentFiles.id })
    .from(assessmentFiles)
    .where(
      and(
        eq(assessmentFiles.assessmentId, assessmentId),
        eq(assessmentFiles.kind, "completed"),
        eq(assessmentFiles.scanStatus, "clean"),
        isNull(assessmentFiles.deletedAt),
      ),
    )
    .limit(1);

  if (
    (row.status === "completed_pending_payment" ||
      row.status === "payment_submitted") &&
    remainingCompletedFiles.length === 0
  ) {
    await db
      .update(assessments)
      .set({
        completedAt: null,
        paymentSubmittedAt: null,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessmentId));

    await emitAssessmentStatus({
      assessmentId,
      status: "in_progress",
      title: row.title,
    });
  }
}

export async function submitPaymentProofFromForm(
  user: AppSessionUser,
  assessmentId: string,
  formData: FormData,
) {
  const row = await getAssessmentRow(assessmentId);
  const file = formData.get("file");

  if (!row || (row.userId !== user.id && asRole(user.role) !== "admin")) {
    throw new Error("Only the assessment owner can submit payment proof.");
  }

  if (row.status !== "completed_pending_payment") {
    throw new Error("Payment proof can only be submitted after completion.");
  }

  if (!isFile(file)) {
    throw new Error("Payment proof file is required.");
  }

  await insertAssessmentFile({
    assessmentId,
    file,
    kind: "payment_proof",
    uploaderId: user.id,
  });

  await db
    .update(assessments)
    .set({
      paymentSubmittedAt: new Date(),
      status: "payment_submitted",
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId));

  if (row.writerId) {
    await insertNotification({
      assessmentId,
      body: "The user submitted payment proof.",
      title: "Payment proof submitted",
      userId: row.writerId,
    });
  }
}

export async function verifyAssessmentPayment(
  user: AppSessionUser,
  assessmentId: string,
) {
  const row = await getAssessmentRow(assessmentId);
  if (!row || (row.writerId !== user.id && asRole(user.role) !== "admin")) {
    throw new Error("Only the assigned writer can verify payment.");
  }

  if (row.status !== "payment_submitted") {
    throw new Error("Payment is not waiting for verification.");
  }

  await db
    .update(assessments)
    .set({
      paymentVerifiedAt: new Date(),
      status: "payment_verified",
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId));

  await Promise.all([
    insertNotification({
      assessmentId,
      body: "The writer verified payment. Download is unlocked.",
      title: "Payment verified",
      userId: row.userId,
    }),
    emitAssessmentStatus({
      assessmentId,
      status: "payment_verified",
      title: row.title,
    }),
  ]);
}

export async function createAssessmentReport(
  user: AppSessionUser,
  assessmentId: string,
  reason: string,
) {
  const row = await getAssessmentRow(assessmentId);
  if (!row || !canViewAssessment(user, row)) {
    throw new Error("Assessment not found.");
  }

  const targetUserId = row.userId === user.id ? row.writerId : row.userId;

  await db.insert(assessmentReports).values({
    assessmentId,
    reason: reason || "Issue reported.",
    reporterId: user.id,
    status: "open",
    targetUserId: targetUserId ?? null,
  });

  await insertNotification({
    assessmentId,
    body: `${user.name} reported an issue on ${row.title}.`,
    role: "admin",
    title: "Assessment report opened",
  });
}

export async function resolveAssessmentReport(
  user: AppSessionUser,
  reportId: string,
) {
  assertRole(user, ["admin"]);

  await db
    .update(assessmentReports)
    .set({
      resolvedAt: new Date(),
      resolvedById: user.id,
      status: "resolved",
    })
    .where(eq(assessmentReports.id, reportId));
}

export async function getDownloadableAssessmentFile(
  user: AppSessionUser,
  assessmentId: string,
  fileId: string,
) {
  const detail = await getAssessmentDetail(user, assessmentId);
  if (!detail) {
    return null;
  }

  const file = detail.files.find((item) => item.id === fileId);
  if (!file) {
    return null;
  }

  const role = asRole(user.role);
  const isOwner = detail.assessment.userId === user.id;
  const isWriter = detail.assessment.writerId === user.id;
  const isAdmin = role === "admin";
  const canReviewSource =
    file.kind === "source" && canReviewOpenAssessment(user, detail.assessment);

  if (file.kind === "completed") {
    const unlocked =
      isAdmin ||
      isWriter ||
      (isOwner &&
        ["payment_verified", "downloaded", "archived"].includes(
          detail.assessment.status,
        ));
    if (!unlocked) {
      throw new Error("Payment must be verified before download.");
    }

    if (isOwner && detail.assessment.status === "payment_verified") {
      await db
        .update(assessments)
        .set({
          firstDownloadedAt: new Date(),
          status: "downloaded",
          updatedAt: new Date(),
        })
        .where(eq(assessments.id, assessmentId));
    }
  } else if (!isAdmin && !isOwner && !isWriter && !canReviewSource) {
    return null;
  }

  return {
    data: await readPrivateAssessmentFile(file.storageKey),
    file,
  };
}

export async function runAssessmentCleanup() {
  const cutoff = new Date(
    Date.now() - serverEnv.assessmentCleanupRetentionDays * 24 * 60 * 60 * 1000,
  );

  const rows = await db
    .select()
    .from(assessments)
    .where(
      or(
        and(
          inArray(assessments.status, ["downloaded", "archived"]),
          lt(assessments.firstDownloadedAt, cutoff),
        ),
        and(eq(assessments.status, "closed"), lt(assessments.closedAt, cutoff)),
        and(
          eq(assessments.status, "cancelled"),
          lt(assessments.cancelledAt, cutoff),
        ),
      ),
    )
    .orderBy(desc(assessments.updatedAt))
    .limit(100);

  let deletedFiles = 0;
  let deletedMessages = 0;

  for (const row of rows) {
    const files = await db
      .select()
      .from(assessmentFiles)
      .where(
        and(
          eq(assessmentFiles.assessmentId, row.id),
          isNull(assessmentFiles.deletedAt),
        ),
      );

    await Promise.all(
      files.map((file) => removePrivateAssessmentFile(file.storageKey)),
    );

    if (files.length > 0) {
      await db
        .update(assessmentFiles)
        .set({
          deletedAt: new Date(),
          scanStatus: "deleted",
        })
        .where(eq(assessmentFiles.assessmentId, row.id));
      deletedFiles += files.length;
    }

    const removedMessages = await db
      .delete(assessmentMessages)
      .where(eq(assessmentMessages.assessmentId, row.id))
      .returning({ id: assessmentMessages.id });
    deletedMessages += removedMessages.length;

    if (row.status !== "archived") {
      await db
        .update(assessments)
        .set({
          archivedAt: new Date(),
          status: "archived",
          updatedAt: new Date(),
        })
        .where(eq(assessments.id, row.id));
    }
  }

  return {
    assessments: rows.length,
    deletedFiles,
    deletedMessages,
  };
}
