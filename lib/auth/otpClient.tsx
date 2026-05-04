"use client";

const RESEND_KEY_PREFIX = "auth:otp:resend:";
const SENT_AT_PREFIX = "auth:otp:sentAt:";

function now() {
  return Date.now();
}

export function getResendTimestamps(email: string): number[] {
  try {
    const raw = localStorage.getItem(RESEND_KEY_PREFIX + email.toLowerCase());
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

export function recordResend(email: string) {
  const key = RESEND_KEY_PREFIX + email.toLowerCase();
  const recentWindow = 10 * 60 * 1000; // 10 minutes
  const ts = now();
  const arr = getResendTimestamps(email).filter((t) => t + recentWindow > ts);
  arr.push(ts);
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

export function countRecentResends(email: string) {
  const recentWindow = 10 * 60 * 1000; // 10 minutes
  const ts = now();
  return getResendTimestamps(email).filter((t) => t + recentWindow > ts).length;
}

export function setOtpSentAt(email: string) {
  try {
    localStorage.setItem(SENT_AT_PREFIX + email.toLowerCase(), String(now()));
  } catch {}
}

export function getOtpSentAt(email: string): number | null {
  try {
    const v = localStorage.getItem(SENT_AT_PREFIX + email.toLowerCase());
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function isOtpStillValid(email: string, windowMs = 5 * 60 * 1000) {
  const sent = getOtpSentAt(email);
  if (!sent) return false;
  return now() - sent < windowMs;
}
