"use client";

import {
  KeyRoundIcon,
  MailIcon,
  ShieldIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Frame } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

type AuthMode = "signin" | "signup";
type Method = "password" | "otp";

type LoginFormProps = {
  nextPath: string;
  disabledMessage?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
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

async function postAuth(path: string, body: unknown) {
  const response = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.message ??
        data?.error?.message ??
        `Authentication failed with status ${response.status}.`,
    );
  }

  return response.json().catch(() => ({}));
}

export function LoginForm({ nextPath, disabledMessage }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [method, setMethod] = useState<Method>("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(disabledMessage ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitEmailPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result =
      mode === "signin"
        ? await authClient.signIn.email({
            email,
            password,
            callbackURL: nextPath,
          })
        : await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: nextPath,
          });

    setLoading(false);

    if (result.error) {
      setError(
        result.error.message ??
          (mode === "signin"
            ? "Unable to sign in."
            : "Unable to create your account."),
      );
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function sendOtp() {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await postAuth("/email-otp/send-verification-otp", {
        email,
        type: "sign-in",
      });
      setOtpSent(true);
      setMessage("Email code sent.");
    } catch (error) {
      setError(getErrorMessage(error, "Unable to send email code."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await postAuth("/sign-in/email-otp", {
        email,
        otp,
      });
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "The email code is invalid."));
    } finally {
      setLoading(false);
    }
  }

  async function signInWithPasskey() {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const result = await authClient.signIn.passkey();

      if (result.error) {
        throw result.error;
      }

      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Unable to sign in with passkey."));
    } finally {
      setLoading(false);
    }
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
            onClick={() => setMethod("password")}
            size="sm"
            type="button"
            variant={method === "password" ? "default" : "outline"}
          >
            <KeyRoundIcon />
            Password
          </Button>
          <Button
            onClick={() => setMethod("otp")}
            size="sm"
            type="button"
            variant={method === "otp" ? "default" : "outline"}
          >
            <MailIcon />
            Email OTP
          </Button>
        </div>

        {method === "password" ? (
          <Form onSubmit={submitEmailPassword}>
            <FieldGroup>
              {mode === "signup" && (
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    autoComplete="name"
                    id="name"
                    name="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    required
                    type="text"
                    value={name}
                  />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  autoComplete="email"
                  id="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="m@example.com"
                  required
                  type="email"
                  value={email}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  id="password"
                  maxLength={128}
                  minLength={8}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  type="password"
                  value={password}
                />
              </Field>
              {error ? (
                <p className="text-destructive-foreground text-xs">{error}</p>
              ) : null}
              {message ? (
                <p className="text-muted-foreground text-xs">{message}</p>
              ) : null}
              <Field>
                <Button loading={loading} type="submit">
                  {mode === "signin" ? "Sign in" : "Sign up"}
                </Button>
              </Field>
            </FieldGroup>
          </Form>
        ) : (
          <Form onSubmit={verifyOtp}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="otp-email">Email</FieldLabel>
                <Input
                  autoComplete="email"
                  id="otp-email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="m@example.com"
                  required
                  type="email"
                  value={email}
                />
              </Field>
              {otpSent && (
                <Field>
                  <FieldLabel htmlFor="otp">Code</FieldLabel>
                  <Input
                    autoComplete="one-time-code"
                    id="otp"
                    inputMode="numeric"
                    minLength={6}
                    name="otp"
                    onChange={(event) => setOtp(event.target.value)}
                    required
                    value={otp}
                  />
                </Field>
              )}
              {error ? (
                <p className="text-destructive-foreground text-xs">{error}</p>
              ) : null}
              {message ? (
                <p className="text-muted-foreground text-xs">{message}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  disabled={!email}
                  loading={loading && !otpSent}
                  onClick={() => void sendOtp()}
                  type="button"
                  variant="outline"
                >
                  Send code
                </Button>
                <Button disabled={!otpSent} loading={loading} type="submit">
                  Verify
                </Button>
              </div>
            </FieldGroup>
          </Form>
        )}

        <FieldSeparator className="my-4">Or use a device key</FieldSeparator>
        <Button
          className="w-full"
          disabled={loading}
          onClick={() => void signInWithPasskey()}
          type="button"
          variant="outline"
        >
          <KeyRoundIcon />
          Continue with passkey
        </Button>

        <p className="mt-4 text-center text-muted-foreground text-xs">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("signup");
                  setMethod("password");
                }}
                type="button"
              >
                <UserPlusIcon className="size-3" />
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="underline-offset-4 hover:underline"
                onClick={() => setMode("signin")}
                type="button"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </CardContent>
    </Frame>
  );
}
