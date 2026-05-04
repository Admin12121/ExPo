"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBrand } from "../../_components/auth-brand";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Frame } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

type ResetPasswordFormProps = {
  initialEmail: string;
  token: string;
};

type AuthClientResult = {
  error?: {
    message?: string | null;
  } | null;
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

export function ResetPasswordForm({
  initialEmail,
  token,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail.trim().toLowerCase());
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const usesTokenReset = Boolean(token);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (usesTokenReset) {
        const response = await fetch("/api/auth/reset-password", {
          body: JSON.stringify({
            newPassword,
            token,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: { message?: string };
            message?: string;
          } | null;
          throw new Error(
            data?.message ??
              data?.error?.message ??
              "Unable to reset your password.",
          );
        }
      } else {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !otp.trim()) {
          throw new Error("Email and reset code are required.");
        }

        const result = (await authClient.emailOtp.resetPassword({
          email: normalizedEmail,
          otp: otp.trim(),
          password: newPassword,
        })) as AuthClientResult;

        if (result.error) {
          throw result.error;
        }
      }

      setMessage("Password reset. You can sign in now.");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 600);
    } catch (resetError) {
      setError(getErrorMessage(resetError, "Unable to reset your password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Frame className="border-none p-5">
      <AuthBrand />
      <CardContent className="px-0 py-0">
        <Form onSubmit={submit}>
          <FieldGroup>
            {!usesTokenReset ? (
              <>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    autoComplete="email"
                    nativeInput
                    onChange={(event) => setEmail(event.target.value)}
                    readOnly
                    required
                    type="email"
                    value={email}
                  />
                </Field>
                <Field>
                  <FieldLabel>Reset code</FieldLabel>
                  <Input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    minLength={6}
                    nativeInput
                    onChange={(event) => setOtp(event.target.value)}
                    required
                    value={otp}
                  />
                </Field>
              </>
            ) : null}
            <Field>
              <FieldLabel>New password</FieldLabel>
              <Input
                autoComplete="new-password"
                disabled={loading}
                minLength={8}
                name="newPassword"
                nativeInput
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
              <FieldDescription>
                Password must be at least 8 characters.
              </FieldDescription>
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : null}
            <Button loading={loading} type="submit">
              Reset password
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </Frame>
  );
}
