"use client";

import type { ComponentType } from "react";
import Link from "next/link";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavigationIcon = ComponentType<{ className?: string }>;

export function NavDocuments({
  label = "Manage",
  items,
  isItemActive,
}: {
  label?: string;
  items: {
    title: string;
    href: string;
    icon: NavigationIcon;
  }[];
  isItemActive?: (href: string) => boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={isItemActive?.(item.href)}
                render={<Link href={item.href} />}
                tooltip={item.title}
              >
                <Icon className="size-4.5" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
