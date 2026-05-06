"use client";

import * as React from "react";
import {
  EllipsisIcon,
  EyeIcon,
  HandIcon,
  LayoutGrid,
  SearchIcon,
  TableProperties,
  XIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
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

function matchesStatus(item: AssessmentSummary, filter: AssessmentStatusFilter) {
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

function AssessmentActions({
  item,
  role,
  userId,
  className,
}: {
  item: AssessmentSummary;
  role: string;
  userId: string;
  className?: string;
}) {
  const canClaim =
    (role === "writer" || role === "admin") && item.status === "open";
  const canCancel =
    (role === "admin" || item.userId === userId) && item.status === "open";

  return (
    <div className={`flex justify-end ${className}`}>
      <Menu>
        <MenuTrigger
          render={
            <Button
              aria-label={`Actions for ${item.title}`}
              size="icon-sm"
              variant="ghost"
            >
              <EllipsisIcon />
            </Button>
          }
        />
        <MenuPopup align="end">
          <MenuItem render={<Link href={`/assessments/${item.id}`} />}>
            <EyeIcon />
            Open
          </MenuItem>
          {canClaim || canCancel ? <MenuSeparator /> : null}
          {canClaim ? (
            <form action={claimAssessmentAction}>
              <input name="assessmentId" type="hidden" value={item.id} />
              <MenuItem render={<button type="submit" />}>
                <HandIcon />
                Claim
              </MenuItem>
            </form>
          ) : null}
          {canCancel ? (
            <form action={cancelAssessmentAction}>
              <input name="assessmentId" type="hidden" value={item.id} />
              <MenuItem render={<button type="submit" />} variant="destructive">
                <XIcon />
                Cancel
              </MenuItem>
            </form>
          ) : null}
        </MenuPopup>
      </Menu>
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
      <CardFrame className="w-full after:pointer-events-none after:absolute after:-inset-[5px] after:-z-1 after:rounded-[calc(var(--radius-xl)+4px)] after:border after:border-border/64 dark:bg-background">
        <Card className="min-h-50 flex-1 flex-col flex-wrap overflow-x-auto dark:bg-background">
          <CardPanel className="flex flex-1 items-center justify-center lg:px-8 lg:py-12 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
            <AssessmentActions
              item={item}
              role={role}
              userId={userId}
              className="absolute top-2 right-2"
            />
          </CardPanel>{" "}
        </Card>
        <CardFrameFooter className="flex items-center gap-3 p-2">
          <p className="flex flex-1 gap-1 truncate text-muted-foreground text-xs flex-col">
            <span className="truncate">{item.title}</span>
            <span className="truncate">{item.topic}</span>
          </p>
          <Badge variant={statusVariant(item.status)}>
            {statusLabel(item.status)}
          </Badge>
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
          {items.map((item) => (
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
              <TableCell>
                <AssessmentActions item={item} role={role} userId={userId} />
              </TableCell>
            </TableRow>
          ))}
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
        className="grid flex-1 items-stretch gap-9 pb-12 lg:grid-cols-2 lg:gap-6 xl:gap-9"
        value="cards"
      >
        {items.map((item) => (
          <AssessmentCard item={item} key={item.id} role={role} userId={userId} />
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
