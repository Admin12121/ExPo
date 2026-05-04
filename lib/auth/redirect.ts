import { getRoutePolicy } from "@/lib/auth/route-policy";

const LOCAL_ORIGIN = "https://athena.local";

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = new URL(value, LOCAL_ORIGIN);

    if (parsed.origin !== LOCAL_ORIGIN) {
      return fallback;
    }

    if (!getRoutePolicy(parsed.pathname)) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}
