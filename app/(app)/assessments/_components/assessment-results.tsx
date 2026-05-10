"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
import { ScrollArea } from "@/components/ui/scroll-area";
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

const CARD_BATCH_SIZE = 12;
const TIMELINE_CARD_HEIGHT = 126;
const TIMELINE_CARD_WIDTH = 280;
const TIMELINE_DAY_WIDTH = 160;
const TIMELINE_HEADER_HEIGHT = 37;

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

function formatDateTime(value: Date | null) {
  if (!value) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
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

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function formatTimelineDay(value: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    weekday: "short",
  })
    .format(value)
    .toUpperCase();
}

function formatTimelineRange(start: Date, end: Date) {
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${new Intl.DateTimeFormat("en", {
      month: "short",
    }).format(start)} ${start.getDate()} - ${end.getDate()}`;
  }

  return `${new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(start)} - ${new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(end)}`;
}

function getTimelineRange(items: AssessmentSummary[], today: Date) {
  const startTimes = items.map((item) => item.createdAt.getTime());
  const endTimes = items.map((item) =>
    (item.deadlineAt ?? item.createdAt).getTime(),
  );
  const start = startOfDay(new Date(Math.min(today.getTime(), ...startTimes)));
  const end = startOfDay(new Date(Math.max(today.getTime(), ...endTimes)));
  const dayCount =
    Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000)) + 1;

  return {
    days: Array.from({ length: dayCount }, (_, index) => addDays(start, index)),
    end,
    start,
  };
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

function TimelineAssessmentCard({
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
    <div className="w-full rounded-lg border bg-background p-2 shadow-xs">
      <div className="grid gap-2 border-l-[3px] border-primary/40 pl-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            className="min-w-0 text-sm font-medium hover:underline"
            href={`/assessments/${item.id}`}
          >
            <span className="line-clamp-2">{item.title}</span>
          </Link>
          <Badge variant={statusVariant(item.status)}>
            {statusLabel(item.status)}
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          {formatDateTime(item.deadlineAt)}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge variant="outline">{item.topic}</Badge>
          <Badge variant="secondary">
            {formatMoney(item.priceCents, item.currency)}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-muted-foreground text-xs">
            {item.user?.name ?? "User"}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canClaim ? (
              <Button
                aria-label="Claim assessment"
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
                aria-label="Cancel assessment"
                onClick={() =>
                  refreshAfterAction(
                    cancelAssessmentAction(actionFormData(item.id)),
                  )
                }
                size="icon-sm"
                variant="destructive-outline"
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssessmentTimeline({
  items,
  role,
  userId,
}: {
  items: AssessmentSummary[];
  role: string;
  userId: string;
}) {
  const [today] = React.useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = React.useState(() => today);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const selectedDateKey = selectedDate.toISOString();
  const { days, end, start } = React.useMemo(
    () => getTimelineRange(items, today),
    [items, today],
  );
  const selectedDayIndex = Math.max(
    0,
    days.findIndex((day) => isSameDay(day, selectedDate)),
  );
  const itemPlacements = React.useMemo(() => {
    const rowsByDay = new Map<string, number>();

    return items
      .map((item) => {
        const itemDate = item.deadlineAt ?? item.createdAt;
        const dayIndex = days.findIndex((day) => isSameDay(itemDate, day));

        if (dayIndex < 0) {
          return null;
        }

        const dayKey = days[dayIndex]?.toISOString() ?? String(dayIndex);
        const row = rowsByDay.get(dayKey) ?? 0;
        rowsByDay.set(dayKey, row + 1);

        return {
          dayIndex,
          item,
          row,
        };
      })
      .filter(
        (
          placement,
        ): placement is {
          dayIndex: number;
          item: AssessmentSummary;
          row: number;
        } => placement !== null,
      );
  }, [days, items]);
  const maxTimelineRows = Math.max(
    1,
    ...itemPlacements.map((placement) => placement.row + 1),
  );
  const timelineContentHeight =
    TIMELINE_HEADER_HEIGHT + 24 + maxTimelineRows * TIMELINE_CARD_HEIGHT;
  const visibleCount = days.reduce(
    (count, day) =>
      count +
      items.filter((item) => item.deadlineAt && isSameDay(item.deadlineAt, day))
        .length,
    0,
  );
  const selectDate = React.useCallback(
    (date: Date) => {
      const boundedTime = Math.min(
        Math.max(startOfDay(date).getTime(), start.getTime()),
        end.getTime(),
      );
      setSelectedDate(new Date(boundedTime));
    },
    [end, start],
  );

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const targetLeft =
      selectedDayIndex * TIMELINE_DAY_WIDTH -
      viewport.clientWidth / 2 +
      TIMELINE_DAY_WIDTH / 2;

    viewport.scrollTo({
      behavior: "smooth",
      left: Math.max(0, targetLeft),
    });
  }, [selectedDayIndex, selectedDateKey]);

  return (
    <Frame className="min-w-0 overflow-hidden">
      <FramePanel className="min-w-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <div className="truncate text-sm font-medium">
              {formatTimelineRange(start, end)}
            </div>
            <Badge variant="outline">{visibleCount} due</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label="Previous day"
              onClick={() => selectDate(addDays(selectedDate, -1))}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeft />
            </Button>
            <Button
              onClick={() => selectDate(today)}
              size="sm"
              variant="outline"
            >
              Today
            </Button>
            <Button
              aria-label="Next day"
              onClick={() => selectDate(addDays(selectedDate, 1))}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <ScrollArea
          className="h-[calc(100dvh-250px)] min-h-0 max-h-[560px] max-w-full overflow-hidden"
          hideScrollbar
          scrollFade
          viewportRef={viewportRef}
        >
          <div className="relative h-full">
            <div
              className="relative"
              style={{
                height: `max(100%, ${timelineContentHeight}px)`,
                width: `${
                  Math.max(days.length, 1) * TIMELINE_DAY_WIDTH +
                  TIMELINE_CARD_WIDTH
                }px`,
              }}
            >
              <div
                className="grid border-b bg-muted/32"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(${TIMELINE_DAY_WIDTH}px, ${TIMELINE_DAY_WIDTH}px))`,
                }}
              >
                {days.map((day) => (
                  <button
                    className={cn(
                      "border-r p-2 text-center text-muted-foreground text-xs font-medium transition-colors last:border-r-0 hover:bg-accent hover:text-foreground",
                      isSameDay(day, selectedDate) && "bg-background text-foreground",
                    )}
                    key={day.toISOString()}
                    onClick={() => selectDate(day)}
                    type="button"
                  >
                    {formatTimelineDay(day)}
                  </button>
                ))}
              </div>
              <div
                className="absolute top-[37px] bottom-0 left-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(${TIMELINE_DAY_WIDTH}px, ${TIMELINE_DAY_WIDTH}px))`,
                }}
              >
                {days.map((day) => (
                  <div
                    className={cn(
                      "border-r last:border-r-0",
                      isSameDay(day, selectedDate) && "bg-accent/24",
                    )}
                    key={day.toISOString()}
                  />
                ))}
              </div>
              {itemPlacements.map(({ dayIndex, item, row }) => (
                <div
                  className="absolute z-10"
                  key={item.id}
                  style={{
                    left: dayIndex * TIMELINE_DAY_WIDTH + 14,
                    top:
                      TIMELINE_HEADER_HEIGHT +
                      16 +
                      row * TIMELINE_CARD_HEIGHT,
                    width: TIMELINE_CARD_WIDTH,
                  }}
                >
                  <TimelineAssessmentCard
                    item={item}
                    role={role}
                    userId={userId}
                  />
                </div>
              ))}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-destructive"
              style={{
                left:
                  selectedDayIndex * TIMELINE_DAY_WIDTH +
                  TIMELINE_DAY_WIDTH / 2,
              }}
            >
              <div className="absolute -top-px left-1/2 size-2 -translate-x-1/2 rotate-45 bg-destructive" />
            </div>
          </div>
        </ScrollArea>
      </FramePanel>
    </Frame>
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
        <Link
          href={`/assessments/${item.id}`}
          style={
            item.status === "downloaded"
              ? {
                  padding: "1px",
                  background:
                    "linear-gradient(135deg, #A97CF8, #F38CB8, #FDCC92)",
                  borderRadius: "18px",
                }
              : undefined
          }
        >
          <Card className="relative min-h-40 aspect-4/3 flex-1 flex-col flex-wrap overflow-x-auto dark:bg-background">
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
                "absolute top-2.5 right-3 p-0 size-1.5! min-w-1.5! animate-ping",
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
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="max-w-80">
          <InputGroupInput
            aria-label="Search assessments"
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
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Showing latest {items.length}
          </span>
          <Select
            aria-label="Filter assessments by status"
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
    </div>
  );
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
  const [visibleCardCount, setVisibleCardCount] =
    React.useState(CARD_BATCH_SIZE);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
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
  const visibleCardItems = filteredItems.slice(0, visibleCardCount);
  const hasMoreCards = visibleCardCount < filteredItems.length;
  const {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useTablePagination(filteredItems);
  const showMoreCards = React.useCallback(() => {
    setVisibleCardCount((currentCount) =>
      Math.min(currentCount + CARD_BATCH_SIZE, filteredItems.length),
    );
  }, [filteredItems.length]);
  const showTimeline = role === "writer";

  React.useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMoreCards) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          showMoreCards();
        }
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreCards, showMoreCards]);

  return (
    <Tabs className="min-w-0" defaultValue="cards">
      <div className="grid gap-3">
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
            {showTimeline ? (
              <TabsTrigger value="timeline">
                <CalendarDays />
                Timeline
              </TabsTrigger>
            ) : null}
          </TabsList>
          <div className="text-muted-foreground text-sm">
            Showing {filteredItems.length} of {items.length}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="max-w-80">
            <InputGroupInput
              aria-label="Search assessments"
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
                setVisibleCardCount(CARD_BATCH_SIZE);
              }}
              placeholder="Search"
              type="search"
              value={query}
            />
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
          <Select
            aria-label="Filter assessments by status"
            items={status}
            onValueChange={(value) => {
              setStatusFilter((value ?? "all") as AssessmentStatusFilter);
              setCurrentPage(1);
              setVisibleCardCount(CARD_BATCH_SIZE);
            }}
            value={statusFilter}
          >
            <SelectTrigger className={"max-w-[250px]"}>
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
        </div>
      </div>
      <TabsContent
        className="grid flex-1 items-stretch gap-9 pb-12 lg:grid-cols-4 lg:gap-6"
        value="cards"
      >
        {visibleCardItems.map((item) => (
          <AssessmentCard
            item={item}
            key={item.id}
            role={role}
            userId={userId}
          />
        ))}
        {filteredItems.length === 0 ? (
          <FramePanel className="p-8 text-center text-muted-foreground text-sm md:col-span-2 xl:col-span-3">
            No assessments yet.
          </FramePanel>
        ) : null}
        {hasMoreCards ? (
          <div
            aria-hidden="true"
            className="h-px md:col-span-2 lg:col-span-4"
            ref={loadMoreRef}
          />
        ) : null}
      </TabsContent>
      <TabsContent value="table">
        <AssessmentTable items={paginatedItems} role={role} userId={userId} />
        <TablePagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </TabsContent>
      {showTimeline ? (
        <TabsContent className="min-w-0 overflow-hidden" value="timeline">
          <AssessmentTimeline
            items={filteredItems}
            role={role}
            userId={userId}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
