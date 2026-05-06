import { Plus } from "lucide-react";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogPopup,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Frame,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/session";
import { getUsers, parseUserRole } from "@/lib/server/users";

import { UsersDirectory } from "./_components/users-directory";

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

function CreateUserDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size={"icon"} variant={"secondary"}>
            <Plus className="size-4" />
          </Button>
        }
      />
      <DialogPopup>
        <Frame>
          <FrameHeader>
            <FrameTitle>Create user</FrameTitle>
          </FrameHeader>
          <FramePanel>
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
          </FramePanel>
          <FrameFooter className="flex items-center justify-end gap-2 p-2">
            <DialogClose render={<Button variant={"secondary"}>Cancel</Button>} />
            <Button form="create-user-form" type="submit">
              Create
            </Button>
          </FrameFooter>
        </Frame>
      </DialogPopup>
    </Dialog>
  );
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
      </div>

      <UsersDirectory currentUserId={session.user.id} rows={rows}>
        <CreateUserDialog />
      </UsersDirectory>
    </main>
  );
}
