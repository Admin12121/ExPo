"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
      <SidebarTrigger />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">Athena</div>
      </div>
    </header>
  );
}
