import { ClipboardCheckIcon, SettingsIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame } from "@/components/ui/frame";
import { requireSession } from "@/lib/auth/session";

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");

  return (
    <main className="grid gap-4 p-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">Dashboard</h1>
          <p className="truncate text-sm text-muted-foreground">
            Signed in as {session.user.email}.
          </p>
        </div>
        <Badge variant="outline">{formatRole(session.user.role ?? "user")}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Frame className="grid gap-3 p-4">
          <ClipboardCheckIcon className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">Assessments</h2>
            <p className="text-sm text-muted-foreground">
              Assessment workspace placeholder for the next workflow.
            </p>
          </div>
          <Button render={<Link href="/assessments" />} size="sm" variant="outline">
            Open
          </Button>
        </Frame>
        {session.user.role === "admin" ? (
          <Frame className="grid gap-3 p-4">
            <UsersIcon className="size-5 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold">Users</h2>
              <p className="text-sm text-muted-foreground">
                Manage admins, writers, and users.
              </p>
            </div>
            <Button render={<Link href="/users" />} size="sm" variant="outline">
              Manage
            </Button>
          </Frame>
        ) : null}
        <Frame className="grid gap-3 p-4">
          <SettingsIcon className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">Account</h2>
            <p className="text-sm text-muted-foreground">
              Profile, sessions, passkeys, and two-factor settings.
            </p>
          </div>
          <Button render={<Link href="/settings" />} size="sm" variant="outline">
            Settings
          </Button>
        </Frame>
      </div>
    </main>
  );
}
