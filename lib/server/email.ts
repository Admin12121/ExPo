import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";

type SendAuthEmailInput = {
  to: string;
  subject: string;
  html?: string;
  react?: ReactElement;
  text?: string;
};

export async function sendAuthEmail({
  to,
  subject,
  html,
  react,
  text,
}: SendAuthEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM ??
    process.env.AUTH_EMAIL_FROM ??
    "ExPO <auth@expo.local>";

  if (!html && !react) {
    throw new Error("sendAuthEmail requires either html or react content.");
  }

  if (!apiKey) {
    if (process.env.APP_ENV === "production") {
      throw new Error("RESEND_API_KEY is required before auth email can be sent.");
    }

    console.info("[auth email]", {
      to,
      subject,
      text: text ?? html ?? "[react-email-template]",
    });
    return;
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      react,
      text,
    });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }
}
