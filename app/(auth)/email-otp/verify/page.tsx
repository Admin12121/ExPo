"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Frame } from "@/components/ui/frame";
import { Card, CardContent } from "@/components/ui/card";
import { OTPField, OTPFieldInput } from "@/components/ui/otp-field";
import {
  isOtpStillValid,
  recordResend,
  setOtpSentAt,
  countRecentResends,
} from "@/lib/auth/otpClient";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default function EmailOtpVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryEmail = params?.get("email") ?? "";
  const [initialEmail, setInitialEmail] = useState<string>("");

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const OTP_LENGTH = 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // if otp not provided, collect from OTPField inputs in the form
    let code = otp;
    if (!code && formRef.current) {
      const inputs = Array.from(
        formRef.current.querySelectorAll<HTMLInputElement>(
          "[data-slot=otp-field-input]",
        ),
      );
      code = inputs.map((i) => i.value.trim()).join("");
    }

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      });
      setLoading(false);
      if ((result as any).error) {
        setError((result as any).error?.message ?? "Failed to verify OTP");
        return;
      }

      // success — clear stored email and redirect to dashboard
      try {
        sessionStorage.removeItem("auth:verify:email");
      } catch {}
      router.push("/dashboard");
    } catch (err: any) {
      setLoading(false);
      setError(err?.message ?? String(err));
    }
  }

  async function sendOtp(force = false) {
    if (!email) return;
    // client-side reuse check: reuse existing OTP for 5 minutes
    if (!force && isOtpStillValid(email)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call server-side endpoint that enforces DB-backed rate limits
      const res = await fetch("/api/auth/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "sign-in" }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error ?? "Failed to send OTP");
        return;
      }

      setOtpSentAt(email);
      try {
        recordResend(email);
      } catch {}
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // populate initial email from sessionStorage (set by the client during signup)
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem("auth:verify:email")
        : null;
    const resolved = (stored && stored.trim()) || queryEmail || "";
    if (resolved) {
      setInitialEmail(resolved);
      setEmail(resolved);
      // fire-and-forget; will respect client-side limits
      sendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryEmail]);

  return (
    <main className="flex h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className={cn("flex flex-col gap-6")}>
          <Frame className="border-none py-5">
            <CardContent>
              <h2 className="mb-4 text-lg  text-center font-semibold">
                Verify Your Email
              </h2>
              <form ref={formRef} onSubmit={handleSubmit} className="">
                <p className="text-center">
                  Enter the code we&apos;ve sent to your inbox {email}
                </p>
                <p className="text-center">
                  Didn&apos;t get the code ?{" "}
                  <Button
                    variant="link"
                    className="px-0"
                    onClick={() => sendOtp(true)}
                  >
                    Resend
                  </Button>
                </p>

                <Field className="flex w-full flex-col items-center justify-center gap-2 mt-2">
                  <OTPField
                    size="lg"
                    aria-label="One-time password"
                    length={OTP_LENGTH}
                  >
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <OTPFieldInput
                        key={`otp-slot-${i}`}
                        aria-label={`Character ${i + 1} of ${OTP_LENGTH}`}
                      />
                    ))}
                  </OTPField>
                  {error && <FieldError>{error}</FieldError>}
                </Field>

                <Button
                  type="submit"
                  size={"lg"}
                  loading={loading}
                  className="w-full mt-5"
                >
                  Verify
                </Button>
              </form>
            </CardContent>
          </Frame>
        </div>
      </div>
    </main>
  );
}
