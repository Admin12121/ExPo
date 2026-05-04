import { EmailOtpVerifyForm } from "./_components/email-otp-verify-form";

export default async function EmailOtpVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;

  return <EmailOtpVerifyForm initialEmail={params.email ?? ""} />;
}
