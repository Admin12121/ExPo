import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactElement } from "react";

type AuthEmailTemplateProps = {
  appName?: string;
  heading: string;
  intro: string;
  ctaLabel?: string;
  ctaUrl?: string;
  code?: string;
  footer?: string;
};

const baseContainer = {
  backgroundColor: "#f6f9fc",
  fontFamily: "Arial, sans-serif",
  padding: "24px 0",
};

const cardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "24px",
};

const headingStyle = {
  color: "#111827",
  fontSize: "22px",
  margin: "0 0 12px",
};

const textStyle = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 12px",
};

const codeStyle = {
  backgroundColor: "#111827",
  borderRadius: "8px",
  color: "#f9fafb",
  display: "inline-block",
  fontSize: "24px",
  fontWeight: "700",
  letterSpacing: "6px",
  margin: "8px 0 16px",
  padding: "10px 16px",
};

const buttonStyle = {
  backgroundColor: "#111827",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  padding: "12px 18px",
  textDecoration: "none",
};

function AuthEmailTemplate({
  appName = "ExPO",
  heading,
  intro,
  ctaLabel,
  ctaUrl,
  code,
  footer,
}: AuthEmailTemplateProps): ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{heading}</Preview>
      <Body style={baseContainer}>
        <Container style={cardStyle}>
          <Text style={{ ...textStyle, marginBottom: "6px" }}>{appName}</Text>
          <Heading style={headingStyle}>{heading}</Heading>
          <Text style={textStyle}>{intro}</Text>

          {code ? (
            <Section>
              <Text style={codeStyle}>{code}</Text>
            </Section>
          ) : null}

          {ctaLabel && ctaUrl ? (
            <Section style={{ margin: "14px 0" }}>
              <Button href={ctaUrl} style={buttonStyle}>
                {ctaLabel}
              </Button>
              <Text style={{ ...textStyle, marginTop: "10px" }}>
                Or copy and paste this URL: <Link href={ctaUrl}>{ctaUrl}</Link>
              </Text>
            </Section>
          ) : null}

          <Hr style={{ borderColor: "#e5e7eb", margin: "18px 0" }} />
          <Text style={{ ...textStyle, color: "#6b7280", marginBottom: 0 }}>
            {footer ?? "If you did not request this email, you can safely ignore it."}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function resetPasswordEmail(url: string, appName = "ExPO") {
  return AuthEmailTemplate({
    appName,
    heading: "Reset your password",
    intro: "Click the button below to reset your password.",
    ctaLabel: "Reset password",
    ctaUrl: url,
  });
}

export function verifyEmailEmail(url: string, appName = "ExPO") {
  return AuthEmailTemplate({
    appName,
    heading: "Verify your email",
    intro: "Confirm your email address to finish setting up your account.",
    ctaLabel: "Verify email",
    ctaUrl: url,
  });
}

export function signInOtpEmail(
  otp: string,
  appName = "ExPO",
  minutes = 5,
) {
  return AuthEmailTemplate({
    appName,
    heading: "Your sign-in code",
    intro: `Use the code below to sign in. This code expires in ${minutes} minutes.`,
    code: otp,
    footer: "Never share this code with anyone.",
  });
}

export function twoFactorOtpEmail(otp: string, appName = "ExPO") {
  return AuthEmailTemplate({
    appName,
    heading: "Your two-factor code",
    intro: "Enter this code to complete your sign-in.",
    code: otp,
    footer: "If this was not you, change your password immediately.",
  });
}
