"use client";

import * as React from "react";
import { FileWarningIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AdminAssessmentReport } from "@/lib/server/assessments";

const REPORT_BATCH_SIZE = 6;

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
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

export function RecentReportsPanel({
  reports,
}: {
  reports: AdminAssessmentReport[];
}) {
  const [visibleCount, setVisibleCount] = React.useState(REPORT_BATCH_SIZE);
  const scrollRootRef = React.useRef<HTMLDivElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const visibleReports = reports.slice(0, visibleCount);
  const hasMoreReports = visibleCount < reports.length;

  React.useEffect(() => {
    const root =
      scrollRootRef.current?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      ) ?? null;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMoreReports) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) =>
            Math.min(current + REPORT_BATCH_SIZE, reports.length),
          );
        }
      },
      {
        root,
        rootMargin: "120px",
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreReports, reports.length, visibleCount]);

  return (
    <Frame>
      <FrameHeader className="flex-row items-center justify-between p-2">
        <FrameTitle className="flex items-center gap-2">
          <FileWarningIcon className="size-4 text-muted-foreground" />
          Recent reports
        </FrameTitle>
        <Button render={<Link href="/reports" />} size="sm" variant="secondary">
          View all
        </Button>
      </FrameHeader>
      <FramePanel className="min-h-[500px] max-h-[500px] p-0">
        <ScrollArea
          className="h-[500px] min-h-[500px] max-h-[500px]"
          hideScrollbar
          ref={scrollRootRef}
          scrollFade
        >
          <div className="grid content-start gap-3 p-4">
            {reports.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No reports submitted.
              </p>
            ) : (
              visibleReports.map((report) => (
                <div
                  className="grid gap-1 border-b pb-3 last:border-b-0 last:pb-0"
                  key={report.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">
                      {statusLabel(report.category)}
                    </span>
                    <Badge
                      variant={report.status === "open" ? "warning" : "success"}
                    >
                      {statusLabel(report.status)}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-muted-foreground text-xs">
                    {report.reason}
                  </p>
                  <div className="text-muted-foreground text-xs">
                    {report.reporter?.name ?? "Unknown user"} -{" "}
                    {formatDate(report.createdAt)}
                  </div>
                </div>
              ))
            )}
            {hasMoreReports ? (
              <div
                className="h-6 text-center text-muted-foreground text-xs"
                ref={sentinelRef}
              >
                Loading more reports
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </FramePanel>
    </Frame>
  );
}
