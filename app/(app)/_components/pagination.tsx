"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;
const MAX_VISIBLE_PAGES = 5;

type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
};

function getVisiblePages(currentPage: number, totalPages: number): number[] {
  const pages: number[] = [];

  let start = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
  const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);

  if (end - start + 1 < MAX_VISIBLE_PAGES) {
    start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

function PageButton({
  active,
  disabled,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "secondary"}
      disabled={disabled}
      onClick={onClick}
      className={cn("min-w-9 px-2.5", className)}
    >
      {children}
    </Button>
  );
}

export function useTablePagination<T>(
  items: T[],
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const [currentPageState, setCurrentPageState] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(currentPageState, totalPages);
  const setCurrentPage = React.useCallback((page: number) => {
    setCurrentPageState(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const paginatedItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [currentPage, items, pageSize]);

  const rangeStart = items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(items.length, currentPage * pageSize);

  return {
    currentPage,
    pageSize,
    paginatedItems,
    rangeEnd,
    rangeStart,
    setCurrentPage,
    totalItems: items.length,
    totalPages,
  };
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = DEFAULT_PAGE_SIZE,
  className,
}: TablePaginationProps) {
  const pages = getVisiblePages(currentPage, totalPages);
  const first = pages[0];
  const last = pages[pages.length - 1];
  const hasTotalItems = typeof totalItems === "number";
  const rangeStart =
    hasTotalItems && totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const rangeEnd =
    hasTotalItems && totalItems > 0
      ? Math.min(totalItems, currentPage * pageSize)
      : 0;

  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="text-sm text-muted-foreground hidden sm:block">
        {hasTotalItems ? (
          <>
            {totalItems > 0
              ? `Showing ${rangeStart}-${rangeEnd} of ${totalItems}`
              : "Showing 0 of 0"}
          </>
        ) : (
          <>
            Page {currentPage} of {totalPages}
          </>
        )}
      </div>

      <nav
        role="navigation"
        aria-label="Pagination"
        className="flex flex-wrap items-center justify-center gap-1 md:justify-end"
      >
        <PageButton
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          className="px-2"
        >
          <ChevronsLeft className="size-4" />
        </PageButton>
        <PageButton
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-2"
        >
          <ChevronLeft className="size-4" />
        </PageButton>

        {first > 1 ? (
          <>
            <PageButton onClick={() => onPageChange(1)}>1</PageButton>
            {first > 2 ? (
              <span className="px-1 text-sm text-muted-foreground" aria-hidden>
                ...
              </span>
            ) : null}
          </>
        ) : null}

        {pages.map((page) => (
          <PageButton
            key={page}
            active={page === currentPage}
            onClick={() => onPageChange(page)}
          >
            {page}
          </PageButton>
        ))}

        {last < totalPages ? (
          <>
            {last < totalPages - 1 ? (
              <span className="px-1 text-sm text-muted-foreground" aria-hidden>
                ...
              </span>
            ) : null}
            <PageButton onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </PageButton>
          </>
        ) : null}

        <PageButton
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="px-2"
        >
          <ChevronRight className="size-4" />
        </PageButton>
        <PageButton
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          className="px-2"
        >
          <ChevronsRight className="size-4" />
        </PageButton>
      </nav>
    </div>
  );
}
