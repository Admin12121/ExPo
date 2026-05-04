export type RoutePolicy = {
  label: string;
  href: string;
  auth: boolean;
};

export const appRoutePolicies: RoutePolicy[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    auth: true,
  },
  {
    label: "Users",
    href: "/users",
    auth: true,
  },
  {
    label: "Assessments",
    href: "/assessments",
    auth: true,
  },
  {
    label: "Settings",
    href: "/settings",
    auth: true,
  },
];

export const authRoutePrefixes = ["/login", "/two-factor"];

export function getRoutePolicy(pathname: string) {
  return appRoutePolicies
    .filter(
      (route) =>
        pathname === route.href || pathname.startsWith(`${route.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function isAuthRoute(pathname: string) {
  return authRoutePrefixes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
