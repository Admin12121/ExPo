import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Frame } from "@/components/ui/frame";
import { verifyPasswordResetState } from "@/lib/auth/password-reset-state";
import { AuthBrand } from "../_components/auth-brand";
import { ResetPasswordForm } from "./_components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; token?: string }>;
}) {
  const params = await searchParams;
  const resetState = verifyPasswordResetState(params.state);
  const token = params.token ?? "";

  return (
    <main className="flex h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        {token || resetState ? (
          <ResetPasswordForm
            initialEmail={resetState?.email ?? ""}
            token={token}
          />
        ) : (
          <Frame className="border-none p-5">
            <AuthBrand />
            <CardContent className="grid gap-4 px-0 py-0 text-center">
              <div className="grid gap-1">
                <h1 className="text-lg font-semibold">Reset link expired</h1>
                <p className="text-sm text-muted-foreground">
                  Request a new reset code before changing your password.
                </p>
              </div>
              <Button render={<Link href="/forgot-password" />}>
                Request reset code
              </Button>
            </CardContent>
          </Frame>
        )}
      </div>
    </main>
  );
}
