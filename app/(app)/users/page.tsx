import { UserPlusIcon } from "lucide-react";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Frame } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  getUsers,
  parseUserRole,
  setUserActive,
  updateUserRole,
} from "@/lib/server/users";

function getTextValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function createUserAction(formData: FormData) {
  "use server";

  await requireAdmin("/users");
  const name = getTextValue(formData, "name");
  const email = getTextValue(formData, "email");
  const password = getTextValue(formData, "password");
  const role = parseUserRole(formData.get("role"));

  if (!name || !email || password.length < 8) {
    return;
  }

  await auth.api.createUser({
    headers: await headers(),
    body: {
      name,
      email,
      password,
      role,
    },
  });

  revalidatePath("/users");
}

async function updateRoleAction(formData: FormData) {
  "use server";

  await requireAdmin("/users");
  const userId = getTextValue(formData, "userId");
  const role = parseUserRole(formData.get("role"));

  if (!userId) {
    return;
  }

  await updateUserRole(userId, role);
  revalidatePath("/users");
}

async function setActiveAction(formData: FormData) {
  "use server";

  const session = await requireAdmin("/users");
  const userId = getTextValue(formData, "userId");
  const active = getTextValue(formData, "active") === "true";

  if (!userId || userId === session.user.id) {
    return;
  }

  await setUserActive(userId, active);
  revalidatePath("/users");
}

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

export default async function UsersPage() {
  const session = await requireAdmin("/users");
  const rows = await getUsers();

  return (
    <main className="grid gap-4 p-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">Users</h1>
          <p className="truncate text-sm text-muted-foreground">
            Manage admin, writer, and user accounts.
          </p>
        </div>
      </div>

      <form action={createUserAction}>
        <Frame className="grid gap-4 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserPlusIcon className="size-4 text-muted-foreground" />
            Create user
          </div>
          <FieldGroup className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_12rem_auto] md:items-end">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input name="name" required />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input name="email" nativeInput required type="email" />
            </Field>
            <Field>
              <FieldLabel>Password</FieldLabel>
              <Input
                minLength={8}
                name="password"
                nativeInput
                required
                type="password"
              />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <select
                className="h-8.5 w-full rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue="user"
                name="role"
              >
                <option value="admin">Admin</option>
                <option value="writer">Writer</option>
                <option value="user">User</option>
              </select>
            </Field>
            <Button type="submit">Create</Button>
          </FieldGroup>
          <p className="text-muted-foreground text-xs">
            New accounts can sign in immediately and manage their own security
            settings.
          </p>
        </Frame>
      </form>

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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-28 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user) => {
                const isCurrent = user.id === session.user.id;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{user.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {user.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="truncate">{user.email}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatRole(user.role)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={user.isActive ? "outline" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : null}
                        {isCurrent ? <Badge variant="success">You</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.lastLoginAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <form action={updateRoleAction} className="flex gap-2">
                          <input name="userId" type="hidden" value={user.id} />
                          <select
                            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                            defaultValue={user.role}
                            name="role"
                          >
                            <option value="admin">Admin</option>
                            <option value="writer">Writer</option>
                            <option value="user">User</option>
                          </select>
                          <Button size="sm" type="submit" variant="outline">
                            Save
                          </Button>
                        </form>
                        <form action={setActiveAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <input
                            name="active"
                            type="hidden"
                            value={String(!user.isActive)}
                          />
                          <Button
                            disabled={isCurrent}
                            size="sm"
                            type="submit"
                            variant={
                              user.isActive
                                ? "destructive-outline"
                                : "outline"
                            }
                          >
                            {user.isActive ? "Disable" : "Enable"}
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Frame>
    </main>
  );
}
