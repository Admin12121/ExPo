import { KeyRoundIcon, MonitorSmartphoneIcon, Trash2Icon } from "lucide-react";
import { revalidatePath } from "next/cache";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { requireSession } from "@/lib/auth/session";
import {
  deleteAccountPasskey,
  getAccountSettings,
  revokeAccountSession,
  updateAccountProfile,
} from "@/lib/server/account";

import { AccountSecurityActions } from "./_components";

function getTextValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalText(formData: FormData, key: string) {
  return getTextValue(formData, key) || undefined;
}

async function updateProfileAction(formData: FormData) {
  "use server";

  const session = await requireSession("/settings");
  const name = getTextValue(formData, "name");

  if (!name) {
    return;
  }

  await updateAccountProfile(session.user.id, {
    name,
    phone: getOptionalText(formData, "phone"),
    timezone: getOptionalText(formData, "timezone"),
    locale: getOptionalText(formData, "locale"),
    bio: getOptionalText(formData, "bio"),
    recoveryEmail: getOptionalText(formData, "recoveryEmail"),
  });

  revalidatePath("/settings");
}

async function deletePasskeyAction(formData: FormData) {
  "use server";

  const session = await requireSession("/settings");
  const passkeyId = getTextValue(formData, "passkeyId");

  if (!passkeyId) {
    return;
  }

  await deleteAccountPasskey(session.user.id, passkeyId);
  revalidatePath("/settings");
}

async function revokeSessionAction(formData: FormData) {
  "use server";

  const session = await requireSession("/settings");
  const sessionId = getTextValue(formData, "sessionId");
  const currentSessionId = String(session.session.id);

  if (!sessionId || sessionId === currentSessionId) {
    return;
  }

  await revokeAccountSession(session.user.id, sessionId, currentSessionId);
  revalidatePath("/settings");
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatProvider(provider: string) {
  return provider
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown device";
  }

  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";

  return userAgent.split(" ").slice(0, 2).join(" ");
}

export default async function AccountSettingsPage() {
  const session = await requireSession("/settings");
  const currentSessionId = String(session.session.id);
  const account = await getAccountSettings(session.user.id);
  const { linkedAccounts, passkeys, sessions, twoFactor, user } = account;

  return (
    <main className="grid gap-4 p-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">Account Settings</h1>
          <p className="truncate text-sm text-muted-foreground">
            Profile, sign-in, recovery, and active device controls.
          </p>
        </div>
        <Badge variant="outline">{formatRole(user.role)}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <div className="grid gap-4">
          <form action={updateProfileAction}>
            <Frame className="grid gap-4 p-4">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">Profile</h2>
                <p className="truncate text-sm text-muted-foreground">
                  Public account details and recovery contact.
                </p>
              </div>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input defaultValue={user.name} name="name" required />
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    defaultValue={user.email}
                    disabled
                    nativeInput
                    type="email"
                  />
                  <FieldDescription>
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Recovery email</FieldLabel>
                  <Input
                    defaultValue={user.recoveryEmail ?? ""}
                    name="recoveryEmail"
                    nativeInput
                    type="email"
                  />
                </Field>
                <Field>
                  <FieldLabel>Phone</FieldLabel>
                  <Input
                    defaultValue={user.phone ?? ""}
                    name="phone"
                    nativeInput
                    type="tel"
                  />
                </Field>
                <Field>
                  <FieldLabel>Timezone</FieldLabel>
                  <Input defaultValue={user.timezone} name="timezone" />
                </Field>
                <Field>
                  <FieldLabel>Locale</FieldLabel>
                  <Input defaultValue={user.locale} name="locale" />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel>Bio</FieldLabel>
                <Textarea defaultValue={user.bio ?? ""} name="bio" />
              </Field>
              <div className="flex justify-end">
                <Button size="sm" type="submit">
                  Save profile
                </Button>
              </div>
            </Frame>
          </form>

          <Frame className="grid gap-4 p-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">Security</h2>
              <p className="truncate text-sm text-muted-foreground">
                Password, passkey, and authenticator app controls.
              </p>
            </div>
            <AccountSecurityActions
              email={user.email}
              twoFactorEnabled={user.twoFactorEnabled}
            />
          </Frame>
        </div>

        <div className="grid content-start gap-4">
          <Frame className="grid gap-4 p-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">
                Account Activity
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                Last sign-in and security enrollment status.
              </p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="grid gap-1">
                <span className="text-muted-foreground">Last login</span>
                <span className="font-medium">
                  {formatDate(user.lastLoginAt)}
                </span>
              </div>
              <div className="grid gap-1">
                <span className="text-muted-foreground">Two-factor</span>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={user.twoFactorEnabled ? "success" : "outline"}
                  >
                    {user.twoFactorEnabled ? "Enabled" : "Not enabled"}
                  </Badge>
                  {twoFactor?.verified ? (
                    <Badge variant="outline">Verified</Badge>
                  ) : null}
                </span>
              </div>
              <div className="grid gap-1">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </Frame>

          <Frame>
            <Table variant="card">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Linked accounts - {linkedAccounts.length}
                  </TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center text-muted-foreground"
                      colSpan={2}
                    >
                      No linked accounts.
                    </TableCell>
                  </TableRow>
                ) : (
                  linkedAccounts.map((linkedAccount) => (
                    <TableRow key={linkedAccount.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {formatProvider(linkedAccount.providerId)}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {linkedAccount.accountId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(linkedAccount.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Frame>
        </div>
      </div>

      <Frame>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Logged devices - {sessions.length}</TableHead>
              <TableHead>IP address</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((accountSession) => {
              const isCurrent = accountSession.id === currentSessionId;
              const isExpired = accountSession.expiresAt < new Date();

              return (
                <TableRow key={accountSession.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <MonitorSmartphoneIcon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {summarizeUserAgent(accountSession.userAgent)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {accountSession.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {accountSession.ipAddress ?? "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(accountSession.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {isCurrent ? (
                        <Badge variant="success">Current</Badge>
                      ) : null}
                      <Badge variant={isExpired ? "secondary" : "outline"}>
                        {isExpired ? "Expired" : "Active"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <form
                      action={revokeSessionAction}
                      className="flex justify-end"
                    >
                      <input
                        name="sessionId"
                        type="hidden"
                        value={accountSession.id}
                      />
                      <Button
                        disabled={isCurrent}
                        size="sm"
                        type="submit"
                        variant="outline"
                      >
                        Revoke
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Frame>

      <Frame>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Passkeys - {passkeys.length}</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Backed up</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passkeys.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No passkeys added.
                </TableCell>
              </TableRow>
            ) : (
              passkeys.map((passkey) => (
                <TableRow key={passkey.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {passkey.name || "Unnamed passkey"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {passkey.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatProvider(passkey.deviceType)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(passkey.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={passkey.backedUp ? "success" : "outline"}>
                      {passkey.backedUp ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <form
                      action={deletePasskeyAction}
                      className="flex justify-end"
                    >
                      <input
                        name="passkeyId"
                        type="hidden"
                        value={passkey.id}
                      />
                      <Button
                        aria-label={`Delete ${passkey.name ?? "passkey"}`}
                        size="icon-sm"
                        type="submit"
                        variant="destructive-outline"
                      >
                        <Trash2Icon />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Frame>
    </main>
  );
}
