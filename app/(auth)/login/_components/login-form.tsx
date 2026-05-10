"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiGoogleFill } from "@remixicon/react";

import { AuthBrand } from "../../_components/auth-brand";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Frame } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";

type AuthMode = "signin" | "signup";

function authErrorMessage(error: { code?: string; message?: string }, mode: AuthMode) {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "EMAIL_NOT_VERIFIED") {
    return "Please verify your email before signing in.";
  }

  if (
    message.includes("invalid") ||
    message.includes("credential") ||
    message.includes("password")
  ) {
    return mode === "signin"
      ? "The email or password is incorrect."
      : "Please use a stronger password and try again.";
  }

  if (message.includes("user already exists") || message.includes("already")) {
    return "An account already exists for this email. Sign in instead.";
  }

  if (message.includes("rate") || message.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return mode === "signin"
    ? "Unable to sign in. Check your details and try again."
    : "Unable to create your account. Check the form and try again.";
}

export function LoginForm({
  nextPath = "/dashboard",
  disabledMessage,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  nextPath?: string;
  disabledMessage?: string | undefined;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(disabledMessage ?? null);
  const [highlightForgot, setHighlightForgot] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitEmailPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

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
      const errorCode = result.error.code ?? "";

      if (errorCode === "EMAIL_NOT_VERIFIED") {
        router.push(
          `/email-otp/verify?email=${encodeURIComponent(email.trim())}`,
        );
        return;
      }

      const message = authErrorMessage(result.error, mode);
      setError(message);
      toastManager.add({
        description: message,
        title: mode === "signin" ? "Sign in failed" : "Sign up failed",
        type: "error",
      });

      // if signin failed due to wrong password, highlight forgotten password
      if (mode === "signin") {
        const msg = (result.error.message ?? "").toLowerCase();
        if (msg.includes("password") || msg.includes("invalid") || msg.includes("credentials")) {
          setHighlightForgot(true);
        }
      }
      return;
    }

    // If signup did not create a session (token null), redirect to OTP/verification page
    // Better Auth returns no session when `autoSignIn` is false or verification is required.
    // Support both shapes: result.token or result.data?.token
    const token =
      "token" in result
        ? result.token
        : "data" in result &&
            result.data &&
            typeof result.data === "object" &&
            "token" in result.data
          ? result.data.token
          : null;
    if (!token) {
      toastManager.add({
        description: "Check your inbox to finish email verification.",
        title: "Verification required",
        type: "info",
      });
      router.push(
        `/email-otp/verify?email=${encodeURIComponent(email.trim())}`,
      );
      return;
    }

    toastManager.add({
      description: "Welcome back.",
      title: "Signed in",
      type: "success",
    });
    router.push(nextPath);
    router.refresh();
  }

  async function signInWithSocial(provider: "google") {
    setError(null);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: nextPath,
      });
    } catch {
      const message = "Unable to start Google sign in. Please try again.";
      setError(message);
      toastManager.add({
        description: message,
        title: "Google sign in failed",
        type: "error",
      });
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Frame className="border-none py-5">
        <AuthBrand />
        <CardContent className="px-4 py-0">
          <Form onSubmit={submitEmailPassword}>
            <FieldGroup>
              <Field className="flex w-full flex-row items-center justify-center gap-2">
                <Button
                  type="button"
                  className="w-full px-4"
                  onClick={() => signInWithSocial("google")}
                >
                  <RiGoogleFill />
                  Google
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-[#262629] mt-1">
                Or
              </FieldSeparator>
              {mode === "signup" && (
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                    className="border-border"
                  />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="m@example.com"
                  autoComplete="email"
                  required
                  className="border-border"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  minLength={8}
                  maxLength={128}
                  required
                  className="border-border"
                />
                {error && <FieldError>{error}</FieldError>}
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className={
                      highlightForgot
                        ? "text-destructive underline font-medium"
                        : "underline-offset-4 hover:underline"
                    }
                  >
                    Forgot password?
                  </Link>
                </div>
              </Field>
              <Button type="submit" loading={loading}>
                {mode === "signin" ? "Sign in" : "Sign up"}
              </Button>
              <Field className="space-y-1 w-full">
                <FieldDescription className="text-center flex items-center justify-center gap-1 w-full">
                  {mode === "signin" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        className="underline-offset-4 hover:underline"
                        onClick={() => setMode("signup")}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="underline-offset-4 hover:underline"
                        onClick={() => setMode("signin")}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </Form>
        </CardContent>
      </Frame>
      <p className="px-6 text-center text-muted-foreground text-xs">
        By continuing, you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}
