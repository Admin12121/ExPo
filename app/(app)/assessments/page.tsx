import {
  CalendarClockIcon,
  CircleDollarSignIcon,
  ClipboardCheckIcon,
  FilePlusIcon,
  MessageSquareIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFrame,
  CardFrameFooter,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Frame, FramePanel } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { requireSession } from "@/lib/auth/session";
import {
  getAssessmentWorkspace,
  type AssessmentSummary,
} from "@/lib/server/assessments";

import React from "react";
import {
  cancelAssessmentAction,
  claimAssessmentAction,
  createAssessmentAction,
} from "./actions";
import NewAssessmentDialog from "./_components/new-assessment-dialog";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(value);
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusVariant(status: string) {
  if (status === "open") return "success";
  if (status === "cancelled" || status === "closed") return "secondary";
  if (status.includes("payment")) return "warning";
  if (status === "downloaded" || status === "archived") return "outline";
  return "default";
}

function AssessmentActions({
  item,
  role,
  userId,
}: {
  item: AssessmentSummary;
  role: string;
  userId: string;
}) {
  const canClaim =
    (role === "writer" || role === "admin") && item.status === "open";
  const canCancel =
    (role === "admin" || item.userId === userId) && item.status === "open";

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canClaim ? (
        <form action={claimAssessmentAction}>
          <input name="assessmentId" type="hidden" value={item.id} />
          <Button size="sm" type="submit">
            Claim
          </Button>
        </form>
      ) : null}
      {canCancel ? (
        <form action={cancelAssessmentAction}>
          <input name="assessmentId" type="hidden" value={item.id} />
          <Button size="sm" type="submit" variant="destructive-outline">
            Cancel
          </Button>
        </form>
      ) : null}
      <Button
        render={<Link href={`/assessments/${item.id}`} />}
        size="sm"
        variant="outline"
      >
        Open
      </Button>
    </div>
  );
}

function AssessmentCard({
  item,
  role,
  userId,
}: {
  item: AssessmentSummary;
  role: string;
  userId: string;
}) {
  return (
    <div className="relative flex min-w-0">
      <CardFrame className="w-full">
        <Card className="min-h-50 flex-1 flex-col flex-wrap overflow-x-auto">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">
                  {item.title}
                </CardTitle>
                <div className="mt-1 truncate text-muted-foreground text-sm">
                  {item.topic}
                </div>
              </div>
              <Badge variant={statusVariant(item.status)}>
                {statusLabel(item.status)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4">
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {item.description}
            </p>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <CircleDollarSignIcon className="size-4 text-muted-foreground" />
                {formatMoney(item.priceCents, item.currency)}
              </span>
              <span className="flex items-center gap-2">
                <CalendarClockIcon className="size-4 text-muted-foreground" />
                {formatDate(item.deadlineAt)}
              </span>
              <span className="truncate text-muted-foreground">
                Writer: {item.writer?.name ?? "Unclaimed"}
              </span>
            </div>
          </CardContent>

          <CardFrameFooter className="flex items-center gap-3 p-2">
            <p className="flex flex-1 gap-1 truncate text-muted-foreground text-xs">
              <span className="truncate">{item.description}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <AssessmentActions item={item} role={role} userId={userId} />
            </div>
          </CardFrameFooter>
        </Card>
      </CardFrame>
    </div>
  );
}

export default async function AssessmentsPage() {
  const session = await requireSession("/assessments");
  const workspace = await getAssessmentWorkspace(session.user);
  const role = workspace.role;
  const userId = session.user.id;
  const upcoming = workspace.items
    .filter((item) => item.deadlineAt && item.status !== "cancelled")
    .slice(0, 6);

  return (
    <main className="grid gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex items-center justify-between w-full">
          <h1 className="truncate text-lg font-semibold">Assessments</h1>
          {role === "user" ? <NewAssessmentDialog /> : null}
        </div>
        <Badge variant="outline">{role}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Total", workspace.stats.total],
          ["Open", workspace.stats.open],
          ["Active", workspace.stats.active],
          ["Payment", workspace.stats.payment],
        ].map(([label, value]) => (
          <FramePanel key={label} className="p-4">
            <div className="text-muted-foreground text-sm">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </FramePanel>
        ))}
      </div>

      {role === "writer" || role === "admin" ? (
        <FramePanel className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClockIcon className="size-4 text-muted-foreground" />
            Claimed deadlines
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {upcoming.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No upcoming deadlines.
              </div>
            ) : (
              upcoming.map((item) => (
                <Link
                  className="rounded-lg border bg-background p-3 text-sm transition-colors hover:bg-accent"
                  href={`/assessments/${item.id}`}
                  key={item.id}
                >
                  <div className="truncate font-medium">{item.title}</div>
                  <div className="text-muted-foreground">
                    {formatDate(item.deadlineAt)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </FramePanel>
      ) : null}

      <Tabs defaultValue="cards">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="cards">
              <ClipboardCheckIcon />
              Cards
            </TabsTrigger>
            <TabsTrigger value="table">
              <MessageSquareIcon />
              Table
            </TabsTrigger>
          </TabsList>
          <div className="text-muted-foreground text-sm">
            Showing latest {workspace.items.length}
          </div>
        </div>
        <TabsContent
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          value="cards"
        >
          {workspace.items.map((item) => (
            <AssessmentCard
              item={item}
              key={item.id}
              role={role}
              userId={userId}
            />
          ))}
          {workspace.items.length === 0 ? (
            <FramePanel className="p-8 text-center text-muted-foreground text-sm md:col-span-2 xl:col-span-3">
              No assessments yet.
            </FramePanel>
          ) : null}
        </TabsContent>
        <TabsContent value="table">
          <Frame>
            <Table variant="card">
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="truncate text-muted-foreground text-xs">
                          {item.topic}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.deadlineAt)}</TableCell>
                    <TableCell>
                      {formatMoney(item.priceCents, item.currency)}
                    </TableCell>
                    <TableCell>
                      <AssessmentActions
                        item={item}
                        role={role}
                        userId={userId}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Frame>
        </TabsContent>
      </Tabs>
    </main>
  );
}
