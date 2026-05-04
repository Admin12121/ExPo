"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiGoogleFill } from "@remixicon/react";

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

type AuthMode = "signin" | "signup";

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

  async function signInWithSocial(provider: "google") {
    setError(null);
    await authClient.signIn.social({
      provider,
      callbackURL: nextPath,
    });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Frame className="border-none py-5">
        <div className="mb-5 text-center">
          <Link
            href="/"
            className="flex flex-col items-center gap-2 self-center font-medium text-3xl"
          >
            <div className="flex size-14 items-center justify-center rounded-md">
              <Image
                src="/logo.webp"
                priority
                alt="ExPO"
                height={500}
                width={500}
                className="rounded-md"
              />
            </div>
            ExPo
          </Link>
        </div>
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
