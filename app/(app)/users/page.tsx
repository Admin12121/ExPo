import { BadgeCheck, UserPlusIcon } from "lucide-react";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Frame } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
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
import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  getUsers,
  parseUserRole,
} from "@/lib/server/users";
import { UserActionsMenu } from "./_components/user-actions-menu";

const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "Writer", value: "writer" },
  { label: "User", value: "user" },
] as const;

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
        </div>
        <Dialog>
          <DialogTrigger
            render={
              <Button>
                <UserPlusIcon className="size-4" />
                Create user
              </Button>
            }
          />
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                New accounts can sign in immediately and manage their own
                security settings.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <form
                action={createUserAction}
                id="create-user-form"
                className="grid gap-4"
              >
                <FieldGroup className="grid gap-4 md:grid-cols-2">
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
                    <Select defaultValue="user" items={roleOptions} name="role">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>
                </FieldGroup>
              </form>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button form="create-user-form" type="submit">
                Create
              </Button>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
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
                          currentRole={parseUserRole(user.role)}
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
    </main>
  );
}
