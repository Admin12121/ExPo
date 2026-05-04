"use client";

import * as React from "react";
import { HelpCircleIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { AnimatedThemeToggler } from "@/components/animated-theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

function subscribe() {
  return () => {};
}

export function NavSecondary({
  items,
  isItemActive,
  ...props
}: {
  items: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  isItemActive?: (href: string) => boolean;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const mounted = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={isItemActive?.(item.href)}
                render={<Link href={item.href} />}
                tooltip={item.title}
              >
                <item.icon className="size-5" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton
              className="cursor-default hover:bg-transparent active:bg-transparent"
              render={<div />}
            >
              <HelpCircleIcon className="size-5" />
              <span>Get Help</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton
              className="cursor-default hover:bg-transparent active:bg-transparent"
              render={<div />}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icons-tabler-outline icon-tabler-brightness size-5"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                <path d="M12 3l0 18" />
                <path d="M12 9l4.65 -4.65" />
                <path d="M12 14.3l7.37 -7.37" />
                <path d="M12 19.6l8.85 -8.85" />
              </svg>
              <span>Dark Mode</span>
              {mounted ? (
                <AnimatedThemeToggler />
              ) : (
                <Skeleton className="ml-auto h-4 w-8 rounded-full" />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
