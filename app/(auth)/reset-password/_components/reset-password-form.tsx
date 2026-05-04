"use client";

import type React from "react";
import { ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Frame } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        newPassword,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(
        data?.message ??
          data?.error?.message ??
          "Unable to reset your password.",
      );
      return;
    }

    setMessage("Password reset. You can sign in now.");
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 600);
  }

  return (
    <Frame className="border-none p-5">
      <div className="mb-5 text-center">
        <Link
          href="/"
          className="inline-flex flex-col items-center gap-2 font-medium text-3xl"
        >
          <span className="flex size-12 items-center justify-center rounded-lg border bg-background">
            <ShieldIcon className="size-6" />
          </span>
          Athena
        </Link>
      </div>
      <CardContent className="px-0 py-0">
        <Form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel>New password</FieldLabel>
              <Input
                autoComplete="new-password"
                disabled={!token || loading}
                minLength={8}
                name="newPassword"
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
              <FieldDescription>
                Password must be at least 8 characters.
              </FieldDescription>
            </Field>
            {!token ? (
              <p className="text-destructive-foreground text-xs">
                Missing reset token.
              </p>
            ) : null}
            {error ? (
              <p className="text-destructive-foreground text-xs">{error}</p>
            ) : null}
            {message ? (
              <p className="text-muted-foreground text-xs">{message}</p>
            ) : null}
            <Button disabled={!token} loading={loading} type="submit">
              Reset password
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </Frame>
  );
}
