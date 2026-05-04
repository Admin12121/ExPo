"use client";

import {
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/client";

type AppUser = {
  name: string;
  email: string;
  role: string;
};

const navigation = [
  {
    label: "Workspace",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
        roles: ["admin", "writer", "user"],
      },
      {
        title: "Assessments",
        href: "/assessments",
        icon: ClipboardCheckIcon,
        roles: ["admin", "writer", "user"],
      },
      {
        title: "Users",
        href: "/users",
        icon: UsersIcon,
        roles: ["admin"],
      },
      {
        title: "Settings",
        href: "/settings",
        icon: SettingsIcon,
        roles: ["admin", "writer", "user"],
      },
    ],
  },
];

function normalizePath(pathname: string | null) {
  if (!pathname || pathname === "/") {
    return "/dashboard";
  }

  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: AppUser }) {
  const router = useRouter();
  const pathname = normalizePath(usePathname());

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton render={<Link href="/dashboard" />}>
              <ShieldIcon className="size-5" />
              <span className="text-base font-semibold">Athena</span>
            </SidebarMenuButton>
            <SidebarTrigger className="-ml-1 flex sm:hidden" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items
                  .filter((item) => item.roles.includes(user.role))
                  .map((item) => {
                    const Icon = item.icon;

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive(item.href)}
                          render={<Link href={item.href} />}
                          tooltip={item.title}
                        >
                          <Icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="grid gap-3 p-2">
          <div className="min-w-0 text-sm">
            <div className="truncate font-medium">{user.name}</div>
            <div className="truncate text-muted-foreground">{user.email}</div>
            <div className="text-xs text-muted-foreground">
              {formatRole(user.role)}
            </div>
          </div>
          <Button onClick={() => void signOut()} size="sm" variant="outline">
            Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
