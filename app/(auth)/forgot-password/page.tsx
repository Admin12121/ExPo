"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await authClient.emailOtp.requestPasswordReset({ email });
      setInfo("Password reset code sent to your email (if the account exists). Check your inbox.");
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h2 className="mb-4 text-lg font-semibold">Forgot password</h2>
      <form onSubmit={handleSendOtp} className="grid gap-4">
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        {info && <div className="text-sm text-muted-foreground">{info}</div>}
        <div className="flex gap-2">
          <Button type="submit" loading={loading}>
            Send reset code
          </Button>
          <Button type="button" variant="ghost" onClick={() => {}}>Use other methods</Button>
        </div>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">If your account has TOTP or Passkey set, follow those flows when prompted. This page sends an email OTP as a fallback.</p>
    </div>
  );
}
