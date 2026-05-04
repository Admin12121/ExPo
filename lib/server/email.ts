import "server-only";

type SendAuthEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendAuthEmail({
  to,
  subject,
  html,
  text,
}: SendAuthEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM ?? "Athena <auth@athena.local>";

  if (!apiKey) {
    if (process.env.APP_ENV === "production") {
      throw new Error("RESEND_API_KEY is required before auth email can be sent.");
    }

    console.info("[auth email]", { to, subject, text: text ?? html });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${body}`);
  }
}
