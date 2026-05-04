"use client";

// import { usePathname } from "next/navigation";
// import { ChevronRightIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
// import { getRoutePolicy } from "@/lib/auth/route-policy";

export function SiteHeader() {
  // const pathname = usePathname();
  // const route = getRoutePolicy(pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-2 lg:gap-2 justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <>
            <SidebarTrigger className="ml-2 flex" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-8 flex"
            />
          </>
          <span className="shrink-0 text-muted-foreground">Dashboard</span>
          {/* {route.label && (
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          )} */}
          {/* <h1 className="truncate text-base font-medium">{route.label}</h1> */}
        </div>
      </div>
    </header>
  );
}
