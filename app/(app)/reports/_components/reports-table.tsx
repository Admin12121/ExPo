"use client";

import * as React from "react";
import { EyeIcon, ExternalLinkIcon, SearchIcon } from "lucide-react";
import Link from "next/link";

import { TablePagination, useTablePagination } from "@/app/(app)/_components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Frame } from "@/components/ui/frame";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminAssessmentReport } from "@/lib/server/assessments";

import { resolveReportAction } from "../actions";

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
] as const;

const categoryFilters = [
  { label: "All categories", value: "all" },
  { label: "Issue", value: "issue" },
  { label: "Problem", value: "problem" },
  { label: "Complaint", value: "complaint" },
  { label: "Suggestion", value: "suggestion" },
  { label: "Improvement", value: "improvement" },
] as const;

const typeFilters = [
  { label: "All reports", value: "all" },
  { label: "Assessment", value: "assessment" },
  { label: "General help", value: "general" },
] as const;

type StatusFilter = (typeof statusFilters)[number]["value"];
type CategoryFilter = (typeof categoryFilters)[number]["value"];
type TypeFilter = (typeof typeFilters)[number]["value"];

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function UserSummary({
  label,
  user,
}: {
  label: string;
  user: AdminAssessmentReport["reporter"];
}) {
  return (
    <div className="grid gap-1 rounded-lg border bg-background p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-medium">{user?.name ?? "Unknown user"}</div>
      <div className="text-muted-foreground text-xs">
        {user?.email ?? "No email available"}
      </div>
    </div>
  );
}

function matchesSearch(report: AdminAssessmentReport, query: string) {
  if (!query) {
    return true;
  }

  const searchable = [
    report.category,
    report.reason,
    report.status,
    report.reporter?.name,
    report.reporter?.email,
    report.targetUser?.name,
    report.targetUser?.email,
    report.assessment?.title,
    report.assessment?.topic,
    report.assessment?.status,
    report.assessment?.user?.name,
    report.assessment?.writer?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

function ReportDetailDialog({ report }: { report: AdminAssessmentReport }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button aria-label="View report" size="icon-sm" variant="outline" />
        }
      >
        <EyeIcon aria-hidden="true" />
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{formatLabel(report.category)} report</DialogTitle>
          <DialogDescription>
            Submitted {formatDate(report.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <UserSummary label="Submitted by" user={report.reporter} />
            <UserSummary label="Against" user={report.targetUser} />
          </div>

          <div className="grid gap-1 rounded-lg border bg-background p-3">
            <div className="text-muted-foreground text-xs">Assessment</div>
            {report.assessment ? (
              <div className="grid gap-2">
                <div>
                  <div className="font-medium">{report.assessment.topic}</div>
                  <div className="text-muted-foreground text-xs">
                    {report.assessment.title}
                  </div>
                </div>
                <Button
                  render={
                    <Link href={`/assessments/${report.assessment.id}`} />
                  }
                  size="sm"
                  variant="secondary"
                >
                  Open assessment
                  <ExternalLinkIcon />
                </Button>
              </div>
            ) : (
              <div className="font-medium">General help request</div>
            )}
          </div>

          <div className="grid gap-1 rounded-lg border bg-background p-3">
            <div className="text-muted-foreground text-xs">Message</div>
            <p className="whitespace-pre-wrap text-sm leading-6">
              {report.reason}
            </p>
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Close
          </DialogClose>
          {report.status === "open" ? (
            <form action={resolveReportAction}>
              <input name="reportId" type="hidden" value={report.id} />
              <input
                name="assessmentId"
                type="hidden"
                value={report.assessmentId ?? ""}
              />
              <Button type="submit">Mark resolved</Button>
            </form>
          ) : null}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export function ReportsTable({
  reports,
}: {
  reports: AdminAssessmentReport[];
}) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredReports = React.useMemo(
    () =>
      reports.filter((report) => {
        if (statusFilter !== "all" && report.status !== statusFilter) {
          return false;
        }

        if (categoryFilter !== "all" && report.category !== categoryFilter) {
          return false;
        }

        if (typeFilter === "assessment" && !report.assessment) {
          return false;
        }

        if (typeFilter === "general" && report.assessment) {
          return false;
        }

        return matchesSearch(report, normalizedQuery);
      }),
    [categoryFilter, normalizedQuery, reports, statusFilter, typeFilter],
  );

  const {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useTablePagination(filteredReports);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <InputGroup className="max-w-96">
          <InputGroupInput
            aria-label="Search reports"
            onChange={(event) => {
              setQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search reports"
            type="search"
            value={query}
          />
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
        <div className="grid gap-2 sm:grid-cols-3 xl:w-[42rem]">
          <Select
            aria-label="Filter reports by status"
            items={statusFilters}
            onValueChange={(value) => {
              setStatusFilter((value ?? "all") as StatusFilter);
              setCurrentPage(1);
            }}
            value={statusFilter}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {statusFilters.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Select
            aria-label="Filter reports by category"
            items={categoryFilters}
            onValueChange={(value) => {
              setCategoryFilter((value ?? "all") as CategoryFilter);
              setCurrentPage(1);
            }}
            value={categoryFilter}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {categoryFilters.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Select
            aria-label="Filter reports by type"
            items={typeFilters}
            onValueChange={(value) => {
              setTypeFilter((value ?? "all") as TypeFilter);
              setCurrentPage(1);
            }}
            value={typeFilter}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {typeFilters.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      </div>
      <div className="text-muted-foreground text-sm">
        Showing {filteredReports.length} of {reports.length}
      </div>
      <Frame>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Against</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <div className="font-medium">
                    {formatLabel(report.category)}
                  </div>
                  <div className="truncate text-muted-foreground text-xs">
                    {report.assessment
                      ? `${report.assessment.topic} - ${report.assessment.title}`
                      : "General help request"}
                  </div>
                </TableCell>
                <TableCell>{report.reporter?.name ?? "Unknown"}</TableCell>
                <TableCell>{report.targetUser?.name ?? "Not assigned"}</TableCell>
                <TableCell>
                  <Badge variant={report.status === "open" ? "warning" : "success"}>
                    {formatLabel(report.status)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(report.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <ReportDetailDialog report={report} />
                </TableCell>
              </TableRow>
            ))}
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-8 text-center text-muted-foreground text-sm"
                  colSpan={6}
                >
                  No reports match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Frame>
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
