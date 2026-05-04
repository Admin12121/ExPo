"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import {
  KeyRoundIcon,
  LockKeyholeIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

type AccountSecurityActionsProps = {
  email: string;
  twoFactorEnabled: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export function AccountSecurityActions({
  email,
  twoFactorEnabled,
}: AccountSecurityActionsProps) {
  const router = useRouter();
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");

    try {
      setPendingAction("password");
      setPasswordMessage(null);
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        throw result.error;
      }

      event.currentTarget.reset();
      setPasswordMessage("Password updated.");
      router.refresh();
    } catch (error) {
      setPasswordMessage(getErrorMessage(error, "Unable to update password."));
    } finally {
      setPendingAction(null);
    }
  }

  async function sendPasswordReset() {
    try {
      setPendingAction("reset");
      setResetMessage(null);
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        throw result.error;
      }

      setResetMessage("Password reset email sent.");
    } catch (error) {
      setResetMessage(getErrorMessage(error, "Unable to send reset email."));
    } finally {
      setPendingAction(null);
    }
  }

  async function addPasskey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("passkeyName") ?? "").trim();

    try {
      setPendingAction("passkey");
      setPasskeyMessage(null);
      const result = await authClient.passkey.addPasskey({
        name: name || undefined,
      });

      if (result.error) {
        throw result.error;
      }

      event.currentTarget.reset();
      setPasskeyMessage("Passkey added.");
      router.refresh();
    } catch (error) {
      setPasskeyMessage(getErrorMessage(error, "Unable to add passkey."));
    } finally {
      setPendingAction(null);
    }
  }

  async function setupAuthenticator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("twoFactorPassword") ?? "");

    try {
      setPendingAction("twoFactor");
      setTwoFactorMessage(null);
      setTotpUri(null);
      setBackupCodes([]);
      const result = twoFactorEnabled
        ? await authClient.twoFactor.disable({ password })
        : await authClient.twoFactor.enable({ issuer: "ExPO", password });

      if (result.error) {
        throw result.error;
      }

      if (!twoFactorEnabled && result.data && "totpURI" in result.data) {
        setTotpUri(result.data.totpURI);
        setBackupCodes(result.data.backupCodes);
        setTwoFactorMessage("Authenticator setup started.");
      } else {
        setTwoFactorMessage("Authenticator disabled.");
      }

      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setTwoFactorMessage(
        getErrorMessage(error, "Unable to update authenticator app."),
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <FieldGroup className="grid gap-6">
      <form className="grid gap-3" onSubmit={changePassword}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <LockKeyholeIcon className="size-4 text-muted-foreground" />
          Password
        </div>
        <FieldGroup className="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel>Current password</FieldLabel>
            <Input
              autoComplete="current-password"
              disabled={pendingAction === "password"}
              nativeInput
              name="currentPassword"
              required
              type="password"
            />
          </Field>
          <Field>
            <FieldLabel>New password</FieldLabel>
            <Input
              autoComplete="new-password"
              disabled={pendingAction === "password"}
              minLength={8}
              nativeInput
              name="newPassword"
              required
              type="password"
            />
          </Field>
        </FieldGroup>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={pendingAction === "password"}
            loading={pendingAction === "password"}
            size="sm"
            type="submit"
          >
            Save password
          </Button>
          {passwordMessage ? (
            <span className="text-sm text-muted-foreground">
              {passwordMessage}
            </span>
          ) : null}
        </div>
      </form>

      <section className="grid gap-3 border-t pt-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MailIcon className="size-4 text-muted-foreground" />
          Password reset
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={pendingAction === "reset"}
            loading={pendingAction === "reset"}
            onClick={() => void sendPasswordReset()}
            size="sm"
            type="button"
            variant="outline"
          >
            Send reset email
          </Button>
          {resetMessage ? (
            <span className="text-sm text-muted-foreground">
              {resetMessage}
            </span>
          ) : null}
        </div>
      </section>

      <form className="grid gap-3 border-t pt-4" onSubmit={addPasskey}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyRoundIcon className="size-4 text-muted-foreground" />
          Passkey
        </div>
        <Field>
          <FieldLabel>Passkey name</FieldLabel>
          <Input
            disabled={pendingAction === "passkey"}
            name="passkeyName"
            placeholder="Work laptop"
          />
          <FieldDescription>
            Browser passkey support is required on this device.
          </FieldDescription>
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={pendingAction === "passkey"}
            loading={pendingAction === "passkey"}
            size="sm"
            type="submit"
          >
            Add passkey
          </Button>
          {passkeyMessage ? (
            <span className="text-sm text-muted-foreground">
              {passkeyMessage}
            </span>
          ) : null}
        </div>
      </form>

      <form className="grid gap-3 border-t pt-4" onSubmit={setupAuthenticator}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheckIcon className="size-4 text-muted-foreground" />
          Authenticator app
        </div>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            autoComplete="current-password"
            disabled={pendingAction === "twoFactor"}
            nativeInput
            name="twoFactorPassword"
            required
            type="password"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={pendingAction === "twoFactor"}
            loading={pendingAction === "twoFactor"}
            size="sm"
            type="submit"
            variant={twoFactorEnabled ? "destructive-outline" : "default"}
          >
            {twoFactorEnabled ? "Disable authenticator" : "Add authenticator"}
          </Button>
          {twoFactorMessage ? (
            <span className="text-sm text-muted-foreground">
              {twoFactorMessage}
            </span>
          ) : null}
        </div>
        {totpUri ? (
          <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="break-all font-mono text-xs">{totpUri}</div>
            {backupCodes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {backupCodes.map((code) => (
                  <span
                    key={code}
                    className="rounded-md border bg-background px-2 py-1 font-mono text-xs"
                  >
                    {code}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </FieldGroup>
  );
}
