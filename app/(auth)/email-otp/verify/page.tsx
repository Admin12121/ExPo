"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  isOtpStillValid,
  recordResend,
  setOtpSentAt,
  countRecentResends,
} from "@/lib/auth/otpClient";

export default function EmailOtpVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialEmail = params?.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.emailOtp.verifyEmail({ email, otp });
      setLoading(false);
      if ((result as any).error) {
        setError((result as any).error?.message ?? "Failed to verify OTP");
        return;
      }

      // success — redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setLoading(false);
      setError(err?.message ?? String(err));
    }
  }

  async function sendOtp(force = false) {
    if (!email) return;

    // client-side limit: max 3 resends in 10 minutes
    const recent = countRecentResends(email);
    if (recent >= 3 && !force) {
      setError("Too many OTP requests. Try again later.");
      return;
    }

    // reuse existing OTP for 5 minutes
    if (!force && isOtpStillValid(email)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // server endpoint from better-auth: sendVerificationOtp
      await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
      setOtpSentAt(email);
      recordResend(email);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // auto-send OTP when we have an email in the querystring
    if (initialEmail) {
      // fire-and-forget; will respect client-side limits
      sendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  return (
    <div className="mx-auto max-w-sm p-6">
      <h2 className="mb-4 text-lg font-semibold">Verify your email</h2>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>One-time code</FieldLabel>
          <Input value={otp} onChange={(e) => setOtp(e.target.value)} required />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <div className="flex items-center gap-2">
          <Button type="submit" loading={loading}>
            Verify
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => sendOtp(true)}
            disabled={loading}
          >
            Resend
          </Button>
        </div>
      </form>
    </div>
  );
}
