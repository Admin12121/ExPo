"use client";

import * as React from "react";
import { BadgeCheck, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import type { UserDirectoryRow } from "@/lib/server/users";

import { TablePagination, useTablePagination } from "../../_components";
import { UserActionsMenu } from "./user-actions-menu";

const role = [
  { label: "All", value: "all" },
  { label: "Writer", value: "writer" },
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
] as const;

const status = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
] as const;

type RoleFilter = (typeof role)[number]["value"];
type StatusFilter = (typeof status)[number]["value"];

function formatDate(value: Date | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function matchesRole(user: UserDirectoryRow, filter: RoleFilter) {
  return filter === "all" || user.role === filter;
}

function matchesStatus(user: UserDirectoryRow, filter: StatusFilter) {
  if (filter === "all") {
    return true;
  }

  const isActive = user.isActive && !user.banned;
  return filter === "active" ? isActive : !isActive;
}

function matchesSearch(user: UserDirectoryRow, query: string) {
  if (!query) {
    return true;
  }

  const searchable = [
    user.name,
    user.email,
    user.role,
    user.isActive ? "active" : "inactive",
    user.banned ? "banned" : "",
    user.emailVerified ? "verified" : "unverified",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

export function UsersDirectory({
  children,
  currentUserId,
  rows,
}: {
  children?: React.ReactNode;
  currentUserId: string;
  rows: UserDirectoryRow[];
}) {
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = React.useMemo(
    () =>
      rows.filter(
        (user) =>
          matchesRole(user, roleFilter) &&
          matchesStatus(user, statusFilter) &&
          matchesSearch(user, normalizedQuery),
      ),
    [normalizedQuery, roleFilter, rows, statusFilter],
  );
  const {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useTablePagination(filteredRows);

  return (
    <>
      <div className="flex items-center justify-between w-full">
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
            items={role}
            onValueChange={(value) => {
              setRoleFilter((value ?? "all") as RoleFilter);
              setCurrentPage(1);
            }}
            value={roleFilter}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {role.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Select
            aria-label="Select framework"
            items={status}
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
              {status.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {children}
        </span>
      </div>
      <Frame>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Users - {rows.length}</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-36">Role</TableHead>
              <TableHead className="w-40">Status</TableHead>
              <TableHead className="w-44">Last login</TableHead>
              <TableHead className="w-56 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-28 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((user) => {
                const isCurrent = user.id === currentUserId;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{user.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0 relative">
                        <div className="truncate">{user.email}</div>
                        <div className="truncate text-xs text-muted-foreground absolute right-0 top-0 flex items-center gap-1">
                          {user.emailVerified ? (
                            <BadgeCheck className="size-4" />
                          ) : (
                            ""
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatRole(user.role)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant={user.isActive ? "outline" : "secondary"}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : null}
                        {isCurrent ? (
                          <Badge variant="success">You</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.lastLoginAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <UserActionsMenu
                          currentRole={user.role}
                          isActive={user.isActive}
                          isCurrent={isCurrent}
                          userId={user.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
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
    </>
  );
}
