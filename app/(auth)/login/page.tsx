import { LoginForm } from "./_components/login-form";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next, "/dashboard");

  return (
    <main className="flex h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <LoginForm
          disabledMessage={
            params.error === "account_disabled"
              ? "This account cannot sign in."
              : undefined
          }
          nextPath={nextPath}
        />
      </div>
    </main>
  );
}
