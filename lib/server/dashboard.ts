import "server-only";

import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  assessments,
  users,
  type AssessmentStatus,
} from "@/lib/db/schema";
import { type AppSessionUser, getAdminAssessmentReports } from "./assessments";

const assignedStatuses = new Set([
  "in_progress",
  "close_requested",
  "completed_pending_payment",
  "payment_submitted",
  "payment_verified",
]);

const completedStatuses = new Set([
  "completed_pending_payment",
  "payment_submitted",
  "payment_verified",
  "downloaded",
  "archived",
]);

const revenueStatuses = new Set(["payment_verified", "downloaded", "archived"]);

type AssessmentRow = typeof assessments.$inferSelect;
type UserRow = Pick<typeof users.$inferSelect, "email" | "id" | "name" | "role">;

function asRole(value: string | null | undefined) {
  if (value === "admin" || value === "writer" || value === "user") {
    return value;
  }

  return "user";
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function moneyFromCents(cents: number) {
  return cents;
}

function getUserMap(rows: UserRow[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function summarizeByStatus(rows: AssessmentRow[]) {
  const order: AssessmentStatus[] = [
    "open",
    "in_progress",
    "close_requested",
    "completed_pending_payment",
    "payment_submitted",
    "payment_verified",
    "downloaded",
    "archived",
    "closed",
    "cancelled",
  ];

  return order
    .map((status) => ({
      count: rows.filter((row) => row.status === status).length,
      label: statusLabel(status),
      status,
    }))
    .filter((item) => item.count > 0);
}

function topByOwner(
  rows: AssessmentRow[],
  usersById: Map<string, UserRow>,
  key: "userId" | "writerId",
) {
  const map = new Map<string, { count: number; revenueCents: number }>();

  for (const row of rows) {
    const userId = row[key];
    if (!userId) {
      continue;
    }

    const current = map.get(userId) ?? { count: 0, revenueCents: 0 };
    current.count += 1;
    if (revenueStatuses.has(row.status)) {
      current.revenueCents += moneyFromCents(row.priceCents);
    }
    map.set(userId, current);
  }

  return Array.from(map.entries())
    .map(([userId, value]) => ({
      ...value,
      user: usersById.get(userId) ?? null,
    }))
    .sort(
      (left, right) =>
        right.revenueCents - left.revenueCents || right.count - left.count,
    )
    .slice(0, 5);
}

function recentAssessmentItems(
  rows: AssessmentRow[],
  usersById: Map<string, UserRow>,
) {
  return rows
    .slice()
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      priceCents: row.priceCents,
      status: row.status,
      title: row.title,
      topic: row.topic,
      updatedAt: row.updatedAt,
      user: usersById.get(row.userId) ?? null,
      writer: row.writerId ? usersById.get(row.writerId) ?? null : null,
    }));
}

export async function getDashboardData(user: AppSessionUser) {
  const role = asRole(user.role);
  const [assessmentRows, userRows] = await Promise.all([
    db.select().from(assessments).orderBy(desc(assessments.updatedAt)).limit(500),
    db
      .select({
        email: users.email,
        id: users.id,
        name: users.name,
        role: users.role,
      })
      .from(users),
  ]);
  const usersById = getUserMap(userRows);
  const paidRows = assessmentRows.filter((row) => revenueStatuses.has(row.status));
  const totalRevenueCents = paidRows.reduce(
    (total, row) => total + moneyFromCents(row.priceCents),
    0,
  );

  if (role === "admin") {
    const reports = await getAdminAssessmentReports();
    const openReports = reports.filter((report) => report.status === "open");

    return {
      analytics: summarizeByStatus(assessmentRows),
      recentItems: recentAssessmentItems(assessmentRows, usersById),
      recentReports: reports,
      role: "admin" as const,
      stats: [
        { label: "Total assessments", value: assessmentRows.length },
        {
          label: "Assigned in progress",
          value: assessmentRows.filter((row) => assignedStatuses.has(row.status))
            .length,
        },
        {
          label: "Completed",
          value: assessmentRows.filter((row) => completedStatuses.has(row.status))
            .length,
        },
        { label: "Total revenue", value: totalRevenueCents, money: true },
      ],
      topUsers: topByOwner(assessmentRows, usersById, "userId"),
      topWriters: topByOwner(assessmentRows, usersById, "writerId"),
      openReports: openReports.length,
    };
  }

  if (role === "writer") {
    const writerRows = assessmentRows.filter((row) => row.writerId === user.id);
    const writerPaidRows = writerRows.filter((row) =>
      revenueStatuses.has(row.status),
    );
    const clients = topByOwner(writerRows, usersById, "userId");

    return {
      analytics: summarizeByStatus(writerRows),
      availableRows: assessmentRows
        .filter((row) => row.status === "open" && row.writerId === null)
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          priceCents: row.priceCents,
          title: row.title,
          topic: row.topic,
          updatedAt: row.updatedAt,
          user: usersById.get(row.userId) ?? null,
        })),
      clients,
      recentItems: recentAssessmentItems(writerRows, usersById),
      role: "writer" as const,
      stats: [
        {
          label: "Available claimable",
          value: assessmentRows.filter(
            (row) => row.status === "open" && row.writerId === null,
          ).length,
        },
        {
          label: "In process",
          value: writerRows.filter((row) => assignedStatuses.has(row.status))
            .length,
        },
        {
          label: "Completed by you",
          value: writerRows.filter((row) => completedStatuses.has(row.status))
            .length,
        },
        {
          label: "Revenue",
          value: writerPaidRows.reduce(
            (total, row) => total + moneyFromCents(row.priceCents),
            0,
          ),
          money: true,
        },
      ],
    };
  }

  const userRowsForDashboard = assessmentRows.filter((row) => row.userId === user.id);
  const userPaidRows = userRowsForDashboard.filter((row) =>
    revenueStatuses.has(row.status),
  );

  return {
    analytics: summarizeByStatus(userRowsForDashboard),
    recentItems: recentAssessmentItems(userRowsForDashboard, usersById),
    role: "user" as const,
    stats: [
      { label: "Total assessments", value: userRowsForDashboard.length },
      {
        label: "Assigned in progress",
        value: userRowsForDashboard.filter((row) =>
          assignedStatuses.has(row.status),
        ).length,
      },
      {
        label: "Completed",
        value: userRowsForDashboard.filter((row) =>
          completedStatuses.has(row.status),
        ).length,
      },
      {
        label: "Total paid",
        value: userPaidRows.reduce(
          (total, row) => total + moneyFromCents(row.priceCents),
          0,
        ),
        money: true,
      },
    ],
  };
}
