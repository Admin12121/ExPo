"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthBrand } from "../../../_components/auth-brand";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Frame } from "@/components/ui/frame";
import { OTPField, OTPFieldInput } from "@/components/ui/otp-field";
import { authClient } from "@/lib/auth/client";
import {
  isOtpStillValid,
  recordResend,
  setOtpSentAt,
} from "@/lib/auth/otpClient";

type EmailOtpVerifyFormProps = {
  initialEmail: string;
};

type AuthClientResult = {
  error?: {
    message?: string | null;
  } | null;
};

const OTP_LENGTH = 6;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

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

function getOtpFromForm(form: HTMLFormElement) {
  return Array.from(
    form.querySelectorAll<HTMLInputElement>("[data-slot=otp-field-input]"),
  )
    .map((input) => input.value.trim())
    .join("");
}

export function EmailOtpVerifyForm({ initialEmail }: EmailOtpVerifyFormProps) {
  const router = useRouter();
  const normalizedInitialEmail = normalizeEmail(initialEmail);
  const email = normalizedInitialEmail;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  async function sendOtp(targetEmail = email, force = false) {
    const normalizedEmail = normalizeEmail(targetEmail);
    if (!normalizedEmail) {
      return;
    }

    if (!force && isOtpStillValid(normalizedEmail)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/send-verification-otp", {
        body: JSON.stringify({ email: normalizedEmail }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "Failed to send OTP");
        return;
      }

      setOtpSentAt(normalizedEmail);
      recordResend(normalizedEmail);
    } catch (sendError) {
      setError(getErrorMessage(sendError, "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!normalizedInitialEmail) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void sendOtp(normalizedInitialEmail);
    }, 0);

    return () => window.clearTimeout(timeout);
    // Only auto-send once for the server-provided email.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedInitialEmail]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    const code = getOtpFromForm(event.currentTarget);
    if (!normalizedEmail || code.length !== OTP_LENGTH) {
      setError("Enter your email and 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = (await authClient.emailOtp.verifyEmail({
        email: normalizedEmail,
        otp: code,
      })) as AuthClientResult;

      if (result.error) {
        setError(result.error.message ?? "Failed to verify OTP");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, "Failed to verify OTP"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <Frame className="border-none py-5">
          <AuthBrand />
          <CardContent>
            <h2 className="mb-4 text-center text-lg font-semibold">
              Verify Your Email
            </h2>
            <form className="grid gap-4" onSubmit={handleSubmit} ref={formRef}>
              <div className="grid gap-1 text-center text-sm text-muted-foreground">
                <p>
                  Enter the code we&apos;ve sent to your inbox{" "}
                  <span className="text-foreground">{email}</span>
                </p>
                <p>
                  Didn&apos;t get the code?{" "}
                  <Button
                    className="h-auto px-0"
                    disabled={!email || loading}
                    onClick={() => void sendOtp(email, true)}
                    type="button"
                    variant="link"
                  >
                    Resend
                  </Button>
                </p>
              </div>

              <Field className="flex w-full flex-col items-center justify-center gap-2">
                <OTPField
                  aria-label="One-time password"
                  length={OTP_LENGTH}
                  size="lg"
                >
                  {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                    <OTPFieldInput
                      aria-label={`Character ${index + 1} of ${OTP_LENGTH}`}
                      key={`otp-slot-${index}`}
                    />
                  ))}
                </OTPField>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>

              <Button
                className="w-full"
                loading={loading}
                size="lg"
                type="submit"
              >
                Verify
              </Button>
            </form>
          </CardContent>
        </Frame>
      </div>
    </main>
  );
}
