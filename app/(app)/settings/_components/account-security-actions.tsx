"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { FrameFooter, FramePanel } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

type AccountSecurityActionsProps = {
  email: string;
  scope?: "all" | "authenticator" | "passkey" | "passkeys" | "security";
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
  scope = "all",
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
  const [authenticatorOpen, setAuthenticatorOpen] = useState(false);
  const [passkeyOpen, setPasskeyOpen] = useState(false);
  const showAuthenticator =
    scope === "all" || scope === "authenticator" || scope === "passkeys";
  const showPasskey =
    scope === "all" || scope === "passkey" || scope === "passkeys";
  const showSecurity = scope === "all" || scope === "security";

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
      setPasskeyOpen(false);
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
        setAuthenticatorOpen(false);
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
    <>
      {showSecurity ? (
        <form className="contents" onSubmit={changePassword}>
          <FramePanel>
            <FieldGroup className="flex max-w-2xl flex-col gap-3">
              <Field>
                <Input
                  aria-label="Current password"
                  autoComplete="current-password"
                  disabled={pendingAction === "password"}
                  nativeInput
                  name="currentPassword"
                  placeholder="Current password"
                  required
                  type="password"
                />
              </Field>
              <Field>
                <Input
                  aria-label="New password"
                  autoComplete="new-password"
                  disabled={pendingAction === "password"}
                  minLength={8}
                  nativeInput
                  name="newPassword"
                  placeholder="New password"
                  required
                  type="password"
                />
              </Field>
            </FieldGroup>
          </FramePanel>
          <FrameFooter className="p-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
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
              <Button
                disabled={pendingAction === "password"}
                loading={pendingAction === "password"}
                size="sm"
                type="submit"
              >
                Save password
              </Button>
              {resetMessage ? (
                <span className="text-sm text-muted-foreground">
                  {resetMessage}
                </span>
              ) : null}
              {passwordMessage ? (
                <span className="text-sm text-muted-foreground">
                  {passwordMessage}
                </span>
              ) : null}
            </div>
          </FrameFooter>
        </form>
      ) : null}

      {showPasskey ? (
        <Dialog open={passkeyOpen} onOpenChange={setPasskeyOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            Add passkey
          </DialogTrigger>
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>Add passkey</DialogTitle>
            </DialogHeader>
            <form className="contents" onSubmit={addPasskey}>
              <DialogPanel>
                <FieldGroup className="flex flex-col gap-3">
                  <Field>
                    <Input
                      aria-label="Passkey name"
                      disabled={pendingAction === "passkey"}
                      name="passkeyName"
                      nativeInput
                      placeholder="Work laptop"
                      type="text"
                    />
                  </Field>
                  {passkeyMessage ? (
                    <span className="text-sm text-muted-foreground">
                      {passkeyMessage}
                    </span>
                  ) : null}
                </FieldGroup>
              </DialogPanel>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button
                      disabled={pendingAction === "passkey"}
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  Cancel
                </DialogClose>
                <Button
                  disabled={pendingAction === "passkey"}
                  loading={pendingAction === "passkey"}
                  type="submit"
                >
                  Add passkey
                </Button>
              </DialogFooter>
            </form>
          </DialogPopup>
        </Dialog>
      ) : null}

      {showAuthenticator ? (
        <Dialog open={authenticatorOpen} onOpenChange={setAuthenticatorOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            {twoFactorEnabled ? "Disable authenticator" : "Add authenticator"}
          </DialogTrigger>
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>
                {twoFactorEnabled
                  ? "Disable authenticator"
                  : "Add authenticator"}
              </DialogTitle>
            </DialogHeader>
            <form className="contents" onSubmit={setupAuthenticator}>
              <DialogPanel>
                <FieldGroup className="flex flex-col gap-3">
                  <Field>
                    <Input
                      aria-label="Password"
                      autoComplete="current-password"
                      disabled={pendingAction === "twoFactor"}
                      nativeInput
                      name="twoFactorPassword"
                      placeholder="Password"
                      required
                      type="password"
                    />
                  </Field>
                  {totpUri ? (
                    <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                      <div className="break-all font-mono text-xs">
                        {totpUri}
                      </div>
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
                  {twoFactorMessage ? (
                    <span className="text-sm text-muted-foreground">
                      {twoFactorMessage}
                    </span>
                  ) : null}
                </FieldGroup>
              </DialogPanel>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button
                      disabled={pendingAction === "twoFactor"}
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  Cancel
                </DialogClose>
                <Button
                  disabled={pendingAction === "twoFactor"}
                  loading={pendingAction === "twoFactor"}
                  type="submit"
                  variant={twoFactorEnabled ? "destructive-outline" : "default"}
                >
                  {twoFactorEnabled
                    ? "Disable authenticator"
                    : "Add authenticator"}
                </Button>
              </DialogFooter>
            </form>
          </DialogPopup>
        </Dialog>
      ) : null}
    </>
  );
}
