"use client";

import * as React from "react";
import {
  HandIcon,
  LayoutGrid,
  SearchIcon,
  TableProperties,
  Trash2,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardPanel,
} from "@/components/ui/card";
import { Frame, FramePanel } from "@/components/ui/frame";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssessmentSummary } from "@/lib/server/assessments";

import { TablePagination, useTablePagination } from "../../_components";
import { cancelAssessmentAction, claimAssessmentAction } from "../actions";
import { cn } from "@/lib/utils";

const status = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
] as const;

type AssessmentStatusFilter = (typeof status)[number]["value"];

const activeAssessmentStatuses = new Set([
  "open",
  "in_progress",
  "close_requested",
  "completed_pending_payment",
  "payment_submitted",
  "payment_verified",
]);

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

function actionFormData(assessmentId: string) {
  const formData = new FormData();
  formData.set("assessmentId", assessmentId);
  return formData;
}

function matchesStatus(
  item: AssessmentSummary,
  filter: AssessmentStatusFilter,
) {
  if (filter === "all") {
    return true;
  }

  const isActive = activeAssessmentStatuses.has(item.status);
  return filter === "active" ? isActive : !isActive;
}

function matchesSearch(item: AssessmentSummary, query: string) {
  if (!query) {
    return true;
  }

  const searchable = [
    item.title,
    item.topic,
    item.description,
    item.status,
    item.user?.name,
    item.user?.email,
    item.writer?.name,
    item.writer?.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
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
  const router = useRouter();
  const canClaim =
    (role === "writer" || role === "admin") && item.status === "open";
  const canCancel =
    (role === "admin" || item.userId === userId) && item.status === "open";
  const refreshAfterAction = (action: Promise<unknown>) => {
    void action.then(
      () => router.refresh(),
      () => router.refresh(),
    );
  };

  return (
    <div className="relative flex min-w-0">
      <CardFrame
        className={cn(
          "w-full after:pointer-events-none after:absolute after:-inset-[5px] after:rounded-[calc(var(--radius-xl)+8px)] after:border after:border-border/64 dark:bg-background",
          statusLabel(item.status),
        )}
      >
        <Link href={`/assessments/${item.id}`}>
          <Card className="relative min-h-40 aspect-[4/3] flex-1 flex-col flex-wrap overflow-x-auto dark:bg-background">
            <CardPanel className="flex flex-1 items-center justify-center lg:px-8 lg:py-12 relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </CardPanel>
            <div
              className={cn(
                badgeVariants({ variant: statusVariant(item.status) }),
                "absolute top-[10px] right-[12px] p-0 size-1.5! min-w-1.5! animate-ping",
              )}
            />
            <div
              className={cn(
                badgeVariants({ variant: statusVariant(item.status) }),
                "absolute top-[12px] right-[12px] p-0 size-1! min-w-1!",
              )}
            />
          </Card>
        </Link>
        <CardFrameFooter className="flex items-center gap-3 p-2">
          <p className="flex flex-1 gap-1 truncate text-muted-foreground text-xs flex-col">
            <span className="truncate">{item.title}</span>
            <span className="truncate">{item.topic}</span>
          </p>
          {canClaim ? (
            <Button
              onClick={() =>
                refreshAfterAction(
                  claimAssessmentAction(actionFormData(item.id)),
                )
              }
              size="icon-sm"
              variant="outline"
            >
              <HandIcon />
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              onClick={() =>
                refreshAfterAction(
                  cancelAssessmentAction(actionFormData(item.id)),
                )
              }
              variant="destructive-outline"
            >
              <XIcon />
              Cancel
            </Button>
          ) : null}
        </CardFrameFooter>
      </CardFrame>
    </div>
  );
}

function AssessmentTable({
  items,
  role,
  userId,
}: {
  items: AssessmentSummary[];
  role: string;
  userId: string;
}) {
  const router = useRouter();
  const refreshAfterAction = (action: Promise<unknown>) => {
    void action.then(
      () => router.refresh(),
      () => router.refresh(),
    );
  };

  return (
    <Frame>
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>Country</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const canClaim =
              (role === "writer" || role === "admin") && item.status === "open";
            const canCancel =
              (role === "admin" || item.userId === userId) &&
              item.status === "open";
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <Link href={`/assessments/${item.id}`} className="min-w-0">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="truncate text-muted-foreground text-xs">
                      {item.topic}
                    </div>
                  </Link>
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
                <TableCell className="text-right">
                  {canClaim ? (
                    <Button
                      onClick={() =>
                        refreshAfterAction(
                          claimAssessmentAction(actionFormData(item.id)),
                        )
                      }
                      size="icon-sm"
                      variant="outline"
                    >
                      <HandIcon />
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button
                      onClick={() =>
                        refreshAfterAction(
                          cancelAssessmentAction(actionFormData(item.id)),
                        )
                      }
                      variant="destructive-outline"
                      size={"icon-sm"}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-8 text-center text-muted-foreground text-sm"
                colSpan={5}
              >
                No assessments yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Frame>
  );
}

export function UserAssessmentTable({
  items,
  role,
  userId,
}: {
  items: AssessmentSummary[];
  role: string;
  userId: string;
}) {
  return <AssessmentTable items={items} role={role} userId={userId} />;
}

export function AssessmentResults({
  items,
  role,
  userId,
}: {
  items: AssessmentSummary[];
  role: string;
  userId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<AssessmentStatusFilter>("all");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = React.useMemo(
    () =>
      items.filter(
        (item) =>
          matchesStatus(item, statusFilter) &&
          matchesSearch(item, normalizedQuery),
      ),
    [items, normalizedQuery, statusFilter],
  );
  const {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useTablePagination(filteredItems);

  return (
    <Tabs defaultValue="cards">
      <div className="flex items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="cards">
            <LayoutGrid />
            Cards
          </TabsTrigger>
          <TabsTrigger value="table">
            <TableProperties />
            Table
          </TabsTrigger>
        </TabsList>
        <div className="text-muted-foreground text-sm">
          Showing latest {items.length}
        </div>
      </div>
      <TabsContent
        className="grid flex-1 items-stretch gap-9 pb-12 lg:grid-cols-4 lg:gap-6"
        value="cards"
      >
        {items.map((item) => (
          <AssessmentCard
            item={item}
            key={item.id}
            role={role}
            userId={userId}
          />
        ))}
        {items.length === 0 ? (
          <FramePanel className="p-8 text-center text-muted-foreground text-sm md:col-span-2 xl:col-span-3">
            No assessments yet.
          </FramePanel>
        ) : null}
      </TabsContent>
      <TabsContent value="table">
        <div className="flex items-center justify-between w-full mb-2">
          <InputGroup className="max-w-80">
            <InputGroupInput
              aria-label="Search"
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search"
              type="search"
              value={query}
            />
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
          <span className="flex gap-2">
            <Select
              aria-label="Select framework"
              items={status}
              onValueChange={(value) => {
                setStatusFilter((value ?? "all") as AssessmentStatusFilter);
                setCurrentPage(1);
              }}
              value={statusFilter}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {status.map(({ label, value }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </span>
        </div>
        <AssessmentTable items={paginatedItems} role={role} userId={userId} />
        <TablePagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </TabsContent>
    </Tabs>
  );
}
