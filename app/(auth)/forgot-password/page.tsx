"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBrand } from "../_components/auth-brand";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Frame } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/password-reset-otp", {
        body: JSON.stringify({ email: normalizedEmail }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        state?: string;
      } | null;

      if (!response.ok || !payload?.state) {
        throw new Error(payload?.error ?? "Unable to send reset code.");
      }

      router.push(`/reset-password?state=${encodeURIComponent(payload.state)}`);
    } catch (sendError) {
      setError(getErrorMessage(sendError, "Unable to send reset code."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <Frame className="border-none p-5">
          <AuthBrand />
          <CardContent className="px-0 py-0">
            <form className="grid gap-4" onSubmit={handleSendOtp}>
              <div className="grid gap-1">
                <h1 className="text-lg font-semibold">Forgot password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email to receive a reset code.
                </p>
              </div>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  autoComplete="email"
                  nativeInput
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
              <Button loading={loading} type="submit">
                Send reset code
              </Button>
            </form>
          </CardContent>
        </Frame>
      </div>
    </main>
  );
}
