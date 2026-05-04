"use client";

import { MailIcon, ShieldCheckIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
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
import { authClient } from "@/lib/auth/client";

type Method = "totp" | "otp";

export function TwoFactorForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verifyTotp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await authClient.twoFactor.verifyTotp({
      code,
      trustDevice: true,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "The verification code is invalid.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function sendOtp() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/two-factor/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        trustDevice: true,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(
        data?.message ??
          data?.error?.message ??
          "Unable to send email code.",
      );
      return;
    }

    setMessage("Email code sent.");
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/two-factor/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        code,
        trustDevice: true,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(
        data?.message ??
          data?.error?.message ??
          "The email code is invalid.",
      );
      return;
    }

    router.push(nextPath);
    router.refresh();
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
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              setMethod("totp");
              setCode("");
            }}
            size="sm"
            type="button"
            variant={method === "totp" ? "default" : "outline"}
          >
            <ShieldCheckIcon />
            TOTP
          </Button>
          <Button
            onClick={() => {
              setMethod("otp");
              setCode("");
            }}
            size="sm"
            type="button"
            variant={method === "otp" ? "default" : "outline"}
          >
            <MailIcon />
            Email OTP
          </Button>
        </div>

        <Form onSubmit={method === "totp" ? verifyTotp : verifyOtp}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="code">Verification code</FieldLabel>
              <Input
                autoComplete="one-time-code"
                id="code"
                inputMode="numeric"
                minLength={6}
                name="code"
                onChange={(event) => setCode(event.target.value)}
                required
                value={code}
              />
              <FieldDescription>
                {method === "totp"
                  ? "Use the code from your authenticator app."
                  : "Send an email code, then enter it here."}
              </FieldDescription>
            </Field>
            {error ? (
              <p className="text-destructive-foreground text-xs">{error}</p>
            ) : null}
            {message ? (
              <p className="text-muted-foreground text-xs">{message}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              {method === "otp" ? (
                <Button
                  loading={loading && !code}
                  onClick={() => void sendOtp()}
                  type="button"
                  variant="outline"
                >
                  Send code
                </Button>
              ) : (
                <div />
              )}
              <Button loading={loading} type="submit">
                Verify
              </Button>
            </div>
          </FieldGroup>
        </Form>
      </CardContent>
    </Frame>
  );
}
