import { TwoFactorForm } from "./_components/two-factor-form";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next, "/dashboard");

  return (
    <main className="flex h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <TwoFactorForm nextPath={nextPath} />
      </div>
    </main>
  );
}
