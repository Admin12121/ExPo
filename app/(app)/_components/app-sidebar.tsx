"use client";

import {
  ClipboardList,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import Image from "next/image";

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
        icon: ClipboardList,
        roles: ["admin", "writer", "user"],
      },
      {
        title: "Users",
        href: "/users",
        icon: UsersRound,
        roles: ["admin"],
      },
    ],
  },
];

const secondaryNavigation = [
  {
    title: "Settings",
    href: "/settings",
    icon: SettingsIcon,
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

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: AppUser }) {
  const pathname = normalizePath(usePathname());

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
            <SidebarMenuButton
              render={<Link href="/dashboard" />}
              className="flex items-center"
            >
              <Image
                src="/logo.webp"
                priority
                alt="ExPO"
                height={32}
                width={32}
                className="rounded-md"
              />
              <span className="text-base font-semibold">ExPO</span>
            </SidebarMenuButton>
            <SidebarTrigger className="-ml-1 flex sm:hidden" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="h-full">
        {navigation.map((section) => (
          <SidebarGroup key={section.label}>
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

        <NavSecondary
          items={secondaryNavigation}
          isItemActive={isActive}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            image: undefined,
            role: user.role,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
